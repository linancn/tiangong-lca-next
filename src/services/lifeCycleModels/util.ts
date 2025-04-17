import { v4 } from 'uuid';
import {
  classificationToJsonList,
  classificationToStringList,
  getLangJson,
  getLangList,
  getLangText,
  jsonToList,
  listToJson,
  removeEmptyObjects,
  toAmountNumber,
} from '../general/util';
import { genProcessName } from '../processes/util';
import { supabase } from '../supabase';

export function genNodeLabel(label: string, lang: string, nodeWidth: number) {
  let labelSub = label?.substring(0, nodeWidth / 7 - 4);
  if (lang === 'zh') {
    labelSub = label?.substring(0, nodeWidth / 12 - 4);
  }
  return label !== labelSub ? labelSub + '...' : label;
}

export function genPortLabel(label: string, lang: string, nodeWidth: number) {
  let labelSub = label?.substring(0, nodeWidth / 7 - 10);
  if (lang === 'zh') {
    labelSub = label?.substring(0, nodeWidth / 12 - 10);
  }
  return label !== labelSub ? labelSub + '...' : label;
}

export function genLifeCycleModelJsonOrdered(id: string, data: any, oldData: any) {
  const nodes = data?.model?.nodes?.map((n: any, index: number) => {
    return {
      ...n,
      '@dataSetInternalID': index.toString(),
    };
  });

  let referenceToReferenceProcess = null;
  const processInstance = nodes?.map((n: any) => {
    if (n?.data?.quantitativeReference === '1') {
      referenceToReferenceProcess = n?.['@dataSetInternalID'];
    }

    const sourceEdges = data?.model?.edges?.filter((e: any) => e?.source?.cell === n?.id);

    const sourceEdgeGroupeds = sourceEdges.reduce((acc: any, edge: any) => {
      const key = edge?.data?.connection?.outputExchange?.['@flowUUID'];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(edge);
      return acc;
    }, {});

    const outputExchange = Object.entries(sourceEdgeGroupeds).map(([key, edges]) => {
      const downstreamProcesses = jsonToList(edges)?.map((e: any) => {
        const targetNode = nodes?.find((n: any) => n?.id === e?.target?.cell);
        return {
          '@flowUUID': e?.data?.connection?.outputExchange?.downstreamProcess?.['@flowUUID'],
          '@id': targetNode?.['@dataSetInternalID'],
        };
      });
      return {
        '@flowUUID': key,
        downstreamProcess: listToJson(downstreamProcesses),
      };
    });

    return removeEmptyObjects({
      '@dataSetInternalID': n?.['@dataSetInternalID'] ?? {},
      '@multiplicationFactor': n?.data?.multiplicationFactor ?? {},
      scalingFactor: n?.data?.scalingFactor,
      referenceToProcess: {
        '@refObjectId': n?.data?.id ?? {},
        '@type': 'process data set',
        '@uri': '../processes/' + n?.data?.id + '.xml',
        '@version': n?.data?.version ?? {},
        'common:shortDescription': n?.data?.shortDescription ?? {},
      },
      groups: {},
      parameters: {},
      connections: {
        outputExchange: listToJson(outputExchange),
      },
    });
  });

  return removeEmptyObjects({
    lifeCycleModelDataSet: {
      '@xmlns': oldData?.lifeCycleModelDataSet?.['@xmlns'],
      '@xmlns:acme': oldData?.lifeCycleModelDataSet?.['@xmlns:acme'],
      '@xmlns:common': oldData?.lifeCycleModelDataSet?.['@xmlns:common'],
      '@xmlns:ecn': oldData?.lifeCycleModelDataSet?.['@xmlns:ecn'],
      '@xmlns:xsi': oldData?.lifeCycleModelDataSet?.['@xmlns:xsi'],
      '@locations': oldData?.lifeCycleModelDataSet?.['@locations'],
      '@version': oldData?.lifeCycleModelDataSet?.['@version'],
      '@xsi:schemaLocation': oldData?.lifeCycleModelDataSet?.['@xsi:schemaLocation'],
      lifeCycleModelInformation: {
        dataSetInformation: {
          'common:UUID': id,
          name: {
            baseName: getLangJson(
              data?.lifeCycleModelInformation?.dataSetInformation?.name?.baseName,
            ),
            treatmentStandardsRoutes: getLangJson(
              data?.lifeCycleModelInformation?.dataSetInformation?.name?.treatmentStandardsRoutes,
            ),
            mixAndLocationTypes: getLangJson(
              data?.lifeCycleModelInformation?.dataSetInformation?.name?.mixAndLocationTypes,
            ),
            functionalUnitFlowProperties: getLangJson(
              data?.lifeCycleModelInformation?.dataSetInformation?.name
                ?.functionalUnitFlowProperties,
            ),
          },
          identifierOfSubDataSet:
            data?.lifeCycleModelInformation?.dataSetInformation?.identifierOfSubDataSet,
          'common:synonyms': getLangJson(
            data?.lifeCycleModelInformation?.dataSetInformation?.['common:synonyms'],
          ),
          classificationInformation: {
            'common:classification': {
              'common:class': classificationToJsonList(
                data?.lifeCycleModelInformation?.dataSetInformation?.classificationInformation?.[
                  'common:classification'
                ]?.['common:class'],
              ),
            },
          },
          referenceToResultingProcess: {
            '@refObjectId':
              data?.lifeCycleModelInformation?.dataSetInformation?.referenceToResultingProcess?.[
                '@refObjectId'
              ],
            '@type':
              data?.lifeCycleModelInformation?.dataSetInformation?.referenceToResultingProcess?.[
                '@type'
              ],
            '@uri':
              data?.lifeCycleModelInformation?.dataSetInformation?.referenceToResultingProcess?.[
                '@uri'
              ],
            '@version':
              data?.lifeCycleModelInformation?.dataSetInformation?.referenceToResultingProcess?.[
                '@version'
              ],
            'common:shortDescription': getLangJson(
              data?.lifeCycleModelInformation?.dataSetInformation?.referenceToResultingProcess?.[
                '@refObjectId'
              ],
            ),
          },
          'common:generalComment': getLangJson(
            data?.lifeCycleModelInformation?.dataSetInformation?.['common:generalComment'],
          ),
          referenceToExternalDocumentation: {
            '@refObjectId':
              data?.lifeCycleModelInformation?.dataSetInformation
                ?.referenceToExternalDocumentation?.['@refObjectId'],
            '@type':
              data?.lifeCycleModelInformation?.dataSetInformation
                ?.referenceToExternalDocumentation?.['@type'],
            '@uri':
              data?.lifeCycleModelInformation?.dataSetInformation
                ?.referenceToExternalDocumentation?.['@uri'],
            '@version':
              data?.lifeCycleModelInformation?.dataSetInformation
                ?.referenceToExternalDocumentation?.['@version'],
            'common:shortDescription': getLangJson(
              data?.lifeCycleModelInformation?.dataSetInformation
                ?.referenceToExternalDocumentation?.['@refObjectId'],
            ),
          },
        },
        quantitativeReference: {
          referenceToReferenceProcess: referenceToReferenceProcess ?? {},
        },
        time: {
          'common:referenceYear':
            data?.lifeCycleModelInformation?.time?.['common:referenceYear'] ?? {},
          'common:dataSetValidUntil':
            data?.lifeCycleModelInformation?.time?.['common:dataSetValidUntil'] ?? {},
          'common:timeRepresentativenessDescription': getLangJson(
            data?.lifeCycleModelInformation?.time?.['common:timeRepresentativenessDescription'],
          ),
        },
        geography: {
          locationOfOperationSupplyOrProduction: {
            '@location':
              data?.lifeCycleModelInformation?.geography?.locationOfOperationSupplyOrProduction?.[
                '@location'
              ] === 'NULL'
                ? {}
                : (data?.lifeCycleModelInformation?.geography
                    ?.locationOfOperationSupplyOrProduction?.['@location'] ?? {}),
            descriptionOfRestrictions: getLangJson(
              data?.lifeCycleModelInformation?.geography?.locationOfOperationSupplyOrProduction
                ?.descriptionOfRestrictions,
            ),
          },
          subLocationOfOperationSupplyOrProduction: {
            '@subLocation':
              data?.lifeCycleModelInformation?.geography
                ?.subLocationOfOperationSupplyOrProduction?.['@subLocation'] === 'NULL'
                ? {}
                : (data?.lifeCycleModelInformation?.geography
                    ?.subLocationOfOperationSupplyOrProduction?.['@subLocation'] ?? {}),
            descriptionOfRestrictions: getLangJson(
              data?.lifeCycleModelInformation?.geography?.subLocationOfOperationSupplyOrProduction
                ?.descriptionOfRestrictions,
            ),
          },
        },
        technology: {
          technologyDescriptionAndIncludedProcesses: getLangJson(
            data?.lifeCycleModelInformation?.technology?.technologyDescriptionAndIncludedProcesses,
          ),
          technologicalApplicability: getLangJson(
            data?.lifeCycleModelInformation?.technology?.technologicalApplicability,
          ),
          referenceToTechnologyPictogramme: {
            '@type':
              data?.lifeCycleModelInformation?.technology?.referenceToTechnologyPictogramme?.[
                '@type'
              ] ?? {},
            '@refObjectId':
              data?.lifeCycleModelInformation?.technology?.referenceToTechnologyPictogramme?.[
                '@refObjectId'
              ] ?? {},
            '@uri':
              data?.lifeCycleModelInformation?.technology?.referenceToTechnologyPictogramme?.[
                '@uri'
              ] ?? {},
            'common:shortDescription': getLangJson(
              data?.lifeCycleModelInformation?.technology?.referenceToTechnologyPictogramme?.[
                'common:shortDescription'
              ],
            ),
          },
          referenceToTechnologyFlowDiagrammOrPicture: {
            '@type':
              data?.lifeCycleModelInformation?.technology
                ?.referenceToTechnologyFlowDiagrammOrPicture?.['@type'] ?? {},
            '@refObjectId':
              data?.lifeCycleModelInformation?.technology
                ?.referenceToTechnologyFlowDiagrammOrPicture?.['@refObjectId'] ?? {},
            '@uri':
              data?.lifeCycleModelInformation?.technology
                ?.referenceToTechnologyFlowDiagrammOrPicture?.['@uri'] ?? {},
            'common:shortDescription': getLangJson(
              data?.lifeCycleModelInformation?.technology
                ?.referenceToTechnologyFlowDiagrammOrPicture?.['common:shortDescription'],
            ),
          },
          groupDeclarations: {},
          processes: {
            processInstance: listToJson(processInstance),
          },
          referenceToDiagram: {
            '@refObjectId':
              data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.['@refObjectId'],
            '@type': data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.['@type'],
            '@uri': data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.['@uri'],
            '@version':
              data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.['@version'],
            'common:shortDescription': getLangJson(
              data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.[
                'common:shortDescription'
              ],
            ),
          },
        },
        mathematicalRelations: {
          modelDescription: getLangJson(
            data?.lifeCycleModelInformation?.mathematicalRelations?.modelDescription,
          ),
          variableParameter: {
            '@name':
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.['@name'],
            formula:
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.formula,
            meanValue:
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.meanValue,
            minimumValue:
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                ?.minimumValue,
            maximumValue:
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                ?.maximumValue,
            uncertaintyDistributionType:
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                ?.uncertaintyDistributionType,
            relativeStandardDeviation95In:
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                ?.relativeStandardDeviation95In,
            comment:
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.comment,
          },
        },
      },
      modellingAndValidation: {
        dataSourcesTreatmentEtc: {
          useAdviceForDataSet: getLangJson(
            data?.modellingAndValidation?.dataSourcesTreatmentEtc?.useAdviceForDataSet,
          ),
        },
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
          modellingConstants: getLangJson(
            data?.modellingAndValidation?.LCIMethodAndAllocation?.modellingConstants,
          ),
          deviationsFromModellingConstants: getLangJson(
            data?.modellingAndValidation?.LCIMethodAndAllocation?.deviationsFromModellingConstants,
          ),
          referenceToLCAMethodDetails: {
            '@type':
              data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
                '@type'
              ] ?? {},
            '@refObjectId':
              data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
                '@refObjectId'
              ] ?? {},
            '@uri':
              data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
                '@uri'
              ] ?? {},
            '@version':
              data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
                '@version'
              ] ?? {},
            'common:shortDescription': getLangJson(
              data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
                'common:shortDescription'
              ],
            ),
          },
        },
        dataSourcesTreatmentAndRepresentativeness: {
          dataCutOffAndCompletenessPrinciples: getLangJson(
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.dataCutOffAndCompletenessPrinciples,
          ),
          deviationsFromCutOffAndCompletenessPrinciples: getLangJson(
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.deviationsFromCutOffAndCompletenessPrinciples,
          ),
          dataSelectionAndCombinationPrinciples: getLangJson(
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.dataSelectionAndCombinationPrinciples,
          ),
          deviationsFromSelectionAndCombinationPrinciples: getLangJson(
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.deviationsFromSelectionAndCombinationPrinciples,
          ),
          dataTreatmentAndExtrapolationsPrinciples: getLangJson(
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.dataTreatmentAndExtrapolationsPrinciples,
          ),
          deviationsFromTreatmentAndExtrapolationPrinciples: getLangJson(
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.deviationsFromTreatmentAndExtrapolationPrinciples,
          ),
          referenceToDataHandlingPrinciples: {
            '@type':
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataHandlingPrinciples?.['@type'] ?? {},
            '@refObjectId':
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataHandlingPrinciples?.['@refObjectId'] ?? {},
            '@uri':
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataHandlingPrinciples?.['@uri'] ?? {},
            '@version':
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataHandlingPrinciples?.['@version'] ?? {},
            'common:shortDescription': getLangJson(
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataHandlingPrinciples?.['common:shortDescription'],
            ),
          },
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
          percentageSupplyOrProductionCovered:
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.percentageSupplyOrProductionCovered ?? {},
          annualSupplyOrProductionVolume: getLangJson(
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.annualSupplyOrProductionVolume,
          ),
          samplingProcedure: getLangJson(
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.samplingProcedure,
          ),
          dataCollectionPeriod: getLangJson(
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.dataCollectionPeriod,
          ),
          uncertaintyAdjustments: getLangJson(
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.uncertaintyAdjustments,
          ),
          // useAdviceForDataSet: getLangJson(
          //   data?.modellingAndValidation?.LCIMethodAndAllocation?.useAdviceForDataSet,
          // ),
        },
        completeness: {
          completenessProductModel:
            data?.modellingAndValidation?.completeness?.completenessProductModel,
          completenessElementaryFlows: {
            '@type':
              data?.modellingAndValidation?.completeness?.completenessElementaryFlows?.['@type'],
            '@value':
              data?.modellingAndValidation?.completeness?.completenessElementaryFlows?.['@value'],
          },
          completenessOtherProblemField: getLangJson(
            data?.modellingAndValidation?.completeness?.completenessOtherProblemField,
          ),
          // completenessDescription: getLangJson(
          //   data?.modellingAndValidation?.completeness?.completenessDescription,
          // ),
        },
        validation: {
          review: listToJson(
            data?.modellingAndValidation?.validation?.review?.map((review: any) => {
              return {
                '@type': review?.['@type'] ?? {},
                'common:scope': listToJson(
                  review?.['common:scope']?.map((scope: any) => {
                    return {
                      '@name': scope?.['@name'] ?? {},
                      'common:method': {
                        '@name': scope?.['common:method']?.['@name'] ?? {},
                      },
                    };
                  }),
                ),
                'common:dataQualityIndicators': {
                  'common:dataQualityIndicator': listToJson(
                    review?.['common:dataQualityIndicators']?.['common:dataQualityIndicator']?.map(
                      (dataQualityIndicator: any) => {
                        return {
                          '@name': dataQualityIndicator?.['@name'] ?? {},
                          '@value': dataQualityIndicator?.['@value'] ?? {},
                        };
                      },
                    ),
                  ),
                },
                'common:reviewDetails': getLangJson(review?.['common:reviewDetails']),
                'common:referenceToNameOfReviewerAndInstitution': {
                  '@refObjectId':
                    review?.['common:referenceToNameOfReviewerAndInstitution']?.['@refObjectId'] ??
                    {},
                  '@type':
                    review?.['common:referenceToNameOfReviewerAndInstitution']?.['@type'] ?? {},
                  '@uri':
                    review?.['common:referenceToNameOfReviewerAndInstitution']?.['@uri'] ?? {},
                  '@version':
                    review?.['common:referenceToNameOfReviewerAndInstitution']?.['@version'] ?? {},
                  'common:shortDescription': getLangJson(
                    review?.['common:referenceToNameOfReviewerAndInstitution']?.[
                      'common:shortDescription'
                    ],
                  ),
                },
                'common:otherReviewDetails': getLangJson(review?.['common:otherReviewDetails']),
                'common:referenceToCompleteReviewReport': {
                  '@refObjectId':
                    review?.['common:referenceToCompleteReviewReport']?.['@refObjectId'] ?? {},
                  '@type': review?.['common:referenceToCompleteReviewReport']?.['@type'] ?? {},
                  '@uri': review?.['common:referenceToCompleteReviewReport']?.['@uri'] ?? {},
                  '@version':
                    review?.['common:referenceToCompleteReviewReport']?.['@version'] ?? {},
                  'common:shortDescription': getLangJson(
                    review?.['common:referenceToCompleteReviewReport']?.['common:shortDescription'],
                  ),
                },
              };
            }),
          ),
        },
        complianceDeclarations: {
          compliance: listToJson(
            data?.modellingAndValidation?.complianceDeclarations?.compliance?.map(
              (compliance: any) => {
                return {
                  'common:referenceToComplianceSystem': {
                    '@refObjectId':
                      compliance?.['common:referenceToComplianceSystem']?.['@refObjectId'] ?? {},
                    '@type': compliance?.['common:referenceToComplianceSystem']?.['@type'] ?? {},
                    '@uri': compliance?.['common:referenceToComplianceSystem']?.['@uri'] ?? {},
                    '@version':
                      compliance?.['common:referenceToComplianceSystem']?.['@version'] ?? {},
                    'common:shortDescription': getLangJson(
                      compliance?.['common:referenceToComplianceSystem']?.[
                        'common:shortDescription'
                      ],
                    ),
                  },
                  'common:approvalOfOverallCompliance':
                    compliance?.['common:approvalOfOverallCompliance'] ?? {},
                  'common:nomenclatureCompliance':
                    compliance?.['common:nomenclatureCompliance'] ?? {},
                  'common:methodologicalCompliance':
                    compliance?.['common:methodologicalCompliance'] ?? {},
                  'common:reviewCompliance': compliance?.['common:reviewCompliance'] ?? {},
                  'common:documentationCompliance':
                    compliance?.['common:documentationCompliance'] ?? {},
                  'common:qualityCompliance': compliance?.['common:qualityCompliance'] ?? {},
                };
              },
            ),
          ),
        },
      },
      administrativeInformation: {
        'common:commissionerAndGoal': {
          'common:referenceToCommissioner': {
            '@refObjectId':
              data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                'common:referenceToCommissioner'
              ]?.['@refObjectId'],
            '@type':
              data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                'common:referenceToCommissioner'
              ]?.['@type'],
            '@uri':
              data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                'common:referenceToCommissioner'
              ]?.['@uri'],
            '@version':
              data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                'common:referenceToCommissioner'
              ]?.['@version'],
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                'common:referenceToCommissioner'
              ]?.['common:shortDescription'],
            ),
          },
          'common:project': getLangJson(
            data?.administrativeInformation?.['common:commissionerAndGoal']?.['common:project'],
          ),
          'common:intendedApplications': getLangJson(
            data?.administrativeInformation?.['common:commissionerAndGoal']?.[
              'common:intendedApplications'
            ],
          ),
        },
        dataGenerator: {
          'common:referenceToPersonOrEntityGeneratingTheDataSet': {
            '@refObjectId':
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['@refObjectId'],
            '@type':
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['@type'],
            '@uri':
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['@uri'],
            '@version':
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['@version'],
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['common:shortDescription'],
            ),
          },
        },
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
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
                'common:shortDescription'
              ],
            ),
          },
          'common:referenceToConvertedOriginalDataSetFrom': {
            '@refObjectId':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToConvertedOriginalDataSetFrom'
              ]?.['@refObjectId'],
            '@type':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToConvertedOriginalDataSetFrom'
              ]?.['@type'],
            '@uri':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToConvertedOriginalDataSetFrom'
              ]?.['@uri'],
            '@version':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToConvertedOriginalDataSetFrom'
              ]?.['@version'] ?? {},
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToConvertedOriginalDataSetFrom'
              ]?.['common:shortDescription'],
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
          'common:referenceToDataSetUseApproval': {
            '@refObjectId':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToDataSetUseApproval'
              ]?.['@refObjectId'],
            '@type':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToDataSetUseApproval'
              ]?.['@type'],
            '@uri':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToDataSetUseApproval'
              ]?.['@uri'],
            '@version':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToDataSetUseApproval'
              ]?.['@version'] ?? {},
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToDataSetUseApproval'
              ]?.['common:shortDescription'],
            ),
          },
        },
        publicationAndOwnership: {
          'common:dateOfLastRevision':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:dateOfLastRevision'
            ] ?? {},
          'common:dataSetVersion':
            data?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'],
          'common:permanentDataSetURI':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:permanentDataSetURI'
            ],
          'common:workflowAndPublicationStatus':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:workflowAndPublicationStatus'
            ] ?? {},
          'common:referenceToUnchangedRepublication': {
            '@refObjectId':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToUnchangedRepublication'
              ]?.['@refObjectId'] ?? {},
            '@type':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToUnchangedRepublication'
              ]?.['@type'] ?? {},
            '@uri':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToUnchangedRepublication'
              ]?.['@uri'] ?? {},
            '@version':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToUnchangedRepublication'
              ]?.['@version'] ?? {},
            'common:shortDescription': getLangList(
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToUnchangedRepublication'
              ]?.['common:shortDescription'],
            ),
          },
          'common:referenceToRegistrationAuthority': {
            '@refObjectId':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToRegistrationAuthority'
              ]?.['@refObjectId'] ?? {},
            '@type':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToRegistrationAuthority'
              ]?.['@type'] ?? {},
            '@uri':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToRegistrationAuthority'
              ]?.['@uri'] ?? {},
            '@version':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToRegistrationAuthority'
              ]?.['@version'] ?? {},
            'common:shortDescription': getLangList(
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToRegistrationAuthority'
              ]?.['common:shortDescription'],
            ),
          },
          'common:registrationNumber':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:registrationNumber'
            ] ?? {},
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
          'common:copyright':
            data?.administrativeInformation?.publicationAndOwnership?.['common:copyright'],
          'common:referenceToEntitiesWithExclusiveAccess': {
            '@refObjectId':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToEntitiesWithExclusiveAccess'
              ]?.['@refObjectId'],
            '@type':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToEntitiesWithExclusiveAccess'
              ]?.['@type'],
            '@uri':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToEntitiesWithExclusiveAccess'
              ]?.['@uri'],
            '@version':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToEntitiesWithExclusiveAccess'
              ]?.['@version'],
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToEntitiesWithExclusiveAccess'
              ]?.['common:shortDescription'],
            ),
          },
          'common:licenseType':
            data?.administrativeInformation?.publicationAndOwnership?.['common:licenseType'],
          'common:accessRestrictions': getLangJson(
            data?.administrativeInformation?.publicationAndOwnership?.['common:accessRestrictions'],
          ),
        },
      },
    },
  });
}

