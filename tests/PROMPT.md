## Prompt for Adding Tests

### Unit Tests Addition/Update Instructions

Add or update unit tests for the {src/services/auth/} or {tests/unit/services/antchain/api.test.ts} module with the following requirements:

1. Strictly follow the existing test file organization and style used in the project (refer to tests/README.md for guidelines).
2. Investigate real-world usage first: Before writing tests, review how this module is actually invoked in the business code (e.g., which functions are called, input/output formats, boundary and error handling). Use these real usage patterns to determine the scope of test coverage and key assertions.
3. Cover scenarios with confirmed issues in business usage: If you discover clear problems or design flaws in the actual usage paths, add tests for these cases as well. Such tests should be marked using the project’s existing conventions (e.g., test.failing, xfail, TODO/skip) so they serve as visible regression tests awaiting fixes, ensuring that known issues are not hidden.
4. Use 'npm run lint' to ensure code quality and consistency with project standards.
5. Use 'npm test -- <test file>' to ensure all new tests run successfully, ruling out failures caused by the tests themselves (not the product code).

### Integration Tests Addition/Update Instructions

Add or update integration tests for the workflow in the {tests/integration/reviews/} with the following requirements:

1. Strictly follow the existing test file organization and style used in the project (refer to tests/README.md for guidelines).
2. Investigate real-world usage first: Before writing tests, review how this module is actually invoked in the business code (e.g., which functions are called, input/output formats, boundary and error handling). Use these real usage patterns to determine the scope of test coverage and key assertions.
3. Cover scenarios with confirmed issues in business usage: If you discover clear problems or design flaws in the actual usage paths, add tests for these cases as well. Such tests should be marked using the project’s existing conventions (e.g., test.failing, xfail, TODO/skip) so they serve as visible regression tests awaiting fixes, ensuring that known issues are not hidden.
4. Use 'npm run lint' to ensure code quality and consistency with project standards.
5. Use 'npm test -- <test file>' to ensure all new tests run successfully, ruling out failures caused by the tests themselves (not the product code).
