import {
  classificationToJsonList,
  classificationToStringList,
  getLangJson,
  getLangList,
  getLangText,
  removeEmptyObjects,
} from '../general/util';

export function genFlowJsonOrdered(id: string, data: any, oldData: any) {
  let quantitativeReference = {};
  const flowProperty =
    data?.flowProperties?.flowProperty?.map((item: any) => {
      if (item?.quantitativeReference) {
        quantitativeReference = {
          referenceToReferenceFlowProperty: item?.['@dataSetInternalID'],
        };
      }
      return {
        '@dataSetInternalID': item?.['@dataSetInternalID'],
        referenceToFlowPropertyDataSet: {
          '@refObjectId': item?.referenceToFlowPropertyDataSet?.['@refObjectId'],
          '@type': item?.referenceToFlowPropertyDataSet?.['@type'],
          '@uri': item?.referenceToFlowPropertyDataSet?.['@uri'],
          'common:shortDescription': getLangJson(
            item?.referenceToFlowPropertyDataSet?.['common:shortDescription'],
          ),
        },
        meanValue: item?.['meanValue'],
      };
    }) ?? [];
  let flowPropertyJson: any = {};
  if (flowProperty.length > 1) {
    flowPropertyJson = flowProperty;
  } else if (flowProperty.length === 1) {
    flowPropertyJson = flowProperty[0];
  } else {
    flowPropertyJson = {};
  }

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
            treatmentStandardsRoutes: getLangJson(
              data?.flowInformation?.dataSetInformation?.name?.treatmentStandardsRoutes,
            ),
            mixAndLocationTypes: getLangJson(
              data?.flowInformation?.dataSetInformation?.name?.mixAndLocationTypes,
            ),
            flowProperties: getLangJson(
              data?.flowInformation?.dataSetInformation?.name?.flowProperties,
            ),
          },
          'common:synonyms': getLangJson(
            data?.flowInformation?.dataSetInformation?.['common:synonyms'],
          ),
          classificationInformation: {
            'common:elementaryFlowCategorization': {
              'common:category': classificationToJsonList(
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
        quantitativeReference: quantitativeReference,
        geography: {
          locationOfSupply: data?.flowInformation?.geography?.locationOfSupply,
        },
        technology: {
          technologicalApplicability: getLangJson(
            data?.flowInformation?.technology?.technologicalApplicability,
          ),
          referenceToTechnicalSpecification: {
            '@type':
              data?.flowInformation?.technology?.referenceToTechnicalSpecification?.['@type'] ?? {},
            '@refObjectId':
              data?.flowInformation?.technology?.referenceToTechnicalSpecification?.[
                '@refObjectId'
              ] ?? {},
            '@uri':
              data?.flowInformation?.technology?.referenceToTechnicalSpecification?.['@uri'] ?? {},
            'common:shortDescription': getLangJson(
              data?.flowInformation?.technology?.referenceToTechnicalSpecification?.[
                'common:shortDescription'
              ],
            ),
          },
        },
      },
      modellingAndValidation: {
        LCIMethod: {
          typeOfDataSet: data?.flowInformation?.LCIMethod?.typeOfDataSet,
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
          'common:referenceToPersonOrEntityEnteringTheData': {
            '@refObjectId':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToPersonOrEntityEnteringTheData'
              ]?.['@refObjectId'],
            '@type':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToPersonOrEntityEnteringTheData'
              ]?.['@type'],
            '@uri':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToPersonOrEntityEnteringTheData'
              ]?.['@uri'],
            '@version':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToPersonOrEntityEnteringTheData'
              ]?.['@version'],
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToPersonOrEntityEnteringTheData'
              ]?.['common:shortDescription'],
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
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]?.['common:shortDescription'],
            ),
          },
        },
      },
      flowProperties: {
        flowProperty: flowPropertyJson,
      },
    },
  });
}