export function genLifeCycleModelInfoFromData(data: any) {
  return {
    lifeCycleModelInformation: {
      dataSetInformation: {
        'common:UUID': data?.lifeCycleModelInformation?.dataSetInformation?.['common:UUID'] ?? '-',
        name: {
          baseName: getLangList(
            data?.lifeCycleModelInformation?.dataSetInformation?.name?.baseName,
          ),
          treatmentStandardsRoutes: getLangList(
            data?.lifeCycleModelInformation?.dataSetInformation?.name?.treatmentStandardsRoutes,
          ),
          mixAndLocationTypes: getLangList(
            data?.lifeCycleModelInformation?.dataSetInformation?.name?.mixAndLocationTypes,
          ),
          functionalUnitFlowProperties: getLangList(
            data?.lifeCycleModelInformation?.dataSetInformation?.name?.functionalUnitFlowProperties,
          ),
        },
        identifierOfSubDataSet:
          data?.lifeCycleModelInformation?.dataSetInformation?.identifierOfSubDataSet,
        'common:synonyms': getLangList(
          data?.lifeCycleModelInformation?.dataSetInformation?.['common:synonyms'],
        ),
        classificationInformation: {
          'common:classification': {
            'common:class': classificationToStringList(
              data?.lifeCycleModelInformation?.dataSetInformation?.classificationInformation?.[
                'common:classification'
              ]?.['common:class'],
            ),
          },
        },
        referenceToResultingProcess: {
          '@refObjectId':
            data?.lifeCycleModelInformation?.dataSetInformation?.referenceToResultingProcess?.[
              '@refObjectId'
            ],
          '@type':
            data?.lifeCycleModelInformation?.dataSetInformation?.referenceToResultingProcess?.[
              '@type'
            ],
          '@uri':
            data?.lifeCycleModelInformation?.dataSetInformation?.referenceToResultingProcess?.[
              '@uri'
            ],
          '@version':
            data?.lifeCycleModelInformation?.dataSetInformation?.referenceToResultingProcess?.[
              '@version'
            ],
          'common:shortDescription': getLangList(
            data?.lifeCycleModelInformation?.dataSetInformation?.referenceToResultingProcess?.[
              '@refObjectId'
            ],
          ),
        },
        'common:generalComment': getLangList(
          data?.lifeCycleModelInformation?.dataSetInformation?.['common:generalComment'],
        ),
        referenceToExternalDocumentation: {
          '@refObjectId':
            data?.lifeCycleModelInformation?.dataSetInformation?.referenceToExternalDocumentation?.[
              '@refObjectId'
            ],
          '@type':
            data?.lifeCycleModelInformation?.dataSetInformation?.referenceToExternalDocumentation?.[
              '@type'
            ],
          '@uri':
            data?.lifeCycleModelInformation?.dataSetInformation?.referenceToExternalDocumentation?.[
              '@uri'
            ],
          '@version':
            data?.lifeCycleModelInformation?.dataSetInformation?.referenceToExternalDocumentation?.[
              '@version'
            ],
          'common:shortDescription': getLangList(
            data?.lifeCycleModelInformation?.dataSetInformation?.referenceToExternalDocumentation?.[
              '@refObjectId'
            ],
          ),
        },
      },
      quantitativeReference: {
        '@type': data?.lifeCycleModelInformation?.quantitativeReference?.['@type'] ?? {},
        referenceToReferenceFlow:
          data?.lifeCycleModelInformation?.quantitativeReference?.referenceToReferenceFlow ?? {},
        functionalUnitOrOther: getLangList(
          data?.lifeCycleModelInformation?.quantitativeReference?.functionalUnitOrOther,
        ),
        referenceToReferenceProcess:
          data?.lifeCycleModelInformation?.quantitativeReference?.referenceToReferenceProcess,
      },
      time: {
        'common:referenceYear':
          data?.lifeCycleModelInformation?.time?.['common:referenceYear'] ?? {},
        'common:dataSetValidUntil':
          data?.lifeCycleModelInformation?.time?.['common:dataSetValidUntil'] ?? {},
        'common:timeRepresentativenessDescription': getLangList(
          data?.lifeCycleModelInformation?.time?.['common:timeRepresentativenessDescription'],
        ),
      },
      geography: {
        locationOfOperationSupplyOrProduction: {
          '@location':
            data?.lifeCycleModelInformation?.geography?.locationOfOperationSupplyOrProduction?.[
              '@location'
            ] ?? {},
          descriptionOfRestrictions: getLangList(
            data?.lifeCycleModelInformation?.geography?.locationOfOperationSupplyOrProduction
              ?.descriptionOfRestrictions,
          ),
        },
        subLocationOfOperationSupplyOrProduction: {
          '@subLocation':
            data?.lifeCycleModelInformation?.geography?.subLocationOfOperationSupplyOrProduction?.[
              '@subLocation'
            ] ?? {},
          descriptionOfRestrictions: getLangList(
            data?.lifeCycleModelInformation?.geography?.subLocationOfOperationSupplyOrProduction
              ?.descriptionOfRestrictions,
          ),
        },
      },
      technology: {
        technologyDescriptionAndIncludedProcesses: getLangList(
          data?.lifeCycleModelInformation?.technology?.technologyDescriptionAndIncludedProcesses,
        ),
        technologicalApplicability: getLangList(
          data?.lifeCycleModelInformation?.technology?.technologicalApplicability,
        ),
        referenceToTechnologyPictogramme: {
          '@type':
            data?.lifeCycleModelInformation?.technology?.referenceToTechnologyPictogramme?.[
              '@type'
            ] ?? {},
          '@refObjectId':
            data?.lifeCycleModelInformation?.technology?.referenceToTechnologyPictogramme?.[
              '@refObjectId'
            ] ?? {},
          '@version':
            data?.lifeCycleModelInformation?.technology?.referenceToTechnologyPictogramme?.[
              '@version'
            ] ?? {},
          '@uri':
            data?.lifeCycleModelInformation?.technology?.referenceToTechnologyPictogramme?.[
              '@uri'
            ] ?? {},
          'common:shortDescription': getLangList(
            data?.lifeCycleModelInformation?.technology?.referenceToTechnologyPictogramme?.[
              'common:shortDescription'
            ],
          ),
        },
        referenceToTechnologyFlowDiagrammOrPicture: {
          '@type':
            data?.lifeCycleModelInformation?.technology
              ?.referenceToTechnologyFlowDiagrammOrPicture?.['@type'] ?? {},
          '@refObjectId':
            data?.lifeCycleModelInformation?.technology
              ?.referenceToTechnologyFlowDiagrammOrPicture?.['@refObjectId'] ?? {},
          '@version':
            data?.lifeCycleModelInformation?.technology
              ?.referenceToTechnologyFlowDiagrammOrPicture?.['@version'] ?? {},
          '@uri':
            data?.lifeCycleModelInformation?.technology
              ?.referenceToTechnologyFlowDiagrammOrPicture?.['@uri'] ?? {},
          'common:shortDescription': getLangList(
            data?.lifeCycleModelInformation?.technology
              ?.referenceToTechnologyFlowDiagrammOrPicture?.['common:shortDescription'],
          ),
        },
        groupDeclarations: {},
        processes: {
          processInstance: {},
        },
        referenceToDiagram: {
          '@refObjectId':
            data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.['@refObjectId'],
          '@type': data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.['@type'],
          '@uri': data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.['@uri'],
          '@version': data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.['@version'],
          'common:shortDescription': getLangList(
            data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.[
              'common:shortDescription'
            ],
          ),
        },
      },
      mathematicalRelations: {
        modelDescription: getLangList(
          data?.lifeCycleModelInformation?.mathematicalRelations?.modelDescription,
        ),
        variableParameter: {
          '@name':
            data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.['@name'],
          formula:
            data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.formula,
          meanValue:
            data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.meanValue,
          minimumValue:
            data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.minimumValue,
          maximumValue:
            data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.maximumValue,
          uncertaintyDistributionType:
            data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
              ?.uncertaintyDistributionType,
          relativeStandardDeviation95In:
            data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
              ?.relativeStandardDeviation95In,
          comment:
            data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.comment,
        },
      },
    },
    modellingAndValidation: {
      dataSourcesTreatmentEtc: {
        useAdviceForDataSet: getLangList(
          data?.modellingAndValidation?.dataSourcesTreatmentEtc?.useAdviceForDataSet,
        ),
      },
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
        modellingConstants: getLangList(
          data?.modellingAndValidation?.LCIMethodAndAllocation?.modellingConstants,
        ),
        deviationsFromModellingConstants: getLangList(
          data?.modellingAndValidation?.LCIMethodAndAllocation?.deviationsFromModellingConstants,
        ),
        referenceToLCAMethodDetails: {
          '@type':
            data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
              '@type'
            ] ?? {},
          '@refObjectId':
            data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
              '@refObjectId'
            ] ?? {},
          '@uri':
            data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
              '@uri'
            ] ?? {},
          '@version':
            data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
              '@version'
            ] ?? {},
          'common:shortDescription': getLangJson(
            data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
              'common:shortDescription'
            ],
          ),
        },
      },
      dataSourcesTreatmentAndRepresentativeness: {
        dataCutOffAndCompletenessPrinciples: getLangList(
          data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
            ?.dataCutOffAndCompletenessPrinciples,
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
        referenceToDataHandlingPrinciples: {
          '@type':
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.referenceToDataHandlingPrinciples?.['@type'] ?? {},
          '@refObjectId':
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.referenceToDataHandlingPrinciples?.['@refObjectId'] ?? {},
          '@uri':
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.referenceToDataHandlingPrinciples?.['@uri'] ?? {},
          '@version':
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.referenceToDataHandlingPrinciples?.['@version'] ?? {},
          'common:shortDescription': getLangJson(
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.referenceToDataHandlingPrinciples?.['common:shortDescription'],
          ),
        },
        referenceToDataSource: {
          '@type':
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.referenceToDataSource?.['@type'] ?? {},
          '@refObjectId':
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.referenceToDataSource?.['@refObjectId'] ?? {},
          '@version':
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.referenceToDataSource?.['@version'] ?? {},
          '@uri':
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.referenceToDataSource?.['@uri'] ?? {},
          'common:shortDescription': getLangList(
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.referenceToDataSource?.['common:shortDescription'],
          ),
        },
        percentageSupplyOrProductionCovered:
          data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
            ?.percentageSupplyOrProductionCovered ?? {},
        annualSupplyOrProductionVolume: getLangList(
          data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
            ?.annualSupplyOrProductionVolume,
        ),
        samplingProcedure: getLangList(
          data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
            ?.samplingProcedure,
        ),
        dataCollectionPeriod: getLangList(
          data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
            ?.dataCollectionPeriod,
        ),
        uncertaintyAdjustments: getLangList(
          data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
            ?.uncertaintyAdjustments,
        ),
        // useAdviceForDataSet: getLangList(
        //   data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
        //     ?.useAdviceForDataSet,
        // ),
      },
      completeness: {
        completenessProductModel:
          data?.modellingAndValidation?.completeness?.completenessProductModel,
        completenessElementaryFlows: {
          '@type':
            data?.modellingAndValidation?.completeness?.completenessElementaryFlows?.['@type'],
          '@value':
            data?.modellingAndValidation?.completeness?.completenessElementaryFlows?.['@value'],
        },
        completenessOtherProblemField: getLangList(
          data?.modellingAndValidation?.completeness?.completenessOtherProblemField,
        ),
        // completenessDescription: getLangList(
        //   data?.modellingAndValidation?.completeness?.completenessDescription,
        // ),
      },
      validation: {
        review: jsonToList(data?.modellingAndValidation?.validation?.review).map((review: any) => {
          return {
            '@type': review?.['@type'],
            'common:scope': jsonToList(review?.['common:scope']),
            'common:dataQualityIndicators': {
              'common:dataQualityIndicator': jsonToList(
                review?.['common:dataQualityIndicators']?.['common:dataQualityIndicator'],
              ),
            },
            'common:reviewDetails': getLangList(review?.['common:reviewDetails']),
            'common:referenceToNameOfReviewerAndInstitution': {
              '@refObjectId':
                review?.['common:referenceToNameOfReviewerAndInstitution']?.['@refObjectId'],
              '@type': review?.['common:referenceToNameOfReviewerAndInstitution']?.['@type'],
              '@uri': review?.['common:referenceToNameOfReviewerAndInstitution']?.['@uri'],
              '@version': review?.['common:referenceToNameOfReviewerAndInstitution']?.['@version'],
              'common:shortDescription': getLangList(
                review?.['common:referenceToNameOfReviewerAndInstitution']?.[
                  'common:shortDescription'
                ],
              ),
            },
            'common:otherReviewDetails': getLangList(review?.['common:otherReviewDetails']),
            'common:referenceToCompleteReviewReport': {
              '@refObjectId': review?.['common:referenceToCompleteReviewReport']?.['@refObjectId'],
              '@type': review?.['common:referenceToCompleteReviewReport']?.['@type'],
              '@uri': review?.['common:referenceToCompleteReviewReport']?.['@uri'],
              '@version': review?.['common:referenceToCompleteReviewReport']?.['@version'],
              'common:shortDescription': getLangList(
                review?.['common:referenceToCompleteReviewReport']?.['common:shortDescription'],
              ),
            },
          };
        }),
      },
      complianceDeclarations: {
        compliance: jsonToList(
          data?.modellingAndValidation?.complianceDeclarations?.compliance,
        ).map((compliance: any) => {
          return {
            'common:referenceToComplianceSystem': {
              '@refObjectId': compliance?.['common:referenceToComplianceSystem']?.['@refObjectId'],
              '@type': compliance?.['common:referenceToComplianceSystem']?.['@type'],
              '@uri': compliance?.['common:referenceToComplianceSystem']?.['@uri'],
              '@version': compliance?.['common:referenceToComplianceSystem']?.['@version'],
              'common:shortDescription': getLangList(
                compliance?.['common:referenceToComplianceSystem']?.['common:shortDescription'],
              ),
            },
            'common:approvalOfOverallCompliance':
              compliance?.['common:approvalOfOverallCompliance'],
            'common:nomenclatureCompliance': compliance?.['common:nomenclatureCompliance'],
            'common:methodologicalCompliance': compliance?.['common:methodologicalCompliance'],
            'common:reviewCompliance': compliance?.['common:reviewCompliance'],
            'common:documentationCompliance': compliance?.['common:documentationCompliance'],
            'common:qualityCompliance': compliance?.['common:qualityCompliance'],
          };
        }),
      },
    },
    administrativeInformation: {
      'common:commissionerAndGoal': {
        'common:referenceToCommissioner': {
          '@refObjectId':
            data?.administrativeInformation?.['common:commissionerAndGoal']?.[
              'common:referenceToCommissioner'
            ]?.['@refObjectId'],
          '@type':
            data?.administrativeInformation?.['common:commissionerAndGoal']?.[
              'common:referenceToCommissioner'
            ]?.['@type'],
          '@uri':
            data?.administrativeInformation?.['common:commissionerAndGoal']?.[
              'common:referenceToCommissioner'
            ]?.['@uri'],
          '@version':
            data?.administrativeInformation?.['common:commissionerAndGoal']?.[
              'common:referenceToCommissioner'
            ]?.['@version'],
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.['common:commissionerAndGoal']?.[
              'common:referenceToCommissioner'
            ]?.['common:shortDescription'],
          ),
        },
        'common:project': getLangList(
          data?.administrativeInformation?.['common:commissionerAndGoal']?.['common:project'],
        ),
        'common:intendedApplications': getLangList(
          data?.administrativeInformation?.['common:commissionerAndGoal']?.[
            'common:intendedApplications'
          ],
        ),
      },
      dataGenerator: {
        'common:referenceToPersonOrEntityGeneratingTheDataSet': {
          '@refObjectId':
            data?.administrativeInformation?.dataGenerator?.[
              'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]?.['@refObjectId'],
          '@type':
            data?.administrativeInformation?.dataGenerator?.[
              'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]?.['@type'],
          '@uri':
            data?.administrativeInformation?.dataGenerator?.[
              'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]?.['@uri'],
          '@version':
            data?.administrativeInformation?.dataGenerator?.[
              'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]?.['@version'],
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.dataGenerator?.[
              'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]?.['common:shortDescription'],
          ),
        },
      },
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
        'common:referenceToConvertedOriginalDataSetFrom': {
          '@refObjectId':
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToConvertedOriginalDataSetFrom'
            ]?.['@refObjectId'],
          '@type':
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToConvertedOriginalDataSetFrom'
            ]?.['@type'],
          '@uri':
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToConvertedOriginalDataSetFrom'
            ]?.['@uri'],
          '@version':
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToConvertedOriginalDataSetFrom'
            ]?.['@version'] ?? {},
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToConvertedOriginalDataSetFrom'
            ]?.['common:shortDescription'],
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
        'common:referenceToDataSetUseApproval': {
          '@refObjectId':
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToDataSetUseApproval'
            ]?.['@refObjectId'],
          '@type':
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToDataSetUseApproval'
            ]?.['@type'],
          '@uri':
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToDataSetUseApproval'
            ]?.['@uri'],
          '@version':
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToDataSetUseApproval'
            ]?.['@version'] ?? {},
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.dataEntryBy?.[
              'common:referenceToDataSetUseApproval'
            ]?.['common:shortDescription'],
          ),
        },
      },
      publicationAndOwnership: {
        'common:dateOfLastRevision':
          data?.administrativeInformation?.publicationAndOwnership?.['common:dateOfLastRevision'] ??
          {},
        'common:dataSetVersion':
          data?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'],
        'common:permanentDataSetURI':
          data?.administrativeInformation?.publicationAndOwnership?.['common:permanentDataSetURI'],
        'common:workflowAndPublicationStatus':
          data?.administrativeInformation?.publicationAndOwnership?.[
            'common:workflowAndPublicationStatus'
          ] ?? {},
        'common:referenceToUnchangedRepublication': {
          '@refObjectId':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToUnchangedRepublication'
            ]?.['@refObjectId'] ?? {},
          '@type':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToUnchangedRepublication'
            ]?.['@type'] ?? {},
          '@uri':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToUnchangedRepublication'
            ]?.['@uri'] ?? {},
          '@version':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToUnchangedRepublication'
            ]?.['@version'] ?? {},
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToUnchangedRepublication'
            ]?.['common:shortDescription'],
          ),
        },
        'common:referenceToRegistrationAuthority': {
          '@refObjectId':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToRegistrationAuthority'
            ]?.['@refObjectId'] ?? {},
          '@type':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToRegistrationAuthority'
            ]?.['@type'] ?? {},
          '@uri':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToRegistrationAuthority'
            ]?.['@uri'] ?? {},
          '@version':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToRegistrationAuthority'
            ]?.['@version'] ?? {},
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToRegistrationAuthority'
            ]?.['common:shortDescription'],
          ),
        },
        'common:registrationNumber':
          data?.administrativeInformation?.publicationAndOwnership?.['common:registrationNumber'],
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
        'common:copyright':
          data?.administrativeInformation?.publicationAndOwnership?.['common:copyright'],
        'common:referenceToEntitiesWithExclusiveAccess': {
          '@refObjectId':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToEntitiesWithExclusiveAccess'
            ]?.['@refObjectId'],
          '@type':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToEntitiesWithExclusiveAccess'
            ]?.['@type'],
          '@uri':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToEntitiesWithExclusiveAccess'
            ]?.['@uri'],
          '@version':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToEntitiesWithExclusiveAccess'
            ]?.['@version'],
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToEntitiesWithExclusiveAccess'
            ]?.['common:shortDescription'],
          ),
        },
        'common:licenseType':
          data?.administrativeInformation?.publicationAndOwnership?.['common:licenseType'],
        'common:accessRestrictions': getLangList(
          data?.administrativeInformation?.publicationAndOwnership?.['common:accessRestrictions'],
        ),
      },
    },
  };
}

