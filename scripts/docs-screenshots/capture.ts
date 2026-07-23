#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { chromium, type BrowserContext, type Locator, type Page } from '@playwright/test';

import { DOCS_CAPTURE_DEFAULTS } from '../../playwright.docs-capture.config';
import {
  ACCESS_REPORT_SCHEMA,
  classifyAccess,
  normalizeOutputPath,
  parseEnvFile,
  redactRoute,
  secretValuesFromEnv,
  validateSecretLocation,
  validateSecretMode,
  validateVisualPlan,
  VISUAL_RESULT_SCHEMA,
  type AccessObservation,
  type CapturePlan,
  type LocatorSpec,
  type SecretValues,
  type VisualPlan,
} from './contracts';

process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

type CliOptions = {
  plan?: string;
  result?: string;
  accessReport?: string;
  allowedOutputRoots: string[];
  headed: boolean;
};

type AuthorizationResult = {
  observation: AccessObservation;
  status: ReturnType<typeof classifyAccess>;
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const FULL_SHA = /^[0-9a-f]{40}$/i;

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    allowedOutputRoots: [],
    headed: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--plan') options.plan = argv[++index];
    else if (argument === '--result') options.result = argv[++index];
    else if (argument === '--access-report') options.accessReport = argv[++index];
    else if (argument === '--allowed-output-root') {
      options.allowedOutputRoots.push(argv[++index]);
    } else if (argument === '--headed') options.headed = true;
    else if (argument === '--help' || argument === '-h') {
      process.stdout.write(`Usage:
  npm run docs:screenshot:capture -- --plan PLAN --result RESULT
    --access-report ACCESS_REPORT --allowed-output-root NEXT_DOCS_ROOT
    [--headed]

Credentials are read only by this child process from DOCS_SCREENSHOT_ENV_FILE.
Never pass account values on the command line or in the plan.\n`);
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  if (!options.plan) throw new Error('--plan is required');
  if (!options.result) throw new Error('--result is required');
  if (!options.accessReport) throw new Error('--access-report is required');
  if (options.allowedOutputRoots.length === 0) {
    throw new Error('--allowed-output-root is required');
  }
  return options;
}

function writePrivateJson(file: string, payload: unknown) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, {
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
}

function readSecrets(): SecretValues {
  const secretFile = process.env.DOCS_SCREENSHOT_ENV_FILE;
  if (!secretFile) {
    throw new Error('missing-credentials: DOCS_SCREENSHOT_ENV_FILE is not configured');
  }
  const absoluteSecretFile = validateSecretLocation(secretFile);
  const stats = fs.lstatSync(absoluteSecretFile);
  validateSecretMode(stats.mode, stats.isFile());
  return secretValuesFromEnv(parseEnvFile(fs.readFileSync(absoluteSecretFile, 'utf8')));
}

function sameOriginUrl(baseUrl: string, routePath: string): URL {
  const base = new URL(baseUrl);
  const target = new URL(routePath, base);
  if (target.origin !== base.origin) {
    throw new Error(`route must stay on the configured base origin: ${routePath}`);
  }
  return target;
}

function globMatchesUrl(value: string, pattern: string): boolean {
  const url = new URL(value);
  const target = /^https?:/i.test(pattern) ? url.toString() : url.pathname;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(target);
}

function locatorFromSpec(page: Page, spec: LocatorSpec): Locator {
  const exact = spec.exact ?? true;
  switch (spec.kind) {
    case 'role':
      return page.getByRole(spec.role as Parameters<Page['getByRole']>[0], {
        name: spec.name,
        exact,
      });
    case 'label':
      return page.getByLabel(spec.value!, { exact });
    case 'text':
      return page.getByText(spec.value!, { exact });
    case 'testId':
      return page.getByTestId(spec.value!);
    case 'css':
      return page.locator(spec.value!);
  }
}

async function installMutationGuard(context: BrowserContext, allowlist: string[]) {
  const blocked: Array<{ method: string; routePattern: string }> = [];
  await context.route('**/*', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    if (
      SAFE_METHODS.has(method) ||
      allowlist.some((pattern) => globMatchesUrl(request.url(), pattern))
    ) {
      await route.continue();
      return;
    }
    blocked.push({ method, routePattern: redactRoute(request.url()) });
    await route.abort('blockedbyclient');
  });
  return blocked;
}

