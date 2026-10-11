import { resolveBrandProfile } from '../../../config/brandProfile';
import { resolveBrandMessage } from '@/locales/brandMessages';
import dePages from '@/locales/de-DE/pages';
import deGeneral from '@/locales/de-DE/pages_general';
import deHome from '@/locales/de-DE/pages_home';
import deReview from '@/locales/de-DE/pages_review';
import enPages from '@/locales/en-US/pages';
import enGeneral from '@/locales/en-US/pages_general';
import enHome from '@/locales/en-US/pages_home';
import enReview from '@/locales/en-US/pages_review';
import frPages from '@/locales/fr-FR/pages';
import frGeneral from '@/locales/fr-FR/pages_general';
import frHome from '@/locales/fr-FR/pages_home';
import frReview from '@/locales/fr-FR/pages_review';
import zhPages from '@/locales/zh-CN/pages';
import zhGeneral from '@/locales/zh-CN/pages_general';
import zhHome from '@/locales/zh-CN/pages_home';
import zhReview from '@/locales/zh-CN/pages_review';
import type { SupportedAppLocale } from '@/services/general/localeRegistry';

const catalogs: Record<SupportedAppLocale, Record<string, string>> = {
  'zh-CN': { ...zhPages, ...zhGeneral, ...zhHome, ...zhReview },
  'en-US': { ...enPages, ...enGeneral, ...enHome, ...enReview },
  'de-DE': { ...dePages, ...deGeneral, ...deHome, ...deReview },
  'fr-FR': { ...frPages, ...frGeneral, ...frHome, ...frReview },
};
const tiangong = resolveBrandProfile('tiangong');
const atlas = resolveBrandProfile('atlas');

const identityIds = [
  'pages.account.profile.fallbackName',
  'pages.oauth.consent.return',
  'pages.oauth.consent.description',
  'pages.oauth.consent.scope.openid',
  'pages.validationIssues.report.generated',
];

describe.each(Object.entries(catalogs))('localized brand presentation in %s', (locale, catalog) => {
  it('preserves every accepted TianGong message', () => {
    Object.entries(catalog).forEach(([id, text]) => {
      expect(resolveBrandMessage(locale, id, text, tiangong)).toBe(text);
    });
  });

  it('uses the independent ATLAS identity and slogan', () => {
    expect(resolveBrandMessage(locale, 'pages.name', catalog['pages.name'], atlas)).toBe(
      atlas.title[locale as SupportedAppLocale],
    );
    expect(
      resolveBrandMessage(locale, 'pages.login.title', catalog['pages.login.title'], atlas),
    ).toBe(atlas.title[locale as SupportedAppLocale]);
    expect(resolveBrandMessage(locale, 'pages.welcome', catalog['pages.welcome'], atlas)).toBe(
      atlas.slogan[locale as SupportedAppLocale],
    );
    identityIds.forEach((id) => {
      expect(resolveBrandMessage(locale, id, catalog[id], atlas)).toContain('ATLAS');
      expect(resolveBrandMessage(locale, id, catalog[id], atlas)).not.toMatch(/TianGong|天工/);
    });
    const card = resolveBrandMessage(
      locale,
      'pages.card.description.3',
      catalog['pages.card.description.3'],
      atlas,
    );
    expect(card).toContain('ATLAS');
    expect(card).not.toMatch(/Tian[Gg]ong|天工/);
  });

  it('preserves TIDAS attribution in the introduction and factual source labels', () => {
    const intro = resolveBrandMessage(
      locale,
      'pages.welcome.overview.intro',
      catalog['pages.welcome.overview.intro'],
      atlas,
    );
    expect(intro).toContain('ATLAS');
    expect(intro).not.toMatch(/TianGong|天工/);
    [
      'pages.tab.title.tgdata',
      'pages.welcome.overview.actions.dataEcosystem',
      'pages.home.nationalCarbon.organization.title',
      'pages.home.nationalCarbon.overview.insight',
    ].forEach((id) => {
      expect(resolveBrandMessage(locale, id, catalog[id], atlas)).toBe(catalog[id]);
    });
  });

  it('preserves localized marketing copy when ATLAS has no message override', () => {
    const id = 'pages.welcome.overview.sections.architectureExtensibility.description';
    const text = catalog[id];

    expect(text).toEqual(expect.any(String));
    expect(text).not.toBe('');
    expect(resolveBrandMessage(locale, id, text, atlas)).toBe(text);
  });
});

it.each(['en-US', 'de-DE', 'fr-FR'] as const)(
  'preserves the full TIDAS name in the %s introduction',
  (locale) => {
    const id = 'pages.welcome.overview.intro';
    expect(
      resolveBrandMessage(locale, id, catalogs[locale][id], { ...atlas, messages: {} }),
    ).toContain('TianGong LCA Data System (TIDAS)');
  },
);

it('changes the German registered-user application name only', () => {
  const id = 'pages.review.members.addError.notRegistered';
  expect(resolveBrandMessage('de-DE', id, deReview[id], atlas)).toBe(
    'Für diese E-Mail-Adresse ist kein ATLAS-Benutzerkonto registriert.',
  );
  expect(resolveBrandMessage('en-US', id, enReview[id], atlas)).toBe(enReview[id]);
});

it('allows bounded plain-text marketing overrides and rejects unrelated overrides', () => {
  const profile = {
    ...atlas,
    messages: {
      'en-US': {
        'pages.name': 'Conflicting title override',
        'pages.login.title': 'Conflicting login title override',
        'pages.welcome': 'Conflicting slogan override',
        'pages.welcome.overview.intro': 'A configured ATLAS introduction.',
        'pages.welcome.overview.sections.architectureExtensibility.description':
          'Configured capabilities.',
        'pages.tab.title.tgdata': 'Misleading source replacement',
        'unrelated.legal': 'Misleading operator replacement',
      },
    },
  };
  expect(resolveBrandMessage('en-US', 'pages.name', enHome['pages.name'], profile)).toBe(
    atlas.title['en-US'],
  );
  expect(
    resolveBrandMessage('en-US', 'pages.login.title', enPages['pages.login.title'], profile),
  ).toBe(atlas.title['en-US']);
  expect(resolveBrandMessage('en-US', 'pages.welcome', enHome['pages.welcome'], profile)).toBe(
    atlas.slogan['en-US'],
  );
  expect(
    resolveBrandMessage(
      'en-US',
      'pages.welcome.overview.intro',
      enHome['pages.welcome.overview.intro'],
      profile,
    ),
  ).toBe('A configured ATLAS introduction.');
  expect(
    resolveBrandMessage(
      'en-US',
      'pages.welcome.overview.sections.architectureExtensibility.description',
      'Original capabilities.',
      profile,
    ),
  ).toBe('Configured capabilities.');
  expect(
    resolveBrandMessage(
      'en-US',
      'pages.tab.title.tgdata',
      enGeneral['pages.tab.title.tgdata'],
      profile,
    ),
  ).toBe(enGeneral['pages.tab.title.tgdata']);
  expect(resolveBrandMessage('en-US', 'unrelated.legal', 'TianGong operator', profile)).toBe(
    'TianGong operator',
  );
  expect(resolveBrandMessage(undefined, 'pages.name', enHome['pages.name'], atlas)).toBe(
    atlas.title['en-US'],
  );
  expect(resolveBrandMessage('unknown', 'pages.name', enHome['pages.name'], atlas)).toBe(
    atlas.title['en-US'],
  );
});