export function genLifeCycleModelData(data: any, lang: string) {
  return {
    nodes:
      data?.xflow?.nodes?.map((node: any) => {
        const nodeWidth = node.width;
        const label = genProcessName(node?.data?.label, lang);
        return {
          ...node,
          label: genNodeLabel(label ?? '', lang, nodeWidth),
          ports: {
            ...node?.ports,
            items: node?.ports?.items?.map((item: any) => {
              const itemText = item?.data?.textLang
                ? getLangText(item?.data?.textLang, lang)
                : item?.attrs?.text?.text;
              return {
                ...item,
                attrs: {
                  ...item?.attrs,
                  text: {
                    text: genPortLabel(itemText ?? '', lang, nodeWidth),
                    title: itemText,
                  },
                },
              };
            }),
          },
        };
      }) ?? [],
    edges: data?.xflow?.edges ?? [],
  };
}

const calculateProcessExchange = (
  modelProcess: any,
  dependProcess: any,
  targetAmount: number,
  connectionFlowId: string,
  connectionDirection: string,
  nodeTreeIds: any[],
  modelProcesses: any[],
  dbProcessExchanges: any[],
) => {
  if (nodeTreeIds.includes(modelProcess?.['@dataSetInternalID'])) {
    return undefined;
  }

  const thisNodeTreeIds = [...nodeTreeIds, modelProcess?.['@dataSetInternalID']];

  let newProcessExchanges: any[] = [];

  const dbPE = dbProcessExchanges?.find(
    (p: any) => p?.id === modelProcess?.referenceToProcess?.['@refObjectId'],
  );

  let scalingFactor = 1;
  if (dependProcess === null) {
    const thisRefFlow = dbPE?.exchange?.find(
      (e: any) =>
        dbPE?.quantitativeReference?.referenceToReferenceFlow === e?.['@dataSetInternalID'],
    );
    const thisRefMeanAmount = toAmountNumber(thisRefFlow?.meanAmount);
    if (thisRefMeanAmount !== 0 && targetAmount !== 0) {
      scalingFactor = targetAmount / thisRefMeanAmount;
    }
  } else {
    const thisRefFlow = dbPE?.exchange?.find(
      (e: any) =>
        e?.referenceToFlowDataSet?.['@refObjectId'] === connectionFlowId &&
        e?.exchangeDirection.toUpperCase() === connectionDirection,
    );
    const thisRefMeanAmount = toAmountNumber(thisRefFlow?.meanAmount);
    if (thisRefMeanAmount !== 0 && targetAmount !== 0) {
      scalingFactor = targetAmount / thisRefMeanAmount;
    }
  }

  const outputExchanges = jsonToList(modelProcess?.connections?.outputExchange);

  const outputFlowIds = outputExchanges
    .map((o: any) => {
      const downstreamProcesses = jsonToList(o?.downstreamProcess);
      if (connectionDirection !== 'OUTPUT') {
        if (downstreamProcesses.length !== 1) {
          return null;
        } else {
          const dsModelProcess = modelProcesses.find(
            (p: any) => p?.['@dataSetInternalID'] === downstreamProcesses[0]?.['@id'],
          );
          const connectionOutputFlow = dbPE.exchange?.find((e: any) => {
            return (
              e?.referenceToFlowDataSet?.['@refObjectId'] === o?.['@flowUUID'] &&
              e?.exchangeDirection.toUpperCase() === 'OUTPUT'
            );
          });
          const outputFlowMeanAmount =
            toAmountNumber(connectionOutputFlow?.meanAmount) * scalingFactor;
          const outputPE = calculateProcessExchange(
            dsModelProcess,
            modelProcess,
            outputFlowMeanAmount,
            o?.['@flowUUID'],
            'INPUT',
            thisNodeTreeIds,
            modelProcesses,
            dbProcessExchanges,
          );

          if (outputPE) {
            newProcessExchanges.push(...outputPE);
            return o?.['@flowUUID'];
          } else {
            return null;
          }
        }
      } else {
        if (o?.['@flowUUID'] !== connectionFlowId) {
          if (downstreamProcesses.length !== 1) {
            return null;
          } else {
            const dsModelProcess = modelProcesses.find(
              (p: any) => p?.['@dataSetInternalID'] === downstreamProcesses[0]?.['@id'],
            );
            const connectionOutputFlow = dbPE.exchange?.find((e: any) => {
              return (
                e?.referenceToFlowDataSet?.['@refObjectId'] === o?.['@flowUUID'] &&
                e?.exchangeDirection.toUpperCase() === 'OUTPUT'
              );
            });
            const outputFlowMeanAmount =
              toAmountNumber(connectionOutputFlow?.meanAmount) * scalingFactor;
            const outputPE = calculateProcessExchange(
              dsModelProcess,
              modelProcess,
              outputFlowMeanAmount,
              o?.['@flowUUID'],
              'INPUT',
              thisNodeTreeIds,
              modelProcesses,
              dbProcessExchanges,
            );
            if (outputPE) {
              newProcessExchanges.push(...outputPE);
              return o?.['@flowUUID'];
            } else {
              return null;
            }
          }
        } else {
          return o?.['@flowUUID'];
        }
      }
    })
    .filter((outputFlowId: any) => outputFlowId !== null);

  const upstreamModelProcesses = modelProcesses.filter((mp: any) =>
    jsonToList(mp?.connections?.outputExchange)?.some((o: any) =>
      jsonToList(o?.downstreamProcess)?.some(
        (dp: any) => dp?.['@id'] === modelProcess?.['@dataSetInternalID'],
      ),
    ),
  );

  const inputFlowIds = upstreamModelProcesses
    .map((usModelProcess: any) => {
      if (usModelProcess?.['@dataSetInternalID'] === dependProcess?.['@dataSetInternalID']) {
        return connectionFlowId;
      } else {
        const upstreamModelProcessOutputExchanges = jsonToList(
          usModelProcess?.connections?.outputExchange,
        );
        const upstreamModelProcessOutputExchangesFilter =
          upstreamModelProcessOutputExchanges.filter((o: any) =>
            jsonToList(o?.downstreamProcess)?.some(
              (dp: any) => dp?.['@id'] === modelProcess?.['@dataSetInternalID'],
            ),
          );

        if (upstreamModelProcessOutputExchangesFilter.length !== 1) {
          return null;
        } else {
          const upstreamModelProcessOutputExchange = upstreamModelProcessOutputExchangesFilter[0];
          if (
            upstreamModelProcessOutputExchange?.['@flowUUID'] === connectionFlowId &&
            connectionDirection === 'INPUT'
          ) {
            return null;
          } else {
            const usModelProcessRepeated = upstreamModelProcesses.filter((usmp: any) => {
              const connectionOutputExchange = jsonToList(usmp?.connections?.outputExchange)?.find(
                (o: any) => o?.['@flowUUID'] === upstreamModelProcessOutputExchange?.['@flowUUID'],
              );
              if (connectionOutputExchange) {
                const connectionDownstreamProcess = jsonToList(
                  connectionOutputExchange?.downstreamProcess,
                )?.some((dp: any) => dp?.['@id'] === modelProcess?.['@dataSetInternalID']);
                if (connectionDownstreamProcess) {
                  return true;
                } else {
                  return false;
                }
              } else {
                return false;
              }
            });
            if (usModelProcessRepeated?.length !== 1) {
              return null;
            } else {
              const connectionInputFlow = dbPE?.exchange?.find((e: any) => {
                return (
                  e?.referenceToFlowDataSet?.['@refObjectId'] ===
                    upstreamModelProcessOutputExchange?.['@flowUUID'] &&
                  e?.exchangeDirection.toUpperCase() === 'INPUT'
                );
              });
              const inputFlowMeanAmount =
                toAmountNumber(connectionInputFlow?.meanAmount) * scalingFactor;
              const inputPE = calculateProcessExchange(
                usModelProcess,
                modelProcess,
                inputFlowMeanAmount,
                upstreamModelProcessOutputExchange?.['@flowUUID'],
                'OUTPUT',
                thisNodeTreeIds,
                modelProcesses,
                dbProcessExchanges,
              );
              if (inputPE) {
                newProcessExchanges.push(...inputPE);
                return upstreamModelProcessOutputExchange?.['@flowUUID'];
              } else {
                return null;
              }
            }
          }
        }
      }
    })
    .filter((inputFlowId: any) => inputFlowId !== null);

  const newProcessExchange = {
    processId: modelProcess?.referenceToProcess?.['@refObjectId'],
    scalingFactor: scalingFactor,
    exchange: dbPE.exchange,
    connectionFlow: {
      outputFlowIds: outputFlowIds,
      inputFlowIds: inputFlowIds,
    },
  };

  newProcessExchanges.push(newProcessExchange);

  return newProcessExchanges;
};

