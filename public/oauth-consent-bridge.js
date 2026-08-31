(() => {
  'use strict';

  const values = new URLSearchParams(window.location.search).getAll('authorization_id');
  const authorizationId = values.length === 1 ? values[0] : '';
  // authorization_id is an opaque Supabase handle. Permit one bounded RFC
  // 3986 unreserved path segment and preserve it byte-for-byte.
  const valid =
    /^[A-Za-z0-9._~-]{1,256}$/u.test(authorizationId) && !/^\.+$/u.test(authorizationId);
  const destination = valid
    ? `/#/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`
    : '/#/oauth/consent?error=invalid_authorization_request';

  window.location.replace(destination);
})();
