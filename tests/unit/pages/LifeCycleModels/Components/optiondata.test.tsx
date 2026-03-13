import {
  copyrightOptions,
  licenseTypeOptions,
} from '@/pages/LifeCycleModels/Components/optiondata';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => ({
    props: { defaultMessage, id },
  }),
}));

describe('LifeCycleModels optiondata', () => {
  it('exposes the expected copyright choices', () => {
    expect(copyrightOptions.map((option) => option.value)).toEqual(['Yes', 'No']);
    expect((copyrightOptions[0].label as any).props.defaultMessage).toBe('Yes');
    expect((copyrightOptions[1].label as any).props.id).toBe(
      'pages.lifeCycleModel.view.administrativeInformation.copyright.no',
    );
  });

  it('keeps the license type choices and message ids aligned', () => {
    expect(licenseTypeOptions.map((option) => option.value)).toEqual([
      'Free of charge for all users and uses',
      'Free of charge for some user types or use types',
      'Free of charge for members only',
      'License fee',
      'Other',
    ]);
    expect((licenseTypeOptions[0].label as any).props.id).toBe(
      'pages.lifeCycleModel.administrativeInformation.licenseType.freeOfChargeForAllUsersAndUses',
    );
    expect((licenseTypeOptions[4].label as any).props.defaultMessage).toBe('Other');
  });
});