const sumProcessExchange = (processExchange: any[]) => {
  let allExchange: any[] = [];
  processExchange?.forEach((pe: any) => {
    pe?.exchange?.forEach((e: any) => {
      if (
        e?.exchangeDirection.toUpperCase() === 'OUTPUT' &&
        !pe?.connectionFlow?.outputFlowIds?.includes(e?.referenceToFlowDataSet?.['@refObjectId'])
      ) {
        const newAmount = e?.meanAmount * pe?.scalingFactor;
        const newExchange = {
          ...e,
          meanAmount: newAmount,
          resultingAmount: newAmount,
        };
        allExchange.push(newExchange);
      } else if (
        e?.exchangeDirection.toUpperCase() === 'INPUT' &&
        !pe?.connectionFlow?.inputFlowIds?.includes(e?.referenceToFlowDataSet?.['@refObjectId'])
      ) {
        const newAmount = e?.meanAmount * pe?.scalingFactor;
        const newExchange = {
          ...e,
          meanAmount: newAmount,
          resultingAmount: newAmount,
        };
        allExchange.push(newExchange);
      }
    });
  });
  const sumData =
    allExchange?.reduce((acc, curr) => {
      const cId =
        curr?.exchangeDirection.toUpperCase() +
        '_' +
        curr?.referenceToFlowDataSet?.['@refObjectId'];
      if (!acc[cId]) {
        acc[cId] = { ...curr };
      } else {
        acc[cId].meanAmount += curr.meanAmount;
        acc[cId].resultingAmount += curr.resultingAmount;
      }
      return acc;
    }, []) ?? [];
  const sumDataList = Object.values(sumData);
  return sumDataList?.map((d: any, index: number) => {
    return {
      ...d,
      meanAmount: d?.meanAmount.toString(),
      resultingAmount: d?.resultingAmount.toString(),
      '@dataSetInternalID': (index + 1).toString(),
    };
  });
};

