import {
  classificationToJsonList,
  classificationToStringList,
  getLangJson,
  getLangList,
  removeEmptyObjects,
} from '../general/util';

export function genFlowpropertyJsonOrdered(id: string, data: any, oldData: any) {
  console.log('genFlowpropertyJsonOrdered', data);
  return removeEmptyObjects({
    flowPropertyDataSet: {
      '@xmlns': oldData.flowPropertyDataSet?.['@xmlns'] ?? {},
      '@xmlns:common': oldData.flowPropertyDataSet?.['@xmlns:common'] ?? {},
      '@xmlns:xsi': oldData.flowPropertyDataSet?.['@xmlns:xsi'] ?? {},
      '@version': oldData.flowPropertyDataSet?.['@version'] ?? {},
      '@xsi:schemaLocation': oldData.flowPropertyDataSet?.['@xsi:schemaLocation'] ?? {},
      flowPropertiesInformation: {
        dataSetInformation: {
          'common:UUID': id,
          'common:name': getLangJson(
            data?.flowPropertiesInformation?.dataSetInformation?.['common:name'],
          ),
          classificationInformation: {
            'common:classification': {
              'common:class': classificationToJsonList(
                data?.flowPropertiesInformation?.dataSetInformation?.classificationInformation?.[
                  'common:classification'
                ]?.['common:class'],
              ),
            },
          },
          'common:generalComment': getLangJson(
            data?.flowPropertiesInformation?.dataSetInformation?.['common:generalComment'],
          ),
        },
        quantitativeReference: {
          referenceToReferenceUnitGroup: {
            '@refObjectId':
              data?.flowPropertiesInformation?.quantitativeReference
                ?.referenceToReferenceUnitGroup?.['@refObjectId'],
            '@type':
              data?.flowPropertiesInformation?.quantitativeReference
                ?.referenceToReferenceUnitGroup?.['@type'],
            '@uri':
              data?.flowPropertiesInformation?.quantitativeReference
                ?.referenceToReferenceUnitGroup?.['@uri'],
            'common:shortDescription': getLangJson(
              data?.flowPropertiesInformation?.quantitativeReference
                ?.referenceToReferenceUnitGroup?.['common:shortDescription'],
            ),
          },
        },
      },
      modellingAndValidation: {
        complianceDeclarations: {
          compliance: {
            'common:referenceToComplianceSystem': {
              '@refObjectId':
                data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                  'common:referenceToComplianceSystem'
                ]?.['@refObjectId'],
              '@type':
                data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                  'common:referenceToComplianceSystem'
                ]?.['@type'],
              '@uri':
                data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                  'common:referenceToComplianceSystem'
                ]?.['@uri'],
              'common:shortDescription': getLangJson(
                data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                  'common:referenceToComplianceSystem'
                ]?.['common:shortDescription'],
              ),
            },
            'common:approvalOfOverallCompliance':
              data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:approvalOfOverallCompliance'
              ],
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

export function genFlowpropertyFromData(data: any) {
  return removeEmptyObjects({
    flowPropertiesInformation: {
      dataSetInformation: {
        'common:UUID': data?.flowPropertiesInformation?.dataSetInformation?.['common:UUID'],
        'common:name': getLangList(
          data?.flowPropertiesInformation?.dataSetInformation?.['common:name'],
        ),
        classificationInformation: {
          'common:classification': {
            'common:class': classificationToStringList(
              data?.flowPropertiesInformation?.dataSetInformation?.classificationInformation?.[
                'common:classification'
              ]?.['common:class'],
            ),
          },
        },
        'common:generalComment': getLangList(
          data?.flowPropertiesInformation?.dataSetInformation?.['common:generalComment'],
        ),
      },
      quantitativeReference: {
        referenceToReferenceUnitGroup: {
          '@refObjectId':
            data?.flowPropertiesInformation?.quantitativeReference?.referenceToReferenceUnitGroup?.[
              '@refObjectId'
            ],
          '@type':
            data?.flowPropertiesInformation?.quantitativeReference?.referenceToReferenceUnitGroup?.[
              '@type'
            ],
          '@uri':
            data?.flowPropertiesInformation?.quantitativeReference?.referenceToReferenceUnitGroup?.[
              '@uri'
            ],
          'common:shortDescription': getLangList(
            data?.flowPropertiesInformation?.quantitativeReference?.referenceToReferenceUnitGroup?.[
              'common:shortDescription'
            ],
          ),
        },
      },
    },
    modellingAndValidation: {
      complianceDeclarations: {
        compliance: {
          'common:referenceToComplianceSystem': {
            '@refObjectId':
              data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:referenceToComplianceSystem'
              ]?.['@refObjectId'],
            '@type':
              data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:referenceToComplianceSystem'
              ]?.['@type'],
            '@uri':
              data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:referenceToComplianceSystem'
              ]?.['@uri'],
            'common:shortDescription': getLangList(
              data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:referenceToComplianceSystem'
              ]?.['common:shortDescription'],
            ),
          },
          'common:approvalOfOverallCompliance':
            data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
              'common:approvalOfOverallCompliance'
            ],
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
