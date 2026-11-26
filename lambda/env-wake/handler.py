"""env-wake Lambda.

Wakes the pilot EC2 instance identified by the INSTANCE_ID environment
variable, on demand, from a public (but shared-secret-protected) Lambda
Function URL. Meant to be hit directly in a browser after the instance has
auto-stopped (via the CloudWatch idle alarm in
infra/terraform/envs/pilot/main.tf) or the fixed overnight schedule
(lambda/env-stop, wired by infra/terraform/modules/env-scheduler), so
someone can bring the pilot back up without waiting for the next scheduled
start.

Behavior:
- Rejects the request (403) unless the `secret` query-string parameter
  matches the current value of the SSM SecureString parameter named by the
  SECRET_PARAMETER_NAME environment variable. This is a deliberately simple
  shared-secret check (not a login system) — see
  docs/runbooks/env-start-stop.md for how the secret is distributed and
  rotated.
- If the instance is already `running`, redirects (302) to its current
  public IP over plain HTTP (no stable DNS/domain exists yet for the pilot,
  and no Elastic IP, so this address can change across stop/start cycles —
  a documented limitation, not a bug).
- If the instance is `stopped`, calls `ec2:StartInstances` (idempotent, same
  pattern as lambda/env-start/handler.py) and returns a small HTML page
  with a meta-refresh that retries the same URL (secret included) after a
  few seconds.
- If the instance is in a transitional state (`pending`, `stopping`,
  `shutting-down`), does NOT call StartInstances again (that would raise an
  AWS error for `stopping`/`shutting-down`, and is redundant for `pending`)
  and instead returns the same retry page.
- If the instance is `terminated`, returns an error page rather than
  retrying forever.

Every invocation is logged as a single structured JSON line with a
generated correlation ID, matching the convention in env-start/env-stop.
"""

from __future__ import annotations

import hmac
import json
import logging
import os
import uuid
from typing import Any

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

RUNNING_STATE = "running"
STOPPED_STATE = "stopped"
TRANSITIONAL_STATES = {"pending", "stopping", "shutting-down"}
TERMINAL_STATE = "terminated"

RETRY_SECONDS = 5

_WAITING_PAGE = """<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="{retry_seconds}">
  <title>Starting the pilot app...</title>
</head>
<body style="font-family: sans-serif; max-width: 32rem; margin: 4rem auto; text-align: center;">
  <h1>Starting the app</h1>
  <p>This takes about a minute. This page will retry automatically every
  {retry_seconds} seconds.</p>
  <p style="color: #666;">Instance state: {state}</p>
</body>
</html>
"""

_ERROR_PAGE = """<!doctype html>
<html>
<head><meta charset="utf-8"><title>Cannot wake instance</title></head>
<body style="font-family: sans-serif; max-width: 32rem; margin: 4rem auto; text-align: center;">
  <h1>Cannot wake the instance</h1>
  <p>Instance state is <code>{state}</code>, which this endpoint cannot
  recover from automatically. Check the AWS console or contact an
  operator.</p>
</body>
</html>
"""

_FORBIDDEN_PAGE = """<!doctype html>
<html>
<head><meta charset="utf-8"><title>Forbidden</title></head>
<body style="font-family: sans-serif; max-width: 32rem; margin: 4rem auto; text-align: center;">
  <h1>Forbidden</h1>
  <p>Missing or incorrect shared secret.</p>
</body>
</html>
"""


def _ec2_client():
    return boto3.client("ec2")


def _ssm_client():
    return boto3.client("ssm")


def _html_response(status_code: int, body: str) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "text/html; charset=utf-8"},
        "body": body,
        "isBase64Encoded": False,
    }


def _redirect_response(location: str) -> dict:
    return {
        "statusCode": 302,
        "headers": {"Location": location},
        "body": "",
        "isBase64Encoded": False,
    }


def _extract_secret(event: dict) -> str | None:
    # Lambda Function URLs use the API Gateway HTTP API payload format
    # (v2.0): single-value query params land in queryStringParameters.
    query_params = event.get("queryStringParameters") or {}
    return query_params.get("secret")


def _expected_secret(ssm_client: Any) -> str:
    parameter_name = os.environ["SECRET_PARAMETER_NAME"]
    response = ssm_client.get_parameter(Name=parameter_name, WithDecryption=True)
    return response["Parameter"]["Value"]


def _describe_instance(ec2_client: Any, instance_id: str) -> dict:
    response = ec2_client.describe_instances(InstanceIds=[instance_id])
    reservations = response.get("Reservations", [])
    if not reservations or not reservations[0].get("Instances"):
        raise ValueError(f"Instance {instance_id} not found")
    return reservations[0]["Instances"][0]


def handler(event: dict | None, context: Any = None) -> dict:
    correlation_id = str(uuid.uuid4())
    instance_id = os.environ["INSTANCE_ID"]
    event = event or {}

    log_entry: dict[str, Any] = {
        "correlation_id": correlation_id,
        "action": "env-wake",
        "instance_id": instance_id,
    }

    ssm_client = _ssm_client()
    expected_secret = _expected_secret(ssm_client)
    provided_secret = _extract_secret(event)

    if not provided_secret or not hmac.compare_digest(provided_secret, expected_secret):
        log_entry["result"] = "forbidden-bad-secret"
        logger.info(json.dumps(log_entry))
        return _html_response(403, _FORBIDDEN_PAGE)

    ec2_client = _ec2_client()
    instance = _describe_instance(ec2_client, instance_id)
    state = instance["State"]["Name"]
    log_entry["current_state"] = state

    if state == RUNNING_STATE:
        public_ip = instance.get("PublicIpAddress")
        if public_ip:
            log_entry["result"] = "redirect-running"
            logger.info(json.dumps(log_entry))
            return _redirect_response(f"http://{public_ip}")
        # Running but no public IP assigned yet (rare, momentary) — fall
        # back to the waiting/retry page instead of redirecting nowhere.
        log_entry["result"] = "waiting-no-public-ip-yet"
        logger.info(json.dumps(log_entry))
        return _html_response(200, _WAITING_PAGE.format(retry_seconds=RETRY_SECONDS, state=state))

    if state == STOPPED_STATE:
        ec2_client.start_instances(InstanceIds=[instance_id])
        log_entry["result"] = "start-requested"
        logger.info(json.dumps(log_entry))
        return _html_response(200, _WAITING_PAGE.format(retry_seconds=RETRY_SECONDS, state=state))

    if state in TRANSITIONAL_STATES:
        log_entry["result"] = "waiting-transitional-state"
        logger.info(json.dumps(log_entry))
        return _html_response(200, _WAITING_PAGE.format(retry_seconds=RETRY_SECONDS, state=state))

    # terminated, or any other unexpected state.
    log_entry["result"] = "error-unrecoverable-state"
    logger.info(json.dumps(log_entry))
    return _html_response(500, _ERROR_PAGE.format(state=state))