export async function genLifeCycleModelProcess(id: string, refNode: any, data: any, oldData: any) {
  let processIds: any[] = [];
  const processInstance =
    jsonToList(data?.lifeCycleModelInformation?.technology?.processes?.processInstance)?.map(
      (p: any) => {
        if (p?.referenceToProcess?.['@refObjectId']) {
          processIds.push(p?.referenceToProcess?.['@refObjectId']);
        }
        return {
          ...p,
          connections: {
            ...p?.connections,
            outputExchange: jsonToList(p?.connections?.outputExchange),
          },
        };
      },
    ) ?? [];

  const dbProcessExchanges =
    (
      await supabase
        .from('processes')
        .select(
          `
      id,
      json->processDataSet->processInformation->quantitativeReference,
      json->processDataSet->exchanges->exchange
      `,
        )
        .in('id', processIds)
    )?.data ?? [];

  let sumExchange: any = [];

  const referenceToReferenceProcess =
    data?.lifeCycleModelInformation?.quantitativeReference?.referenceToReferenceProcess;

  const referenceProcess = processInstance.find(
    (p: any) => p?.['@dataSetInternalID'] === referenceToReferenceProcess,
  );

  const dbReferenceProcess = dbProcessExchanges.find(
    (p: any) => p?.id === referenceProcess?.referenceToProcess?.['@refObjectId'],
  ) as any;

  const thisFlowQuantitativeReference = dbReferenceProcess?.exchange?.find(
    (e: any) =>
      e?.['@dataSetInternalID'] ===
      dbReferenceProcess?.quantitativeReference?.referenceToReferenceFlow,
  );

  const targetAmount = Number(refNode?.data?.targetAmount ?? '0');

  if (referenceProcess) {
    const calculatePE = calculateProcessExchange(
      referenceProcess,
      null,
      targetAmount,
      '',
      '',
      [],
      processInstance,
      dbProcessExchanges,
    );

    sumExchange = sumProcessExchange(calculatePE ?? []);
  }

  const referenceToReferenceFlow = sumExchange?.find(
    (e: any) =>
      e?.exchangeDirection.toUpperCase() ===
        thisFlowQuantitativeReference?.exchangeDirection.toUpperCase() &&
      e?.referenceToFlowDataSet?.['@refObjectId'] ===
        thisFlowQuantitativeReference?.referenceToFlowDataSet?.['@refObjectId'],
  );

  const newData = removeEmptyObjects({
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
            baseName: data?.lifeCycleModelInformation?.dataSetInformation?.name?.baseName,
            treatmentStandardsRoutes:
              data?.lifeCycleModelInformation?.dataSetInformation?.name?.treatmentStandardsRoutes,
            mixAndLocationTypes:
              data?.lifeCycleModelInformation?.dataSetInformation?.name?.mixAndLocationTypes,
            functionalUnitFlowProperties:
              data?.lifeCycleModelInformation?.dataSetInformation?.name
                ?.functionalUnitFlowProperties,
          },
          identifierOfSubDataSet:
            data?.lifeCycleModelInformation?.dataSetInformation?.identifierOfSubDataSet,
          'common:synonyms':
            data?.lifeCycleModelInformation?.dataSetInformation?.['common:synonyms'],
          classificationInformation: {
            'common:classification': {
              'common:class':
                data?.lifeCycleModelInformation?.dataSetInformation?.classificationInformation?.[
                  'common:classification'
                ]?.['common:class'],
            },
          },
          'common:generalComment':
            data?.lifeCycleModelInformation?.dataSetInformation?.['common:generalComment'],
          referenceToExternalDocumentation: {
            '@refObjectId':
              data?.lifeCycleModelInformation?.dataSetInformation
                ?.referenceToExternalDocumentation?.['@refObjectId'] ?? {},
            '@type':
              data?.lifeCycleModelInformation?.dataSetInformation
                ?.referenceToExternalDocumentation?.['@type'] ?? {},
            '@uri':
              data?.lifeCycleModelInformation?.dataSetInformation
                ?.referenceToExternalDocumentation?.['@uri'] ?? {},
            '@version':
              data?.lifeCycleModelInformation?.dataSetInformation
                ?.referenceToExternalDocumentation?.['@version'] ?? {},
            'common:shortDescription':
              data?.lifeCycleModelInformation?.dataSetInformation
                ?.referenceToExternalDocumentation?.['common:shortDescription'],
          },
        },
        quantitativeReference: {
          '@type': dbReferenceProcess?.quantitativeReference?.['@type'],
          referenceToReferenceFlow: referenceToReferenceFlow?.['@dataSetInternalID'],
          functionalUnitOrOther: dbReferenceProcess?.quantitativeReference?.functionalUnitOrOther,
        },
        time: {
          'common:referenceYear':
            data?.lifeCycleModelInformation?.time?.['common:referenceYear'] ?? {},
          'common:dataSetValidUntil':
            data?.lifeCycleModelInformation?.time?.['common:dataSetValidUntil'] ?? {},
          'common:timeRepresentativenessDescription':
            data?.lifeCycleModelInformation?.time?.['common:timeRepresentativenessDescription'],
        },
        geography: {
          locationOfOperationSupplyOrProduction: {
            '@location':
              data?.lifeCycleModelInformation?.geography?.locationOfOperationSupplyOrProduction?.[
                '@location'
              ] === 'NULL'
                ? {}
                : (data?.lifeCycleModelInformation?.geography
                    ?.locationOfOperationSupplyOrProduction?.['@location'] ?? {}),
            descriptionOfRestrictions:
              data?.lifeCycleModelInformation?.geography?.locationOfOperationSupplyOrProduction
                ?.descriptionOfRestrictions,
          },
          subLocationOfOperationSupplyOrProduction: {
            '@subLocation':
              data?.lifeCycleModelInformation?.geography
                ?.subLocationOfOperationSupplyOrProduction?.['@subLocation'] === 'NULL'
                ? {}
                : (data?.lifeCycleModelInformation?.geography
                    ?.subLocationOfOperationSupplyOrProduction?.['@subLocation'] ?? {}),
            descriptionOfRestrictions:
              data?.lifeCycleModelInformation?.geography?.subLocationOfOperationSupplyOrProduction
                ?.descriptionOfRestrictions,
          },
        },
        technology: {
          technologyDescriptionAndIncludedProcesses:
            data?.lifeCycleModelInformation?.technology?.technologyDescriptionAndIncludedProcesses,
          technologicalApplicability:
            data?.lifeCycleModelInformation?.technology?.technologicalApplicability,
          referenceToTechnologyPictogramme: {
            '@type':
              data?.lifeCycleModelInformation?.technology?.referenceToTechnologyPictogramme?.[
                '@type'
              ] ?? {},
            '@refObjectId':
              data?.lifeCycleModelInformation?.technology?.referenceToTechnologyPictogramme?.[
                '@refObjectId'
              ] ?? {},
            '@uri':
              data?.lifeCycleModelInformation?.technology?.referenceToTechnologyPictogramme?.[
                '@uri'
              ] ?? {},
            'common:shortDescription':
              data?.lifeCycleModelInformation?.technology?.referenceToTechnologyPictogramme?.[
                'common:shortDescription'
              ],
          },
          referenceToTechnologyFlowDiagrammOrPicture: {
            '@type':
              data?.lifeCycleModelInformation?.technology
                ?.referenceToTechnologyFlowDiagrammOrPicture?.['@type'] ?? {},
            '@refObjectId':
              data?.lifeCycleModelInformation?.technology
                ?.referenceToTechnologyFlowDiagrammOrPicture?.['@refObjectId'] ?? {},
            '@uri':
              data?.lifeCycleModelInformation?.technology
                ?.referenceToTechnologyFlowDiagrammOrPicture?.['@uri'] ?? {},
            'common:shortDescription':
              data?.lifeCycleModelInformation?.technology
                ?.referenceToTechnologyFlowDiagrammOrPicture?.['common:shortDescription'],
          },
        },
        mathematicalRelations: {
          modelDescription:
            data?.lifeCycleModelInformation?.mathematicalRelations?.modelDescription,
          variableParameter: {
            '@name':
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.['@name'],
            formula:
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.formula,
            meanValue:
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.meanValue,
            minimumValue:
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                ?.minimumValue,
            maximumValue:
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                ?.maximumValue,
            uncertaintyDistributionType:
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                ?.uncertaintyDistributionType,
            relativeStandardDeviation95In:
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                ?.relativeStandardDeviation95In,
            comment:
              data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.comment,
          },
        },
      },
      modellingAndValidation: {
        LCIMethodAndAllocation: {
          typeOfDataSet: data?.modellingAndValidation?.LCIMethodAndAllocation?.typeOfDataSet ?? {},
          LCIMethodPrinciple:
            data?.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodPrinciple ?? {},
          deviationsFromLCIMethodPrinciple:
            data?.modellingAndValidation?.LCIMethodAndAllocation?.deviationsFromLCIMethodPrinciple,
          LCIMethodApproaches:
            data?.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodApproaches ?? {},
          deviationsFromLCIMethodApproaches:
            data?.modellingAndValidation?.LCIMethodAndAllocation?.deviationsFromLCIMethodApproaches,
          modellingConstants:
            data?.modellingAndValidation?.LCIMethodAndAllocation?.modellingConstants,
          deviationsFromModellingConstants:
            data?.modellingAndValidation?.LCIMethodAndAllocation?.deviationsFromModellingConstants,
          referenceToLCAMethodDetails: {
            '@type':
              data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
                '@type'
              ] ?? {},
            '@refObjectId':
              data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
                '@refObjectId'
              ] ?? {},
            '@uri':
              data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
                '@uri'
              ] ?? {},
            '@version':
              data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
                '@version'
              ] ?? {},
            'common:shortDescription':
              data?.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
                'common:shortDescription'
              ],
          },
        },
        dataSourcesTreatmentAndRepresentativeness: {
          dataCutOffAndCompletenessPrinciples:
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.dataCutOffAndCompletenessPrinciples,
          deviationsFromCutOffAndCompletenessPrinciples:
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.deviationsFromCutOffAndCompletenessPrinciples,
          dataSelectionAndCombinationPrinciples:
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.dataSelectionAndCombinationPrinciples,
          deviationsFromSelectionAndCombinationPrinciples:
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.deviationsFromSelectionAndCombinationPrinciples,
          dataTreatmentAndExtrapolationsPrinciples:
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.dataTreatmentAndExtrapolationsPrinciples,
          deviationsFromTreatmentAndExtrapolationPrinciples:
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.deviationsFromTreatmentAndExtrapolationPrinciples,
          referenceToDataHandlingPrinciples: {
            '@type':
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataHandlingPrinciples?.['@type'] ?? {},
            '@refObjectId':
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataHandlingPrinciples?.['@refObjectId'] ?? {},
            '@uri':
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataHandlingPrinciples?.['@uri'] ?? {},
            '@version':
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataHandlingPrinciples?.['@version'] ?? {},
            'common:shortDescription':
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataHandlingPrinciples?.['common:shortDescription'],
          },
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
            'common:shortDescription':
              data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataSource?.['common:shortDescription'],
          },
          percentageSupplyOrProductionCovered:
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.percentageSupplyOrProductionCovered ?? {},
          annualSupplyOrProductionVolume:
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.annualSupplyOrProductionVolume,
          samplingProcedure:
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.samplingProcedure,
          dataCollectionPeriod:
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.dataCollectionPeriod,
          uncertaintyAdjustments:
            data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
              ?.uncertaintyAdjustments,
          useAdviceForDataSet:
            data?.modellingAndValidation?.LCIMethodAndAllocation?.useAdviceForDataSet,
        },
        completeness: {
          completenessProductModel:
            data?.modellingAndValidation?.completeness?.completenessProductModel,
          completenessElementaryFlows: {
            '@type':
              data?.modellingAndValidation?.completeness?.completenessElementaryFlows?.['@type'],
            '@value':
              data?.modellingAndValidation?.completeness?.completenessElementaryFlows?.['@value'],
          },
          completenessOtherProblemField:
            data?.modellingAndValidation?.completeness?.completenessOtherProblemField,
          // completenessDescription: getLangJson(
          //   data?.modellingAndValidation?.completeness?.completenessDescription,
          // ),
        },
        validation: { ...data?.modellingAndValidation?.validation },
        complianceDeclarations: {
          ...data?.modellingAndValidation?.complianceDeclarations,
        },
      },
      administrativeInformation: {
        ['common:commissionerAndGoal']: {
          'common:referenceToCommissioner': {
            '@refObjectId':
              data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                'common:referenceToCommissioner'
              ]?.['@refObjectId'] ?? {},
            '@type':
              data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                'common:referenceToCommissioner'
              ]?.['@type'] ?? {},
            '@uri':
              data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                'common:referenceToCommissioner'
              ]?.['@uri'] ?? {},
            '@version':
              data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                'common:referenceToCommissioner'
              ]?.['@version'] ?? {},
            'common:shortDescription':
              data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                'common:referenceToCommissioner'
              ]?.['common:shortDescription'],
          },
          'common:project':
            data?.administrativeInformation?.['common:commissionerAndGoal']?.['common:project'],
          'common:intendedApplications':
            data?.administrativeInformation?.['common:commissionerAndGoal']?.[
              'common:intendedApplications'
            ],
        },
        dataGenerator: {
          'common:referenceToPersonOrEntityGeneratingTheDataSet': {
            '@refObjectId':
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['@refObjectId'],
            '@type':
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['@type'],
            '@uri':
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['@uri'],
            '@version':
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['@version'],
            'common:shortDescription':
              data?.administrativeInformation?.dataGenerator?.[
                'common:referenceToPersonOrEntityGeneratingTheDataSet'
              ]?.['common:shortDescription'],
          },
        },
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
              ] ?? {},
            'common:shortDescription':
              data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
                'common:shortDescription'
              ],
          },
          'common:referenceToConvertedOriginalDataSetFrom': {
            '@refObjectId':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToConvertedOriginalDataSetFrom'
              ]?.['@refObjectId'],
            '@type':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToConvertedOriginalDataSetFrom'
              ]?.['@type'],
            '@uri':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToConvertedOriginalDataSetFrom'
              ]?.['@uri'],
            '@version':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToConvertedOriginalDataSetFrom'
              ]?.['@version'] ?? {},
            'common:shortDescription':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToConvertedOriginalDataSetFrom'
              ]?.['common:shortDescription'],
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
              ]?.['@version'] ?? {},
            'common:shortDescription':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToPersonOrEntityEnteringTheData'
              ]?.['common:shortDescription'],
          },
          'common:referenceToDataSetUseApproval': {
            '@refObjectId':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToDataSetUseApproval'
              ]?.['@refObjectId'],
            '@type':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToDataSetUseApproval'
              ]?.['@type'],
            '@uri':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToDataSetUseApproval'
              ]?.['@uri'],
            '@version':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToDataSetUseApproval'
              ]?.['@version'] ?? {},
            'common:shortDescription':
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToDataSetUseApproval'
              ]?.['common:shortDescription'],
          },
        },
        publicationAndOwnership: {
          'common:dateOfLastRevision':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:dateOfLastRevision'
            ] ?? {},
          'common:dataSetVersion':
            data?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'],
          'common:permanentDataSetURI':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:permanentDataSetURI'
            ] ?? {},
          'common:workflowAndPublicationStatus':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:workflowAndPublicationStatus'
            ] ?? {},
          'common:referenceToUnchangedRepublication': {
            '@refObjectId':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToUnchangedRepublication'
              ]?.['@refObjectId'] ?? {},
            '@type':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToUnchangedRepublication'
              ]?.['@type'] ?? {},
            '@uri':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToUnchangedRepublication'
              ]?.['@uri'] ?? {},
            '@version':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToUnchangedRepublication'
              ]?.['@version'] ?? {},
            'common:shortDescription':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToUnchangedRepublication'
              ]?.['common:shortDescription'],
          },
          'common:referenceToRegistrationAuthority': {
            '@refObjectId':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToRegistrationAuthority'
              ]?.['@refObjectId'] ?? {},
            '@type':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToRegistrationAuthority'
              ]?.['@type'] ?? {},
            '@uri':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToRegistrationAuthority'
              ]?.['@uri'] ?? {},
            '@version':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToRegistrationAuthority'
              ]?.['@version'] ?? {},
            'common:shortDescription':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToRegistrationAuthority'
              ]?.['common:shortDescription'],
          },
          'common:registrationNumber':
            data?.administrativeInformation?.publicationAndOwnership?.[
              'common:registrationNumber'
            ] ?? {},
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
            'common:shortDescription':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]?.['common:shortDescription'],
          },
          'common:copyright':
            data?.administrativeInformation?.publicationAndOwnership?.['common:copyright'],
          'common:referenceToEntitiesWithExclusiveAccess': {
            '@refObjectId':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToEntitiesWithExclusiveAccess'
              ]?.['@refObjectId'] ?? {},
            '@type':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToEntitiesWithExclusiveAccess'
              ]?.['@type'] ?? {},
            '@uri':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToEntitiesWithExclusiveAccess'
              ]?.['@uri'] ?? {},
            '@version':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToEntitiesWithExclusiveAccess'
              ]?.['@version'] ?? {},
            'common:shortDescription':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToEntitiesWithExclusiveAccess'
              ]?.['common:shortDescription'],
          },
          'common:licenseType':
            data?.administrativeInformation?.publicationAndOwnership?.['common:licenseType'],
          'common:accessRestrictions':
            data?.administrativeInformation?.publicationAndOwnership?.['common:accessRestrictions'],
        },
      },
      exchanges: {
        exchange: sumExchange,
      },
    },
  });

  return newData;
}

export function genEdgeExchangeTableData(data: any, lang: string) {
  if (data) {
    return data.map((item: any) => {
      return removeEmptyObjects({
        id: item.id ?? v4(),
        sourceProcessId: item.sourceProcessId ?? '-',
        sourceOutputFlowInternalID: item.sourceOutputFlowInternalID ?? '-',
        sourceOutputFlowId: item.sourceOutputFlowId ?? '-',
        sourceOutputFlowName: getLangText(item.sourceOutputFlowName, lang),
        sourceOutputFlowGeneralComment: getLangText(item.sourceOutputFlowGeneralComment, lang),
        targetProcessId: item.targetProcessId ?? '-',
        targetInputFlowInternalID: item.targetInputFlowInternalID ?? '-',
        targetInputFlowId: item.targetOutputFlowId ?? '-',
        targetInputFlowName: getLangText(item.targetInputFlowName, lang),
        targetInputFlowGeneralComment: getLangText(item.targetInputFlowGeneralComment, lang),
      });
    });
  }
  return [];
}
