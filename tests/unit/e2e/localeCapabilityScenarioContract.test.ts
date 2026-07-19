import {
  buildLocaleCapabilityRow,
  LOCALE_CAPABILITY_MATRIX,
  type LocaleCapabilitySnapshot,
} from '@/services/general/localeCapabilities';
import { LOCALE_REGISTRY, type LocaleDefinition } from '@/services/general/localeRegistry';
import { resolveLocaleContentE2EScenario } from '../../e2e/i18n/locale-capability-scenarios';

describe('locale capability semantic E2E scenarios', () => {
  it('keeps every currently active locale on the complete native branch', () => {
    for (const capability of LOCALE_CAPABILITY_MATRIX) {
      expect(resolveLocaleContentE2EScenario(capability)).toEqual(
        expect.objectContaining({
          appLocale: capability.appLocale,
          contentLanguage: capability.contentLanguage,
          status: 'native',
        }),
      );
    }
  });

  it('routes a future declared fallback to the fallback branch, never native', () => {
    const capability = buildLocaleCapabilityRow({
      ...LOCALE_REGISTRY[1],
      canonicalLocale: 'es-ES',
      languageCode: 'es',
      contentCapability: { status: 'declared-fallback', contentLanguage: 'en' },
    } satisfies LocaleDefinition);

    expect(resolveLocaleContentE2EScenario(capability)).toEqual(
      expect.objectContaining({
        appLocale: 'es-ES',
        contentLanguage: 'en',
        status: 'declared-fallback',
      }),
    );
  });

  it('routes a future unsupported locale to the unsupported branch, never native', () => {
    const capability = buildLocaleCapabilityRow({
      ...LOCALE_REGISTRY[1],
      canonicalLocale: 'es-ES',
      languageCode: 'es',
      contentCapability: { status: 'unsupported' },
    } satisfies LocaleDefinition);

    expect(resolveLocaleContentE2EScenario(capability)).toEqual({
      appLocale: 'es-ES',
      status: 'unsupported',
    });
  });

  it('fails closed instead of reclassifying inconsistent fallback or unsupported rows', () => {
    const native = LOCALE_CAPABILITY_MATRIX[0];
    expect(() =>
      resolveLocaleContentE2EScenario({
        ...native,
        contentReading: 'declared-fallback',
        contentAuthoring: 'native',
      } as LocaleCapabilitySnapshot),
    ).toThrow(/must not claim native content authoring/u);
    expect(() =>
      resolveLocaleContentE2EScenario({
        ...native,
        contentReading: 'unsupported',
      } as LocaleCapabilitySnapshot),
    ).toThrow(/inconsistent content capabilities/u);
  });
});
