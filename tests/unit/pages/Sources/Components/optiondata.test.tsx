import {
  getPublicationTypeLabel,
  publicationTypeOptions,
} from '@/pages/Sources/Components/optiondata';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => ({
    props: { defaultMessage, id },
  }),
}));

describe('Sources optiondata', () => {
  it('exposes the expected publication type option values', () => {
    expect(publicationTypeOptions.map((option) => option.value)).toEqual([
      'Undefined',
      'Article in periodical',
      'Chapter in anthology',
      'Monograph',
      'Direct measurement',
      'Oral communication',
      'Personal written communication',
      'Questionnaire',
      'Software or database',
      'Other unpublished and grey literature',
    ]);
  });

  it('returns the matching label or a fallback dash', () => {
    expect((getPublicationTypeLabel('Monograph') as any).props.defaultMessage).toBe('Monograph');
    expect(getPublicationTypeLabel('missing')).toBe('-');
  });
});
