const path = require('path');

class FailureSkippedSummaryReporter {
  onRunComplete(_, results) {
    const { testResults } = results;
    if (!Array.isArray(testResults) || testResults.length === 0) {
      return;
    }

    const rootDir = results.globalConfig?.rootDir || process.cwd();
    const failedSuites = [];
    const skippedTests = [];

    testResults.forEach((suite) => {
      const relativePath = path.relative(rootDir, suite.testFilePath);

      if (suite.numFailingTests > 0) {
        const failedCases = suite.testResults
          .filter((testCase) => testCase.status === 'failed')
          .map((testCase) => ({
            name: testCase.fullName || testCase.title,
            messages: testCase.failureMessages || [],
          }));

        if (failedCases.length > 0) {
          failedSuites.push({ path: relativePath || suite.testFilePath, failedCases });
        }
      }

      const skippedCases = suite.testResults
        .filter((testCase) => ['pending', 'skipped', 'todo'].includes(testCase.status))
        .map((testCase) => ({
          name: testCase.fullName || testCase.title,
          status: testCase.status,
        }));

      if (skippedCases.length > 0) {
        skippedTests.push({ path: relativePath || suite.testFilePath, skippedCases });
      }
    });

    if (failedSuites.length === 0 && skippedTests.length === 0) {
      return;
    }

    const divider = '\n========================================\n';
    process.stdout.write(`${divider}Test Summary (failed & skipped)${divider}`);

    if (failedSuites.length > 0) {
      process.stdout.write('Failed Tests by File:\n');
      failedSuites.forEach(({ path: filePath, failedCases }) => {
        process.stdout.write(`- ${filePath}\n`);
        failedCases.forEach(({ name, messages }) => {
          process.stdout.write(`  ✖ ${name}\n`);
          messages
            .join('\n')
            .split('\n')
            .filter((line) => line.trim().length > 0)
            .forEach((line) => {
              process.stdout.write(`    ${line}\n`);
            });
        });
      });
      process.stdout.write('\n');
    }

    if (skippedTests.length > 0) {
      process.stdout.write('Skipped Tests by File:\n');
      skippedTests.forEach(({ path: filePath, skippedCases }) => {
        process.stdout.write(`- ${filePath}\n`);
        skippedCases.forEach(({ name, status }) => {
          process.stdout.write(`  ○ ${name} [${status}]\n`);
        });
      });
      process.stdout.write('\n');
    }

    process.stdout.write('End of summary.\n');
  }
}

module.exports = FailureSkippedSummaryReporter;
