import {
  getTeamMessage,
  getTeamMessageCatalog,
  getValidatorMessage,
  getValidatorMessageCatalog,
} from '@/locales/runtimeCatalogRegistry';
import { LOCALE_REGISTRY } from '@/services/general/localeRegistry';

describe('runtimeCatalogRegistry', () => {
  it.each(LOCALE_REGISTRY)(
    'provides runtime service catalogs for $canonicalLocale',
    ({ canonicalLocale }) => {
      const teamMessages = getTeamMessageCatalog(canonicalLocale);
      const validatorMessages = getValidatorMessageCatalog(canonicalLocale);

      expect(teamMessages['teams.modal.noTeam.title']?.trim()).not.toBe('');
      expect(validatorMessages['validator.langValidation.missingEnglish']?.trim()).not.toBe('');
      expect(validatorMessages['validator.langValidation.missingEnglishMore']?.trim()).not.toBe('');
      expect(validatorMessages['validator.langValidation.root']?.trim()).not.toBe('');
      expect(getTeamMessage(canonicalLocale, 'teams.modal.noTeam.title')?.trim()).not.toBe('');
      expect(
        getValidatorMessage(canonicalLocale, 'validator.langValidation.root')?.trim(),
      ).not.toBe('');
    },
  );

  it('uses the reviewed native snapshot when a live locale catalog is damaged', () => {
    const germanValidatorCatalog = getValidatorMessageCatalog('de-DE') as Record<
      string,
      string | undefined
    >;
    const messageId = 'validator.langValidation.root';
    const reviewedMessage = germanValidatorCatalog[messageId];

    germanValidatorCatalog[messageId] = undefined;
    try {
      expect(getValidatorMessage('de-DE', messageId)).toBe(reviewedMessage);
    } finally {
      germanValidatorCatalog[messageId] = reviewedMessage;
    }
  });

  it('falls back to the canonical catalog only for an invalid runtime locale', () => {
    const invalidLocale = 'es-ES' as 'en-US';

    expect(getTeamMessageCatalog(invalidLocale)).toBe(getTeamMessageCatalog('en-US'));
    expect(getValidatorMessageCatalog(invalidLocale)).toBe(getValidatorMessageCatalog('en-US'));
    expect(getTeamMessage(invalidLocale, 'teams.modal.noTeam.title')).toBe(
      getTeamMessage('en-US', 'teams.modal.noTeam.title'),
    );
  });

  it('fails closed when a required message has no reviewed native value', () => {
    expect(() => getTeamMessage('en-US', 'teams.missing.fixture')).toThrow(
      'Missing required team runtime message: teams.missing.fixture',
    );
    expect(() => getValidatorMessage('fr-FR', 'validator.missing.fixture')).toThrow(
      'Missing required validator runtime message: validator.missing.fixture',
    );
  });
});
