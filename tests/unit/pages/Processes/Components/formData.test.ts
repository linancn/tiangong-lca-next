import { mergeProcessFormValues } from '@/pages/Processes/Components/formData';

describe('Process form data overlay', () => {
  it('preserves absent scientific siblings without mutating either input', () => {
    const base = {
      modellingAndValidation: {
        dataSourcesTreatmentAndRepresentativeness: {
          samplingProcedure: ['old'],
          useAdviceForDataSet: ['advice'],
        },
        validation: { review: ['review'] },
        complianceDeclarations: { compliance: ['compliance'] },
      },
    };
    const values = {
      modellingAndValidation: {
        dataSourcesTreatmentAndRepresentativeness: { samplingProcedure: ['new'] },
      },
    };
    const merged = mergeProcessFormValues(base, values);
    expect(merged).toEqual({
      modellingAndValidation: {
        ...base.modellingAndValidation,
        dataSourcesTreatmentAndRepresentativeness: {
          samplingProcedure: ['new'],
          useAdviceForDataSet: ['advice'],
        },
      },
    });
    expect(
      base.modellingAndValidation.dataSourcesTreatmentAndRepresentativeness.samplingProcedure,
    ).toEqual(['old']);
    expect(values).toEqual({
      modellingAndValidation: {
        dataSourcesTreatmentAndRepresentativeness: { samplingProcedure: ['new'] },
      },
    });
  });

  it.each([undefined, null, '', [], {}])('respects an explicit clear %p', (clear) => {
    const result = mergeProcessFormValues(
      { field: { '@refObjectId': 'reference' }, sibling: 'retained' },
      { field: clear },
    );
    expect(result).toEqual({ field: clear, sibling: 'retained' });
    expect(result).toHaveProperty('field');
  });

  it('retains empty container snapshots without clearing unmounted scientific fields', () => {
    const base = {
      modellingAndValidation: {
        validation: { review: ['review'] },
        dataSourcesTreatmentAndRepresentativeness: { useAdviceForDataSet: ['advice'] },
      },
      processInformation: {
        technology: { technologyDescriptionAndIncludedProcesses: ['technology'] },
      },
    };
    expect(
      mergeProcessFormValues(base, {
        modellingAndValidation: {},
        processInformation: { technology: {} },
      }),
    ).toEqual(base);
  });

  it('applies actual Source/Contact selector object replacement without reviving old attributes', () => {
    const base = {
      modellingAndValidation: {
        LCIMethodAndAllocation: {
          referenceToLCAMethodDetails: {
            '@refObjectId': 'old-source',
            '@uri': '../sources/old.xml',
          },
          modellingConstants: ['constants'],
        },
      },
      administrativeInformation: {
        dataGenerator: {
          'common:referenceToPersonOrEntityGeneratingTheDataSet': {
            '@refObjectId': 'old-contact',
            '@uri': '../contacts/old.xml',
          },
        },
      },
    };
    const values = {
      modellingAndValidation: { LCIMethodAndAllocation: { referenceToLCAMethodDetails: {} } },
      administrativeInformation: {
        dataGenerator: {
          'common:referenceToPersonOrEntityGeneratingTheDataSet': { '@refObjectId': 'new-contact' },
        },
      },
    };
    expect(mergeProcessFormValues(base, values)).toEqual({
      modellingAndValidation: {
        LCIMethodAndAllocation: {
          referenceToLCAMethodDetails: {},
          modellingConstants: ['constants'],
        },
      },
      administrativeInformation: {
        dataGenerator: {
          'common:referenceToPersonOrEntityGeneratingTheDataSet': { '@refObjectId': 'new-contact' },
        },
      },
    });
  });

  it('merges attribute-bearing schema containers by path rather than guessing from values', () => {
    expect(
      mergeProcessFormValues(
        {
          processInformation: {
            quantitativeReference: { '@type': 'Reference flow(s)', functionalUnitOrOther: ['FU'] },
            geography: {
              locationOfOperationSupplyOrProduction: {
                '@location': 'CN',
                descriptionOfRestrictions: ['Regional limit'],
              },
            },
          },
        },
        {
          processInformation: {
            quantitativeReference: {},
            geography: { locationOfOperationSupplyOrProduction: { '@location': 'DE' } },
          },
        },
      ),
    ).toEqual({
      processInformation: {
        quantitativeReference: { '@type': 'Reference flow(s)', functionalUnitOrOther: ['FU'] },
        geography: {
          locationOfOperationSupplyOrProduction: {
            '@location': 'DE',
            descriptionOfRestrictions: ['Regional limit'],
          },
        },
      },
    });
  });

  it('replaces repeated fields completely and preserves scalar objects as values', () => {
    const date = new Date('2026-01-01');
    expect(
      mergeProcessFormValues(
        { reviews: [{ name: 'one' }, { name: 'two' }], date: null },
        { reviews: [{ name: 'one' }], date },
      ),
    ).toEqual({ reviews: [{ name: 'one' }], date });
  });

  it('keeps a base snapshot when no mounted fields are returned', () => {
    expect(mergeProcessFormValues({ preserved: 'value' }, undefined)).toEqual({
      preserved: 'value',
    });
    expect(mergeProcessFormValues(undefined, { added: 'value' })).toEqual({ added: 'value' });
  });
});
