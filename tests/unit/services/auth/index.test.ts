import * as auth from '@/services/auth';
import * as api from '@/services/auth/api';
import * as password from '@/services/auth/password';
import * as profile from '@/services/auth/profile';

describe('Auth service barrel exports (src/services/auth/index.ts)', () => {
  it('re-exports the public auth helpers from api, password, and profile modules', () => {
    expect(auth.getCurrentUser).toBe(api.getCurrentUser);
    expect(auth.login).toBe(api.login);
    expect(auth.sendMagicLink).toBe(api.sendMagicLink);
    expect(auth.changePassword).toBe(password.changePassword);
    expect(auth.forgotPasswordSendEmail).toBe(password.forgotPasswordSendEmail);
    expect(auth.changeEmail).toBe(profile.changeEmail);
    expect(auth.setProfile).toBe(profile.setProfile);
  });
});
