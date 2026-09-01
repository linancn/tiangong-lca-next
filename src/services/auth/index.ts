// Export all authentication related functions
export {
  getCurrentUser,
  getFreshUserMetadata,
  login,
  logout,
  reauthenticate,
  sendMagicLink,
  signUp,
  updateDataNotificationTime,
  updateIssueNotificationTime,
  updateTeamNotificationTime,
} from './api';
export { cognitoChangeEmail, cognitoChangePassword, cognitoSignUp } from './cognito';
export {
  buildOAuthLoginPath,
  decideOAuthAuthorization,
  getOAuthAuthorizationDetails,
  getVerifiedOAuthSubject,
  isSafeOAuthCallbackUrl,
  listOAuthGrants,
  OAUTH_CONSENT_PATH,
  parseOAuthAuthorizationId,
  redirectToOAuthCallback,
  revokeOAuthGrant,
} from './oauth';
export type { OAuthAuthorizationResult, OAuthServiceResponse } from './oauth';
export { changePassword, forgotPasswordSendEmail, setPassword } from './password';
export { changeEmail, getAccountProfile, setProfile } from './profile';
export {
  completePasswordRecovery,
  getPasswordRecoveryUser,
  recordPasswordRecoverySession,
  subscribeToPasswordRecovery,
} from './recovery';
