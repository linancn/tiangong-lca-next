import {
  complianceOptions,
  dataDerivationTypeStatusOptions,
  myFlowTypeOptions,
  uncertaintyDistributionTypeOptions,
} from '@/pages/Flows/Components/optiondata';

describe('optiondata (src/pages/Flows/Components/optiondata.tsx)', () => {
  it('exposes flow property option sets', () => {
    expect(dataDerivationTypeStatusOptions.map((opt) => opt.value)).toEqual([
      'Measured',
      'Calculated',
      'Estimated',
      'Unknown derivation',
    ]);
    expect(uncertaintyDistributionTypeOptions.map((opt) => opt.value)).toContain('normal');
  });

  it('contains flow type and compliance choices', () => {
    expect(myFlowTypeOptions.map((opt) => opt.value)).toEqual(['Product flow', 'Waste flow']);
    expect(complianceOptions.map((opt) => opt.value)).toEqual([
      'Fully compliant',
      'Not compliant',
      'Not defined',
    ]);
  });
});
