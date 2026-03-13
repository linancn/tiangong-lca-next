import {
  copyrightOptions,
  dataSourceTypeOptions,
  functionTypeOptions,
  uncertaintyDistributionTypeOptions,
  workflowAndPublicationStatusOptions,
} from '@/pages/Processes/Components/optiondata';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => ({
    props: { defaultMessage, id },
  }),
}));

describe('Processes optiondata', () => {
  it('exposes core process option groups with expected values', () => {
    expect(dataSourceTypeOptions.map((option) => option.value)).toEqual([
      'Primary',
      '> 90% primary',
      'Mixed primary / secondary',
      'Secondary',
    ]);
    expect(functionTypeOptions.map((option) => option.value)).toEqual([
      'General reminder flow',
      'Allocation reminder flow',
      'System expansion reminder flow',
    ]);
    expect(uncertaintyDistributionTypeOptions.map((option) => option.value)).toEqual([
      'undefined',
      'log-normal',
      'normal',
      'triangular',
      'uniform',
    ]);
  });

  it('keeps workflow and copyright labels wired to the intended messages', () => {
    expect(workflowAndPublicationStatusOptions).toHaveLength(8);
    expect((workflowAndPublicationStatusOptions[0].label as any).props.defaultMessage).toBe(
      'Working draft',
    );
    expect((workflowAndPublicationStatusOptions[7].label as any).props.id).toBe(
      'pages.process.view.administrativeInformation.workflowAndPublicationStatus.dataSetFinalisedEntirelyPublished',
    );
    expect(copyrightOptions.map((option) => option.value)).toEqual(['true', 'false']);
    expect((copyrightOptions[0].label as any).props.defaultMessage).toBe('Yes');
    expect((copyrightOptions[1].label as any).props.defaultMessage).toBe('No');
  });
});
