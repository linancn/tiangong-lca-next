import {
  classificationToJson,
  classificationToList,
  getLangJson,
  getLangList,
  getLangText,
  removeEmptyObjects,
} from '../general/util';

export function genProcessJsonOrdered(id: string, data: any, oldData: any) {
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
          },
          classificationInformation: {
            'common:classification': {
              'common:class': classificationToList(
                data?.processInformation?.dataSetInformation?.classificationInformation?.[
                  'common:classification'
                ]?.['common:class'],
              ),
            },
          },
          'common:generalComment': getLangJson(
            data?.processInformation?.dataSetInformation?.['common:generalComment'],
          ),
        },
        quantitativeReference: {
          '@type': data?.processInformation?.quantitativeReference?.['@type'] ?? {},
          referenceToReferenceFlow:
            data?.processInformation?.quantitativeReference?.referenceToReferenceFlow ?? {},
          functionalUnitOrOther: getLangJson(
            data?.processInformation?.quantitativeReference?.functionalUnitOrOther,
          ),
        },
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
              data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToDataSource?.[
                '@type'
              ] ?? {},
            '@refObjectId':
              data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToDataSource?.[
                '@refObjectId'
              ] ?? {},
            '@uri':
              data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToDataSource?.[
                '@uri'
              ] ?? {},
            'common:shortDescription': getLangJson(
              data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToDataSource?.[
                'common:shortDescription'
              ],
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
            data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
              'common:dateOfLastRevision'
            ] ?? {},
          'common:dataSetVersion':
            data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
              'common:dataSetVersion'
            ] ?? {},
          'common:permanentDataSetURI':
            data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
              'common:permanentDataSetURI'
            ] ?? {},
          'common:referenceToOwnershipOfDataSet': {
            '@refObjectId':
              data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]?.['@refObjectId'] ?? {},
            '@type':
              data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]?.['@type'] ?? {},
            '@uri':
              data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]?.['@uri'] ?? {},
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]?.['common:shortDescription'],
            ),
          },
          'common:copyright':
            data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
              'common:copyright'
            ],
          'common:licenseType':
            data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
              'common:licenseType'
            ],
        },
      },
      exchanges: data?.exchanges ?? {},
    },
  });
}

export function genProcessFromData(data: any) {
  return removeEmptyObjects({
    processInformation: {
      dataSetInformation: {
        name: {
          baseName: getLangList(data?.processInformation?.dataSetInformation?.name?.baseName),
        },
        classificationInformation: {
          'common:classification': {
            'common:class': classificationToJson(
              data?.processInformation?.dataSetInformation?.classificationInformation?.[
                'common:classification'
              ]?.['common:class'],
            ),
          },
        },
        'common:generalComment': getLangList(
          data?.processInformation?.dataSetInformation?.['common:generalComment'],
        ),
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
        deviationsFromCutOffAndCompletenessPrinciples: getLangList(
          data?.modellingAndValidation?.LCIMethodAndAllocation
            ?.deviationsFromCutOffAndCompletenessPrinciples,
        ),
        dataSelectionAndCombinationPrinciples: getLangList(
          data?.modellingAndValidation?.LCIMethodAndAllocation
            ?.dataSelectionAndCombinationPrinciples,
        ),
        deviationsFromSelectionAndCombinationPrinciples: getLangList(
          data?.modellingAndValidation?.LCIMethodAndAllocation
            ?.deviationsFromSelectionAndCombinationPrinciples,
        ),
        dataTreatmentAndExtrapolationsPrinciples: getLangList(
          data?.modellingAndValidation?.LCIMethodAndAllocation
            ?.dataTreatmentAndExtrapolationsPrinciples,
        ),
        deviationsFromTreatmentAndExtrapolationPrinciples: getLangList(
          data?.modellingAndValidation?.LCIMethodAndAllocation
            ?.deviationsFromTreatmentAndExtrapolationPrinciples,
        ),
        referenceToDataSource: {
          '@type':
            data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToDataSource?.[
              '@type'
            ] ?? {},
          '@refObjectId':
            data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToDataSource?.[
              '@refObjectId'
            ] ?? {},
          '@uri':
            data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToDataSource?.['@uri'] ??
            {},
          'common:shortDescription': getLangList(
            data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToDataSource?.[
              'common:shortDescription'
            ],
          ),
        },
        useAdviceForDataSet: getLangList(
          data?.modellingAndValidation?.LCIMethodAndAllocation?.useAdviceForDataSet,
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
          data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
            'common:dateOfLastRevision'
          ] ?? {},
        'common:dataSetVersion':
          data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
            'common:dataSetVersion'
          ] ?? {},
        'common:permanentDataSetURI':
          data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
            'common:permanentDataSetURI'
          ] ?? {},
        'common:referenceToOwnershipOfDataSet': {
          '@refObjectId':
            data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
              'common:referenceToOwnershipOfDataSet'
            ]?.['@refObjectId'] ?? {},
          '@type':
            data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
              'common:referenceToOwnershipOfDataSet'
            ]?.['@type'] ?? {},
          '@uri':
            data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
              'common:referenceToOwnershipOfDataSet'
            ]?.['@uri'] ?? {},
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
              'common:referenceToOwnershipOfDataSet'
            ]?.['common:shortDescription'],
          ),
        },
        'common:copyright':
          data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
            'common:copyright'
          ],
        'common:licenseType':
          data?.administrativeInformation?.dataEntryBy?.publicationAndOwnership?.[
            'common:licenseType'
          ],
      },
    },
    exchanges: {
      exchange: data?.exchanges?.exchange?.map((item: any) => {
        return {
          '@dataSetInternalID': item['@dataSetInternalID'],
          referenceToFlowDataSet: {
            '@type': item.referenceToFlowDataSet?.['@type'],
            '@refObjectId': item.referenceToFlowDataSet?.['@refObjectId'],
            '@uri': item.referenceToFlowDataSet?.['@type'],
            'common:shortDescriptio': getLangList(
              item.referenceToFlowDataSet?.['common:shortDescriptio'],
            ),
          },
          exchangeDirection: item.exchangeDirection,
          meanAmount: item.meanAmount,
          resultingAmount: item.resultingAmount,
          dataDerivationTypeStatus: item.dataDerivationTypeStatus,
          generalComment: getLangList(item.generalComment),
        };
      }),
    },
  });
}

export function genProcessExchangeTableData(data: any, lang: string) {
  if (data) {
    return data.map((item: any) => {
      return removeEmptyObjects({
        dataSetInternalID: item['@dataSetInternalID'],
        exchangeDirection: item.exchangeDirection ?? '-',
        referenceToFlowDataSet: getLangText(
          item.referenceToFlowDataSet?.['common:shortDescription'],
          lang,
        ),
        meanAmount: item.meanAmount ?? '-',
        resultingAmount: item.resultingAmount ?? '-',
        dataDerivationTypeStatus: item.dataDerivationTypeStatus ?? '-',
        generalComment: getLangText(item.generalComment, lang),
      });
    });
  }
  return {};
}
