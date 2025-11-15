"""
Simple logging configuration for the Timbre backend application.
"""

import logging
import os
from typing import Optional


def setup_logging(log_level: str = "INFO") -> None:
    """
    Set up simple logging for the application.

    Args:
        log_level: The logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    os.makedirs("logs", exist_ok=True)

    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(),  # Console output
            logging.FileHandler("logs/app.log"),  # File output
        ],
    )


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Get a logger instance.

    Args:
        name: The logger name (defaults to the calling module)

    Returns:
        A configured logger
    """
    return logging.getLogger(name or __name__)


setup_logging(os.getenv("LOG_LEVEL", "INFO"))
