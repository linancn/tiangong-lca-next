import { isRuleVerificationPassed } from '@/utils/ruleVerification';

describe('ruleVerification helpers', () => {
  it('treats nullish rule verification values as passed', () => {
    expect(isRuleVerificationPassed(undefined)).toBe(true);
    expect(isRuleVerificationPassed(null)).toBe(true);
    expect(isRuleVerificationPassed(true)).toBe(true);
  });

  it('treats an explicit false rule verification as failed', () => {
    expect(isRuleVerificationPassed(false)).toBe(false);
  });
});
