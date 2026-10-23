import { hasCurrentReviewerApproval } from '@/services/reviews/util';

describe('hasCurrentReviewerApproval', () => {
  it.each([
    [0, 0, false],
    [0, 1, false],
    [2, 0, false],
    [2, 1, true],
    [2, 2, true],
    [2, undefined, false],
    [undefined, 1, false],
    [null, 1, false],
    [2, null, false],
  ])('checks reviewer count %s and approve count %s', (reviewers, approvals, expected) => {
    expect(hasCurrentReviewerApproval(reviewers, approvals)).toBe(expected);
  });
});
