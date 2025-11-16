.PHONY: test test-cov test-video

test:
	uv run pytest -v

test-cov:
	uv run pytest -v --cov=utils --cov=models --cov=shared --cov-report=term-missing