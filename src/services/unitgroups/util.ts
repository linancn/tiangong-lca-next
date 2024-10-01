import {
  classificationToJsonList,
  classificationToStringList,
  getLangJson,
  getLangList,
  getLangText,
  removeEmptyObjects,
} from '../general/util';

export function genUnitGroupJsonOrdered(id: string, data: any, oldData: any) {
  let quantitativeReference = {};
  const unit =
    data?.units?.unit?.map((item: any) => {
      if (item.quantitativeReference) {
        quantitativeReference = {
          referenceToReferenceUnit: item['@dataSetInternalID'],
        };
      }
      return {
        '@dataSetInternalID': item['@dataSetInternalID'],
        name: item.name,
        meanValue: item.meanValue,
        generalComment: getLangJson(item.generalComment),
      };
    }) ?? [];

  return removeEmptyObjects({
    unitGroupDataSet: {
      '@xmlns': oldData.unitGroupDataSet?.['@xmlns'] ?? {},
      '@xmlns:common': oldData.unitGroupDataSet?.['@xmlns:common'] ?? {},
      '@xmlns:xsi': oldData.unitGroupDataSet?.['@xmlns:xsi'] ?? {},
      '@version': oldData.unitGroupDataSet?.['@version'] ?? {},
      '@xsi:schemaLocation': oldData.unitGroupDataSet?.['@xsi:schemaLocation'] ?? {},
      unitGroupInformation: {
        dataSetInformation: {
          'common:UUID': id,
          'common:name': getLangJson(
            data?.unitGroupInformation?.dataSetInformation?.['common:name'],
          ),
          classificationInformation: {
            'common:classification': {
              'common:class': classificationToJsonList(
                data?.unitGroupInformation?.dataSetInformation?.classificationInformation?.[
                  'common:classification'
                ]?.['common:class'],
              ),
            },
          },
          email: data?.unitGroupInformation?.dataSetInformation?.email ?? {},
        },
        quantitativeReference: quantitativeReference,
      },
      modellingAndValidation: {
        complianceDeclarations: {
          compliance: {
            'common:referenceToComplianceSystem': {
              '@refObjectId':
                data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                  'common:referenceToComplianceSystem'
                ]?.['@refObjectId'] ?? {},
              '@type':
                data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                  'common:referenceToComplianceSystem'
                ]?.['@type'] ?? {},
              '@uri':
                data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                  'common:referenceToComplianceSystem'
                ]?.['@uri'] ?? {},
              '@version':
                data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                  'common:referenceToComplianceSystem'
                ]?.['@version'] ?? {},
              'common:shortDescription': getLangJson(
                data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                  'common:referenceToComplianceSystem'
                ]?.['common:shortDescription'],
              ),
            },
            'common:approvalOfOverallCompliance':
              data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:approvalOfOverallCompliance'
              ] ?? {},
          },
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp':
            data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? {},
          'common:referenceToDataSetFormat': {
            '@refObjectId':
              data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
                '@refObjectId'
              ] ?? {},
            '@type':
              data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
                '@type'
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
        },
      },
      units: {
        unit: unit,
      },
    },
  });
}

export function genUnitGroupFromData(data: any) {
  let unit = data?.units?.unit;
  if (unit && !Array.isArray(unit)) {
    unit = [unit];
  }
  return removeEmptyObjects({
    unitGroupInformation: {
      dataSetInformation: {
        'common:UUID': data?.unitGroupInformation?.dataSetInformation?.['common:UUID'] ?? '-',
        'common:name': getLangList(data?.unitGroupInformation?.dataSetInformation?.['common:name']),
        classificationInformation: {
          'common:classification': {
            'common:class': classificationToStringList(
              data?.unitGroupInformation?.dataSetInformation?.classificationInformation?.[
                'common:classification'
              ]?.['common:class'],
            ),
          },
        },
        email: data?.unitGroupInformation?.dataSetInformation?.email,
      },
      quantitativeReference: {
        referenceToReferenceUnit:
          data?.unitGroupInformation?.quantitativeReference?.referenceToReferenceUnit,
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
            '@version':
              data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:referenceToComplianceSystem'
              ]?.['@version'],
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
      },
    },
    units: {
      unit: unit?.map((item: any) => {
        if (
          item['@dataSetInternalID'] ===
          (data?.unitGroupInformation?.quantitativeReference?.referenceToReferenceUnit ?? '')
        ) {
          return {
            '@dataSetInternalID': item['@dataSetInternalID'],
            name: item['name'],
            meanValue: item['meanValue'],
            generalComment: item['generalComment'],
            quantitativeReference: true,
          };
        } else {
          return {
            '@dataSetInternalID': item['@dataSetInternalID'],
            name: item['name'],
            meanValue: item['meanValue'],
            generalComment: item['generalComment'],
            quantitativeReference: false,
          };
        }
      }),
    },
  });
}

export function genUnitTableData(data: any, lang: string) {
  if (data) {
    return data.map((item: any) => {
      return removeEmptyObjects({
        dataSetInternalID: item['@dataSetInternalID'],
        name: item.name ?? '-',
        generalComment: getLangText(item.generalComment, lang),
        quantitativeReference: item.quantitativeReference ?? false,
        meanValue: item.meanValue ?? '-',
      });
    });
  }
  return {};
}
