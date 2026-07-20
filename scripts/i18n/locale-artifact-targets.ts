export function resolveLocaleArtifactTargets<Locale extends string>(
  requestedLocale: Locale | undefined,
  supportedLocales: readonly Locale[],
): Locale[] {
  return requestedLocale ? [requestedLocale] : [...supportedLocales];
}

export function resolveLocaleArtifactSharedAuditMode(write: boolean): 'write' | 'check' {
  return write ? 'write' : 'check';
}
