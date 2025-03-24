# NextHaven.ai API Test Suite

This directory contains the test suite for the NextHaven.ai API. It includes unit tests, integration tests, and specialized tests for various components of the application.

## Test Structure

The tests are organized to mirror the structure of the `src` directory:

```
tests/
├── conftest.py           # Shared pytest fixtures
├── routers/              # Tests for API routes
│   ├── test_property_evaluation.py
│   └── test_property_evaluation_snapshots.py
├── models/               # Tests for data models
│   └── test_request.py
├── lib/                  # Tests for library code
│   └── test_evaluate_agent.py
└── utils/                # Tests for utility functions
```

## Running Tests

### Using the Test Runner Script

We provide a convenient test runner script that supports various options:

```bash
# Run all tests with coverage report
python tests/run_tests.py

# Run only unit tests
python tests/run_tests.py --unit

# Run integration tests with HTML coverage report
python tests/run_tests.py --integration --html

# Run all tests in parallel with all reporting options
python tests/run_tests.py --all --parallel --xml --html --report
```

### Using pytest Directly

You can also run tests directly with pytest:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src

# Run specific test categories
pytest -m unit
pytest -m integration
pytest -m api
pytest -m snapshot

# Run specific test files
pytest tests/routers/test_property_evaluation.py
```

## Test Categories

The test suite is organized into the following categories:

- **Unit Tests** (`@pytest.mark.unit`): Tests individual components in isolation
- **Integration Tests** (`@pytest.mark.integration`): Tests interactions between components
- **API Tests** (`@pytest.mark.api`): Tests the API endpoints with client requests
- **Snapshot Tests** (`@pytest.mark.snapshot`): Tests that compare responses against saved snapshots
- **Slow Tests** (`@pytest.mark.slow`): Long-running tests that may be skipped for quick feedback

## Advanced Testing Features

The test suite implements several advanced testing strategies:

1. **Property-based Testing**: Using Hypothesis to generate test cases
2. **Snapshot Testing**: Capturing and comparing API responses for regression testing
3. **Mock Clock Testing**: For time-dependent operations
4. **Parallel Test Execution**: For faster test runs
5. **AI Component Isolation**: Special tests for AI-based evaluation components

## Coverage Requirements

We aim to maintain at least 80% test coverage for the codebase. The CI pipeline will fail if coverage drops below this threshold.

To view coverage reports:

- **Terminal**: Run `pytest --cov=src --cov-report=term`
- **HTML**: Run `pytest --cov=src --cov-report=html` and open `htmlcov/index.html`
- **XML**: Run `pytest --cov=src --cov-report=xml` for CI integration

## Adding New Tests

When adding new functionality, please follow these guidelines:

1. Create test files with the `test_` prefix
2. Organize tests in the appropriate directory mirroring the `src` structure
3. Use the appropriate test markers
4. Create fixtures in `conftest.py` if they're reusable across multiple tests
5. Mock external dependencies like API calls and databases
6. Include both happy path and error case tests

## Continuous Integration

The test suite runs automatically on GitHub Actions for all pull requests and pushes to the main branch. See `.github/workflows/test-coverage.yml` for details. 