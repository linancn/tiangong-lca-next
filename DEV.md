# Project Setup

## Installing Dependencies

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

nvm install
nvm alias default 22
nvm use

npm install

npm update && npm ci
```

## Configuration Files

You can modify or add extra scripts in the `package.json` file. Below are some pre-configured script commands:

### Debug the Project

🚀 **Start the project in debug mode using the command below** 🚀:

```bash
npm start
```

The application will run at: [localhost:8000](http://localhost:8000/)

### Check Code Formatting

```bash
npm run lint
```

### Check and Auto-Fix Code Formatting

```bash
npm run lint:fix
```

### Run Tests

```bash
npm test
```

### Test Coverage Analysis

The project provides a powerful test coverage analysis script (`scripts/test-coverage-report.js`) that can analyze test coverage in detail.

#### Quick Usage

```bash
# Recommended: Run tests and generate detailed coverage report
npm run test:report

# Run tests and generate detailed coverage report (same as above)
npm run test:coverage:report

# Run tests and generate standard coverage data (HTML format)
npm run test:coverage
```

#### Coverage Level Guide

| Icon | Color  | Coverage Range | Description                     |
| ---- | ------ | -------------- | ------------------------------- |
| ✅   | Green  | 100%           | Perfect coverage                |
| 🟢   | Cyan   | 80-99%         | Good coverage                   |
| 🟡   | Yellow | 50-79%         | Moderate coverage               |
| 🔴   | Red    | < 50%          | Low coverage, needs improvement |

#### Coverage Metrics

The report displays three types of coverage metrics:

1. **Line Coverage**: Percentage of code lines executed by tests
2. **Branch Coverage**: Percentage of conditional branches executed by tests
3. **Function Coverage**: Percentage of functions called by tests

#### Report Structure

The coverage report is categorized and displayed as follows:

```
📦 Components    - React components
🔧 Services      - Services and utility functions
📄 Pages         - Page components
📁 Others        - Other files (configuration, i18n, etc.)
```

Each category displays:

- ❌ List of files without test coverage
- 📊 Details of files with coverage (including three coverage metrics)
- 📈 Statistics for that category

#### Test File Locations

- Component tests: `tests/unit/components/`
- Service tests: `tests/unit/services/`
- Page tests: `tests/unit/pages/`

#### Test Writing Recommendations

1. Use `@testing-library/react` for component testing
2. Mock external dependencies (APIs, routing, etc.)
3. Test different user interaction scenarios
4. Test edge cases and error handling
5. Test different prop combinations

#### Test-Related Commands

| Command                        | Description                                      |
| ------------------------------ | ------------------------------------------------ |
| `npm test`                     | Run all tests                                    |
| `npm run test:coverage`        | Run tests and generate coverage data             |
| `npm run test:coverage:report` | Run tests and generate readable coverage report  |
| `npm run test:report`          | Run tests and generate report (combined command) |
| `npm run test:update`          | Update test snapshots                            |

> 💡 **Tip**: For detailed test coverage script usage, see [`scripts/README.md`](./scripts/README.md)

### Build the Project

```bash
npm run build
```

## Automatic Deployment

The project's `.github/workflows/build.yml` file is configured with an automatic deployment workflow based on version tags. Simply create a tag that follows the format ‘v\*’ locally and push it to the remote repository to trigger a deployment. By configuring the keys `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the project, automatic deployment to Cloudflare Pages is enabled.

```bash
# List existing tags
git tag

# Create a new tag
git tag v0.0.1

# Push the tag to the remote repository
git push origin v0.0.1
```
