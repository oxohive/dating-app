"""env-stop Lambda.

Stops the pilot EC2 instance identified by the INSTANCE_ID environment
variable. Idempotent: checks the instance's current state first, and is a
safe no-op if the instance is already stopped or already stopping. Every
invocation is logged as a single structured JSON line with a generated
correlation ID, so CloudWatch Logs Insights can trace one invocation end to
end.

Invoked by the env-scheduler Terraform module's EventBridge "stop" rule on
a cron schedule (cost control for the always-on pilot EC2 host outside
active hours), but also safe to invoke directly/on-demand with the same
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

# States in which the instance is already inactive (or becoming inactive)
# and we should not issue another stop call.
ALREADY_INACTIVE_STATES = {"stopping", "stopped"}


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
        "action": "env-stop",
        "instance_id": instance_id,
        "trigger_event": event,
    }

    ec2_client = _ec2_client()
    current_state = _describe_instance_state(ec2_client, instance_id)
    log_entry["current_state"] = current_state

    if current_state in ALREADY_INACTIVE_STATES:
        log_entry["result"] = "noop-already-inactive"
        logger.info(json.dumps(log_entry))
        return {"statusCode": 200, "body": json.dumps(log_entry)}

    ec2_client.stop_instances(InstanceIds=[instance_id])
    log_entry["result"] = "stop-requested"
    logger.info(json.dumps(log_entry))
    return {"statusCode": 200, "body": json.dumps(log_entry)}
