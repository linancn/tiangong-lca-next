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
});
