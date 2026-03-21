/**
 * @jest-environment jsdom
 */

import { genContactFromData, genContactJsonOrdered } from '@/services/contacts/util';

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  __esModule: true,
  createContact: jest.fn((data: any) => data),
}));

describe('Contacts Util Cleanup Regression', () => {
  it('removes stale empty multilingual arrays when regenerating json_ordered from legacy contact data', () => {
    const legacyContactData = {
      contactInformation: {
        dataSetInformation: {
          'common:UUID': '7abe0936-a05c-46bb-8acc-7a58c00fbeab',
          'common:shortName': {
            '#text': '测试-联系人',
            '@xml:lang': 'en',
          },
          'common:name': [],
          'common:synonyms': [],
          'common:generalComment': [],
          classificationInformation: {
            'common:classification': {
              'common:class': {
                '#text': 'Group of organisations, project',
                '@level': '0',
                '@classId': '1',
              },
            },
          },
        },
      },
      administrativeInformation: {
        dataEntryBy: {},
        publicationAndOwnership: {
          'common:dataSetVersion': '01.01.000',
        },
      },
    };

    const formData = genContactFromData(legacyContactData);
    const regenerated = genContactJsonOrdered('7abe0936-a05c-46bb-8acc-7a58c00fbeab', formData);
    const dataSetInformation = regenerated.contactDataSet.contactInformation.dataSetInformation;

    expect(dataSetInformation).toMatchObject({
      'common:UUID': '7abe0936-a05c-46bb-8acc-7a58c00fbeab',
      'common:shortName': {
        '#text': '测试-联系人',
        '@xml:lang': 'en',
      },
      classificationInformation: {
        'common:classification': {
          'common:class': {
            '#text': 'Group of organisations, project',
            '@level': '0',
            '@classId': '1',
          },
        },
      },
    });
    expect(Object.prototype.hasOwnProperty.call(dataSetInformation, 'common:name')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(dataSetInformation, 'common:synonyms')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(dataSetInformation, 'common:generalComment')).toBe(
      false,
    );
  });
});
