# NextHaven.ai Tests

This directory contains tests for the NextHaven.ai backend API.

## Structure

- `unit/`: Unit tests for individual components
- `integration/`: Integration tests for API endpoints
- `conftest.py`: Shared pytest fixtures

## Running Tests

From the project root, run:

```bash
cd services/api
poetry run pytest
```

For more verbose output:

```bash
poetry run pytest -v
```

To run specific test categories:

```bash
# Run only unit tests
poetry run pytest tests/unit

# Run only integration tests
poetry run pytest tests/integration

# Run a specific test file
poetry run pytest tests/unit/test_models.py
```

## Test Coverage

To generate a test coverage report:

```bash
poetry run pytest --cov=src tests/
```

For a more detailed HTML report:

```bash
poetry run pytest --cov=src --cov-report=html tests/
```

The HTML report will be available in the `htmlcov` directory. 