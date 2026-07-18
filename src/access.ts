/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(initialState: { currentUser?: Auth.CurrentUser } | undefined) {
  const { currentUser } = initialState ?? {};
  const isSessionResolutionPending = !currentUser;
  return {
    // Role gates must not replace the global anonymous-to-login redirect with
    // a 403 page. Once a session exists, the normal role checks apply.
    canAdmin: isSessionResolutionPending || currentUser.access === 'admin',
    canDataProductManager:
      isSessionResolutionPending || currentUser.access === 'data_product_manager',
  };
}
