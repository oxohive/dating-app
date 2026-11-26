"""Unit tests for lambda/env-start/handler.py.

Loads the handler module directly by file path (rather than relying on
sys.path/package layout) so this works whether or not env-start and
env-stop's identically-named handler.py modules are ever imported in the
same process, and mocks the boto3 ec2 client so no real AWS calls happen.

Run with: python -m pytest lambda/tests/test_env_start.py -q
(or just:  python lambda/tests/test_env_start.py)
"""

from __future__ import annotations

import importlib.util
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

_HANDLER_PATH = os.path.join(
    os.path.dirname(__file__), "..", "env-start", "handler.py"
)


def _load_handler_module():
    spec = importlib.util.spec_from_file_location("env_start_handler", _HANDLER_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


env_start_handler = _load_handler_module()


def _mock_ec2_client(state: str) -> MagicMock:
    client = MagicMock()
    client.describe_instances.return_value = {
        "Reservations": [{"Instances": [{"State": {"Name": state}}]}]
    }
    return client


class EnvStartHandlerTests(unittest.TestCase):
    def setUp(self):
        os.environ["INSTANCE_ID"] = "i-0123456789abcdef0"

    def test_starts_instance_when_stopped(self):
        client = _mock_ec2_client("stopped")
        with patch.object(env_start_handler, "_ec2_client", return_value=client):
            result = env_start_handler.handler({}, None)

        client.start_instances.assert_called_once_with(
            InstanceIds=["i-0123456789abcdef0"]
        )
        self.assertEqual(result["statusCode"], 200)
        self.assertIn("start-requested", result["body"])

    def test_is_idempotent_when_already_running(self):
        client = _mock_ec2_client("running")
        with patch.object(env_start_handler, "_ec2_client", return_value=client):
            result = env_start_handler.handler({}, None)

        client.start_instances.assert_not_called()
        self.assertEqual(result["statusCode"], 200)
        self.assertIn("noop-already-active", result["body"])

    def test_is_idempotent_when_pending(self):
        client = _mock_ec2_client("pending")
        with patch.object(env_start_handler, "_ec2_client", return_value=client):
            result = env_start_handler.handler({}, None)

        client.start_instances.assert_not_called()
        self.assertIn("noop-already-active", result["body"])

    def test_handles_missing_event(self):
        client = _mock_ec2_client("stopped")
        with patch.object(env_start_handler, "_ec2_client", return_value=client):
            result = env_start_handler.handler(None, None)

        self.assertEqual(result["statusCode"], 200)


if __name__ == "__main__":
    sys.exit(unittest.main())
