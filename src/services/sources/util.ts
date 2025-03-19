import {
  classificationToJsonList,
  classificationToStringList,
  getLangJson,
  getLangList,
  jsonToList,
  listToJson,
  removeEmptyObjects,
} from '../general/util';

export function genSourceJsonOrdered(id: string, data: any) {
  return removeEmptyObjects({
    sourceDataSet: {
      // '@xmlns:common': oldData.sourceDataSet?.['@xmlns:common'] ?? {},
      // '@xmlns': oldData.sourceDataSet?.['@xmlns'] ?? {},
      // '@xmlns:xsi': oldData.sourceDataSet?.['@xmlns:xsi'] ?? {},
      // '@version': oldData.sourceDataSet?.['@version'] ?? {},
      // '@xsi:schemaLocation': oldData.sourceDataSet?.['@xsi:schemaLocation'] ?? {},
      '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
      '@xmlns': 'http://lca.jrc.it/ILCD/Source',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@version': '1.1',
      '@xsi:schemaLocation': 'http://lca.jrc.it/ILCD/Source ../../schemas/ILCD_SourceDataSet.xsd',
      sourceInformation: {
        dataSetInformation: {
          'common:UUID': id,
          'common:shortName': getLangJson(
            data?.sourceInformation?.dataSetInformation?.['common:shortName'],
          ),
          classificationInformation: {
            'common:classification': {
              'common:class': classificationToJsonList(
                data?.sourceInformation?.dataSetInformation?.classificationInformation?.[
                  'common:classification'
                ]?.['common:class'],
              ),
            },
          },
          sourceCitation: data?.sourceInformation?.dataSetInformation?.sourceCitation ?? {},
          publicationType: data?.sourceInformation?.dataSetInformation?.publicationType ?? {},
          sourceDescriptionOrComment: getLangJson(
            data?.sourceInformation?.dataSetInformation?.sourceDescriptionOrComment,
          ),
          referenceToDigitalFile: listToJson(
            data?.sourceInformation?.dataSetInformation?.referenceToDigitalFile,
          ),
          referenceToContact: {
            '@refObjectId':
              data?.sourceInformation?.dataSetInformation?.referenceToContact?.['@refObjectId'],
            '@type': data?.sourceInformation?.dataSetInformation?.referenceToContact?.['@type'],
            '@uri': data?.sourceInformation?.dataSetInformation?.referenceToContact?.['@uri'],
            '@version':
              data?.sourceInformation?.dataSetInformation?.referenceToContact?.['@version'],
            'common:shortDescription': getLangJson(
              data?.sourceInformation?.dataSetInformation?.referenceToContact?.[
                'common:shortDescription'
              ],
            ),
          },
          referenceToLogo: {
            '@refObjectId':
              data?.sourceInformation?.dataSetInformation?.referenceToLogo?.['@refObjectId'],
            '@type': data?.sourceInformation?.dataSetInformation?.referenceToLogo?.['@type'],
            '@uri': data?.sourceInformation?.dataSetInformation?.referenceToLogo?.['@uri'],
            '@version':
              data?.sourceInformation?.dataSetInformation?.referenceToLogo?.['@version'],
            'common:shortDescription': getLangJson(
              data?.sourceInformation?.dataSetInformation?.referenceToLogo?.[
                'common:shortDescription'
              ],
            ),
          },
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp':
            data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? {},
          'common:referenceToDataSetFormat': {
            '@type':
              data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
                '@type'
              ] ?? {},
            '@refObjectId':
              data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
                '@refObjectId'
              ] ?? {},
            '@uri':
              data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
                '@uri'
              ] ?? {},
            '@version':
              data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
                '@version'
              ] ?? {},
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
                'common:shortDescription'
              ],
            ),
          },
        },
        publicationAndOwnership: {
          'common:dataSetVersion':
            data?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'] ??
            {},
          'common:referenceToOwnershipOfDataSet': {
            '@refObjectId':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]?.['@refObjectId'] ?? {},
            '@type':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]?.['@type'] ?? {},
            '@uri':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]?.['@uri'] ?? {},
            '@version':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]?.['@version'] ?? {},
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]?.['common:shortDescription'],
            ),
          },
          'common:referenceToPrecedingDataSetVersion': {
            '@refObjectId':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToPrecedingDataSetVersion'
              ]?.['@refObjectId'] ?? {},
            '@type':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToPrecedingDataSetVersion'
              ]?.['@type'] ?? {},
            '@uri':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToPrecedingDataSetVersion'
              ]?.['@uri'] ?? {},
            '@version':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToPrecedingDataSetVersion'
              ]?.['@version'] ?? {},
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToPrecedingDataSetVersion'
              ]?.['common:shortDescription'],
            ),
          },
          'common:permanentDataSetURI':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:permanentDataSetURI'
            ] ?? {},
        },
      },
    },
  });
}

