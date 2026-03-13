import type {
  FormSource,
  SourceDetailResponse,
  SourceReference,
  SourceTable,
} from '@/services/sources/data';

describe('sources data shapes', () => {
  it('supports source list rows and source references', () => {
    const row: SourceTable = {
      key: 'source-1',
      id: 'source-1',
      lang: 'en',
      shortName: 'Annual report',
      version: '01.00.000',
      classification: 'Reports',
      sourceCitation: 'Environmental report 2025',
      publicationType: 'report',
      modifiedAt: new Date('2026-03-13T00:00:00Z'),
      teamId: 'team-1',
    };
    const ref: SourceReference = {
      '@refObjectId': 'source-1',
      '@type': 'source data set',
      '@uri': '../sources/source-1.xml',
      '@version': '01.00.000',
      'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Annual report' }],
    };

    expect(row.publicationType).toBe('report');
    expect(ref['@refObjectId']).toBe('source-1');
  });

  it('supports detail responses and form payloads used by source drawers', () => {
    const formState: FormSource = {
      sourceInformation: {
        dataSetInformation: {
          'common:UUID': 'source-2',
        },
      },
      administrativeInformation: {
        publicationAndOwnership: {
          'common:dataSetVersion': '02.00.000',
        },
      },
    } as FormSource;

    const response: SourceDetailResponse = {
      success: true,
      data: {
        id: 'source-2',
        version: '02.00.000',
        json: { sourceDataSet: formState as any },
        modifiedAt: '2026-03-13T00:00:00Z',
        stateCode: 20,
        ruleVerification: true,
        userId: 'user-1',
      },
    };

    expect(response.data?.json?.sourceDataSet).toBe(formState);
    expect(response.data?.ruleVerification).toBe(true);
  });
});
