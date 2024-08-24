import {
  classificationToJson,
  classificationToList,
  getLangJson,
  getLangList,
  removeEmptyObjects,
} from '../general/util';

export function genFlowJsonOrdered(id: string, data: any, oldData: any) {
  return removeEmptyObjects({
    flowDataSet: {
      '@xmlns': oldData.flowPropertyDataSet?.['@xmlns'],
      '@xmlns:common': oldData.flowPropertyDataSet?.['@xmlns:common'],
      '@xmlns:ecn': oldData.flowPropertyDataSet?.['@xmlns:ecn'],
      '@xmlns:xsi': oldData.flowPropertyDataSet?.['@xmlns:xsi'],
      '@version': oldData.flowPropertyDataSet?.['@version'],
      '@xsi:schemaLocation': oldData.flowPropertyDataSet?.['@xsi:schemaLocation'],
      flowInformation: {
        dataSetInformation: {
          'common:UUID': id,
          name: {
            baseName: getLangJson(
              data?.flowInformation?.dataSetInformation?.['name']?.['baseName'],
            ),
          },
          'common:synonyms': getLangJson(
            data?.flowInformation?.dataSetInformation?.['common:synonyms'],
          ),
          classificationInformation: {
            'common:elementaryFlowCategorization': {
              'common:category': classificationToList(
                data?.flowInformation?.dataSetInformation?.classificationInformation?.[
                'common:elementaryFlowCategorization'
                ]?.['common:category'],
              ),
            },
          },
          CASNumber: data?.flowInformation?.dataSetInformation?.['CASNumber'],
          'common:generalComment': getLangJson(
            data?.flowInformation?.dataSetInformation?.['common:generalComment'],
          ),
          'common:other': {
            'ecn:ECNumber':
              data?.flowInformation?.dataSetInformation?.['common:other']?.['ecn:ECNumber'],
          },
        },
        quantitativeReference: {
          referenceToReferenceFlowProperty: data?.flowInformation?.quantitativeReference?.referenceToReferenceFlowProperty
        },
      },
      modellingAndValidation: {
        LCIMethod: {
          typeOfDataSet: data?.modellingAndValidation?.LCIMethod?.typeOfDataSet,
        },
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
          'common:permanentDataSetURI':
            data?.administrativeInformation?.publicationAndOwnership?.[
            'common:permanentDataSetURI'
            ],
        },
      },
      flowProperties: {
        flowProperty: {
          '@dataSetInternalID': data?.flowProperties?.flowProperty?.['@dataSetInternalID'],
          referenceToFlowPropertyDataSet: {
            '@refObjectId':
              data?.flowProperties?.flowProperty?.referenceToFlowPropertyDataSet?.['@refObjectId'],
            '@type': data?.flowProperties?.flowProperty?.referenceToFlowPropertyDataSet?.['@type'],
            '@uri': data?.flowProperties?.flowProperty?.referenceToFlowPropertyDataSet?.['@uri'],
            'common:shortDescription': getLangJson(
              data?.flowProperties?.flowProperty?.referenceToFlowPropertyDataSet?.[
              'common:shortDescription'
              ],
            ),
          },
          meanValue: data?.flowProperties?.flowProperty?.['meanValue'],
        },
      },
    },
  });
}

export function genFlowFromData(data: any) {
  return removeEmptyObjects({
    flowInformation: {
      dataSetInformation: {
        'common:UUID': data?.flowInformation?.dataSetInformation?.['common:UUID'],
        name: {
          baseName: getLangList(data?.flowInformation?.dataSetInformation?.['name']?.['baseName']),
        },
        'common:synonyms': getLangList(
          data?.flowInformation?.dataSetInformation?.['common:synonyms'],
        ),
        classificationInformation: {
          'common:elementaryFlowCategorization': {
            'common:category': classificationToJson(
              data?.flowInformation?.dataSetInformation?.classificationInformation?.[
              'common:elementaryFlowCategorization'
              ]?.['common:category'],
            ),
          },
        },
        CASNumber: data?.flowInformation?.dataSetInformation?.['CASNumber'],
        'common:generalComment': getLangList(
          data?.flowInformation?.dataSetInformation?.['common:generalComment'],
        ),
        'common:other': {
          'ecn:ECNumber':
            data?.flowInformation?.dataSetInformation?.['common:other']?.['ecn:ECNumber'],
        },
      },
      quantitativeReference: {
        referenceToReferenceFlowProperty: data?.flowInformation?.quantitativeReference?.referenceToReferenceFlowProperty
      },
    },
    modellingAndValidation: {
      LCIMethod: {
        typeOfDataSet: data?.modellingAndValidation?.LCIMethod?.typeOfDataSet,
      },
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
          "@refObjectId": data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.["@refObjectId"],
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
        'common:permanentDataSetURI':
          data?.administrativeInformation?.publicationAndOwnership?.['common:permanentDataSetURI'],
      },
    },
    flowProperties: {
      flowProperty: {
        '@dataSetInternalID': data?.flowProperties?.flowProperty?.['@dataSetInternalID'],
        referenceToFlowPropertyDataSet: {
          '@refObjectId':
            data?.flowProperties?.flowProperty?.referenceToFlowPropertyDataSet?.['@refObjectId'],
          '@type': data?.flowProperties?.flowProperty?.referenceToFlowPropertyDataSet?.['@type'],
          '@uri': data?.flowProperties?.flowProperty?.referenceToFlowPropertyDataSet?.['@uri'],
          'common:shortDescription': getLangList(
            data?.flowProperties?.flowProperty?.referenceToFlowPropertyDataSet?.[
            'common:shortDescription'
            ],
          ),
        },
        meanValue: data?.flowProperties?.flowProperty?.['meanValue'],
      },
    },
  });
}
