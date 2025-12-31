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
  updateTeamNotificationTime,
} from './api';
export { cognitoChangeEmail, cognitoChangePassword, cognitoSignUp } from './cognito';
export { changePassword, forgotPasswordSendEmail, setPassword } from './password';
export { changeEmail, setProfile } from './profile';