export function genSourceFromData(data: any) {
  return removeEmptyObjects({
    sourceInformation: {
      dataSetInformation: {
        'common:UUID': data?.sourceInformation?.dataSetInformation?.['common:UUID'],
        'common:shortName': getLangList(
          data?.sourceInformation?.dataSetInformation?.['common:shortName'],
        ),
        classificationInformation: {
          'common:classification': {
            'common:class': classificationToStringList(
              data?.sourceInformation?.dataSetInformation?.classificationInformation?.[
                'common:classification'
              ]?.['common:class'],
            ),
          },
        },
        sourceCitation: data?.sourceInformation?.dataSetInformation?.sourceCitation,
        publicationType: data?.sourceInformation?.dataSetInformation?.publicationType,
        sourceDescriptionOrComment: getLangList(
          data?.sourceInformation?.dataSetInformation?.sourceDescriptionOrComment,
        ),
        referenceToDigitalFile: jsonToList(
          data?.sourceInformation?.dataSetInformation?.referenceToDigitalFile,
        ),
        referenceToContact: {
          '@refObjectId':
            data?.sourceInformation?.dataSetInformation?.referenceToContact?.['@refObjectId'],
          '@type': data?.sourceInformation?.dataSetInformation?.referenceToContact?.['@type'],
          '@uri': data?.sourceInformation?.dataSetInformation?.referenceToContact?.['@uri'],
          '@version': data?.sourceInformation?.dataSetInformation?.referenceToContact?.['@version'],
          'common:shortDescription': getLangList(
            data?.sourceInformation?.dataSetInformation?.referenceToContact?.[
              'common:shortDescription'
            ],
          ),
        },
        referenceToLogo: {
          '@refObjectId':
            data?.sourceInformation?.dataSetInformation?.referenceToLogo?.['@refObjectId'],
          '@type': data?.sourceInformation?.dataSetInformation?.referenceToLogo?.['@type'],
          '@uri': data?.sourceInformation?.dataSetInformation?.referenceToLogo?.['@uri'],
          '@version': data?.sourceInformation?.dataSetInformation?.referenceToLogo?.['@version'],
          'common:shortDescription': getLangList(
            data?.sourceInformation?.dataSetInformation?.referenceToLogo?.[
              'common:shortDescription'
            ],
          ),
        },
      },
    },
    administrativeInformation: {
      dataEntryBy: {
        'common:timeStamp': data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'],
        'common:referenceToDataSetFormat': {
          '@type':
            data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
              '@type'
            ],
          '@refObjectId':
            data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
              '@refObjectId'
            ],
          '@uri':
            data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
              '@uri'
            ],
          '@version':
            data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
              '@version'
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
          data?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'],
        'common:referenceToOwnershipOfDataSet': {
          '@refObjectId':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToOwnershipOfDataSet'
            ]?.['@refObjectId'],
          '@type':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToOwnershipOfDataSet'
            ]?.['@type'],
          '@uri':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToOwnershipOfDataSet'
            ]?.['@uri'],
          '@version':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToOwnershipOfDataSet'
            ]?.['@version'],
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToOwnershipOfDataSet'
            ]?.['common:shortDescription'],
          ),
        },
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
          '@version':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToPrecedingDataSetVersion'
            ]?.['@version'],
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
