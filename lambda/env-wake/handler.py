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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="{retry_seconds}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Starting the pilot app&hellip;</title>
  <style>
    :root {{
      color-scheme: dark;
    }}
    * {{
      box-sizing: border-box;
    }}
    html, body {{
      margin: 0;
      padding: 0;
    }}
    body {{
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: radial-gradient(circle at 50% -10%, #241a28 0%, #120f16 45%, #0a090d 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #f5f4f6;
    }}
    .card {{
      width: 100%;
      max-width: 26rem;
      background: #1c1a21;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 1.25rem;
      box-shadow: 0 25px 60px -20px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(229, 29, 87, 0.12);
      padding: 2.5rem 2rem;
      text-align: center;
    }}
    .brand {{
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.75rem;
      font-weight: 700;
      font-size: 0.95rem;
      letter-spacing: 0.01em;
      color: #d4d1d8;
    }}
    .brand svg {{
      flex-shrink: 0;
    }}
    .spinner {{
      width: 48px;
      height: 48px;
      margin: 0 auto 1.5rem;
      border-radius: 50%;
      border: 4px solid rgba(229, 29, 87, 0.15);
      border-top-color: #e51d57;
      animation: spin 0.85s linear infinite;
    }}
    @keyframes spin {{
      to {{
        transform: rotate(360deg);
      }}
    }}
    h1 {{
      margin: 0 0 0.6rem;
      font-size: 1.4rem;
      font-weight: 700;
      color: #ffffff;
    }}
    p.lead {{
      margin: 0 0 1.5rem;
      font-size: 0.95rem;
      line-height: 1.5;
      color: #b9b4c0;
    }}
    .progress-track {{
      width: 100%;
      height: 8px;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.08);
      margin-bottom: 1.5rem;
    }}
    .progress-fill {{
      height: 100%;
      width: 35%;
      border-radius: 999px;
      background: linear-gradient(90deg, #f8406a, #e51d57);
      animation: indeterminate 1.7s ease-in-out infinite;
    }}
    @keyframes indeterminate {{
      0% {{
        transform: translateX(-110%);
      }}
      100% {{
        transform: translateX(290%);
      }}
    }}
    p.hint {{
      margin: 0 0 1.25rem;
      font-size: 0.85rem;
      color: #8d8796;
    }}
    .debug {{
      margin: 0;
      font-size: 0.75rem;
      color: #5c5664;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 1rem;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#e51d57" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 21s-6.7-4.35-9.33-8.2C1.1 10.77 1 8.99 2.02 7.36 3.04 5.74 4.84 5 6.5 5c1.54 0 2.94.78 3.9 2.02C11.06 5.78 12.46 5 14 5c1.66 0 3.46.74 4.48 2.36 1.02 1.63.92 3.41-.65 5.44C18.7 16.65 12 21 12 21z"/></svg>
      Dating App
    </div>
    <div class="spinner" role="presentation"></div>
    <h1>Starting the app</h1>
    <p class="lead">The server was idle and is starting back up. This page
    refreshes automatically &mdash; no action needed.</p>
    <div class="progress-track">
      <div class="progress-fill"></div>
    </div>
    <p class="hint">Usually ready within about a minute. Checking again
    every {retry_seconds} seconds&hellip;</p>
    <p class="debug">Instance state: {state}</p>
  </div>
</body>
</html>
"""

_ERROR_PAGE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cannot wake instance</title>
  <style>
    :root {{
      color-scheme: dark;
    }}
    * {{
      box-sizing: border-box;
    }}
    html, body {{
      margin: 0;
      padding: 0;
    }}
    body {{
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: radial-gradient(circle at 50% -10%, #241a28 0%, #120f16 45%, #0a090d 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #f5f4f6;
    }}
    .card {{
      width: 100%;
      max-width: 26rem;
      background: #1c1a21;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 1.25rem;
      box-shadow: 0 25px 60px -20px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(243, 97, 7, 0.14);
      padding: 2.5rem 2rem;
      text-align: center;
    }}
    .brand {{
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.75rem;
      font-weight: 700;
      font-size: 0.95rem;
      letter-spacing: 0.01em;
      color: #d4d1d8;
    }}
    .brand svg {{
      flex-shrink: 0;
    }}
    .icon-circle {{
      width: 48px;
      height: 48px;
      margin: 0 auto 1.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(243, 97, 7, 0.14);
    }}
    h1 {{
      margin: 0 0 0.6rem;
      font-size: 1.4rem;
      font-weight: 700;
      color: #ffffff;
    }}
    p.lead {{
      margin: 0 0 1.25rem;
      font-size: 0.95rem;
      line-height: 1.5;
      color: #b9b4c0;
    }}
    code {{
      background: rgba(255, 255, 255, 0.08);
      border-radius: 0.3rem;
      padding: 0.1rem 0.4rem;
      font-size: 0.9em;
      color: #ffc171;
    }}
    .debug {{
      margin: 1.25rem 0 0;
      font-size: 0.75rem;
      color: #5c5664;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 1rem;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#e51d57" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 21s-6.7-4.35-9.33-8.2C1.1 10.77 1 8.99 2.02 7.36 3.04 5.74 4.84 5 6.5 5c1.54 0 2.94.78 3.9 2.02C11.06 5.78 12.46 5 14 5c1.66 0 3.46.74 4.48 2.36 1.02 1.63.92 3.41-.65 5.44C18.7 16.65 12 21 12 21z"/></svg>
      Dating App
    </div>
    <div class="icon-circle">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff7d12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>
    </div>
    <h1>Cannot wake the instance</h1>
    <p class="lead">This endpoint cannot recover from this state
    automatically. Check the AWS console or contact an operator.</p>
    <p class="debug">Instance state: <code>{state}</code></p>
  </div>
</body>
</html>
"""

_FORBIDDEN_PAGE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Forbidden</title>
  <style>
    :root {
      color-scheme: dark;
    }
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
    }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: radial-gradient(circle at 50% -10%, #241a28 0%, #120f16 45%, #0a090d 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #f5f4f6;
    }
    .card {
      width: 100%;
      max-width: 26rem;
      background: #1c1a21;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 1.25rem;
      box-shadow: 0 25px 60px -20px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(229, 29, 87, 0.12);
      padding: 2.5rem 2rem;
      text-align: center;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.75rem;
      font-weight: 700;
      font-size: 0.95rem;
      letter-spacing: 0.01em;
      color: #d4d1d8;
    }
    .brand svg {
      flex-shrink: 0;
    }
    .icon-circle {
      width: 48px;
      height: 48px;
      margin: 0 auto 1.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(229, 29, 87, 0.12);
    }
    h1 {
      margin: 0 0 0.6rem;
      font-size: 1.4rem;
      font-weight: 700;
      color: #ffffff;
    }
    p.lead {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.5;
      color: #b9b4c0;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#e51d57" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 21s-6.7-4.35-9.33-8.2C1.1 10.77 1 8.99 2.02 7.36 3.04 5.74 4.84 5 6.5 5c1.54 0 2.94.78 3.9 2.02C11.06 5.78 12.46 5 14 5c1.66 0 3.46.74 4.48 2.36 1.02 1.63.92 3.41-.65 5.44C18.7 16.65 12 21 12 21z"/></svg>
      Dating App
    </div>
    <div class="icon-circle">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e51d57" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
    </div>
    <h1>Forbidden</h1>
    <p class="lead">Missing or incorrect shared secret.</p>
  </div>
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
