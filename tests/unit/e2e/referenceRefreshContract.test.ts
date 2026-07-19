import fs from 'node:fs';
import path from 'node:path';

import { LOCALE_CAPABILITY_MATRIX } from '@/services/general/localeCapabilities';
import {
  getReferenceRuntimeAssetCacheIdentity,
  REFERENCE_RESOURCE_MANIFEST,
} from '@/services/referenceResources/manifest';
import { APP_LOCALES, findRouteAssertion } from '../../e2e/i18n/contracts';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const SPEC_PATH = 'tests/e2e/i18n/reference-refresh.spec.ts';

describe('reference refresh semantic E2E contract', () => {
  it('requires race and previous-revision cache closure on the process deep link', () => {
    const assertion = findRouteAssertion('/mydata/processes');
    expect(assertion.requiredScenarios).toEqual(
      expect.arrayContaining(['reference-refresh', 'reference-refresh-cache']),
    );
    expect(assertion.focusedTests).toContain('tests/unit/e2e/referenceRefreshContract.test.ts');
  });

  it('partitions every active UI locale through its explicit content-reading capability', () => {
    expect(LOCALE_CAPABILITY_MATRIX.map(({ appLocale }) => appLocale)).toEqual(APP_LOCALES);
    const unsupported = LOCALE_CAPABILITY_MATRIX.filter(
      ({ contentReading }) => contentReading === 'unsupported',
    );
    const readable = LOCALE_CAPABILITY_MATRIX.filter(
      ({ contentReading }) => contentReading !== 'unsupported',
    );
    expect(
      unsupported.every(
        (capability) =>
          capability.contentLanguage === undefined && capability.referenceResources.length === 0,
      ),
    ).toBe(true);
    expect(readable.every(({ contentLanguage }) => Boolean(contentLanguage))).toBe(true);
    expect(readable.length + unsupported.length).toBe(APP_LOCALES.length);
  });

  it('binds every managed cache asset to an exact revision and full JSON/gzip digests', () => {
    for (const resource of REFERENCE_RESOURCE_MANIFEST) {
      for (const asset of Object.values(resource.runtimeAssets)) {
        expect(getReferenceRuntimeAssetCacheIdentity(asset.fileName)).toEqual(
          expect.objectContaining({
            cacheRevision: resource.cacheRevision,
            gzipSha256: asset.gzipDigest.value,
            jsonSha256: asset.jsonDigest.value,
            scope: resource.scope,
          }),
        );
      }
    }
  });

  it('drives both real resource scopes without screenshots, traces, video, or writes', () => {
    const source = fs.readFileSync(path.join(REPOSITORY_ROOT, SPEC_PATH), 'utf8');
    expect(source).toContain("id: 'classification'");
    expect(source).toContain("id: 'location'");
    expect(source).toContain("'reference-refresh-cache'");
    expect(source).toContain('injectPreviousRevisionEntries');
    expect(source).toContain("mode: 'edit' | 'view'");
    expect(source).toContain("page.reload({ waitUntil: 'domcontentloaded' })");
    expect(source).not.toMatch(/page\.screenshot|ariaSnapshot|context\.tracing|recordVideo/gu);
    expect(source).not.toMatch(/updateProcess|insert\(|delete\(|upsert\(/gu);
  });
});
