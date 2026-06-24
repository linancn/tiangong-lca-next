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

  it('allows data product managers without granting admin access', () => {
    const result = access({ currentUser: { access: 'data_product_manager' } as any });

    expect(result.canDataProductManager).toBe(true);
    expect(result.canAdmin).toBe(false);
  });

  it('returns false when user is missing', () => {
    const result = access(undefined);

    expect(result.canAdmin).toBe(false);
    expect(result.canDataProductManager).toBe(false);
  });
});
