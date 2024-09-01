import {
  classificationToJson,
  classificationToList,
  formatDateTime,
  getLangJson,
  getLangList,
  removeEmptyObjects,
} from '../general/util';

export function genContactJsonOrdered(id: string, data: any, oldData: any) {
  return removeEmptyObjects({
    contactDataSet: {
      '@xmlns': oldData.contactDataSet?.['@xmlns'] ?? {},
      '@xmlns:common': oldData.contactDataSet?.['@xmlns:common'] ?? {},
      '@xmlns:xsi': oldData.contactDataSet?.['@xmlns:xsi'] ?? {},
      '@version': oldData.contactDataSet['@version'] ?? {},
      '@xsi:schemaLocation': oldData.contactDataSet['@xsi:schemaLocation'] ?? {},
      contactInformation: {
        dataSetInformation: {
          'common:UUID': id,
          'common:shortName': getLangJson(
            data?.contactInformation?.dataSetInformation?.['common:shortName'],
          ),
          'common:name': getLangJson(data?.contactInformation?.dataSetInformation?.['common:name']),
          classificationInformation: {
            'common:classification': {
              'common:class': classificationToList(
                data?.contactInformation?.dataSetInformation?.classificationInformation?.[
                'common:classification'
                ]?.['common:class'],
              ),
            },
          },
          contactAddress: getLangJson(data?.contactInformation?.dataSetInformation?.contactAddress),
          telephone: data?.contactInformation?.dataSetInformation?.telephone,
          telefax: data?.contactInformation?.dataSetInformation?.telefax,
          email: data?.contactInformation?.dataSetInformation?.email,
          WWWAddress: data?.contactInformation?.dataSetInformation?.WWWAddress,
          centralContactPoint: getLangJson(
            data?.contactInformation?.dataSetInformation?.centralContactPoint,
          ),
          contactDescriptionOrComment: getLangJson(
            data?.contactInformation?.dataSetInformation?.contactDescriptionOrComment,
          ),
          referenceToContact: {
            '@refObjectId':
              data?.contactInformation?.dataSetInformation?.referenceToContact?.['@refObjectId'],
            '@type': data?.contactInformation?.dataSetInformation?.referenceToContact?.['@type'],
            '@uri': data?.contactInformation?.dataSetInformation?.referenceToContact?.['@uri'],
            'common:shortDescription': getLangJson(
              data?.contactInformation?.dataSetInformation?.referenceToContact?.[
              'common:shortDescription'
              ],
            ),
            '@version':
              data?.contactInformation?.dataSetInformation?.referenceToContact?.['@version'],
          },
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'],
          'common:referenceToDataSetFormat': {
            '@refObjectId':
              data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
              '@refObjectId'
              ],
            '@type':
              data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
              '@type'
              ],
            '@uri':
              data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
              '@uri'
              ],
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
              'common:shortDescription'
              ],
            ),
          },
        },
        publicationAndOwnership: {
          'common:dataSetVersion':
            data?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'],
          'common:referenceToPrecedingDataSetVersion': {
            '@refObjectId':
              data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToPrecedingDataSetVersion'
              ]?.['@refObjectId'],
            '@type':
              data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToPrecedingDataSetVersion'
              ]?.['@type'],
            '@uri':
              data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToPrecedingDataSetVersion'
              ]?.['@uri'],
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToPrecedingDataSetVersion'
              ]?.['common:shortDescription'],
            ),
          },
          'common:permanentDataSetURI':
            data?.administrativeInformation?.publicationAndOwnership?.[
            'common:permanentDataSetURI'
            ],
        },
      },
    },
  });
}

export function genContactFromData(data: any) {
  return removeEmptyObjects({
    contactInformation: {
      dataSetInformation: {
        'common:UUID': data?.contactInformation?.dataSetInformation?.['common:UUID'] ?? '-',
        'common:shortName': getLangList(
          data?.contactInformation?.dataSetInformation?.['common:shortName'],
        ),
        'common:name': getLangList(data?.contactInformation?.dataSetInformation?.['common:name']),
        classificationInformation: {
          'common:classification': {
            'common:class': classificationToJson(
              data?.contactInformation?.dataSetInformation?.classificationInformation?.[
              'common:classification'
              ]?.['common:class'],
            ),
          },
        },
        contactAddress: getLangList(data?.contactInformation?.dataSetInformation?.contactAddress),
        telephone: data?.contactInformation?.dataSetInformation?.telephone,
        telefax: data?.contactInformation?.dataSetInformation?.telefax,
        email: data?.contactInformation?.dataSetInformation?.email,
        WWWAddress: data?.contactInformation?.dataSetInformation?.WWWAddress,
        centralContactPoint: getLangList(
          data?.contactInformation?.dataSetInformation?.['centralContactPoint'],
        ),
        contactDescriptionOrComment: getLangList(
          data?.contactInformation?.dataSetInformation?.['contactDescriptionOrComment'],
        ),
        referenceToContact: {
          '@refObjectId':
            data?.contactInformation?.dataSetInformation?.referenceToContact?.['@refObjectId'],
          '@type': data?.contactInformation?.dataSetInformation?.referenceToContact?.['@type'],
          '@uri': data?.contactInformation?.dataSetInformation?.referenceToContact?.['@uri'],
          'common:shortDescription': getLangList(
            data?.contactInformation?.dataSetInformation?.referenceToContact?.[
            'common:shortDescription'
            ],
          ),
          '@version':
            data?.contactInformation?.dataSetInformation?.referenceToContact?.['@version'],
        },
      },
    },
    administrativeInformation: {
      dataEntryBy: {
        'common:timeStamp': data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? formatDateTime(new Date()),
        'common:referenceToDataSetFormat': {
          '@refObjectId':
            data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
            '@refObjectId'
            ],
          '@type':
            data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
            '@type'
            ],
          '@uri':
            data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
            '@uri'
            ],
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
            'common:shortDescription'
            ],
          ),
        },
      },
      publicationAndOwnership: {
        'common:dataSetVersion':
          data?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'] ?? '01.00.000',
        'common:referenceToPrecedingDataSetVersion': {
          '@refObjectId':
            data?.administrativeInformation?.publicationAndOwnership?.[
            'common:referenceToPrecedingDataSetVersion'
            ]?.['@refObjectId'],
          '@type':
            data?.administrativeInformation?.publicationAndOwnership?.[
            'common:referenceToPrecedingDataSetVersion'
            ]?.['@type'],
          '@uri':
            data?.administrativeInformation?.publicationAndOwnership?.[
            'common:referenceToPrecedingDataSetVersion'
            ]?.['@uri'],
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.publicationAndOwnership?.[
            'common:referenceToPrecedingDataSetVersion'
            ]?.['common:shortDescription'],
          ),
        },
        'common:permanentDataSetURI':
          data?.administrativeInformation?.publicationAndOwnership?.['common:permanentDataSetURI'],
      },
    },
  });
}
