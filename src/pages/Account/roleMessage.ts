type IntlShapeLike = {
  formatMessage: (
    descriptor: { defaultMessage?: string; id: string },
    values?: Record<string, string>,
  ) => string;
};

const ACCOUNT_ROLE_MESSAGES = {
  authenticated: {
    id: 'pages.account.profile.role.authenticated',
    defaultMessage: 'Authenticated',
  },
} as const;

type KnownAccountRole = keyof typeof ACCOUNT_ROLE_MESSAGES;

const isKnownAccountRole = (role: string): role is KnownAccountRole =>
  Object.prototype.hasOwnProperty.call(ACCOUNT_ROLE_MESSAGES, role);

export const formatAccountRole = (intl: IntlShapeLike, role?: string | null): string => {
  const normalizedRole = typeof role === 'string' ? role.trim() : '';
  if (isKnownAccountRole(normalizedRole)) {
    return intl.formatMessage(ACCOUNT_ROLE_MESSAGES[normalizedRole]);
  }

  return intl.formatMessage(
    {
      id: 'pages.account.profile.role.unknown',
      defaultMessage: 'Unknown role ({role})',
    },
    { role: normalizedRole || '-' },
  );
};
