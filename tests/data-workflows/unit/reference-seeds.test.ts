import {
  clearActiveReferenceSeeds,
  patchJsonOrderedWithActiveReferenceSeeds,
  setActiveReferenceSeeds,
  type ReferenceSeedMap,
} from '../workflows/reference-seeds';

function buildReferenceSeedMap(): ReferenceSeedMap {
  return {
    contact: {
      id: 'seed-contact-id',
      name: 'test-contact-reference',
      reference: {
        '@refObjectId': 'seed-contact-id',
        '@type': 'contact data set',
        '@uri': '../contacts/seed-contact-id.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'test-contact-reference',
          '@xml:lang': 'en',
        },
      },
      table: 'contacts',
      version: '01.01.000',
    },
    source: {
      id: 'seed-source-id',
      name: 'test-source-reference',
      reference: {
        '@refObjectId': 'seed-source-id',
        '@type': 'source data set',
        '@uri': '../sources/seed-source-id.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'test-source-reference',
          '@xml:lang': 'en',
        },
      },
      table: 'sources',
      version: '01.01.000',
    },
  };
}

describe('reference-seeds', () => {
  afterEach(() => {
    clearActiveReferenceSeeds();
  });

  it('replaces current runtime self references with the matching test reference seed', () => {
    setActiveReferenceSeeds(buildReferenceSeedMap());
    const jsonOrdered = {
      contactDataSet: {
        administrativeInformation: {
          dataEntryBy: {
            'common:referenceToDataSetFormat': {
              '@refObjectId': 'runtime-source-id',
              '@type': 'source data set',
              '@uri': '../sources/runtime-source-id.xml',
              '@version': '01.01.000',
              'common:shortDescription': {
                '#text': 'Runtime Source',
                '@xml:lang': 'en',
              },
            },
          },
          publicationAndOwnership: {
            'common:referenceToOwnershipOfDataSet': {
              '@refObjectId': 'runtime-contact-id',
              '@type': 'contact data set',
              '@uri': '../contacts/runtime-contact-id.xml',
              '@version': '01.01.000',
              'common:shortDescription': {
                '#text': 'Runtime Contact',
                '@xml:lang': 'en',
              },
            },
          },
        },
      },
    };

    patchJsonOrderedWithActiveReferenceSeeds(jsonOrdered, {
      currentDataset: {
        id: 'runtime-contact-id',
        table: 'contacts',
      },
    });

    expect(
      jsonOrdered.contactDataSet.administrativeInformation.publicationAndOwnership[
        'common:referenceToOwnershipOfDataSet'
      ]['@refObjectId'],
    ).toBe('seed-contact-id');
    expect(
      jsonOrdered.contactDataSet.administrativeInformation.dataEntryBy[
        'common:referenceToDataSetFormat'
      ]['@refObjectId'],
    ).toBe('seed-source-id');
  });
});
