"""Unit tests for lambda/env-wake/handler.py.

Mirrors test_env_start.py / test_env_stop.py: loads the handler module
directly by file path and mocks both the boto3 ec2 and ssm clients so no
real AWS calls happen, and no real secret is ever needed. The "instance is
stopped -> start it" and "instance is running -> redirect" paths are
exercised here precisely because the plan calls for verifying those via a
mocked unit test rather than against the live, just-verified pilot
instance.

Run with: python -m pytest lambda/tests/test_env_wake.py -q
(or just:  python lambda/tests/test_env_wake.py)
"""

from __future__ import annotations

import importlib.util
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

_HANDLER_PATH = os.path.join(
    os.path.dirname(__file__), "..", "env-wake", "handler.py"
)

_SECRET = "correct-secret-value"


def _load_handler_module():
    spec = importlib.util.spec_from_file_location("env_wake_handler", _HANDLER_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


env_wake_handler = _load_handler_module()


def _mock_ec2_client(state: str, public_ip: str | None = None) -> MagicMock:
    client = MagicMock()
    instance: dict = {"State": {"Name": state}}
    if public_ip is not None:
        instance["PublicIpAddress"] = public_ip
    client.describe_instances.return_value = {
        "Reservations": [{"Instances": [instance]}]
    }
    return client


def _mock_ssm_client(secret: str = _SECRET) -> MagicMock:
    client = MagicMock()
    client.get_parameter.return_value = {"Parameter": {"Value": secret}}
    return client


def _event(secret: str | None) -> dict:
    return {"queryStringParameters": ({"secret": secret} if secret is not None else {})}


class EnvWakeHandlerTests(unittest.TestCase):
    def setUp(self):
        os.environ["INSTANCE_ID"] = "i-0123456789abcdef0"
        os.environ["SECRET_PARAMETER_NAME"] = "/dating-app/pilot/env_wake_shared_secret"

    def _invoke(self, event, ec2_client, ssm_client):
        with patch.object(env_wake_handler, "_ec2_client", return_value=ec2_client), patch.object(
            env_wake_handler, "_ssm_client", return_value=ssm_client
        ):
            return env_wake_handler.handler(event, None)

    def test_rejects_missing_secret(self):
        result = self._invoke(_event(None), _mock_ec2_client("running"), _mock_ssm_client())
        self.assertEqual(result["statusCode"], 403)

    def test_rejects_wrong_secret(self):
        result = self._invoke(
            _event("wrong-value"), _mock_ec2_client("running"), _mock_ssm_client()
        )
        self.assertEqual(result["statusCode"], 403)

    def test_starts_instance_when_stopped(self):
        ec2_client = _mock_ec2_client("stopped")
        result = self._invoke(_event(_SECRET), ec2_client, _mock_ssm_client())

        ec2_client.start_instances.assert_called_once_with(
            InstanceIds=["i-0123456789abcdef0"]
        )
        self.assertEqual(result["statusCode"], 200)
        self.assertIn("Starting the app", result["body"])

    def test_redirects_when_already_running(self):
        ec2_client = _mock_ec2_client("running", public_ip="203.0.113.10")
        result = self._invoke(_event(_SECRET), ec2_client, _mock_ssm_client())

        ec2_client.start_instances.assert_not_called()
        self.assertEqual(result["statusCode"], 302)
        self.assertEqual(result["headers"]["Location"], "http://203.0.113.10")

    def test_running_without_public_ip_falls_back_to_waiting_page(self):
        ec2_client = _mock_ec2_client("running", public_ip=None)
        result = self._invoke(_event(_SECRET), ec2_client, _mock_ssm_client())

        ec2_client.start_instances.assert_not_called()
        self.assertEqual(result["statusCode"], 200)
        self.assertIn("Starting the app", result["body"])

    def test_does_not_restart_when_pending(self):
        ec2_client = _mock_ec2_client("pending")
        result = self._invoke(_event(_SECRET), ec2_client, _mock_ssm_client())

        ec2_client.start_instances.assert_not_called()
        self.assertEqual(result["statusCode"], 200)

    def test_does_not_restart_when_stopping(self):
        ec2_client = _mock_ec2_client("stopping")
        result = self._invoke(_event(_SECRET), ec2_client, _mock_ssm_client())

        ec2_client.start_instances.assert_not_called()
        self.assertEqual(result["statusCode"], 200)

    def test_terminated_returns_error_page(self):
        ec2_client = _mock_ec2_client("terminated")
        result = self._invoke(_event(_SECRET), ec2_client, _mock_ssm_client())

        self.assertEqual(result["statusCode"], 500)

    def test_handles_missing_event(self):
        ec2_client = _mock_ec2_client("running", public_ip="203.0.113.10")
        result = self._invoke(None, ec2_client, _mock_ssm_client())

        # No queryStringParameters at all -> treated as missing secret.
        self.assertEqual(result["statusCode"], 403)


if __name__ == "__main__":
    sys.exit(unittest.main())
