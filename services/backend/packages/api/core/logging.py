"""Structured JSON logging configuration.

Uses python-json-logger to emit structured logs to stdout, and injects the
request-scoped correlation ID (core/correlation_id.py) into every log
record via a logging.Filter, so every log line can be traced back to the
request (or Celery task) that produced it.
"""
from __future__ import annotations

import logging
import sys

from pythonjsonlogger import jsonlogger

from packages.api.core.correlation_id import get_correlation_id


class CorrelationIdLogFilter(logging.Filter):
    """Inject the current correlation ID into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = get_correlation_id()
        return True


def configure_logging(level: int = logging.INFO) -> None:
    """Configure the root logger for structured JSON output on stdout."""
    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(correlation_id)s %(message)s"
    )
    handler.setFormatter(formatter)
    handler.addFilter(CorrelationIdLogFilter())

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(level)