export function genFlowFromData(data: any) {
  const flowProperty = data?.flowProperties?.flowProperty ?? [];
  let flowPropertyList = [];
  if (!Array.isArray(flowProperty)) {
    flowPropertyList = [flowProperty];
  } else {
    flowPropertyList = flowProperty;
  }

  return removeEmptyObjects({
    flowInformation: {
      dataSetInformation: {
        'common:UUID': data?.flowInformation?.dataSetInformation?.['common:UUID'],
        name: {
          baseName: getLangList(data?.flowInformation?.dataSetInformation?.['name']?.['baseName']),
          treatmentStandardsRoutes: getLangList(
            data?.flowInformation?.dataSetInformation?.name?.treatmentStandardsRoutes,
          ),
          mixAndLocationTypes: getLangList(
            data?.flowInformation?.dataSetInformation?.name?.mixAndLocationTypes,
          ),
          flowProperties: getLangList(
            data?.flowInformation?.dataSetInformation?.name?.flowProperties,
          ),
        },
        'common:synonyms': getLangList(
          data?.flowInformation?.dataSetInformation?.['common:synonyms'],
        ),
        classificationInformation: {
          'common:elementaryFlowCategorization': {
            'common:category': classificationToStringList(
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
        referenceToReferenceFlowProperty:
          data?.flowInformation?.quantitativeReference?.referenceToReferenceFlowProperty,
      },
      geography: {
        locationOfSupply: data?.flowInformation?.geography?.locationOfSupply,
      },
      technology: {
        technologicalApplicability: getLangList(
          data?.flowInformation?.technology?.technologicalApplicability,
        ),
        referenceToTechnicalSpecification: {
          '@type':
            data?.flowInformation?.technology?.referenceToTechnicalSpecification?.['@type'] ?? {},
          '@refObjectId':
            data?.flowInformation?.technology?.referenceToTechnicalSpecification?.[
              '@refObjectId'
            ] ?? {},
          '@uri':
            data?.flowInformation?.technology?.referenceToTechnicalSpecification?.['@uri'] ?? {},
          'common:shortDescription': getLangList(
            data?.flowInformation?.technology?.referenceToTechnicalSpecification?.[
              'common:shortDescription'
            ],
          ),
        },
      },
      LCIMethod: {
        typeOfDataSet: data?.modellingAndValidation?.LCIMethod?.typeOfDataSet,
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
        'common:referenceToPersonOrEntityEnteringTheData': {
          '@refObjectId':
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToPersonOrEntityEnteringTheData'
            ]?.['@refObjectId'],
          '@type':
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToPersonOrEntityEnteringTheData'
            ]?.['@type'],
          '@uri':
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToPersonOrEntityEnteringTheData'
            ]?.['@uri'],
          '@version':
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToPersonOrEntityEnteringTheData'
            ]?.['@version'],
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToPersonOrEntityEnteringTheData'
            ]?.['common:shortDescription'],
          ),
        },
      },
      publicationAndOwnership: {
        'common:dataSetVersion':
          data?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'] ??
          '01.00.000',
        'common:permanentDataSetURI':
          data?.administrativeInformation?.publicationAndOwnership?.['common:permanentDataSetURI'],
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
      },
    },
    flowProperties: {
      flowProperty: flowPropertyList?.map((item: any) => {
        return {
          '@dataSetInternalID': item?.['@dataSetInternalID'],
          referenceToFlowPropertyDataSet: {
            '@refObjectId': item?.referenceToFlowPropertyDataSet?.['@refObjectId'],
            '@type': item?.referenceToFlowPropertyDataSet?.['@type'],
            '@uri': item?.referenceToFlowPropertyDataSet?.['@uri'],
            'common:shortDescription': getLangList(
              item?.referenceToFlowPropertyDataSet?.['common:shortDescription'],
            ),
          },
          meanValue: item?.['meanValue'],
          quantitativeReference:
            item?.['@dataSetInternalID'] ===
            data?.flowInformation?.quantitativeReference?.referenceToReferenceFlowProperty
              ? true
              : false,
        };
      }),
    },
  });
}

export function genFlowPropertyTabTableData(data: any, lang: string) {
  if (data) {
    let dataList = [];
    if (!Array.isArray(data)) {
      dataList = [data];
    } else {
      if (data.length === 0) {
        return [];
      }
      dataList = data;
    }

    return dataList?.map((item: any) => {
      return removeEmptyObjects({
        key: item?.['@dataSetInternalID'] ?? '-',
        dataSetInternalID: item?.['@dataSetInternalID'] ?? '-',
        referenceToFlowPropertyDataSetId:
          item?.referenceToFlowPropertyDataSet?.['@refObjectId'] ?? '-',
        referenceToFlowPropertyDataSet: getLangText(
          item?.referenceToFlowPropertyDataSet?.['common:shortDescription'],
          lang,
        ),
        meanValue: item?.['meanValue'],
        quantitativeReference: item?.quantitativeReference ?? false,
        location: item?.locationOfSupply ?? '-',
      });
    });
  }
  return [];
}

export function genFlowName(name: any, lang: string) {
  const baseName = getLangText(name?.baseName, lang);
  const treatmentStandardsRoutes = getLangText(name?.treatmentStandardsRoutes, lang);
  const mixAndLocationTypes = getLangText(name?.mixAndLocationTypes, lang);
  const flowProperties = getLangText(name?.flowProperties, lang);
  const nameStr = (
    baseName +
    '; ' +
    treatmentStandardsRoutes +
    '; ' +
    mixAndLocationTypes +
    '; ' +
    flowProperties +
    '; '
  ).replace(/-; /g, '');
  if (nameStr.endsWith('; ')) {
    return nameStr.slice(0, -2);
  }
  if (nameStr.length === 0) {
    return '-';
  }
}
