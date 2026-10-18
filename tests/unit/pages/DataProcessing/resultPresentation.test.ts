import { closureDisplayStatus } from '@/pages/DataProcessing/resultPresentation';

it.each([
  ['passed', 'Passed'],
  ['valid', 'Valid'],
  ['complete', 'Complete'],
  ['blocked', 'Blocked'],
  ['stale', 'Out of date'],
  ['revoked', 'Revoked'],
  ['invalid', 'Invalid'],
  ['expired', 'Expired'],
  ['queued', 'Queued'],
  ['running', 'Running'],
  ['failed', 'Failed'],
  ['cancelled', 'Cancelled'],
  ['incomplete', 'Incomplete'],
  ['warning', 'Review suggested'],
  ['blocker', 'Action required'],
  ['info', 'Information'],
  ['unavailable', 'Status unavailable'],
  ['unknown', 'Status unavailable'],
])('presents %s without exposing an untranslated status token', (value, label) => {
  const translate = jest.fn((_id, fallback) => fallback);
  expect(closureDisplayStatus(value, translate)).toBe(label);
  expect(translate).toHaveBeenCalledTimes(1);
});
