import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const VISUAL_PLAN_SCHEMA = 'docs-impact-visual-plan.v1';
export const VISUAL_RESULT_SCHEMA = 'docs-impact-visual-result.v1';
export const ACCESS_REPORT_SCHEMA = 'docs-impact-visual-access-validation.v1';

export const STAGES = ['mapped', 'replay'] as const;
export const CAPTURE_ACTIONS = ['add', 'replace'] as const;
export const LOCATOR_KINDS = ['role', 'label', 'text', 'testId', 'css'] as const;
export const CONTROLLED_ACTIONS = [
  'goto',
  'click',
  'fill',
  'selectOption',
  'waitFor',
  'assertVisible',
] as const;

export type LocatorKind = (typeof LOCATOR_KINDS)[number];
export type LocatorSpec = {
  kind: LocatorKind;
  role?: string;
  name?: string;
  value?: string;
  exact?: boolean;
  cssReason?: string;
};

export type ControlledAction =
  | { type: 'goto'; path: string }
  | { type: 'click'; locator: LocatorSpec }
  | {
      type: 'fill';
      locator: LocatorSpec;
      value: string;
      readOnlyFilter: true;
    }
  | {
      type: 'selectOption';
      locator: LocatorSpec;
      value: string;
      readOnlyFilter: true;
    }
  | { type: 'waitFor'; locator: LocatorSpec }
  | { type: 'assertVisible'; locator: LocatorSpec };

export type CapturePlan = {
  id: string;
  groupId: string;
  action: (typeof CAPTURE_ACTIONS)[number];
  requiredDoc: string;
  mirrorDoc: string;
  asset: string;
  mirrorAsset: string;
  sourcePullRequests: string[];
  routePath: string;
  routePattern: string;
  uiState: string;
  locale: string;
  viewport?: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  compositionClass: string;
  compositionReference: string;
  aspectRatioChangeReason?: string;
  actions?: ControlledAction[];
  crop?: LocatorSpec;
  focus?: LocatorSpec[];
  masks?: LocatorSpec[];
  callouts?: Array<{
    number: number;
    target: string;
    locator: LocatorSpec;
  }>;
  privacyPlan: {
    syntheticOrPublicData: boolean;
    secretsAbsent: boolean;
  };
};

export type VisualPlan = {
  schemaVersion: typeof VISUAL_PLAN_SCHEMA;
  docsImpactIssue: string;
  stage: (typeof STAGES)[number];
  sourceRepo: string;
  sourceCommit: string;
  captureMode: 'local-candidate' | 'production-readonly';
  authentication:
    | { mode: 'public' }
    | {
        mode: 'credentials';
        loginPath: string;
        emailLocator: LocatorSpec;
        passwordLocator: LocatorSpec;
        submitLocator: LocatorSpec;
        authenticatedLocator?: LocatorSpec;
        identityProbe: {
          path: string;
          jsonPath: string;
          matchSecret: 'email' | 'accountAlias';
        };
        mutationAllowlist: string[];
      };
  authorization: {
    requiredCapability: string;
    probe:
      | { kind: 'http-status'; path: string }
      | { kind: 'capability-json'; path: string; jsonPath: string }
      | {
          kind: 'ui-denial';
          path: string;
          deniedLocator: LocatorSpec;
          grantedLocator: LocatorSpec;
          profileRoleConfirmed: boolean;
          sourceGuardReference: string;
        };
  };
  captures: CapturePlan[];
};

export type SecretValues = {
  accountAlias: string;
  email: string;
  password: string;
  baseUrl: string;
};

export type AccessObservation = {
  authenticationStatus: 'authenticated' | 'invalid-authentication';
  identityConfirmed: boolean;
  authorizationStatus?: 'granted' | 'denied' | 'unknown' | 'operational-failure';
  signals?: Array<{ kind: string; [key: string]: unknown }>;
  excludedFailure?: string;
};

export type AccessClassification =
  'granted' | 'verified-access-denied' | 'invalid-authentication' | 'environment';

