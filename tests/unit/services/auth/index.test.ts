import * as auth from '@/services/auth';
import * as api from '@/services/auth/api';
import * as cognito from '@/services/auth/cognito';
import * as password from '@/services/auth/password';
import * as profile from '@/services/auth/profile';

describe('Auth service barrel exports (src/services/auth/index.ts)', () => {
  it('re-exports the public auth helpers from api, cognito, password, and profile modules', () => {
    expect(auth.getCurrentUser).toBe(api.getCurrentUser);
    expect(auth.login).toBe(api.login);
    expect(auth.sendMagicLink).toBe(api.sendMagicLink);
    expect(auth.cognitoChangeEmail).toBe(cognito.cognitoChangeEmail);
    expect(auth.cognitoChangePassword).toBe(cognito.cognitoChangePassword);
    expect(auth.changePassword).toBe(password.changePassword);
    expect(auth.forgotPasswordSendEmail).toBe(password.forgotPasswordSendEmail);
    expect(auth.changeEmail).toBe(profile.changeEmail);
    expect(auth.setProfile).toBe(profile.setProfile);
  });
});
