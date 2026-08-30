(() => {
  'use strict';

  const values = new URLSearchParams(window.location.search).getAll('authorization_id');
  const authorizationId = values.length === 1 ? values[0] : '';
  const valid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      authorizationId,
    );
  const destination = valid
    ? `/#/oauth/consent?authorization_id=${encodeURIComponent(authorizationId.toLowerCase())}`
    : '/#/oauth/consent?error=invalid_authorization_request';

  window.location.replace(destination);
})();