const FULL_SHA = /^[0-9a-f]{40}$/i;
const ISSUE_REF = /^[^/\s]+\/[^#\s]+#\d+$/;
const CAPTURE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_VIEWPORT = {
  width: 1440,
  height: 900,
  deviceScaleFactor: 2,
} as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireString(value: unknown, field: string, errors: string[]): value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${field} must be a non-empty string`);
    return false;
  }
  return true;
}

export function parseEnvFile(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) {
      throw new Error(`secret file line ${index + 1} is not KEY=VALUE`);
    }
    let value = match[2].trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

export function secretValuesFromEnv(values: Record<string, string>): SecretValues {
  const required = [
    'DOCS_SCREENSHOT_ACCOUNT_ALIAS',
    'DOCS_SCREENSHOT_ACCOUNT_EMAIL',
    'DOCS_SCREENSHOT_ACCOUNT_PASSWORD',
    'DOCS_SCREENSHOT_BASE_URL',
  ];
  const missing = required.filter((key) => !values[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`secret file is missing required variables: ${missing.join(', ')}`);
  }
  const unknown = Object.keys(values).filter((key) => !required.includes(key));
  if (unknown.length > 0) {
    throw new Error(`secret file contains unsupported variables: ${unknown.join(', ')}`);
  }
  const url = new URL(values.DOCS_SCREENSHOT_BASE_URL);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('DOCS_SCREENSHOT_BASE_URL must use http or https');
  }
  return {
    accountAlias: values.DOCS_SCREENSHOT_ACCOUNT_ALIAS.trim(),
    email: values.DOCS_SCREENSHOT_ACCOUNT_EMAIL,
    password: values.DOCS_SCREENSHOT_ACCOUNT_PASSWORD,
    baseUrl: url.toString(),
  };
}

export function validateSecretMode(mode: number, regularFile: boolean): void {
  if (!regularFile) {
    throw new Error('screenshot secret path must be a regular file, not a symlink');
  }
  const permissions = mode & 0o777;
  if ((permissions & 0o077) !== 0 || (permissions & 0o111) !== 0) {
    throw new Error(
      `screenshot secret permissions must be no broader than 0600; got ${permissions
        .toString(8)
        .padStart(4, '0')}`,
    );
  }
}

export function validateSecretLocation(secretFile: string): string {
  if (!path.isAbsolute(secretFile)) {
    throw new Error('screenshot secret path must be absolute');
  }
  const absolute = fs.realpathSync(secretFile);
  const result = spawnSync('git', ['-C', path.dirname(absolute), 'rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  });
  if (result.status === 0) {
    const gitRoot = path.resolve(result.stdout.trim());
    if (absolute === gitRoot || absolute.startsWith(`${gitRoot}${path.sep}`)) {
      throw new Error('screenshot secret path must be outside every Git repository/worktree');
    }
  } else if (result.error && (result.error as NodeJS.ErrnoException).code === 'ENOENT') {
    let current = path.dirname(absolute);
    while (true) {
      if (fs.existsSync(path.join(current, '.git'))) {
        throw new Error('screenshot secret path must be outside every Git repository/worktree');
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return absolute;
}

export function locatorErrors(locator: unknown, field: string): string[] {
  const errors: string[] = [];
  if (!isObject(locator)) return [`${field} must be a locator object`];
  if (!LOCATOR_KINDS.includes(locator.kind as LocatorKind)) {
    errors.push(`${field}.kind must be one of ${LOCATOR_KINDS.join(', ')}`);
    return errors;
  }
  const kind = locator.kind as LocatorKind;
  if (kind === 'role') {
    requireString(locator.role, `${field}.role`, errors);
    requireString(locator.name, `${field}.name`, errors);
  } else {
    requireString(locator.value, `${field}.value`, errors);
  }
  if (kind === 'css') {
    requireString(locator.cssReason, `${field}.cssReason`, errors);
  }
  return errors;
}

function validateControlledAction(action: unknown, field: string, errors: string[]) {
  if (!isObject(action)) {
    errors.push(`${field} must be an object`);
    return;
  }
  if (!CONTROLLED_ACTIONS.includes(action.type as never)) {
    errors.push(`${field}.type must be one of ${CONTROLLED_ACTIONS.join(', ')}`);
    return;
  }
  if (action.type === 'goto') {
    requireString(action.path, `${field}.path`, errors);
    return;
  }
  errors.push(...locatorErrors(action.locator, `${field}.locator`));
  if (action.type === 'fill' || action.type === 'selectOption') {
    requireString(action.value, `${field}.value`, errors);
    if (action.readOnlyFilter !== true) {
      errors.push(`${field}.readOnlyFilter must be true`);
    }
  }
}

export function normalizeOutputPath(candidate: string, allowedRoots: string[]): string {
  if (allowedRoots.length === 0) {
    throw new Error('at least one --allowed-output-root is required');
  }
  const absolute = path.isAbsolute(candidate)
    ? path.resolve(candidate)
    : path.resolve(allowedRoots[0], candidate);
  const allowed = allowedRoots.some((root) => {
    const absoluteRoot = path.resolve(root);
    return absolute === absoluteRoot || absolute.startsWith(`${absoluteRoot}${path.sep}`);
  });
  if (!allowed) {
    throw new Error(`screenshot output escapes allowed roots: ${candidate}`);
  }
  return absolute;
}

export function validateVisualPlan(
  payload: unknown,
  allowedOutputRoots: string[],
): asserts payload is VisualPlan {
  const errors: string[] = [];
  if (!isObject(payload)) throw new Error('visual plan must be a JSON object');
  if (payload.schemaVersion !== VISUAL_PLAN_SCHEMA) {
    errors.push(`schemaVersion must be ${VISUAL_PLAN_SCHEMA}`);
  }
  if (!ISSUE_REF.test(String(payload.docsImpactIssue || ''))) {
    errors.push('docsImpactIssue must be owner/repo#number');
  }
  if (!STAGES.includes(payload.stage as never)) {
    errors.push(`stage must be one of ${STAGES.join(', ')}`);
  }
  requireString(payload.sourceRepo, 'sourceRepo', errors);
  if (
    !requireString(payload.sourceCommit, 'sourceCommit', errors) ||
    !FULL_SHA.test(payload.sourceCommit)
  ) {
    errors.push('sourceCommit must be a full 40-character SHA');
  }
  if (!['local-candidate', 'production-readonly'].includes(String(payload.captureMode))) {
    errors.push('captureMode must be local-candidate or production-readonly');
  }

  if (!isObject(payload.authentication)) {
    errors.push('authentication must be an object');
  } else if (!['public', 'credentials'].includes(String(payload.authentication.mode))) {
    errors.push('authentication.mode must be public or credentials');
  } else if (payload.authentication.mode === 'credentials') {
    requireString(payload.authentication.loginPath, 'authentication.loginPath', errors);
    errors.push(
      ...locatorErrors(payload.authentication.emailLocator, 'authentication.emailLocator'),
      ...locatorErrors(payload.authentication.passwordLocator, 'authentication.passwordLocator'),
      ...locatorErrors(payload.authentication.submitLocator, 'authentication.submitLocator'),
    );
    if (payload.authentication.authenticatedLocator) {
      errors.push(
        ...locatorErrors(
          payload.authentication.authenticatedLocator,
          'authentication.authenticatedLocator',
        ),
      );
    }
    if (!isObject(payload.authentication.identityProbe)) {
      errors.push('authentication.identityProbe must be an object');
    } else {
      requireString(
        payload.authentication.identityProbe.path,
        'authentication.identityProbe.path',
        errors,
      );
      requireString(
        payload.authentication.identityProbe.jsonPath,
        'authentication.identityProbe.jsonPath',
        errors,
      );
      if (
        !['email', 'accountAlias'].includes(
          String(payload.authentication.identityProbe.matchSecret),
        )
      ) {
        errors.push('authentication.identityProbe.matchSecret must be email or accountAlias');
      }
    }
    if (
      !Array.isArray(payload.authentication.mutationAllowlist) ||
      payload.authentication.mutationAllowlist.some(
        (value) => typeof value !== 'string' || !value.trim(),
      )
    ) {
      errors.push('authentication.mutationAllowlist must be a string array');
    } else if (
      payload.authentication.mutationAllowlist.some(
        (value) =>
          value.includes('?') ||
          !/^(?:https:\/\/[^/*\s]+)?\/(?:api\/)?(?:auth|session)(?:\/|$)/.test(value),
      )
    ) {
      errors.push(
        'authentication.mutationAllowlist may contain only explicit https auth/session paths without query strings',
      );
    }
  }

  if (!isObject(payload.authorization)) {
    errors.push('authorization must be an object');
  } else {
    requireString(
      payload.authorization.requiredCapability,
      'authorization.requiredCapability',
      errors,
    );
    if (!isObject(payload.authorization.probe)) {
      errors.push('authorization.probe must be an object');
    } else {
      const probe = payload.authorization.probe;
      if (!['http-status', 'capability-json', 'ui-denial'].includes(String(probe.kind))) {
        errors.push('authorization.probe.kind must be http-status, capability-json, or ui-denial');
      }
      requireString(probe.path, 'authorization.probe.path', errors);
      if (probe.kind === 'capability-json') {
        requireString(probe.jsonPath, 'authorization.probe.jsonPath', errors);
      }
      if (probe.kind === 'ui-denial') {
        errors.push(
          ...locatorErrors(probe.deniedLocator, 'authorization.probe.deniedLocator'),
          ...locatorErrors(probe.grantedLocator, 'authorization.probe.grantedLocator'),
        );
        if (probe.profileRoleConfirmed !== true) {
          errors.push('authorization.probe.profileRoleConfirmed must be true for ui-denial');
        }
        requireString(
          probe.sourceGuardReference,
          'authorization.probe.sourceGuardReference',
          errors,
        );
      }
    }
  }

  if (!Array.isArray(payload.captures) || payload.captures.length === 0) {
    errors.push('captures must be a non-empty array');
  } else {
    const ids = new Set<string>();
    const firstCapture = isObject(payload.captures[0]) ? payload.captures[0] : {};
    const sharedViewport = isObject(firstCapture.viewport)
      ? firstCapture.viewport
      : DEFAULT_VIEWPORT;
    const sharedLocale =
      typeof firstCapture.locale === 'string' && firstCapture.locale.trim()
        ? firstCapture.locale.trim()
        : '';
    payload.captures.forEach((candidate, index) => {
      const field = `captures[${index}]`;
      if (!isObject(candidate)) {
        errors.push(`${field} must be an object`);
        return;
      }
      if (requireString(candidate.id, `${field}.id`, errors)) {
        if (!CAPTURE_ID.test(candidate.id)) {
          errors.push(`${field}.id must use lowercase semantic kebab-case`);
        }
        if (ids.has(candidate.id)) errors.push(`${field}.id is duplicated`);
        ids.add(candidate.id);
      }
      if (
        requireString(candidate.groupId, `${field}.groupId`, errors) &&
        !CAPTURE_ID.test(candidate.groupId)
      ) {
        errors.push(`${field}.groupId must use lowercase semantic kebab-case`);
      }
      if (!CAPTURE_ACTIONS.includes(candidate.action as never)) {
        errors.push(`${field}.action must be add or replace`);
      }
      for (const key of [
        'requiredDoc',
        'mirrorDoc',
        'asset',
        'mirrorAsset',
        'routePath',
        'routePattern',
        'uiState',
        'compositionClass',
        'compositionReference',
      ]) {
        requireString(candidate[key], `${field}.${key}`, errors);
      }
      if (
        !Array.isArray(candidate.sourcePullRequests) ||
        candidate.sourcePullRequests.length === 0 ||
        candidate.sourcePullRequests.some((value) => !ISSUE_REF.test(String(value)))
      ) {
        errors.push(`${field}.sourcePullRequests must contain owner/repo#number values`);
      }
      const viewport = isObject(candidate.viewport) ? candidate.viewport : DEFAULT_VIEWPORT;
      if (
        !Number.isInteger(viewport.width) ||
        Number(viewport.width) <= 0 ||
        !Number.isInteger(viewport.height) ||
        Number(viewport.height) <= 0 ||
        !Number.isFinite(Number(viewport.deviceScaleFactor)) ||
        Number(viewport.deviceScaleFactor) < 2
      ) {
        errors.push(
          `${field}.viewport must use positive integer width/height and deviceScaleFactor >= 2`,
        );
      }
      if (
        viewport.width !== sharedViewport.width ||
        viewport.height !== sharedViewport.height ||
        Number(viewport.deviceScaleFactor) !== Number(sharedViewport.deviceScaleFactor)
      ) {
        errors.push(`${field}.viewport must match the shared plan viewport`);
      }
      const locale =
        typeof candidate.locale === 'string' && candidate.locale.trim()
          ? candidate.locale.trim()
          : '';
      requireString(candidate.locale, `${field}.locale`, errors);
      if (locale !== sharedLocale) {
        errors.push(`${field}.locale must match the shared plan locale`);
      }
      try {
        normalizeOutputPath(String(candidate.asset || ''), allowedOutputRoots);
        normalizeOutputPath(String(candidate.mirrorAsset || ''), allowedOutputRoots);
      } catch (error) {
        errors.push(`${field}: ${(error as Error).message}`);
      }
      if (Array.isArray(candidate.actions)) {
        candidate.actions.forEach((action, actionIndex) =>
          validateControlledAction(action, `${field}.actions[${actionIndex}]`, errors),
        );
      }
      if (candidate.crop) {
        errors.push(...locatorErrors(candidate.crop, `${field}.crop`));
      }
      for (const [key, locators] of [
        ['focus', candidate.focus],
        ['masks', candidate.masks],
      ] as const) {
        if (locators !== undefined && !Array.isArray(locators)) {
          errors.push(`${field}.${key} must be an array`);
        } else {
          (locators || []).forEach((locator, locatorIndex) =>
            errors.push(...locatorErrors(locator, `${field}.${key}[${locatorIndex}]`)),
          );
        }
      }
      if (candidate.callouts !== undefined && !Array.isArray(candidate.callouts)) {
        errors.push(`${field}.callouts must be an array`);
      } else {
        const calloutNumbers = new Set<number>();
        (candidate.callouts || []).forEach((callout, calloutIndex) => {
          const calloutField = `${field}.callouts[${calloutIndex}]`;
          if (!isObject(callout)) {
            errors.push(`${calloutField} must be an object`);
            return;
          }
          if (!Number.isInteger(callout.number) || Number(callout.number) < 1) {
            errors.push(`${calloutField}.number must be a positive integer`);
          } else if (calloutNumbers.has(Number(callout.number))) {
            errors.push(`${calloutField}.number must be unique within the capture`);
          } else {
            calloutNumbers.add(Number(callout.number));
          }
          requireString(callout.target, `${calloutField}.target`, errors);
          errors.push(...locatorErrors(callout.locator, `${calloutField}.locator`));
        });
      }
      if (
        !isObject(candidate.privacyPlan) ||
        candidate.privacyPlan.syntheticOrPublicData !== true ||
        candidate.privacyPlan.secretsAbsent !== true
      ) {
        errors.push(`${field}.privacyPlan must confirm synthetic/public data and absent secrets`);
      }
    });
  }

  if (errors.length > 0) {
    throw new Error(`invalid visual plan:\n- ${errors.join('\n- ')}`);
  }
}

export function classifyAccess(observation: AccessObservation): AccessClassification {
  if (
    observation.authenticationStatus !== 'authenticated' ||
    observation.identityConfirmed !== true
  ) {
    return 'invalid-authentication';
  }
  if (observation.authorizationStatus === 'granted') return 'granted';
  if (observation.authorizationStatus === 'denied' && !observation.excludedFailure) {
    const signals = observation.signals || [];
    const accountIdentity = signals.some((signal) => signal.kind === 'account-identity');
    const authoritative = signals.some((signal) =>
      ['http-403', 'capability-denied'].includes(signal.kind),
    );
    const uiCorroborated =
      signals.some((signal) => signal.kind === 'ui-access-denied') &&
      signals.some((signal) => signal.kind === 'profile-role') &&
      signals.some((signal) => signal.kind === 'source-route-guard');
    if (accountIdentity && (authoritative || uiCorroborated)) {
      return 'verified-access-denied';
    }
  }
  return 'environment';
}

export function redactRoute(value: string): string {
  try {
    const url = new URL(value, 'https://redaction.invalid');
    const pathname = url.pathname
      .replace(
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
        '<uuid>',
      )
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '<email>');
    return pathname;
  } catch {
    return '<redacted-route>';
  }
}