function valueAtJsonPath(payload: unknown, jsonPath: string): unknown {
  const segments = jsonPath
    .replace(/^\$\.?/, '')
    .split('.')
    .filter(Boolean);
  let value = payload;
  for (const segment of segments) {
    if (!value || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

async function authenticate(
  page: Page,
  context: BrowserContext,
  plan: VisualPlan,
  secrets: SecretValues,
): Promise<AccessObservation> {
  if (plan.authentication.mode === 'public') {
    return {
      authenticationStatus: 'authenticated',
      identityConfirmed: true,
      signals: [{ kind: 'public-session' }],
    };
  }

  try {
    await page.goto(sameOriginUrl(secrets.baseUrl, plan.authentication.loginPath).toString(), {
      waitUntil: 'domcontentloaded',
    });
    await locatorFromSpec(page, plan.authentication.emailLocator).fill(secrets.email);
    await locatorFromSpec(page, plan.authentication.passwordLocator).fill(secrets.password);
    await locatorFromSpec(page, plan.authentication.submitLocator).click();
    if (plan.authentication.authenticatedLocator) {
      await locatorFromSpec(page, plan.authentication.authenticatedLocator).waitFor({
        state: 'visible',
      });
    }

    const identityUrl = sameOriginUrl(secrets.baseUrl, plan.authentication.identityProbe.path);
    const identityResponse = await context.request.get(identityUrl.toString(), {
      failOnStatusCode: false,
    });
    let identityConfirmed = false;
    if (identityResponse.status() >= 200 && identityResponse.status() < 300) {
      const identity = valueAtJsonPath(
        await identityResponse.json(),
        plan.authentication.identityProbe.jsonPath,
      );
      const expected =
        plan.authentication.identityProbe.matchSecret === 'email'
          ? secrets.email
          : secrets.accountAlias;
      identityConfirmed =
        typeof identity === 'string' &&
        identity.trim().toLocaleLowerCase() === expected.trim().toLocaleLowerCase();
    }
    return {
      authenticationStatus: identityConfirmed ? 'authenticated' : 'invalid-authentication',
      identityConfirmed,
      signals: identityConfirmed ? [{ kind: 'account-identity' }] : [],
      excludedFailure: identityConfirmed
        ? undefined
        : identityResponse.status() >= 200 && identityResponse.status() < 300
          ? 'identity-value-mismatch'
          : `identity-status-${identityResponse.status()}`,
    };
  } catch {
    return {
      authenticationStatus: 'invalid-authentication',
      identityConfirmed: false,
      excludedFailure: 'login-or-identity-preflight-failed',
    };
  }
}

async function authorize(
  page: Page,
  context: BrowserContext,
  plan: VisualPlan,
  secrets: SecretValues,
  authentication: AccessObservation,
): Promise<AuthorizationResult> {
  if (
    authentication.authenticationStatus !== 'authenticated' ||
    !authentication.identityConfirmed
  ) {
    return {
      observation: authentication,
      status: classifyAccess(authentication),
    };
  }

  const probe = plan.authorization.probe;
  let observation: AccessObservation = {
    ...authentication,
    authorizationStatus: 'unknown',
    signals: [...(authentication.signals || [])],
  };

  try {
    if (probe.kind === 'http-status') {
      const response = await context.request.get(
        sameOriginUrl(secrets.baseUrl, probe.path).toString(),
        { failOnStatusCode: false },
      );
      const status = response.status();
      if (status === 403) {
        observation = {
          ...observation,
          authorizationStatus: 'denied',
          signals: [
            ...(observation.signals || []),
            {
              kind: 'http-403',
              target: redactRoute(response.url()),
            },
          ],
        };
      } else if (status >= 200 && status < 300) {
        observation.authorizationStatus = 'granted';
      } else {
        observation = {
          ...observation,
          authorizationStatus: 'operational-failure',
          excludedFailure: `authorization-http-${status}`,
        };
      }
    } else if (probe.kind === 'capability-json') {
      const response = await context.request.get(
        sameOriginUrl(secrets.baseUrl, probe.path).toString(),
        { failOnStatusCode: false },
      );
      if (response.status() < 200 || response.status() >= 300) {
        observation = {
          ...observation,
          authorizationStatus: 'operational-failure',
          excludedFailure: `capability-http-${response.status()}`,
        };
      } else {
        const value = valueAtJsonPath(await response.json(), probe.jsonPath);
        if (value === false) {
          observation = {
            ...observation,
            authorizationStatus: 'denied',
            signals: [
              ...(observation.signals || []),
              {
                kind: 'capability-denied',
                capability: plan.authorization.requiredCapability,
              },
            ],
          };
        } else if (value === true) {
          observation.authorizationStatus = 'granted';
        } else {
          observation = {
            ...observation,
            authorizationStatus: 'operational-failure',
            excludedFailure: 'capability-value-not-boolean',
          };
        }
      }
    } else {
      await page.goto(sameOriginUrl(secrets.baseUrl, probe.path).toString(), {
        waitUntil: 'domcontentloaded',
      });
      const denied = await locatorFromSpec(page, probe.deniedLocator)
        .isVisible()
        .catch(() => false);
      if (denied && probe.profileRoleConfirmed && probe.sourceGuardReference) {
        observation = {
          ...observation,
          authorizationStatus: 'denied',
          signals: [
            ...(observation.signals || []),
            {
              kind: 'ui-access-denied',
              target: redactRoute(probe.path),
            },
            { kind: 'profile-role' },
            {
              kind: 'source-route-guard',
              reference: probe.sourceGuardReference,
            },
          ],
        };
      } else {
        await locatorFromSpec(page, probe.grantedLocator).waitFor({
          state: 'visible',
        });
        observation.authorizationStatus = 'granted';
      }
    }
  } catch {
    observation = {
      ...observation,
      authorizationStatus: 'operational-failure',
      excludedFailure: 'authorization-preflight-failed',
    };
  }

  return { observation, status: classifyAccess(observation) };
}

async function runControlledAction(
  page: Page,
  action: NonNullable<CapturePlan['actions']>[number],
  baseUrl: string,
) {
  switch (action.type) {
    case 'goto':
      await page.goto(sameOriginUrl(baseUrl, action.path).toString(), {
        waitUntil: 'domcontentloaded',
      });
      return;
    case 'click':
      await locatorFromSpec(page, action.locator).click();
      return;
    case 'fill':
      if (action.readOnlyFilter !== true) {
        throw new Error('fill is allowed only for a declared read-only filter');
      }
      await locatorFromSpec(page, action.locator).fill(action.value);
      return;
    case 'selectOption':
      if (action.readOnlyFilter !== true) {
        throw new Error('selectOption is allowed only for a declared read-only filter');
      }
      await locatorFromSpec(page, action.locator).selectOption(action.value);
      return;
    case 'waitFor':
    case 'assertVisible':
      await locatorFromSpec(page, action.locator).waitFor({ state: 'visible' });
      return;
  }
}

async function installOverlays(page: Page, capture: CapturePlan) {
  const overlays: Array<{
    kind: 'focus' | 'callout';
    box: { x: number; y: number; width: number; height: number };
    number?: number;
  }> = [];

  for (const locatorSpec of capture.focus || []) {
    const locator = locatorFromSpec(page, locatorSpec);
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error(`focus locator is not visible for ${capture.id}`);
    overlays.push({ kind: 'focus', box });
  }
  for (const callout of capture.callouts || []) {
    const locator = locatorFromSpec(page, callout.locator);
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error(`callout locator is not visible for ${capture.id}`);
    overlays.push({ kind: 'callout', box, number: callout.number });
  }

  await page.evaluate((items) => {
    document.querySelectorAll('[data-docs-capture-overlay]').forEach((node) => {
      node.remove();
    });
    for (const item of items) {
      const rectangle = document.createElement('div');
      rectangle.dataset.docsCaptureOverlay = 'true';
      Object.assign(rectangle.style, {
        position: 'fixed',
        pointerEvents: 'none',
        left: `${item.box.x - 4}px`,
        top: `${item.box.y - 4}px`,
        width: `${item.box.width + 8}px`,
        height: `${item.box.height + 8}px`,
        border: '3px solid #e11d48',
        borderRadius: '4px',
        boxSizing: 'border-box',
        zIndex: '2147483646',
      });
      document.body.append(rectangle);

      if (item.kind === 'callout') {
        const badge = document.createElement('div');
        badge.dataset.docsCaptureOverlay = 'true';
        badge.textContent = String(item.number);
        Object.assign(badge.style, {
          position: 'fixed',
          pointerEvents: 'none',
          left: `${Math.max(4, item.box.x - 18)}px`,
          top: `${Math.max(4, item.box.y - 18)}px`,
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#e11d48',
          color: '#ffffff',
          font: '700 16px/28px system-ui, sans-serif',
          textAlign: 'center',
          boxShadow: '0 0 0 3px #ffffff',
          zIndex: '2147483647',
        });
        document.body.append(badge);
      }
    }
  }, overlays);
}

async function removeOverlays(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-docs-capture-overlay]').forEach((node) => {
      node.remove();
    });
  });
}

const CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const value of buffer) {
    crc = CRC_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function withPngDpi(buffer: Buffer, dpi = 144): Buffer {
  if (buffer.length < 24 || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error('Playwright output is not a readable PNG');
  }
  const pixelsPerMeter = Math.round(dpi / 0.0254);
  const physical = Buffer.alloc(9);
  physical.writeUInt32BE(pixelsPerMeter, 0);
  physical.writeUInt32BE(pixelsPerMeter, 4);
  physical.writeUInt8(1, 8);
  const physicalChunk = pngChunk('pHYs', physical);

  const chunks: Buffer[] = [buffer.subarray(0, 8)];
  let offset = 8;
  let inserted = false;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > buffer.length) throw new Error('invalid PNG chunk length');
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type !== 'pHYs') chunks.push(buffer.subarray(offset, end));
    if (type === 'IHDR' && !inserted) {
      chunks.push(physicalChunk);
      inserted = true;
    }
    offset = end;
  }
  if (!inserted) throw new Error('PNG does not contain IHDR');
  return Buffer.concat(chunks);
}

function pngDimensions(buffer: Buffer) {
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function captureOne(
  page: Page,
  capture: CapturePlan,
  plan: VisualPlan,
  secrets: SecretValues,
  allowedOutputRoots: string[],
  blockedMutations: Array<{ method: string; routePattern: string }>,
) {
  await page.goto(sameOriginUrl(secrets.baseUrl, capture.routePath).toString(), {
    waitUntil: 'domcontentloaded',
  });
  for (const action of capture.actions || []) {
    await runControlledAction(page, action, secrets.baseUrl);
  }
  if (blockedMutations.length > 0) {
    throw new Error(
      `network mutation guard blocked ${blockedMutations.length} application request(s)`,
    );
  }

  const crop = capture.crop ? locatorFromSpec(page, capture.crop) : undefined;
  if (crop) await crop.scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
  await installOverlays(page, capture);
  const masks = (capture.masks || []).map((spec) => locatorFromSpec(page, spec));
  let rawPng: Buffer;
  try {
    const screenshotOptions = {
      animations: 'disabled' as const,
      caret: 'hide' as const,
      mask: masks,
      maskColor: '#374151',
      scale: 'device' as const,
      timeout: DOCS_CAPTURE_DEFAULTS.screenshotTimeout,
      type: 'png' as const,
    };
    rawPng = crop
      ? await crop.screenshot(screenshotOptions)
      : await page.screenshot({ ...screenshotOptions, fullPage: false });
  } finally {
    await removeOverlays(page);
  }
  if (blockedMutations.length > 0) {
    throw new Error(
      `network mutation guard blocked ${blockedMutations.length} application request(s)`,
    );
  }

  const png = withPngDpi(rawPng, 144);
  const output = normalizeOutputPath(capture.asset, allowedOutputRoots);
  const mirrorOutput = normalizeOutputPath(capture.mirrorAsset, allowedOutputRoots);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.mkdirSync(path.dirname(mirrorOutput), { recursive: true });
  fs.writeFileSync(output, png, { mode: 0o644 });
  fs.writeFileSync(mirrorOutput, png, { mode: 0o644 });
  const dimensions = pngDimensions(png);
  const digest = crypto.createHash('sha256').update(png).digest('hex');

  return {
    id: capture.id,
    groupId: capture.groupId,
    action: capture.action,
    requiredDoc: capture.requiredDoc,
    mirrorDoc: capture.mirrorDoc,
    asset: capture.asset,
    mirrorAsset: capture.mirrorAsset,
    sourceRepo: plan.sourceRepo,
    sourceCommit: plan.sourceCommit,
    sourcePullRequests: capture.sourcePullRequests,
    captureMode: plan.captureMode,
    routePattern: capture.routePattern,
    uiState: capture.uiState,
    locale: capture.locale || DOCS_CAPTURE_DEFAULTS.locale,
    viewport: capture.viewport || {
      ...DOCS_CAPTURE_DEFAULTS.viewport,
      deviceScaleFactor: DOCS_CAPTURE_DEFAULTS.deviceScaleFactor,
    },
    compositionClass: capture.compositionClass,
    compositionReference: capture.compositionReference,
    aspectRatioChangeReason: capture.aspectRatioChangeReason,
    outputPixels: dimensions,
    aspectRatio: Number((dimensions.width / dimensions.height).toFixed(4)),
    dpi: 144,
    callouts: (capture.callouts || []).map(({ number, target }) => ({
      number,
      target,
    })),
    privacyReview: {
      syntheticOrPublicData: capture.privacyPlan.syntheticOrPublicData,
      opaqueMasksApplied: (capture.masks || []).map((_mask, index) => `mask-${index + 1}`),
      secretsAbsent: capture.privacyPlan.secretsAbsent,
      // The worker must open the final PNG and deliberately set this to true.
      reviewed: false,
    },
    sha256: digest,
  };
}

function accessReportPath(requestedPath: string, capture: CapturePlan, captureCount: number) {
  const absolute = path.resolve(requestedPath);
  if (captureCount === 1) return absolute;
  const parsed = path.parse(absolute);
  return path.join(parsed.dir, `${parsed.name}-${capture.id}${parsed.ext || '.json'}`);
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const planPayload = JSON.parse(fs.readFileSync(options.plan!, 'utf8'));
  validateVisualPlan(planPayload, options.allowedOutputRoots);
  const plan = planPayload as VisualPlan;
  if (!FULL_SHA.test(plan.sourceCommit)) {
    throw new Error('sourceCommit must be a full SHA');
  }

  let secrets: SecretValues;
  try {
    secrets = readSecrets();
  } catch (error) {
    writePrivateJson(options.result!, {
      schemaVersion: VISUAL_RESULT_SCHEMA,
      docsImpactIssue: plan.docsImpactIssue,
      stage: plan.stage,
      status: 'missing-credentials',
      captures: [],
      blockedCaptures: [],
      error: error instanceof Error ? error.message.split(':')[0] : 'missing-credentials',
    });
    throw error;
  }

  const browser = await chromium.launch({ headless: !options.headed });
  try {
    const firstCapture = plan.captures[0];
    const viewport = firstCapture.viewport || {
      ...DOCS_CAPTURE_DEFAULTS.viewport,
      deviceScaleFactor: DOCS_CAPTURE_DEFAULTS.deviceScaleFactor,
    };
    const context = await browser.newContext({
      acceptDownloads: false,
      locale: firstCapture.locale || DOCS_CAPTURE_DEFAULTS.locale,
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      serviceWorkers: 'block',
    });
    try {
      context.setDefaultTimeout(DOCS_CAPTURE_DEFAULTS.actionTimeout);
      context.setDefaultNavigationTimeout(DOCS_CAPTURE_DEFAULTS.navigationTimeout);
      const allowlist =
        plan.authentication.mode === 'credentials' ? plan.authentication.mutationAllowlist : [];
      const blockedMutations = await installMutationGuard(context, allowlist);
      const page = await context.newPage();
      const authentication = await authenticate(page, context, plan, secrets);
      const authorization = await authorize(page, context, plan, secrets, authentication);

      if (authorization.status === 'verified-access-denied') {
        const signals = authorization.observation.signals || [];
        const blockedCaptures = plan.captures.map((capture) => {
          const reportPath = accessReportPath(options.accessReport!, capture, plan.captures.length);
          const accessReport = {
            schemaVersion: ACCESS_REPORT_SCHEMA,
            docsImpactIssue: plan.docsImpactIssue,
            stage: plan.stage,
            groupId: capture.groupId,
            captureId: capture.id,
            accountAlias: secrets.accountAlias,
            sourceCommit: plan.sourceCommit,
            captureMode: plan.captureMode,
            routePattern: capture.routePattern,
            authentication: {
              status: 'authenticated',
              identityConfirmed: true,
            },
            authorization: {
              status: 'denied',
              requiredCapability: plan.authorization.requiredCapability,
              signals,
            },
            draftAllowed: true,
          };
          writePrivateJson(reportPath, accessReport);
          const reportBuffer = fs.readFileSync(reportPath);
          const reportSha256 = crypto.createHash('sha256').update(reportBuffer).digest('hex');
          return {
            id: capture.id,
            groupId: capture.groupId,
            blocker: 'verified-access-denied',
            accountAlias: secrets.accountAlias,
            sourceCommit: plan.sourceCommit,
            captureMode: plan.captureMode,
            routePattern: capture.routePattern,
            authorizationSignals: signals.map((signal) => signal.kind),
            accessValidationReportPath: reportPath,
            accessValidationReportSha256: reportSha256,
            draftAllowed: true,
          };
        });
        writePrivateJson(options.result!, {
          schemaVersion: VISUAL_RESULT_SCHEMA,
          docsImpactIssue: plan.docsImpactIssue,
          stage: plan.stage,
          status: 'verified-access-denied',
          captures: [],
          blockedCaptures,
        });
        return;
      }

      if (authorization.status !== 'granted') {
        writePrivateJson(options.result!, {
          schemaVersion: VISUAL_RESULT_SCHEMA,
          docsImpactIssue: plan.docsImpactIssue,
          stage: plan.stage,
          status: authorization.status,
          captures: [],
          blockedCaptures: [],
          error: authorization.observation.excludedFailure || authorization.status,
        });
        throw new Error(
          `capture preflight failed: ${authorization.observation.excludedFailure || authorization.status}`,
        );
      }

      const captures = [];
      for (const capture of plan.captures) {
        captures.push(
          await captureOne(
            page,
            capture,
            plan,
            secrets,
            options.allowedOutputRoots,
            blockedMutations,
          ),
        );
      }
      writePrivateJson(options.result!, {
        schemaVersion: VISUAL_RESULT_SCHEMA,
        docsImpactIssue: plan.docsImpactIssue,
        stage: plan.stage,
        status: 'captured-needs-review',
        captures,
        blockedCaptures: [],
        mutationGuard: {
          blockedRequests: blockedMutations,
        },
      });
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`docs screenshot capture failed: ${message}\n`);
  process.exitCode = 1;
});
