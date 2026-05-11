import {
  buildDataWorkflowHelpText,
  extractDetailResultFlag,
  printCompactSmokeSummary,
  printExpectationResults,
  shouldPrintDetailedResult,
} from '../workflows/workflow-shared';

describe('workflow-shared output helpers', () => {
  it('extracts and removes --detail-result from argv', () => {
    expect(
      extractDetailResultFlag([
        '--detail-result',
        '--frontend-url',
        'http://127.0.0.1:8000',
        '--keep-data',
      ]),
    ).toEqual({
      argv: ['--frontend-url', 'http://127.0.0.1:8000', '--keep-data'],
      detailResult: true,
    });
  });

  it('supports explicit boolean values for --detail-result', () => {
    expect(extractDetailResultFlag(['--detail-result=false', '--keep-data'])).toEqual({
      argv: ['--keep-data'],
      detailResult: false,
    });

    expect(extractDetailResultFlag(['--detail-result', 'true', '--keep-data'])).toEqual({
      argv: ['--keep-data'],
      detailResult: true,
    });
  });

  it('lets --no-detail-result override detail output', () => {
    expect(
      extractDetailResultFlag(['--detail-result', '--no-detail-result', '--keep-data']),
    ).toEqual({
      argv: ['--keep-data'],
      detailResult: false,
    });
  });

  it('appends the shared output help text', () => {
    expect(buildDataWorkflowHelpText('Data workflow help')).toContain('--detail-result');
    expect(buildDataWorkflowHelpText('Data workflow help')).toContain(
      'Data type, Data ID, Version, and Result',
    );
  });

  it('prints compact data workflow summaries as four lines', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      printCompactSmokeSummary({
        dataId: 'contact-1',
        dataType: 'contact',
        passed: true,
        version: '01.01.000',
      });
      expect(logSpy.mock.calls).toEqual([
        ['Data type: contact'],
        ['Data ID: contact-1'],
        ['Version: 01.01.000'],
        ['Result: success'],
      ]);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints expectation results with english-only labels', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      printExpectationResults([{ passed: true }, { passed: false }], 'Check');
      expect(logSpy.mock.calls).toEqual([['[PASS] Check 1'], ['[FAIL] Check 2']]);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('forces detailed output when the workflow fails', () => {
    expect(shouldPrintDetailedResult(false, true)).toBe(false);
    expect(shouldPrintDetailedResult(true, true)).toBe(true);
    expect(shouldPrintDetailedResult(false, false)).toBe(true);
  });
});
