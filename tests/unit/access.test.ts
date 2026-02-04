/**
 * Tests for access control helper
 * Path: src/access.ts
 */

import access from '@/access';

describe('access (src/access.ts)', () => {
  it('allows admin users', () => {
    const result = access({ currentUser: { access: 'admin' } as any });

    expect(result.canAdmin).toBe(true);
  });

  it('blocks non-admin users', () => {
    const result = access({ currentUser: { access: 'user' } as any });

    expect(result.canAdmin).toBe(false);
  });

  it('returns false when user is missing', () => {
    const result = access(undefined);

    expect(result.canAdmin).toBeFalsy();
  });
});
