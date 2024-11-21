import {
  classificationToJsonList,
  classificationToStringList,
  getLangJson,
  getLangList,
  getLangText,
  removeEmptyObjects,
} from '../general/util';

export function genProcessJsonOrdered(id: string, data: any, oldData: any) {
  let quantitativeReference = {};
  const exchange =
    data?.exchanges?.exchange?.map((item: any) => {
      if (item?.quantitativeReference) {
        quantitativeReference = {
          '@type': 'Reference flow(s)',
          referenceToReferenceFlow: item['@dataSetInternalID'],
          functionalUnitOrOther: getLangJson(item.functionalUnitOrOther),
        };
      }
      return {
        '@dataSetInternalID': item['@dataSetInternalID'],
        referenceToFlowDataSet: item.referenceToFlowDataSet,
        exchangeDirection: item.exchangeDirection,
        meanAmount: item.meanAmount,
        resultingAmount: item.resultingAmount,
        dataDerivationTypeStatus: item.dataDerivationTypeStatus,
        generalComment: getLangJson(item.generalComment),
      };
    }) ?? [];
  return removeEmptyObjects({
    processDataSet: {
      '@xmlns:common': oldData.processDataSet?.['@xmlns:common'] ?? {},
      '@xmlns': oldData.processDataSet?.['@xmlns'] ?? {},
      '@xmlns:xsi': oldData.processDataSet?.['@xmlns:xsi'] ?? {},
      '@version': oldData.processDataSet['@version'] ?? {},
      '@xsi:schemaLocation': oldData.processDataSet['@xsi:schemaLocation'] ?? {},
      processInformation: {
        dataSetInformation: {
          'common:UUID': id,
          name: {
            baseName: getLangJson(data?.processInformation?.dataSetInformation?.name?.baseName),
            treatmentStandardsRoutes: getLangJson(
              data?.processInformation?.dataSetInformation?.name?.treatmentStandardsRoutes,
            ),
            mixAndLocationTypes: getLangJson(
              data?.processInformation?.dataSetInformation?.name?.mixAndLocationTypes,
            ),
            functionalUnitFlowProperties: getLangJson(
              data?.processInformation?.dataSetInformation?.name?.functionalUnitFlowProperties,
            ),
          },
          classificationInformation: {
            'common:classification': {
              'common:class': classificationToJsonList(
                data?.processInformation?.dataSetInformation?.classificationInformation?.[
                  'common:classification'
                ]?.['common:class'],
              ),
            },
          },
          'common:generalComment': getLangJson(
            data?.processInformation?.dataSetInformation?.['common:generalComment'],
          ),
          'common:referenceToExternalDocumentation': {
            '@refObjectId':
              data?.processInformation?.dataSetInformation?.[
                'common:referenceToExternalDocumentation'
              ]?.['@refObjectId'] ?? {},
            '@type':
              data?.processInformation?.dataSetInformation?.[
                'common:referenceToExternalDocumentation'
              ]?.['@type'] ?? {},
            '@uri':
              data?.processInformation?.dataSetInformation?.[
                'common:referenceToExternalDocumentation'
              ]?.['@uri'] ?? {},
            '@version':
              data?.processInformation?.dataSetInformation?.[
                'common:referenceToExternalDocumentation'
              ]?.['@version'] ?? {},
            'common:shortDescription': getLangJson(
              data?.processInformation?.dataSetInformation?.[
                'common:referenceToExternalDocumentation'
              ]?.['common:shortDescription'],
            ),
          },
        },
        quantitativeReference: { ...quantitativeReference },
        time: {
          'common:referenceYear': data?.processInformation?.time?.['common:referenceYear'] ?? {},
          'common:timeRepresentativenessDescription': getLangJson(
            data?.processInformation?.time?.['common:timeRepresentativenessDescription'],
          ),
        },
        geography: {
          locationOfOperationSupplyOrProduction: {
            '@location':
              data?.processInformation?.geography?.locationOfOperationSupplyOrProduction?.[
                '@location'
              ] ?? {},
            descriptionOfRestrictions: getLangJson(
              data?.processInformation?.geography?.locationOfOperationSupplyOrProduction
                ?.descriptionOfRestrictions,
            ),
          },
        },
        technology: {
          technologyDescriptionAndIncludedProcesses: getLangJson(
            data?.processInformation?.technology?.technologyDescriptionAndIncludedProcesses,
          ),
          technologicalApplicability: getLangJson(
            data?.processInformation?.technology?.technologicalApplicability,
          ),
          referenceToTechnologyFlowDiagrammOrPicture: {
            '@type':
              data?.processInformation?.technology?.referenceToTechnologyFlowDiagrammOrPicture?.[
                '@type'
              ] ?? {},
            '@refObjectId':
              data?.processInformation?.technology?.referenceToTechnologyFlowDiagrammOrPicture?.[
                '@refObjectId'
              ] ?? {},
            '@uri':
              data?.processInformation?.technology?.referenceToTechnologyFlowDiagrammOrPicture?.[
                '@uri'
              ] ?? {},
            'common:shortDescription': getLangJson(
              data?.processInformation?.technology?.referenceToTechnologyFlowDiagrammOrPicture?.[
                'common:shortDescription'
              ],
            ),
          },
        },
        mathematicalRelations: {
          modelDescription: getLangJson(
            data?.processInformation?.mathematicalRelations?.modelDescription,
          ),
        },
      },
      modellingAndValidation: {
        LCIMethodAndAllocation: {
          typeOfDataSet: data?.modellingAndValidation?.LCIMethodAndAllocation?.typeOfDataSet ?? {},
          LCIMethodPrinciple:
            data?.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodPrinciple ?? {},
          deviationsFromLCIMethodPrinciple: getLangJson(
            data?.modellingAndValidation?.LCIMethodAndAllocation?.deviationsFromLCIMethodPrinciple,
          ),
          LCIMethodApproaches:
            data?.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodApproaches ?? {},
          deviationsFromLCIMethodApproaches: getLangJson(
            data?.modellingAndValidation?.LCIMethodAndAllocation?.deviationsFromLCIMethodApproaches,
          ),
          deviationsFromModellingConstants: getLangJson(
            data?.modellingAndValidation?.LCIMethodAndAllocation?.deviationsFromModellingConstants,
          ),
        },
        dataSourcesTreatmentAndRepresentativeness: {
          dataCutOffAndCompletenessPrinciples: getLangJson(
            data?.modellingAndValidation?.LCIMethodAndAllocation
              ?.dataCutOffAndCompletenessPrinciples,
          ),
          deviationsFromCutOffAndCompletenessPrinciples: getLangJson(
            data?.modellingAndValidation?.LCIMethodAndAllocation
              ?.deviationsFromCutOffAndCompletenessPrinciples,
          ),
          dataSelectionAndCombinationPrinciples: getLangJson(
            data?.modellingAndValidation?.LCIMethodAndAllocation
              ?.dataSelectionAndCombinationPrinciples,
          ),
          deviationsFromSelectionAndCombinationPrinciples: getLangJson(
            data?.modellingAndValidation?.LCIMethodAndAllocation
              ?.deviationsFromSelectionAndCombinationPrinciples,
          ),
          dataTreatmentAndExtrapolationsPrinciples: getLangJson(
            data?.modellingAndValidation?.LCIMethodAndAllocation
              ?.dataTreatmentAndExtrapolationsPrinciples,
          ),
          deviationsFromTreatmentAndExtrapolationPrinciples: getLangJson(
            data?.modellingAndValidation?.LCIMethodAndAllocation
              ?.deviationsFromTreatmentAndExtrapolationPrinciples,
          ),
          referenceToDataSource: {
            '@type':
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataSource?.['@type'] ?? {},
            '@refObjectId':
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataSource?.['@refObjectId'] ?? {},
            '@uri':
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataSource?.['@uri'] ?? {},
            'common:shortDescription': getLangJson(
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataSource?.['common:shortDescription'],
            ),
          },
          useAdviceForDataSet: getLangJson(
            data?.modellingAndValidation?.LCIMethodAndAllocation?.useAdviceForDataSet,
          ),
        },
        completeness: {
          completenessDescription: getLangJson(
            data?.modellingAndValidation?.completeness?.completenessDescription,
          ),
        },
        validation: {
          review: {
            '@type': data?.modellingAndValidation?.validation?.review?.['@type'] ?? {},
            'common:reviewDetails': getLangJson(
              data?.modellingAndValidation?.validation?.review?.['common:reviewDetails'],
            ),
            'common:referenceToNameOfReviewerAndInstitution': {
              '@refObjectId':
                data?.modellingAndValidation?.validation?.review?.[
                  'common:referenceToNameOfReviewerAndInstitution'
                ]?.['@refObjectId'] ?? {},
              '@type':
                data?.modellingAndValidation?.validation?.review?.[
                  'common:referenceToNameOfReviewerAndInstitution'
                ]?.['@type'] ?? {},
              '@uri':
                data?.modellingAndValidation?.validation?.review?.[
                  'common:referenceToNameOfReviewerAndInstitution'
                ]?.['@uri'] ?? {},
              'common:shortDescription': getLangJson(
                data?.modellingAndValidation?.validation?.review?.[
                  'common:referenceToNameOfReviewerAndInstitution'
                ]?.['common:shortDescription'],
              ),
            },
          },
        },
      },
      administrativeInformation: {
        commissionerAndGoal: {
          'common:referenceToCommissioner': {
            '@refObjectId':
              data?.administrativeInformation?.commissionerAndGoal?.[
                'common:referenceToCommissioner'
              ]?.['@refObjectId'] ?? {},
            '@type':
              data?.administrativeInformation?.commissionerAndGoal?.[
                'common:referenceToCommissioner'
              ]?.['@type'] ?? {},
            '@uri':
              data?.administrativeInformation?.commissionerAndGoal?.[
                'common:referenceToCommissioner'
              ]?.['@uri'] ?? {},
            '@version':
              data?.administrativeInformation?.commissionerAndGoal?.[
                'common:referenceToCommissioner'
              ]?.['@version'] ?? {},
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.commissionerAndGoal?.[
                'common:referenceToCommissioner'
              ]?.['common:shortDescription'],
            ),
          },
        },
        dataGenerator: {
          'common:referenceToPersonOrEntityGeneratingTheDataSet': {
            '@refObjectId':
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['@refObjectId'] ?? {},
            '@type':
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['@type'] ?? {},
            '@uri':
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['@uri'] ?? {},
            '@version':
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['@version'] ?? {},
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['common:shortDescription'],
            ),
          },
        },
        dataEntryBy: {
          'common:timeStamp':
            data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? {},
        },
        publicationAndOwnership: {
          'common:dateOfLastRevision':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:dateOfLastRevision'
            ] ?? {},
          'common:dataSetVersion':
            data?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'] ??
            {},
          'common:permanentDataSetURI':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:permanentDataSetURI'
            ] ?? {},
          'common:workflowAndPublicationStatus':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:workflowAndPublicationStatus'
            ] ?? {},
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
          'common:copyright':
            data?.administrativeInformation?.publicationAndOwnership?.['common:copyright'],
          'common:licenseType':
            data?.administrativeInformation?.publicationAndOwnership?.['common:licenseType'],
        },
      },
      exchanges: {
        exchange: [...exchange],
      },
    },
  });
}
export function genProcessFromData(data: any) {
  const exchange = data?.exchanges?.exchange ?? [];
  let exchangeList = [];
  if (!Array.isArray(exchange)) {
    exchangeList = [exchange];
  } else {
    exchangeList = exchange;
  }

  return removeEmptyObjects({
    processInformation: {
      dataSetInformation: {
        'common:UUID': data?.processInformation?.dataSetInformation?.['common:UUID'] ?? '-',
        name: {
          baseName: getLangList(data?.processInformation?.dataSetInformation?.name?.baseName),
          treatmentStandardsRoutes: getLangList(
            data?.processInformation?.dataSetInformation?.name?.treatmentStandardsRoutes,
          ),
          mixAndLocationTypes: getLangList(
            data?.processInformation?.dataSetInformation?.name?.mixAndLocationTypes,
          ),
          functionalUnitFlowProperties: getLangList(
            data?.processInformation?.dataSetInformation?.name?.functionalUnitFlowProperties,
          ),
        },
        classificationInformation: {
          'common:classification': {
            'common:class': classificationToStringList(
              data?.processInformation?.dataSetInformation?.classificationInformation?.[
                'common:classification'
              ]?.['common:class'],
            ),
          },
        },
        'common:generalComment': getLangList(
          data?.processInformation?.dataSetInformation?.['common:generalComment'],
        ),
        'common:referenceToExternalDocumentation': {
          '@refObjectId':
            data?.processInformation?.dataSetInformation?.[
              'common:referenceToExternalDocumentation'
            ]?.['@refObjectId'] ?? {},
          '@type':
            data?.processInformation?.dataSetInformation?.[
              'common:referenceToExternalDocumentation'
            ]?.['@type'] ?? {},
          '@uri':
            data?.processInformation?.dataSetInformation?.[
              'common:referenceToExternalDocumentation'
            ]?.['@uri'] ?? {},
          '@version':
            data?.processInformation?.dataSetInformation?.[
              'common:referenceToExternalDocumentation'
            ]?.['@version'] ?? {},
          'common:shortDescription': getLangJson(
            data?.processInformation?.dataSetInformation?.[
              'common:referenceToExternalDocumentation'
            ]?.['common:shortDescription'],
          ),
        },
      },
      quantitativeReference: {
        '@type': data?.processInformation?.quantitativeReference?.['@type'] ?? {},
        referenceToReferenceFlow:
          data?.processInformation?.quantitativeReference?.referenceToReferenceFlow ?? {},
        functionalUnitOrOther: getLangList(
          data?.processInformation?.quantitativeReference?.functionalUnitOrOther,
        ),
      },
      time: {
        'common:referenceYear': data?.processInformation?.time?.['common:referenceYear'] ?? {},
        'common:timeRepresentativenessDescription': getLangList(
          data?.processInformation?.time?.['common:timeRepresentativenessDescription'],
        ),
      },
      geography: {
        locationOfOperationSupplyOrProduction: {
          '@location':
            data?.processInformation?.geography?.locationOfOperationSupplyOrProduction?.[
              '@location'
            ] ?? {},
          descriptionOfRestrictions: getLangList(
            data?.processInformation?.geography?.locationOfOperationSupplyOrProduction
              ?.descriptionOfRestrictions,
          ),
        },
      },
      technology: {
        technologyDescriptionAndIncludedProcesses: getLangList(
          data?.processInformation?.technology?.technologyDescriptionAndIncludedProcesses,
        ),
        technologicalApplicability: getLangList(
          data?.processInformation?.technology?.technologicalApplicability,
        ),
        referenceToTechnologyFlowDiagrammOrPicture: {
          '@type':
            data?.processInformation?.technology?.referenceToTechnologyFlowDiagrammOrPicture?.[
              '@type'
            ] ?? {},
          '@refObjectId':
            data?.processInformation?.technology?.referenceToTechnologyFlowDiagrammOrPicture?.[
              '@refObjectId'
            ] ?? {},
          '@uri':
            data?.processInformation?.technology?.referenceToTechnologyFlowDiagrammOrPicture?.[
              '@uri'
            ] ?? {},
          'common:shortDescription': getLangList(
            data?.processInformation?.technology?.referenceToTechnologyFlowDiagrammOrPicture?.[
              'common:shortDescription'
            ],
          ),
        },
      },
      mathematicalRelations: {
        modelDescription: getLangList(
          data?.processInformation?.mathematicalRelations?.modelDescription,
        ),
      },
    },
    modellingAndValidation: {
      LCIMethodAndAllocation: {
        typeOfDataSet: data?.modellingAndValidation?.LCIMethodAndAllocation?.typeOfDataSet ?? {},
        LCIMethodPrinciple:
          data?.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodPrinciple ?? {},
        deviationsFromLCIMethodPrinciple: getLangList(
          data?.modellingAndValidation?.LCIMethodAndAllocation?.deviationsFromLCIMethodPrinciple,
        ),
        LCIMethodApproaches:
          data?.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodApproaches ?? {},
        deviationsFromLCIMethodApproaches: getLangList(
          data?.modellingAndValidation?.LCIMethodAndAllocation?.deviationsFromLCIMethodApproaches,
        ),
        deviationsFromModellingConstants: getLangList(
          data?.modellingAndValidation?.LCIMethodAndAllocation?.deviationsFromModellingConstants,
        ),
      },
      dataSourcesTreatmentAndRepresentativeness: {
        dataCutOffAndCompletenessPrinciples: getLangJson(
          data?.modellingAndValidation?.LCIMethodAndAllocation?.dataCutOffAndCompletenessPrinciples,
        ),
        deviationsFromCutOffAndCompletenessPrinciples: getLangList(
          data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
            ?.deviationsFromCutOffAndCompletenessPrinciples,
        ),
        dataSelectionAndCombinationPrinciples: getLangList(
          data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
            ?.dataSelectionAndCombinationPrinciples,
        ),
        deviationsFromSelectionAndCombinationPrinciples: getLangList(
          data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
            ?.deviationsFromSelectionAndCombinationPrinciples,
        ),
        dataTreatmentAndExtrapolationsPrinciples: getLangList(
          data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
            ?.dataTreatmentAndExtrapolationsPrinciples,
        ),
        deviationsFromTreatmentAndExtrapolationPrinciples: getLangList(
          data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
            ?.deviationsFromTreatmentAndExtrapolationPrinciples,
        ),
        referenceToDataSource: {
          '@type':
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.referenceToDataSource?.['@type'] ?? {},
          '@refObjectId':
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.referenceToDataSource?.['@refObjectId'] ?? {},
          '@uri':
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.referenceToDataSource?.['@uri'] ?? {},
          'common:shortDescription': getLangList(
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.referenceToDataSource?.['common:shortDescription'],
          ),
        },
        useAdviceForDataSet: getLangList(
          data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
            ?.useAdviceForDataSet,
        ),
      },
      completeness: {
        completenessDescription: getLangList(
          data?.modellingAndValidation?.completeness?.completenessDescription,
        ),
      },
      validation: {
        review: {
          '@type': data?.modellingAndValidation?.validation?.review?.['@type'] ?? {},
          'common:reviewDetails': getLangList(
            data?.modellingAndValidation?.validation?.review?.['common:reviewDetails'],
          ),
          'common:referenceToNameOfReviewerAndInstitution': {
            '@refObjectId':
              data?.modellingAndValidation?.validation?.review?.[
                'common:referenceToNameOfReviewerAndInstitution'
              ]?.['@refObjectId'] ?? {},
            '@type':
              data?.modellingAndValidation?.validation?.review?.[
                'common:referenceToNameOfReviewerAndInstitution'
              ]?.['@type'] ?? {},
            '@uri':
              data?.modellingAndValidation?.validation?.review?.[
                'common:referenceToNameOfReviewerAndInstitution'
              ]?.['@uri'] ?? {},
            'common:shortDescription': getLangList(
              data?.modellingAndValidation?.validation?.review?.[
                'common:referenceToNameOfReviewerAndInstitution'
              ]?.['common:shortDescription'],
            ),
          },
        },
      },
    },
    administrativeInformation: {
      commissionerAndGoal: {
        'common:referenceToCommissioner': {
          '@refObjectId':
            data?.administrativeInformation?.commissionerAndGoal?.[
              'common:referenceToCommissioner'
            ]?.['@refObjectId'] ?? {},
          '@type':
            data?.administrativeInformation?.commissionerAndGoal?.[
              'common:referenceToCommissioner'
            ]?.['@type'] ?? {},
          '@uri':
            data?.administrativeInformation?.commissionerAndGoal?.[
              'common:referenceToCommissioner'
            ]?.['@uri'] ?? {},
          '@version':
            data?.administrativeInformation?.commissionerAndGoal?.[
              'common:referenceToCommissioner'
            ]?.['@version'] ?? {},
          'common:shortDescription': getLangJson(
            data?.administrativeInformation?.commissionerAndGoal?.[
              'common:referenceToCommissioner'
            ]?.['common:shortDescription'],
          ),
        },
      },
      dataGenerator: {
        'common:referenceToPersonOrEntityGeneratingTheDataSet': {
          '@refObjectId':
            data?.administrativeInformation?.dataGenerator?.[
              'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]?.['@refObjectId'] ?? {},
          '@type':
            data?.administrativeInformation?.dataGenerator?.[
              'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]?.['@type'] ?? {},
          '@uri':
            data?.administrativeInformation?.dataGenerator?.[
              'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]?.['@uri'] ?? {},
          '@version':
            data?.administrativeInformation?.dataGenerator?.[
              'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]?.['@version'] ?? {},
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.dataGenerator?.[
              'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]?.['common:shortDescription'],
          ),
        },
      },
      dataEntryBy: {
        'common:timeStamp':
          data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? {},
      },
      publicationAndOwnership: {
        'common:dateOfLastRevision':
          data?.administrativeInformation?.publicationAndOwnership?.['common:dateOfLastRevision'] ??
          {},
        'common:dataSetVersion':
          data?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'] ?? {},
        'common:permanentDataSetURI':
          data?.administrativeInformation?.publicationAndOwnership?.[
            'common:permanentDataSetURI'
          ] ?? {},
        'common:workflowAndPublicationStatus':
          data?.administrativeInformation?.publicationAndOwnership?.[
            'common:workflowAndPublicationStatus'
          ] ?? {},
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
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToOwnershipOfDataSet'
            ]?.['common:shortDescription'],
          ),
        },
        'common:copyright':
          data?.administrativeInformation?.publicationAndOwnership?.['common:copyright'],
        'common:licenseType':
          data?.administrativeInformation?.publicationAndOwnership?.['common:licenseType'],
      },
    },
    exchanges: {
      exchange: exchangeList?.map((item: any) => {
        if (
          item['@dataSetInternalID'] ===
          (data?.processInformation?.quantitativeReference?.referenceToReferenceFlow ?? '')
        ) {
          return {
            '@dataSetInternalID': item['@dataSetInternalID'],
            referenceToFlowDataSet: {
              '@type': item.referenceToFlowDataSet?.['@type'],
              '@refObjectId': item.referenceToFlowDataSet?.['@refObjectId'],
              '@uri': item.referenceToFlowDataSet?.['@uri'],
              'common:shortDescription': getLangList(
                item.referenceToFlowDataSet?.['common:shortDescription'],
              ),
            },
            exchangeDirection: item.exchangeDirection,
            meanAmount: item.meanAmount,
            resultingAmount: item.resultingAmount,
            dataDerivationTypeStatus: item.dataDerivationTypeStatus,
            generalComment: getLangList(item.generalComment),
            quantitativeReference: true,
            functionalUnitOrOther: getLangList(
              data?.processInformation?.quantitativeReference?.functionalUnitOrOther,
            ),
          };
        } else {
          return {
            '@dataSetInternalID': item['@dataSetInternalID'],
            referenceToFlowDataSet: {
              '@type': item.referenceToFlowDataSet?.['@type'],
              '@refObjectId': item.referenceToFlowDataSet?.['@refObjectId'],
              '@uri': item.referenceToFlowDataSet?.['@uri'],
              'common:shortDescription': getLangList(
                item.referenceToFlowDataSet?.['common:shortDescription'],
              ),
            },
            exchangeDirection: item.exchangeDirection,
            meanAmount: item.meanAmount,
            resultingAmount: item.resultingAmount,
            dataDerivationTypeStatus: item.dataDerivationTypeStatus,
            generalComment: getLangList(item.generalComment),
            quantitativeReference: false,
          };
        }
      }),
    },
  });
}

export function genProcessExchangeTableData(data: any, lang: string) {
  if (data) {
    let dataList = [];
    if (!Array.isArray(data)) {
      dataList = [data];
    } else {
      dataList = data;
    }
    return dataList?.map((item: any) => {
      return removeEmptyObjects({
        // key: `${item?.['@dataSetInternalID'] ?? '-'},${item?.referenceToFlowDataSet?.['@refObjectId'] ?? '-'}`,
        key: item?.referenceToFlowDataSet?.['@refObjectId'] ?? '-',
        dataSetInternalID: item?.['@dataSetInternalID'] ?? '-',
        exchangeDirection: item?.exchangeDirection ?? '-',
        referenceToFlowDataSetId: item?.referenceToFlowDataSet?.['@refObjectId'] ?? '-',
        referenceToFlowDataSet: getLangText(
          item?.referenceToFlowDataSet?.['common:shortDescription'],
          lang,
        ),
        meanAmount: item?.meanAmount ?? '-',
        resultingAmount: item?.resultingAmount ?? '-',
        dataDerivationTypeStatus: item?.dataDerivationTypeStatus ?? '-',
        generalComment: getLangText(item?.generalComment, lang),
        quantitativeReference: item?.quantitativeReference ?? false,
        functionalUnitOrOther: getLangText(item?.functionalUnitOrOther, lang),
      });
    });
  }
  return [];
}

export function genProcessName(name: any, lang: string) {
  const baseName = getLangText(name?.baseName, lang);
  const treatmentStandardsRoutes = getLangText(name?.treatmentStandardsRoutes, lang);
  const mixAndLocationTypes = getLangText(name?.mixAndLocationTypes, lang);
  const functionalUnitFlowProperties = getLangText(name?.functionalUnitFlowProperties, lang);
  const nameStr = (
    baseName +
    '; ' +
    treatmentStandardsRoutes +
    '; ' +
    mixAndLocationTypes +
    '; ' +
    functionalUnitFlowProperties +
    '; '
  ).replace(/-; /g, '');
  if (nameStr.endsWith('; ')) {
    return nameStr.slice(0, -2);
  }
  if (nameStr.length === 0) {
    return '-';
  }
}
