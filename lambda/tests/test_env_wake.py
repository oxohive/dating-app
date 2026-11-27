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
import json
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


def _event(
    secret: str | None,
    *,
    format_param: str | None = None,
    accept_header: str | None = None,
) -> dict:
    query_params: dict[str, str] = {}
    if secret is not None:
        query_params["secret"] = secret
    if format_param is not None:
        query_params["format"] = format_param

    event: dict = {"queryStringParameters": query_params}
    if accept_header is not None:
        event["headers"] = {"accept": accept_header}
    return event


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


class EnvWakeHandlerJsonModeTests(unittest.TestCase):
    """JSON response mode (task 0018), selected by an `Accept:
    application/json` header or a `?format=json` query param. Covers the
    same underlying state checks as EnvWakeHandlerTests, but asserts the
    JSON contract pinned in tasks/0018-mobile-dynamic-wake-discovery/plan.md
    and that requesting JSON doesn't change any AWS call made.
    """

    def setUp(self):
        os.environ["INSTANCE_ID"] = "i-0123456789abcdef0"
        os.environ["SECRET_PARAMETER_NAME"] = "/dating-app/pilot/env_wake_shared_secret"

    def _invoke(self, event, ec2_client, ssm_client):
        with patch.object(env_wake_handler, "_ec2_client", return_value=ec2_client), patch.object(
            env_wake_handler, "_ssm_client", return_value=ssm_client
        ):
            return env_wake_handler.handler(event, None)

    def _json_body(self, result):
        self.assertEqual(result["headers"]["Content-Type"], "application/json")
        return json.loads(result["body"])

    # --- Accept header and ?format=json both trigger JSON mode ---

    def test_accept_header_triggers_json_mode(self):
        ec2_client = _mock_ec2_client("running", public_ip="203.0.113.10")
        result = self._invoke(
            _event(_SECRET, accept_header="application/json"),
            ec2_client,
            _mock_ssm_client(),
        )
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(self._json_body(result), {"state": "running", "base_url": "http://203.0.113.10"})

    def test_format_query_param_triggers_json_mode(self):
        ec2_client = _mock_ec2_client("running", public_ip="203.0.113.10")
        result = self._invoke(
            _event(_SECRET, format_param="json"),
            ec2_client,
            _mock_ssm_client(),
        )
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(self._json_body(result), {"state": "running", "base_url": "http://203.0.113.10"})

    def test_neither_header_nor_param_keeps_html_mode(self):
        # Sanity check: no Accept header, no ?format=json -> unchanged HTML
        # path, not JSON, even though this test module only exists to cover
        # the new branch.
        ec2_client = _mock_ec2_client("running", public_ip="203.0.113.10")
        result = self._invoke(_event(_SECRET), ec2_client, _mock_ssm_client())
        self.assertEqual(result["statusCode"], 302)
        self.assertEqual(result["headers"]["Location"], "http://203.0.113.10")
        self.assertNotIn("Content-Type", result["headers"])

    # --- All four contract states ---

    def test_json_running_with_public_ip(self):
        ec2_client = _mock_ec2_client("running", public_ip="203.0.113.10")
        result = self._invoke(
            _event(_SECRET, accept_header="application/json"), ec2_client, _mock_ssm_client()
        )
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(self._json_body(result), {"state": "running", "base_url": "http://203.0.113.10"})
        ec2_client.start_instances.assert_not_called()

    def test_json_running_without_public_ip_is_starting(self):
        ec2_client = _mock_ec2_client("running", public_ip=None)
        result = self._invoke(
            _event(_SECRET, accept_header="application/json"), ec2_client, _mock_ssm_client()
        )
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(self._json_body(result), {"state": "starting", "retry_after_seconds": 5})
        ec2_client.start_instances.assert_not_called()

    def test_json_stopped_starts_instance_and_reports_starting(self):
        ec2_client = _mock_ec2_client("stopped")
        result = self._invoke(
            _event(_SECRET, accept_header="application/json"), ec2_client, _mock_ssm_client()
        )
        ec2_client.start_instances.assert_called_once_with(InstanceIds=["i-0123456789abcdef0"])
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(self._json_body(result), {"state": "starting", "retry_after_seconds": 5})

    def test_json_transitional_state_is_starting_without_restart(self):
        for transitional_state in ("pending", "stopping", "shutting-down"):
            with self.subTest(state=transitional_state):
                ec2_client = _mock_ec2_client(transitional_state)
                result = self._invoke(
                    _event(_SECRET, accept_header="application/json"),
                    ec2_client,
                    _mock_ssm_client(),
                )
                ec2_client.start_instances.assert_not_called()
                self.assertEqual(result["statusCode"], 200)
                self.assertEqual(self._json_body(result), {"state": "starting", "retry_after_seconds": 5})

    def test_json_terminated_is_error(self):
        ec2_client = _mock_ec2_client("terminated")
        result = self._invoke(
            _event(_SECRET, accept_header="application/json"), ec2_client, _mock_ssm_client()
        )
        self.assertEqual(result["statusCode"], 500)
        body = self._json_body(result)
        self.assertEqual(body["state"], "error")
        self.assertIn("message", body)
        self.assertIsInstance(body["message"], str)
        self.assertTrue(body["message"])

    def test_json_missing_secret_is_forbidden(self):
        ec2_client = _mock_ec2_client("running", public_ip="203.0.113.10")
        result = self._invoke(
            _event(None, accept_header="application/json"), ec2_client, _mock_ssm_client()
        )
        self.assertEqual(result["statusCode"], 403)
        self.assertEqual(self._json_body(result), {"state": "forbidden"})
        ec2_client.describe_instances.assert_not_called()
        ec2_client.start_instances.assert_not_called()

    def test_json_wrong_secret_is_forbidden(self):
        ec2_client = _mock_ec2_client("running", public_ip="203.0.113.10")
        result = self._invoke(
            _event("wrong-value", accept_header="application/json"), ec2_client, _mock_ssm_client()
        )
        self.assertEqual(result["statusCode"], 403)
        self.assertEqual(self._json_body(result), {"state": "forbidden"})

    # --- Requesting JSON must not change any AWS call made ---

    def test_json_mode_makes_identical_aws_calls_as_html_mode_when_stopped(self):
        ec2_client_html = _mock_ec2_client("stopped")
        self._invoke(_event(_SECRET), ec2_client_html, _mock_ssm_client())

        ec2_client_json = _mock_ec2_client("stopped")
        self._invoke(_event(_SECRET, accept_header="application/json"), ec2_client_json, _mock_ssm_client())

        ec2_client_html.start_instances.assert_called_once_with(InstanceIds=["i-0123456789abcdef0"])
        ec2_client_json.start_instances.assert_called_once_with(InstanceIds=["i-0123456789abcdef0"])
        ec2_client_html.describe_instances.assert_called_once_with(InstanceIds=["i-0123456789abcdef0"])
        ec2_client_json.describe_instances.assert_called_once_with(InstanceIds=["i-0123456789abcdef0"])

    def test_json_mode_does_not_call_start_instances_when_running(self):
        ec2_client = _mock_ec2_client("running", public_ip="203.0.113.10")
        self._invoke(_event(_SECRET, accept_header="application/json"), ec2_client, _mock_ssm_client())
        ec2_client.start_instances.assert_not_called()


if __name__ == "__main__":
    sys.exit(unittest.main())
