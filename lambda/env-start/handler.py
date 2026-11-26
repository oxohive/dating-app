"""env-start Lambda.

Starts the pilot EC2 instance identified by the INSTANCE_ID environment
variable. Idempotent: checks the instance's current state first, and is a
safe no-op if the instance is already running or already on its way up
(pending). Every invocation is logged as a single structured JSON line with
a generated correlation ID, so CloudWatch Logs Insights can trace one
invocation end to end.

Invoked by the env-scheduler Terraform module's EventBridge "start" rule on
a cron schedule, but also safe to invoke directly/on-demand (e.g. from a
console test event, or a future "wake it up now" button) with the same
idempotent behavior.
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from typing import Any

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# States in which the instance is already active (or becoming active) and
# we should not issue another start call.
ALREADY_ACTIVE_STATES = {"pending", "running"}


def _ec2_client():
    return boto3.client("ec2")


def _describe_instance_state(ec2_client: Any, instance_id: str) -> str:
    response = ec2_client.describe_instances(InstanceIds=[instance_id])
    reservations = response.get("Reservations", [])
    if not reservations or not reservations[0].get("Instances"):
        raise ValueError(f"Instance {instance_id} not found")
    return reservations[0]["Instances"][0]["State"]["Name"]


def handler(event: dict | None, context: Any = None) -> dict:
    correlation_id = str(uuid.uuid4())
    instance_id = os.environ["INSTANCE_ID"]
    event = event or {}

    log_entry: dict[str, Any] = {
        "correlation_id": correlation_id,
        "action": "env-start",
        "instance_id": instance_id,
        "trigger_event": event,
    }

    ec2_client = _ec2_client()
    current_state = _describe_instance_state(ec2_client, instance_id)
    log_entry["current_state"] = current_state

    if current_state in ALREADY_ACTIVE_STATES:
        log_entry["result"] = "noop-already-active"
        logger.info(json.dumps(log_entry))
        return {"statusCode": 200, "body": json.dumps(log_entry)}

    ec2_client.start_instances(InstanceIds=[instance_id])
    log_entry["result"] = "start-requested"
    logger.info(json.dumps(log_entry))
    return {"statusCode": 200, "body": json.dumps(log_entry)}
