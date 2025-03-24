# Test Status Report

## Test Status Summary

| Category | Status |
|----------|--------|
| Total Tests | 23 |
| Passing Tests | 12 |
| Skipped Tests | 11 |
| Failing Tests | 0 |
| Coverage | 54% |

## What's Working

The following tests are passing successfully:

1. **Model Validation Tests**
   - `TestPropertyQueryRequest::test_valid_request`
   - `TestPropertyQueryRequest::test_missing_required_fields`
   - `TestPropertyQueryRequest::test_invalid_values`
   - `TestPropertyQueryRequest::test_property_query_with_various_inputs`
   - `TestPropertyEvaluationRequest::test_valid_evaluation_request`
   - `TestPropertyEvaluationRequest::test_missing_session_id`
   - `TestPropertyEvaluationRequest::test_evaluation_request_with_various_inputs`

2. **Router Unit Tests**
   - `test_query_properties` - Tests the property query endpoint functionality
   - `test_get_query_status` - Tests retrieving the status of a query
   - `test_get_query_status_not_found` - Tests error handling for non-existent sessions
   - `test_property_query_with_various_inputs` - Tests the query endpoint with different inputs
   - `test_query_timeout_behavior` - Tests timeout handling in the property evaluation endpoint

## What's Skipped

The following tests are currently skipped and need to be revisited:

1. **Background Task Tests**
   - `test_fetch_properties_background_success` - Skipped due to difficulties with mocking async functions
   - `test_fetch_properties_background_error` - Skipped due to difficulties with mocking async functions
   - `test_fetch_properties_background_timeout` - Skipped due to difficulties with mocking async functions
   - `test_concurrent_background_tasks` - Skipped due to difficulties with mocking async functions

2. **Complex Model Tests**
   - `test_evaluate_properties_completed_query` - Skipped due to difficulties with mocking the complex property model

3. **AI Agent Tests**
   - `TestEvaluateAgent::test_evaluate_properties` - Skipped due to issues with the GeneratedRequirement model
   - `TestEvaluateAgent::test_evaluate_handles_llm_errors` - Skipped due to issues with the GeneratedRequirement model
   - `TestEvaluateAgent::test_evaluate_with_image_analysis` - Skipped due to issues with the GeneratedRequirement model

4. **Integration Tests**
   - `test_property_query_flow` - Skipped due to the create_app() function not accepting a 'testing' parameter

5. **Snapshot Tests**
   - `test_query_properties_response_snapshot` - Skipped because the snapshot data needs to be initialized
   - `test_evaluate_properties_response_snapshot` - Skipped because the snapshot data needs to be initialized

## Issues to Fix

1. **Async Function Mocking**
   - The background tasks are difficult to test due to challenges with mocking async functions correctly.
   - Consider simplifying the async code or improving the test fixtures to make these tests easier.

2. **Model Requirements**
   - The `GeneratedRequirement` model requires a `reasoning` field that is missing in the test fixtures.
   - Update the test fixtures to include the required fields.

3. **App Creation for Testing**
   - The `create_app()` function doesn't accept a `testing` parameter, which is needed for integration tests.
   - Update the app factory function to support a testing mode.

4. **Snapshot Initialization**
   - The snapshot tests need to be initialized with `--snapshot-update`.
   - Run the tests with this flag once the other issues are resolved.

5. **Coroutine Warnings**
   - There are several warnings about coroutines never being awaited.
   - Ensure that all coroutines are properly awaited or cancelled.

6. **Test Coverage**
   - The current test coverage is 54%, which is below the target of 80%.
   - Add more tests for untested code paths, especially in `src/lib/evaluate/agents_with_vision.py` (18% coverage) and other low-coverage modules.

## Next Steps

1. Fix the `GeneratedRequirement` model fixture in the `TestEvaluateAgent` class.
2. Improve the async mocking techniques for the background task tests.
3. Update the app factory to support testing mode.
4. Initialize the snapshot tests.
5. Address the coroutine warnings.
6. Add more tests to increase coverage.

## Running Tests

To run the tests that are currently working:

```bash
poetry run pytest -k "not skip" -v
```

To run all tests (including skipped ones):

```bash
poetry run pytest -v
```

To generate a coverage report:

```bash
poetry run python tests/run_tests.py --unit --html
``` 