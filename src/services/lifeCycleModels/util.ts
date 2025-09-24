import { createLifeCycleModel as createTidasLifeCycleModel } from '@tiangong-lca/tidas-sdk';
import BigNumber from 'bignumber.js';
import { v4 } from 'uuid';
import {
  classificationToJsonList,
  classificationToStringList,
  comparePercentDesc,
  getLangJson,
  getLangList,
  getLangText,
  jsonToList,
  listToJson,
  mergeLangArrays,
  percentStringToNumber,
  removeEmptyObjects,
  toAmountNumber,
} from '../general/util';
import LCIAResultCalculation from '../lciaMethods/util';
import { genProcessName } from '../processes/util';
import { supabase } from '../supabase';
import { FormLifeCycleModel, Up2DownEdge } from './data';

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
                ?.referenceToExternalDocumentation?.['common:shortDescription'],
            ),
          },
        },
        quantitativeReference: {
          referenceToReferenceProcess: referenceToReferenceProcess ?? {},
        },
        technology: {
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
      },
      modellingAndValidation: {
        dataSourcesTreatmentEtc: {
          useAdviceForDataSet: getLangJson(
            data?.modellingAndValidation?.dataSourcesTreatmentEtc?.useAdviceForDataSet,
          ),
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

export function genLifeCycleModelInfoFromData(data: any): FormLifeCycleModel {
  const model = createTidasLifeCycleModel({
    lifeCycleModelDataSet: {
      '@xmlns': 'http://eplca.jrc.ec.europa.eu/ILCD/LifeCycleModel/2017',
      '@xmlns:acme': 'http://acme.com/custom',
      '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@locations': '../ILCDLocations.xml',
      '@version': '1.1',
      '@xsi:schemaLocation':
        'http://eplca.jrc.ec.europa.eu/ILCD/LifeCycleModel/2017 ../../schemas/ILCD_LifeCycleModelDataSet.xsd',

      lifeCycleModelInformation: {
        dataSetInformation: {
          'common:UUID':
            data?.lifeCycleModelInformation?.dataSetInformation?.['common:UUID'] ?? '-',
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
              data?.lifeCycleModelInformation?.dataSetInformation?.name
                ?.functionalUnitFlowProperties,
            ),
          },
          classificationInformation: {
            'common:classification': {
              'common:class': classificationToStringList(
                data?.lifeCycleModelInformation?.dataSetInformation?.classificationInformation?.[
                'common:classification'
                ]?.['common:class'],
              ) as any,
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
            'common:shortDescription': getLangList(
              data?.lifeCycleModelInformation?.dataSetInformation
                ?.referenceToExternalDocumentation?.['common:shortDescription'],
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
        } as any,
        technology: {
          groupDeclarations: {},
          processes: {
            processInstance: {} as any,
          },
          referenceToDiagram: {
            '@refObjectId':
              data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.['@refObjectId'],
            '@type': data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.['@type'],
            '@uri': data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.['@uri'],
            '@version':
              data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.['@version'],
            'common:shortDescription': getLangList(
              data?.lifeCycleModelInformation?.technology?.referenceToDiagram?.[
              'common:shortDescription'
              ],
            ),
          },
        },
      },
      modellingAndValidation: {
        dataSourcesTreatmentEtc: {
          useAdviceForDataSet: getLangList(
            data?.modellingAndValidation?.dataSourcesTreatmentEtc?.useAdviceForDataSet,
          ),
        },
        validation: {
          review: jsonToList(data?.modellingAndValidation?.validation?.review).map(
            (review: any) => {
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
                  '@version':
                    review?.['common:referenceToNameOfReviewerAndInstitution']?.['@version'],
                  'common:shortDescription': getLangList(
                    review?.['common:referenceToNameOfReviewerAndInstitution']?.[
                    'common:shortDescription'
                    ],
                  ),
                },
                'common:otherReviewDetails': getLangList(review?.['common:otherReviewDetails']),
                'common:referenceToCompleteReviewReport': {
                  '@refObjectId':
                    review?.['common:referenceToCompleteReviewReport']?.['@refObjectId'],
                  '@type': review?.['common:referenceToCompleteReviewReport']?.['@type'],
                  '@uri': review?.['common:referenceToCompleteReviewReport']?.['@uri'],
                  '@version': review?.['common:referenceToCompleteReviewReport']?.['@version'],
                  'common:shortDescription': getLangList(
                    review?.['common:referenceToCompleteReviewReport']?.['common:shortDescription'],
                  ),
                },
              };
            },
          ),
        },
        complianceDeclarations: {
          compliance: jsonToList(
            data?.modellingAndValidation?.complianceDeclarations?.compliance,
          ).map((compliance: any) => {
            return {
              'common:referenceToComplianceSystem': {
                '@refObjectId':
                  compliance?.['common:referenceToComplianceSystem']?.['@refObjectId'],
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
          }) as any,
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
    },
  });
  return {
    lifeCycleModelInformation: model.lifeCycleModelDataSet.lifeCycleModelInformation,
    modellingAndValidation: model.lifeCycleModelDataSet.modellingAndValidation,
    administrativeInformation: model.lifeCycleModelDataSet.administrativeInformation,
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
                    text: `${genPortLabel(itemText ?? '', lang, nodeWidth)}`,
                    title: itemText,
                    cursor: 'pointer',
                  },
                },
                data: item?.data,
                tools: [{ id: 'portTool' }],
              };
            }),
          },
        };
      }) ?? [],
    edges: data?.xflow?.edges ?? [],
  };
}

export const DEFAULT_EXCHANGE_TOLERANCE = 1e-32;

type ExchangeAggregation = {
  meanAmount: number;
  resultingAmount: number;
};

type StackEntry = {
  key: string;
  pathProduct: number;
};

type NodeStackEntry = {
  nodeId: string;
  pathProduct: number;
};

export interface ExchangeCalculationContext {
  tolerance: number;
  referenceScalingFactor: number;
  pathProduct: number;
  stackEntries: StackEntry[];
  nodeStackEntries: NodeStackEntry[];
  processMap: Map<string, any>;
  exchangeCache: Map<string, Map<string, ExchangeAggregation>>;
  loops: Set<string>;

  // ✅ 新增：全局收敛判定用的聚合表
  exchangeMap: Map<string, number>;
}



// ✅ 定义循环最大迭代次数常量
export const DEFAULT_MAX_LOOP_ITERS_PER_NODE = 1000;

const buildProcessKey = (nodeId: string, dependence: any) =>
  [nodeId, dependence?.direction ?? '', dependence?.nodeId ?? '', dependence?.flowUUID ?? ''].join(
    '|',
  );

export const createExchangeCalculationContext = (
  referenceScalingFactor: number,
  tolerance = DEFAULT_EXCHANGE_TOLERANCE,
): ExchangeCalculationContext => ({
  tolerance,
  referenceScalingFactor: Math.max(Math.abs(referenceScalingFactor) || 0, tolerance),
  pathProduct: 1,
  stackEntries: [],
  nodeStackEntries: [],
  processMap: new Map(),
  exchangeCache: new Map(),
  loops: new Set(),

  // ✅ 补上这一行，避免 exchangeMap 未定义的报错
  exchangeMap: new Map(),
});


// 👇 主产品解析函数
function resolveQRefId(dbProcess: any): string | undefined {
  const qref = dbProcess?.quantitativeReference?.['referenceToReferenceFlow'];
  const exList = jsonToList(dbProcess?.exchange) ?? [];
  if (typeof qref === 'number') return exList[qref]?.['@dataSetInternalID'];
  if (typeof qref === 'string') return qref;
  return undefined;
}

const appendProcessExchangeToContext = (
  thisMdProcess: any,
  thisDbProcess: any,
  dependence: any,
  scalingFactor: number,
  context: ExchangeCalculationContext,
  processKey: string,
) => {
  const nodeId = thisMdProcess?.['@dataSetInternalID'];
  if (!nodeId) {
    return [];
  }

  let processEntry = context.processMap.get(processKey);
  if (!processEntry) {
    processEntry = {
      nodeId,
      dependence,
      processId: thisDbProcess?.id,
      processVersion: thisDbProcess?.version,

      // ✅ 保留原始字段（可能是 number，前端 UI 还在用）
      quantitativeReferenceFlowIndex:
        thisDbProcess?.quantitativeReference?.['referenceToReferenceFlow'],

      // ✅ 新增解析后的 ID，供我们逻辑用
      referenceFlowIdResolved: resolveQRefId(thisDbProcess),

      scalingFactor: 0,
      exchanges: [],
      exchangeMap: new Map<string, any>(),
    };
    context.processMap.set(processKey, processEntry);
  }

  // ===== 累积 scalingFactor =====
  processEntry.scalingFactor = new BigNumber(processEntry.scalingFactor ?? 0)
    .plus(scalingFactor)
    .toNumber();

  // ===== 初始化本节点的 cache =====
  const processExchangeCache = context.exchangeCache.get(processKey) ?? new Map();
  context.exchangeCache.set(processKey, processExchangeCache);

  // ===== 遍历 exchange，缩放后聚合 =====
  const thisExchanges = jsonToList(thisDbProcess?.exchange);
  const scaledExchanges: any[] = [];

  thisExchanges.forEach((exchange: any) => {
    const direction = (exchange?.exchangeDirection ?? '').toUpperCase();
    const flowUUID = exchange?.referenceToFlowDataSet?.['@refObjectId'];
    const flowKey = `${direction}|${flowUUID}`;

    // 按 scalingFactor 缩放
    const scaledMean = new BigNumber(exchange?.meanAmount ?? 0).times(scalingFactor);
    const scaledResult = new BigNumber(exchange?.resultingAmount ?? exchange?.meanAmount ?? 0)
      .times(scalingFactor);

    if (!scaledMean.isFinite() || !scaledResult.isFinite()) {
      return;
    }
    if (scaledMean.isZero() && scaledResult.isZero()) {
      return;
    }

    scaledExchanges.push({
      ...exchange,
      meanAmount: scaledMean.toNumber(),
      resultingAmount: scaledResult.toNumber(),
    });

    // ===== 获取旧值（BigNumber 累加） =====
    const cachedTotals = processExchangeCache.get(flowKey) ?? {
      meanAmount: new BigNumber(0),
      resultingAmount: new BigNumber(0),
    };

    // 🚨 核心逻辑：主产品永远不剪枝
    const isReferenceFlow =
      exchange?.['@dataSetInternalID'] === processEntry.referenceFlowIdResolved;

    if (!isReferenceFlow) {
      if (
        scaledMean.abs().lte(context.tolerance) &&
        scaledResult.abs().lte(context.tolerance)
      ) {
        return; // 非主产品且增量极小 → 忽略
      }
    }

    // ===== 更新 cache 累计值（保持 BigNumber） =====
    const updatedMean = cachedTotals.meanAmount.plus(scaledMean);
    const updatedResult = cachedTotals.resultingAmount.plus(scaledResult);

    processExchangeCache.set(flowKey, {
      meanAmount: updatedMean,
      resultingAmount: updatedResult,
    });

    // ===== 更新 processEntry.exchangeMap（对外只暴露 number） =====
    if (!processEntry.exchangeMap) {
      processEntry.exchangeMap = new Map<string, any>();
    }
    const existingExchange = processEntry.exchangeMap.get(flowKey);
    if (existingExchange) {
      existingExchange.meanAmount = updatedMean.toNumber();
      existingExchange.resultingAmount = updatedResult.toNumber();
    } else {
      processEntry.exchangeMap.set(flowKey, {
        ...exchange,
        meanAmount: updatedMean.toNumber(),
        resultingAmount: updatedResult.toNumber(),
      });
    }
  });

  processEntry.exchanges = Array.from(processEntry.exchangeMap?.values() ?? []);
  return scaledExchanges;
};


const walkProcessExchange = (
  thisMdProcess: any,
  thisDbProcess: any,
  dependence: any,
  scalingFactor: number,
  allUp2DownEdges: Up2DownEdge[],
  mdProcessInstances: any[],
  dbProcessExchanges: any[],
  context: ExchangeCalculationContext,
) => {
  const nodeId = thisMdProcess?.['@dataSetInternalID'];
  if (!nodeId || !thisDbProcess) {
    return;
  }

  const previousPathProduct = context.pathProduct;
  const scalingAbs = Math.abs(scalingFactor);
  const newPathProduct = previousPathProduct * scalingAbs;

  if (newPathProduct <= context.referenceScalingFactor * context.tolerance) {
    return;
  }

  const processKey = buildProcessKey(nodeId, dependence);

  const previousNodeEntry = [...context.nodeStackEntries]
    .reverse()
    .find((entry) => entry.nodeId === nodeId);
  if (previousNodeEntry) {
    const nodeLoopFactor =
      previousNodeEntry.pathProduct === 0 ? 0 : newPathProduct / previousNodeEntry.pathProduct;
    context.loops.add(processKey);
    if (Math.abs(nodeLoopFactor - 1) <= context.tolerance) {
      return;
    }
  }

  const previousEntry = [...context.stackEntries]
    .reverse()
    .find((entry) => entry.key === processKey);
  if (previousEntry) {
    const previousProduct = previousEntry.pathProduct;
    const loopFactor = previousProduct === 0 ? 0 : newPathProduct / previousProduct;
    context.loops.add(processKey);
    if (Math.abs(loopFactor - 1) <= context.tolerance) {
      return;
    }
  }

  const scaledExchanges = appendProcessExchangeToContext(
    thisMdProcess,
    thisDbProcess,
    dependence,
    scalingFactor,
    context,
    processKey,
  );

  context.stackEntries.push({ key: processKey, pathProduct: newPathProduct });
  context.nodeStackEntries.push({ nodeId, pathProduct: newPathProduct });
  context.pathProduct = newPathProduct;

  const dependenceDownstreams = allUp2DownEdges.filter((ud: Up2DownEdge) => {
    return (
      ud?.downstreamId === thisMdProcess?.['@dataSetInternalID'] && ud?.dependence === 'downstream'
    );
  });

  if (dependenceDownstreams.length > 0) {
    dependenceDownstreams.forEach((dependenceDownstream: Up2DownEdge) => {
      const upMdProcess = mdProcessInstances.find(
        (mdp: any) => mdp?.['@dataSetInternalID'] === dependenceDownstream?.upstreamId,
      );
      const upDbProcess = dbProcessExchanges.find(
        (dbp: any) =>
          dbp?.id === upMdProcess?.referenceToProcess?.['@refObjectId'] &&
          dbp?.version === upMdProcess?.referenceToProcess?.['@version'],
      );

      if (upMdProcess && upDbProcess) {
        const downExchange = scaledExchanges.find(
          (e: any) =>
            e?.referenceToFlowDataSet?.['@refObjectId'] === dependenceDownstream?.flowUUID &&
            (e?.exchangeDirection ?? '').toUpperCase() === 'INPUT',
        );

        const upExchange = jsonToList(upDbProcess?.exchange)?.find(
          (e: any) =>
            e?.referenceToFlowDataSet?.['@refObjectId'] === dependenceDownstream?.flowUUID &&
            (e?.exchangeDirection ?? '').toUpperCase() === 'OUTPUT',
        );

        const upMeanAmount = toAmountNumber(upExchange?.meanAmount);
        const upTargetAmount = Number(downExchange?.meanAmount ?? '0');

        let upScalingFactor = 1;

        if (upMeanAmount !== 0 && upTargetAmount !== 0) {
          upScalingFactor = new BigNumber(upTargetAmount).div(upMeanAmount).toNumber();
        }

        walkProcessExchange(
          upMdProcess,
          upDbProcess,
          {
            direction: 'downstream',
            nodeId: thisMdProcess?.['@dataSetInternalID'],
            flowUUID: dependenceDownstream?.flowUUID,
          },
          upScalingFactor,
          allUp2DownEdges,
          mdProcessInstances,
          dbProcessExchanges,
          context,
        );
      }
    });
  }

  const dependenceUpstreams = allUp2DownEdges.filter((ud: Up2DownEdge) => {
    return (
      ud?.upstreamId === thisMdProcess?.['@dataSetInternalID'] && ud?.dependence === 'upstream'
    );
  });

  if (dependenceUpstreams.length > 0) {
    dependenceUpstreams.forEach((dependenceUpstream: Up2DownEdge) => {
      const downMdProcess = mdProcessInstances.find(
        (mdp: any) => mdp?.['@dataSetInternalID'] === dependenceUpstream?.downstreamId,
      );
      const downDbProcess = dbProcessExchanges.find(
        (dbp: any) =>
          dbp?.id === downMdProcess?.referenceToProcess?.['@refObjectId'] &&
          dbp?.version === downMdProcess?.referenceToProcess?.['@version'],
      );
      if (downMdProcess && downDbProcess) {
        const upExchange = scaledExchanges?.find(
          (e: any) =>
            e?.referenceToFlowDataSet?.['@refObjectId'] === dependenceUpstream?.flowUUID &&
            (e?.exchangeDirection ?? '').toUpperCase() === 'OUTPUT',
        );

        const downExchange = jsonToList(downDbProcess?.exchange)?.find(
          (e: any) =>
            e?.referenceToFlowDataSet?.['@refObjectId'] === dependenceUpstream?.flowUUID &&
            (e?.exchangeDirection ?? '').toUpperCase() === 'INPUT',
        );

        const downMeanAmount = toAmountNumber(downExchange?.meanAmount);
        const downTargetAmount = Number(upExchange?.meanAmount ?? '0');

        let downScalingFactor = 1;

        if (downMeanAmount !== 0 && downTargetAmount !== 0) {
          downScalingFactor = new BigNumber(downTargetAmount).div(downMeanAmount).toNumber();
        }

        walkProcessExchange(
          downMdProcess,
          downDbProcess,
          {
            direction: 'upstream',
            nodeId: thisMdProcess?.['@dataSetInternalID'],
            flowUUID: dependenceUpstream?.flowUUID,
          },
          downScalingFactor,
          allUp2DownEdges,
          mdProcessInstances,
          dbProcessExchanges,
          context,
        );
      }
    });
  }

  context.stackEntries.pop();
  context.nodeStackEntries.pop();
  context.pathProduct = previousPathProduct;
};

export const calculateProcessExchange = (
  thisMdProcess: any,
  thisDbProcess: any,
  dependence: any,
  scalingFactor: number,
  allUp2DownEdges: Up2DownEdge[],
  mdProcessInstances: any[],
  dbProcessExchanges: any[],
  context?: ExchangeCalculationContext,
) => {
  const workingContext =
    context ??
    createExchangeCalculationContext(Math.abs(scalingFactor) || 1, DEFAULT_EXCHANGE_TOLERANCE);

  // ========= 顶层调用：迭代收敛 =========
  if (!context) {
    let converged = false;

    for (let iter = 0; iter < DEFAULT_MAX_LOOP_ITERS_PER_NODE; iter++) {
      const prevMap = new Map(workingContext.exchangeMap); // 上一轮结果

      // ✅ 每轮迭代前清空累计，重新跑一次传播
      workingContext.exchangeMap.clear();
      workingContext.processMap.forEach((entry: any) => {
        entry.exchangeMap?.clear?.();
        entry.exchanges = [];
        entry.scalingFactor = 0;
      });

      // 执行传播
      walkProcessExchange(
        thisMdProcess,
        thisDbProcess,
        dependence,
        scalingFactor,
        allUp2DownEdges,
        mdProcessInstances,
        dbProcessExchanges,
        workingContext,
      );

      // 判断收敛
      let maxDelta = 0;
      for (const [key, newVal] of workingContext.exchangeMap.entries()) {
        const oldVal = prevMap.get(key) ?? 0;
        const delta = new BigNumber(newVal).minus(oldVal).abs().toNumber();
        const scale = Math.max(1, Math.abs(newVal));
        if (delta / scale > maxDelta) maxDelta = delta / scale;
      }

      if (maxDelta <= workingContext.tolerance) {
        console.log(`✅ Converged after ${iter + 1} iterations`);
        converged = true;
        break;
      }
    }

    if (!converged) {
      console.warn(
        `⚠️ calculateProcessExchange did not converge after ${DEFAULT_MAX_LOOP_ITERS_PER_NODE} iterations`,
      );
    }

    return Array.from(workingContext.processMap.values()).map((entry: any) => {
      const rest = { ...entry };
      delete rest.exchangeMap;

      // ✅ 在返回阶段强制覆盖
      if (entry.referenceFlowIdResolved) {
        rest.quantitativeReferenceFlowIndex = entry.referenceFlowIdResolved;
      }

      return rest;
    });
  }

  // ========= 内部递归调用 =========
  walkProcessExchange(
    thisMdProcess,
    thisDbProcess,
    dependence,
    scalingFactor,
    allUp2DownEdges,
    mdProcessInstances,
    dbProcessExchanges,
    workingContext,
  );

  return undefined;
};

const allocatedProcessExchange = (calculatedProcessExchanges: any[]) => {
  let childProcessExchanges: any[] = [];

  calculatedProcessExchanges.forEach((npe: any) => {
    const npeExchanges = jsonToList(npe?.exchanges ?? []);
    const allocatedExchanges: any[] = [];
    const nonAllocatedExchanges: any[] = [];

    // ✅ 兜底：保证旧字段 quantitativeReferenceFlowIndex 有值
    if (npe.referenceFlowIdResolved) {
      npe.quantitativeReferenceFlowIndex =
        npe.quantitativeReferenceFlowIndex || npe.referenceFlowIdResolved;
    }

    npeExchanges.forEach((npeExchange: any) => {
      const allocations = jsonToList(npeExchange?.allocations ?? []);
      if (allocations.length > 0) {
        const allocatedFractionStr =
          allocations[0]?.allocation?.['@allocatedFraction'] ?? '';
        const allocatedFraction = percentStringToNumber(allocatedFractionStr);
        if (allocatedFraction && allocatedFraction > 0) {
          allocatedExchanges.push({
            exchange: npeExchange,
            allocatedFraction,
          });
          return;
        }
      }

      // ✅ 主产品判定：兼容新旧字段
      if (
        npeExchange['@dataSetInternalID'] === npe.referenceFlowIdResolved ||
        npeExchange['@dataSetInternalID'] === npe.quantitativeReferenceFlowIndex
      ) {
        allocatedExchanges.push({
          exchange: npeExchange,
          allocatedFraction: 1,
        });
        return;
      }

      // 非主产品 → 放到 nonAllocated
      nonAllocatedExchanges.push(npeExchange);
    });

    if (allocatedExchanges.length > 0) {
      allocatedExchanges.forEach((allocatedExchange: any) => {
        const childNonAllocatedExchanges = nonAllocatedExchanges.map((ne: any) => ({
          ...ne,
          allocatedFraction: allocatedExchange.allocatedFraction,
        }));

        const childProcessExchange = {
          ...npe,
          isAllocated: true,
          allocatedExchangeId: allocatedExchange.exchange?.['@dataSetInternalID'],
          allocatedExchangeFlowId:
            allocatedExchange.exchange?.referenceToFlowDataSet?.['@refObjectId'],
          allocatedExchangeDirection: allocatedExchange.exchange?.exchangeDirection,
          allocatedFraction: allocatedExchange.allocatedFraction,
          exchanges: [...childNonAllocatedExchanges, allocatedExchange.exchange],
        };

        childProcessExchanges.push(childProcessExchange);
      });
    } else {
      childProcessExchanges.push(npe);
    }
  });

  return childProcessExchanges;
};



const hasFinalProductProcessExchange = (
  childProcessExchange: any,
  allUp2DownEdges: Up2DownEdge[],
  childProcessExchanges: any[],
) => {
  const downStreamEdges = allUp2DownEdges.filter((ud: Up2DownEdge) => {
    return (
      ud?.upstreamId === childProcessExchange?.nodeId &&
      (!childProcessExchange?.isAllocated ||
        ud?.flowUUID === childProcessExchange?.allocatedExchangeFlowId)
    );
  });
  for (const edge of downStreamEdges) {
    const nextChildProcessExchange = childProcessExchanges.find((cpe: any) => {
      return cpe?.nodeId === edge?.downstreamId;
    });
    if (nextChildProcessExchange) {
      if (
        nextChildProcessExchange.finalProductType === 'unknown' ||
        nextChildProcessExchange.finalProductType === 'has'
      ) {
        return 'no';
      } else {
        return hasFinalProductProcessExchange(
          nextChildProcessExchange,
          allUp2DownEdges,
          childProcessExchanges,
        );
      }
    } else {
      return 'has';
    }
  }
  return 'unknown';
};

const getFinalProductGroup = (
  finalProductProcessExchange: any,
  allocatedFraction: number,
  childProcessExchanges: any[],
  allUp2DownEdges: Up2DownEdge[],
) => {
  const finalProductGroups: any[] = [];
  if (
    finalProductProcessExchange?.isAllocated &&
    finalProductProcessExchange?.allocatedFraction > 0
  ) {
    const newAllocatedFraction = new BigNumber(finalProductProcessExchange.allocatedFraction)
      .times(allocatedFraction)
      .toNumber();
    finalProductGroups.push({
      ...finalProductProcessExchange,
      exchanges: finalProductProcessExchange?.exchanges?.map((e: any) => {
        if (e['@dataSetInternalID'] === finalProductProcessExchange?.allocatedExchangeId) {
          return {
            ...e,
            meanAmount: new BigNumber(e?.meanAmount).times(allocatedFraction).toNumber(),
            resultingAmount: new BigNumber(e?.resultingAmount).times(allocatedFraction).toNumber(),
          };
        } else {
          return {
            ...e,
            meanAmount: new BigNumber(e?.meanAmount).times(newAllocatedFraction).toNumber(),
            resultingAmount: new BigNumber(e?.resultingAmount)
              .times(newAllocatedFraction)
              .toNumber(),
          };
        }
      }),
    });

    const connectedEdges = allUp2DownEdges.filter((ud: Up2DownEdge) => {
      if (ud?.upstreamId === finalProductProcessExchange?.nodeId) {
        if (
          (ud?.dependence === 'none' && ud?.mainDependence === 'upstream') ||
          ud?.dependence === 'upstream'
        ) {
          const connectedExhanges = finalProductProcessExchange?.exchanges?.filter((e: any) => {
            return (
              e?.referenceToFlowDataSet?.['@refObjectId'] === ud?.flowUUID &&
              (e?.exchangeDirection ?? '').toUpperCase() === 'OUTPUT'
            );
          });
          if (connectedExhanges?.length > 0) {
            return true;
          }
          return false;
        }
      }

      if (ud?.downstreamId === finalProductProcessExchange?.nodeId) {
        if (
          (ud?.dependence === 'none' && ud?.mainDependence === 'downstream') ||
          ud?.dependence === 'downstream'
        ) {
          const connectedExhanges = finalProductProcessExchange?.exchanges?.filter((e: any) => {
            return (
              e?.referenceToFlowDataSet?.['@refObjectId'] === ud?.flowUUID &&
              (e?.exchangeDirection ?? '').toUpperCase() === 'INPUT'
            );
          });

          if (connectedExhanges?.length > 0) {
            return true;
          }
          return false;
        }
        return false;
      }
      return false;
    });

    if (connectedEdges.length > 0) {
      connectedEdges.forEach((edge: Up2DownEdge) => {
        const nextChildProcessExchange = childProcessExchanges.find((cpe: any) => {
          return (
            cpe?.nodeId !== finalProductProcessExchange?.nodeId &&
            cpe?.finalProductType !== 'has' &&
            (cpe?.nodeId === edge?.downstreamId || cpe?.nodeId === edge?.upstreamId) &&
            cpe?.allocatedExchangeFlowId === edge?.flowUUID
          );
        });

        if (nextChildProcessExchange) {
          const nextFinalProductGroups = getFinalProductGroup(
            nextChildProcessExchange,
            ((newAllocatedFraction ?? 1) * (edge?.scalingFactor ?? 1)) /
            (nextChildProcessExchange?.scalingFactor ?? 1),
            childProcessExchanges,
            allUp2DownEdges,
          );
          if (nextFinalProductGroups?.length > 0) {
            finalProductGroups.push(...nextFinalProductGroups);
          }
        }
      });
    }
  } else {
    finalProductGroups.push(finalProductProcessExchange);
  }

  return finalProductGroups;
};

const sumProcessExchange = (processExchanges: any[]) => {
  let allExchanges: any[] = [];
  let sumScalingFactor = 0;
  processExchanges?.forEach((pe: any) => {
    sumScalingFactor += pe?.scalingFactor ?? 0;
    allExchanges.push(...jsonToList(pe?.exchanges ?? []));
  });

  const sumData =
    allExchanges?.reduce((acc, curr) => {
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
  const sumExchanges = Object.values(sumData);

  return { sumScalingFactor, sumExchanges };
};

export async function genLifeCycleModelProcesses(
  id: string,
  refNode: any,
  data: any,
  oldSubmodels: any[],
) {
  const mdProcessInstances = jsonToList(
    data?.lifeCycleModelInformation?.technology?.processes?.processInstance,
  );
  const processKeys = mdProcessInstances.map((p: any) => {
    return {
      id: p?.referenceToProcess?.['@refObjectId'],
      version: p?.referenceToProcess?.['@version'],
    };
  });
  const orConditions = processKeys
    .map((k) => `and(id.eq.${k.id},version.eq.${k.version})`)
    .join(',');
  const dbProcessExchanges =
    (
      await supabase
        .from('processes')
        .select(
          `
      id,
      version,
      json->processDataSet->processInformation->quantitativeReference,
      json->processDataSet->exchanges->exchange
      `,
        )
        .or(orConditions)
    )?.data ?? [];

  let up2DownEdges: Up2DownEdge[] = [];
  mdProcessInstances.forEach((p: any) => {
    const thisPE = dbProcessExchanges.find(
      (pe: any) =>
        pe['id'] === p?.['referenceToProcess']?.['@refObjectId'] &&
        pe['version'] === p?.['referenceToProcess']?.['@version'],
    );
    const thisExchanges = jsonToList(thisPE?.exchange);
    const thisRefExchange = thisExchanges?.find(
      (e: any) =>
        e?.['@dataSetInternalID'] ===
        (thisPE?.quantitativeReference as any)?.referenceToReferenceFlow,
    );
    const thisRefFlowId = thisRefExchange?.referenceToFlowDataSet?.['@refObjectId'] ?? '';
    const thisRefFlowDirection = (thisRefExchange?.exchangeDirection ?? '').toUpperCase();

    const pOutputExchanges = jsonToList(p?.connections?.outputExchange);
    let mainOutputExchange = { '@flowUUID': '' };

    if (pOutputExchanges?.length === 0) {
      mainOutputExchange = { '@flowUUID': '' };
    } else if (pOutputExchanges?.length === 1) {
      mainOutputExchange = { '@flowUUID': pOutputExchanges[0]?.['@flowUUID'] ?? '' };
    } else {
      const thisMF = pOutputExchanges.find(
        (o: any) => o?.['@flowUUID'] === thisRefFlowId && thisRefFlowDirection === 'OUTPUT',
      );
      if (thisMF) {
        mainOutputExchange = { '@flowUUID': thisMF?.['@flowUUID'] ?? '' };
      } else {
        const thisFlowIds = pOutputExchanges.map((o: any) => o?.['@flowUUID']);
        const fes = thisExchanges.filter(
          (e: any) =>
            e?.exchangeDirection?.toUpperCase() === 'OUTPUT' &&
            thisFlowIds.includes(e?.referenceToFlowDataSet?.['@refObjectId']),
        );
        const allocatedFractions = fes.map(
          (e: any) => e.allocations.allocation['@allocatedFraction'],
        );
        const maxAF = allocatedFractions.sort(comparePercentDesc)[0];
        const maxFlow = fes.find(
          (e: any) => e.allocations.allocation['@allocatedFraction'] === maxAF,
        );
        mainOutputExchange = { '@flowUUID': maxFlow?.referenceToFlowDataSet['@refObjectId'] ?? '' };
      }
    }

    pOutputExchanges.forEach((o: any) => {
      jsonToList(o?.downstreamProcess).forEach((dp: any) => {
        let mainInputExchange = { '@flowUUID': '' };
        let inputExchanges: any[] = [];
        const dp_upstreamProcesses = mdProcessInstances.filter((pi: any) => {
          return jsonToList(pi?.connections?.outputExchange)?.some((piOutputExchange: any) => {
            return jsonToList(piOutputExchange?.downstreamProcess)?.some((pi_dp: any) => {
              return pi_dp?.['@id'] === dp?.['@id'];
            });
          });
        });

        dp_upstreamProcesses.forEach((usModelProcess: any) => {
          const dp_upstreamModelProcessOutputExchanges = jsonToList(
            usModelProcess?.connections?.outputExchange,
          );

          const dp_upstreamModelProcessOutputExchangesFilter =
            dp_upstreamModelProcessOutputExchanges.filter((dp_o: any) =>
              jsonToList(dp_o?.downstreamProcess)?.some(
                (dp_dp: any) => dp_dp?.['@id'] === dp?.['@id'],
              ),
            );

          dp_upstreamModelProcessOutputExchangesFilter.forEach(
            (dp_upstreamModelProcessOutputExchange: any) => {
              inputExchanges.push({
                '@flowUUID': dp_upstreamModelProcessOutputExchange?.['@flowUUID'],
              });
            },
          );
        });

        if (inputExchanges?.length === 0) {
          mainInputExchange = { '@flowUUID': '' };
        } else if (inputExchanges?.length === 1) {
          mainInputExchange = { '@flowUUID': inputExchanges[0]?.['@flowUUID'] ?? '' };
        } else {
          const thisMF = inputExchanges.find(
            (i: any) => i?.['@flowUUID'] === thisRefFlowId && thisRefFlowDirection === 'INPUT',
          );
          if (thisMF) {
            mainInputExchange = { '@flowUUID': thisMF?.['@flowUUID'] ?? '' };
          } else {
            const thisFlowIds = inputExchanges.map((i: any) => i?.['@flowUUID']);
            const fes = thisExchanges.filter(
              (e: any) =>
                e?.exchangeDirection?.toUpperCase() === 'INPUT' &&
                thisFlowIds.includes(e?.referenceToFlowDataSet?.['@refObjectId']),
            );
            const allocatedFractions = fes.map(
              (e: any) => e.allocations.allocation['@allocatedFraction'],
            );
            const maxAF = allocatedFractions.sort(comparePercentDesc)[0];
            const maxFlow = fes.find(
              (e: any) => e.allocations.allocation['@allocatedFraction'] === maxAF,
            );
            mainInputExchange = {
              '@flowUUID': maxFlow?.referenceToFlowDataSet['@refObjectId'] ?? '',
            };
          }
        }

        const nowUp2DownEdge = {
          flowUUID: o?.['@flowUUID'],
          upstreamId: p?.['@dataSetInternalID'],
          // upstreamProcessId: p?.['@id'],
          // upstreamProcessVersion: p?.['@version'],
          downstreamId: dp?.['@id'],
          // downstreamProcessId: dp?.['@id'],
          // downstreamProcessVersion: dp?.['@version'],
          mainOutputFlowUUID: mainOutputExchange?.['@flowUUID'],
          mainInputFlowUUID: mainInputExchange?.['@flowUUID'],
        };
        up2DownEdges.push(nowUp2DownEdge);
      });
    });

    // return {
    //   ...p,
    //   connections: {
    //     ...p?.connections,
    //     outputExchange: jsonToList(p?.connections?.outputExchange),
    //     mainOutputExchange: mainOutputExchange,
    //   },
    // };
  });

  const referenceToReferenceProcess =
    data?.lifeCycleModelInformation?.quantitativeReference?.referenceToReferenceProcess;

  if (!referenceToReferenceProcess) {
    throw new Error('No referenceToReferenceProcess found in lifeCycleModelInformation');
  }

  let baseIds1: any[] = [];
  baseIds1.push(referenceToReferenceProcess);
  let direction1 = 'OUTPUT';
  let whileGO1 = true;
  let whileGO11 = true;

  while (whileGO1) {
    whileGO11 = true;

    while (whileGO11) {
      if (baseIds1.length === 0) {
        whileGO11 = false;
        break;
      }

      let newBaseIds: any[] = [];

      if (direction1 === 'OUTPUT') {
        for (const baseId of baseIds1) {
          const uds = up2DownEdges.filter(
            (up2DownEdge: any) => up2DownEdge?.downstreamId === baseId,
          );
          for (const ud of uds) {
            if (ud?.dependence) {
              continue;
            } else {
              newBaseIds.push(ud?.upstreamId);
              ud.dependence = 'downstream';
            }
          }
        }
        baseIds1 = newBaseIds;
      } else if (direction1 === 'INPUT') {
        for (const baseId of baseIds1) {
          const uds = up2DownEdges.filter((up2DownEdge: any) => up2DownEdge?.upstreamId === baseId);
          for (const ud of uds) {
            if (ud?.dependence) {
              continue;
            } else {
              newBaseIds.push(ud?.downstreamId);
              ud.dependence = 'upstream';
            }
          }
        }
        baseIds1 = newBaseIds;
      }
    }

    if (direction1 === 'OUTPUT') {
      const downstreamItems = up2DownEdges.filter((item: any) => item.dependence === 'downstream');
      const duplicatedIds = Object.entries(
        downstreamItems.reduce(
          (acc: Record<string, number>, cur) => {
            acc[cur.upstreamId] = (acc[cur.upstreamId] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      )
        .filter(([, count]) => count > 1)
        .map(([id]) => id);

      for (const duplicatedId of duplicatedIds) {
        const uds = up2DownEdges.filter(
          (up2DownEdge: any) => up2DownEdge?.upstreamId === duplicatedId,
        );
        for (const ud of uds) {
          if (ud.flowUUID !== ud.mainOutputFlowUUID) {
            ud.dependence = 'none';
            ud.mainDependence = 'downstream';
          }
        }
      }
    } else if (direction1 === 'INPUT') {
      const upstreamItems = up2DownEdges.filter((item: any) => item.dependence === 'upstream');
      const duplicatedIds = Object.entries(
        upstreamItems.reduce(
          (acc: Record<string, number>, cur) => {
            acc[cur.downstreamId] = (acc[cur.downstreamId] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      )
        .filter(([, count]) => count > 1)
        .map(([id]) => id);

      for (const duplicatedId of duplicatedIds) {
        const uds = up2DownEdges.filter(
          (up2DownEdge: any) => up2DownEdge?.downstreamId === duplicatedId,
        );
        for (const ud of uds) {
          if (ud.flowUUID !== ud.mainInputFlowUUID) {
            ud.dependence = 'none';
            ud.mainDependence = 'upstream';
          }
        }
      }
    }

    const hasDependenceItems = up2DownEdges.filter((ud: any) => ud?.dependence !== undefined) ?? [];
    if (hasDependenceItems.length === up2DownEdges.length) {
      whileGO1 = false;
      break;
    }

    baseIds1 = [];

    if (direction1 === 'OUTPUT') {
      const hasDependenceUpstreamIds = hasDependenceItems.map((ud: any) => ud?.upstreamId);
      const undoDownstreams = up2DownEdges.filter(
        (ud: any) =>
          ud?.dependence === undefined && hasDependenceUpstreamIds.includes(ud?.upstreamId),
      );
      if (undoDownstreams.length > 0) {
        baseIds1 = undoDownstreams.map((ud: any) => ud?.upstreamId);
      }
      direction1 = 'INPUT';
    } else if (direction1 === 'INPUT') {
      const hasDependenceDownstreamIds = hasDependenceItems.map((ud: any) => ud?.downstreamId);
      const undoUpstreams = up2DownEdges.filter(
        (ud: any) =>
          ud?.dependence === undefined && hasDependenceDownstreamIds.includes(ud?.downstreamId),
      );
      if (undoUpstreams.length > 0) {
        baseIds1 = undoUpstreams.map((ud: any) => ud?.downstreamId);
      }
      direction1 = 'OUTPUT';
    }

    if (baseIds1.length === 0) {
      whileGO1 = false;
      break;
    }
  }

  const refMdProcess = mdProcessInstances.find(
    (p: any) => p?.['@dataSetInternalID'] === referenceToReferenceProcess,
  );

  const refDbProcess = dbProcessExchanges.find(
    (p: any) =>
      p?.id === refMdProcess?.referenceToProcess?.['@refObjectId'] &&
      p?.version === refMdProcess?.referenceToProcess?.['@version'],
  ) as any;

  const thisRefFlow = refDbProcess?.exchange?.find(
    (e: any) =>
      refDbProcess?.quantitativeReference?.referenceToReferenceFlow === e?.['@dataSetInternalID'],
  );

  const thisRefMeanAmount = toAmountNumber(thisRefFlow?.meanAmount);
  const targetAmount = Number(refNode?.data?.targetAmount ?? '0');

  let scalingFactor = 1;

  if (thisRefMeanAmount !== 0 && targetAmount !== 0) {
    scalingFactor = new BigNumber(targetAmount).div(thisRefMeanAmount).toNumber();
  }
  if (refMdProcess && refDbProcess) {
    const calculatedProcessExchanges = calculateProcessExchange(
      refMdProcess,
      refDbProcess,
      {
        direction: '',
        nodeId: '',
        flowUUID: '',
        // scalingFactor: 1,
      },
      scalingFactor,
      up2DownEdges,
      mdProcessInstances,
      dbProcessExchanges,
    );

    const newUp2DownEdges = up2DownEdges.map((ud: Up2DownEdge) => {
      if (ud?.dependence === 'downstream') {
        const cpe = calculatedProcessExchanges.find((c: any) => {
          return (
            c?.dependence?.direction === 'downstream' &&
            c?.dependence?.flowUUID === ud?.flowUUID &&
            c?.dependence?.nodeId === ud?.downstreamId &&
            c?.nodeId === ud?.upstreamId
          );
        });
        if (cpe) {
          return {
            ...ud,
            scalingFactor: cpe?.scalingFactor,
          };
        }
      }

      if (ud?.dependence === 'upstream') {
        const cpe = calculatedProcessExchanges.find((c: any) => {
          return (
            c?.dependence?.direction === 'upstream' &&
            c?.dependence?.flowUUID === ud?.flowUUID &&
            c?.dependence?.nodeId === ud?.upstreamId &&
            c?.nodeId === ud?.downstreamId
          );
        });
        if (cpe) {
          return {
            ...ud,
            scalingFactor: cpe?.scalingFactor,
          };
        }
      }

      if (ud?.dependence === 'none') {
        if (ud?.mainDependence === 'downstream') {
          const cpe = calculatedProcessExchanges.find((c: any) => {
            return c?.nodeId === ud?.upstreamId;
          });
          if (cpe) {
            return {
              ...ud,
              scalingFactor: cpe?.scalingFactor,
            };
          }
        }
        if (ud?.mainDependence === 'upstream') {
          const cpe = calculatedProcessExchanges.find((c: any) => {
            return c?.nodeId === ud?.downstreamId;
          });
          if (cpe) {
            return {
              ...ud,
              scalingFactor: cpe?.scalingFactor,
            };
          }
        }
      }
      return {
        ...ud,
        scalingFactor: 0,
      };
    });

    const groupedProcessExchanges: Record<string, any[]> = {};
    calculatedProcessExchanges.forEach((npe: any) => {
      if (!groupedProcessExchanges[npe.nodeId]) {
        groupedProcessExchanges[npe.nodeId] = [];
      }
      groupedProcessExchanges[npe.nodeId].push(npe);
    });

    const newProcessExchanges = Object.values(groupedProcessExchanges).map((group: any[]) => {
      const sumData = sumProcessExchange(group);
      return {
        ...group[0],
        scalingFactor: sumData.sumScalingFactor,
        exchanges: sumData.sumExchanges,
      };
    });

    const childProcessExchanges = allocatedProcessExchange(newProcessExchanges);

    childProcessExchanges.forEach((cpe: any) => {
      if (cpe?.nodeId === referenceToReferenceProcess) {
        // ✅ 明确标记为主产品
        cpe.finalProductType = 'has';
        cpe.isReferenceProcess = true;   // 🔥 新增标记，后面生成 newExchanges 时用
        return;
      }

      if (cpe?.isAllocated) {
        const downstreamEdges = newUp2DownEdges.filter(
          (ud: Up2DownEdge) =>
            ud?.upstreamId === cpe?.nodeId &&
            ud?.flowUUID === cpe?.allocatedExchangeFlowId,
        );
        if (downstreamEdges.length === 0) {
          cpe.finalProductType = 'has';
          return;
        } else {
          cpe.finalProductType = 'unknown';
          return;
        }
      } else {
        cpe.finalProductType = 'no';
        return;
      }
    });
    let whileCount = 0;
    let whileUnknown = true;
    const unknownCount = childProcessExchanges.filter(
      (cpe: any) => cpe?.finalProductType === 'unknown',
    )?.length;
    while (whileUnknown) {
      const unknownCPEs = childProcessExchanges.filter(
        (cpe: any) => cpe?.finalProductType === 'unknown',
      );
      unknownCPEs.forEach((cpe: any) => {
        const finalProductType = hasFinalProductProcessExchange(
          cpe,
          newUp2DownEdges,
          childProcessExchanges,
        );
        cpe.finalProductType = finalProductType;
      });
      if (unknownCPEs.length === 0) {
        whileUnknown = false;
      }
      whileCount++;
      if (whileCount > 3 + (unknownCount ?? 0) * 3) {
        console.error(`Too many iterations (${whileCount}), breaking out of the loop`);
        whileUnknown = false;
      }
    }

    const hasFinalProductProcessExchanges = childProcessExchanges.filter(
      (cpe: any) => cpe?.finalProductType === 'has',
    );

    const sumFinalProductGroups = await Promise.all(
      hasFinalProductProcessExchanges.map(async (cpe: any) => {
        const finalProductGroup = getFinalProductGroup(
          cpe,
          1,
          childProcessExchanges,
          newUp2DownEdges,
        );

        if (finalProductGroup?.length > 0) {
          let newSumExchanges: any = [];

          const unconnectedProcessExchanges = finalProductGroup.map((npe: any) => {
            const connectedInputFlowIds = newUp2DownEdges
              .map((ud: Up2DownEdge) => {
                if (ud?.downstreamId === npe?.nodeId) {
                  return ud?.flowUUID;
                }
                return null;
              })
              .filter((flowUUID: any) => flowUUID !== null);

            const connectedOutputFlowIds = newUp2DownEdges
              .map((ud: Up2DownEdge) => {
                if (ud?.upstreamId === npe?.nodeId) {
                  return ud?.flowUUID;
                }
                return null;
              })
              .filter((flowUUID: any) => flowUUID !== null);

            const npeExchanges = jsonToList(npe?.exchanges);
            const unconnectedExchanges = npeExchanges
              .map((e: any) => {
                if (
                  (e?.exchangeDirection ?? '').toUpperCase() === 'INPUT' &&
                  connectedInputFlowIds.includes(e?.referenceToFlowDataSet?.['@refObjectId'])
                ) {
                  return null;
                }
                if (
                  (e?.exchangeDirection ?? '').toUpperCase() === 'OUTPUT' &&
                  connectedOutputFlowIds.includes(e?.referenceToFlowDataSet?.['@refObjectId'])
                ) {
                  return null;
                }
                return e;
              })
              .filter((item: any) => item !== null);

            return {
              ...npe,
              exchanges: unconnectedExchanges,
            };
          });

          if (unconnectedProcessExchanges.length > 0) {
            newSumExchanges = sumProcessExchange(unconnectedProcessExchanges).sumExchanges.map(
              (e: any, index: number) => {
                return {
                  ...e,
                  meanAmount: toAmountNumber(e?.meanAmount),
                  resultingAmount: toAmountNumber(e?.resultingAmount),
                  '@dataSetInternalID': (index + 1).toString(),
                };
              },
            );

            const finalProductProcessExchange = unconnectedProcessExchanges.find(
              (npe: any) => npe?.finalProductType === 'has',
            );

            let finalId: any = {
              nodeId: finalProductProcessExchange?.nodeId ?? '',
              processId: finalProductProcessExchange?.processId ?? '',
            };
            if (finalProductProcessExchange?.isAllocated) {
              finalId = {
                ...finalId,
                allocatedExchangeFlowId: finalProductProcessExchange?.allocatedExchangeFlowId ?? '',
                allocatedExchangeDirection:
                  finalProductProcessExchange?.allocatedExchangeDirection ?? '',
              };
            } else {
              finalId = {
                ...finalId,
                referenceToFlowDataSet: {
                  '@refObjectId': thisRefFlow?.referenceToFlowDataSet?.['@refObjectId'] ?? '',
                  '@exchangeDirection': thisRefFlow?.exchangeDirection ?? '',
                },
              };
            }

            let newId = v4();
            let option = 'create';
            let type = 'secondary';
            const newExchanges = newSumExchanges?.map((e: any) => {
              // ✅ 主产品（两种方式兜底）
              if (
                finalProductProcessExchange?.isReferenceProcess ||
                (finalProductProcessExchange?.nodeId === referenceToReferenceProcess &&
                  e?.referenceToFlowDataSet?.['@refObjectId'] ===
                  thisRefFlow?.referenceToFlowDataSet?.['@refObjectId'] &&
                  e?.exchangeDirection?.toUpperCase() ===
                  thisRefFlow?.exchangeDirection?.toUpperCase())
              ) {
                newId = id;
                option = 'update';
                type = 'primary';
                return {
                  ...e,
                  allocatedFraction: undefined,
                  allocations: undefined,
                  meanAmount: e?.meanAmount.toString(),
                  resultingAmount: e?.resultingAmount.toString(),
                  quantitativeReference: true,
                };
              }

              // ✅ 副产品（分配过）
              if (
                finalProductProcessExchange?.isAllocated &&
                e?.referenceToFlowDataSet?.['@refObjectId'] ===
                finalProductProcessExchange?.allocatedExchangeFlowId &&
                e?.exchangeDirection?.toUpperCase() ===
                finalProductProcessExchange?.allocatedExchangeDirection?.toUpperCase()
              ) {
                return {
                  ...e,
                  allocatedFraction: undefined,
                  allocations: undefined,
                  meanAmount: e?.meanAmount.toString(),
                  resultingAmount: e?.resultingAmount.toString(),
                  quantitativeReference: true,
                };
              }

              // ✅ 其它情况（普通 exchange）
              return {
                ...e,
                allocatedFraction: undefined,
                allocations: undefined,
                meanAmount: e?.meanAmount.toString(),
                resultingAmount: e?.resultingAmount.toString(),
                quantitativeReference: true,
              };
            });

            const LCIAResults = await LCIAResultCalculation(newExchanges);

            if (type === 'secondary') {
              const oldProcesses = oldSubmodels?.find(
                (o: any) =>
                  o.type === 'secondary' &&
                  o.finalId.nodeId === finalId.nodeId &&
                  o.finalId.processId === finalId.processId &&
                  o.finalId.allocatedExchangeDirection === finalId.allocatedExchangeDirection &&
                  o.finalId.allocatedExchangeFlowId === finalId.allocatedExchangeFlowId,
              );
              if (oldProcesses && oldProcesses.id.length > 0) {
                option = 'update';
                newId = oldProcesses.id;
              }
            }

            const refExchange = newExchanges.find((e: any) => e?.quantitativeReference);

            const subproductPrefix = [
              { '@xml:lang': 'zh', '#text': '子产品: ' },
              { '@xml:lang': 'en', '#text': 'Subproduct: ' },
            ];
            const subproductLeftBracket = [
              { '@xml:lang': 'zh', '#text': '[' },
              { '@xml:lang': 'en', '#text': '[' },
            ];
            const subproductRightBracket = [
              { '@xml:lang': 'zh', '#text': '] ' },
              { '@xml:lang': 'en', '#text': '] ' },
            ];

            const baseName =
              type === 'primary'
                ? data?.lifeCycleModelInformation?.dataSetInformation?.name?.baseName
                : mergeLangArrays(
                  subproductLeftBracket,
                  subproductPrefix,
                  jsonToList(refExchange?.referenceToFlowDataSet['common:shortDescription']),
                  subproductRightBracket,
                  jsonToList(data?.lifeCycleModelInformation?.dataSetInformation?.name?.baseName),
                );

            // const functionalUnitFlowProperties = type === 'primary' ? data?.lifeCycleModelInformation?.dataSetInformation?.name
            //   ?.functionalUnitFlowProperties : refExchange.referenceToFlowDataSet["common:shortDescription"];

            const newData = removeEmptyObjects({
              option: option,
              modelInfo: {
                id: newId,
                type: type,
                finalId: finalId,
              },
              data: {
                processDataSet: {
                  processInformation: {
                    dataSetInformation: {
                      'common:UUID': newId,
                      name: {
                        baseName: baseName,
                        treatmentStandardsRoutes:
                          data?.lifeCycleModelInformation?.dataSetInformation?.name
                            ?.treatmentStandardsRoutes,
                        mixAndLocationTypes:
                          data?.lifeCycleModelInformation?.dataSetInformation?.name
                            ?.mixAndLocationTypes,
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
                            data?.lifeCycleModelInformation?.dataSetInformation
                              ?.classificationInformation?.['common:classification']?.[
                            'common:class'
                            ],
                        },
                      },
                      'common:generalComment':
                        data?.lifeCycleModelInformation?.dataSetInformation?.[
                        'common:generalComment'
                        ],
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
                    // quantitativeReference: {
                    //   '@type': refDbProcess?.quantitativeReference?.['@type'],
                    //   referenceToReferenceFlow: referenceToReferenceFlow?.['@dataSetInternalID'],
                    //   functionalUnitOrOther:
                    //     refDbProcess?.quantitativeReference?.functionalUnitOrOther,
                    // },
                    time: {
                      'common:referenceYear':
                        data?.lifeCycleModelInformation?.time?.['common:referenceYear'] ?? {},
                      'common:dataSetValidUntil':
                        data?.lifeCycleModelInformation?.time?.['common:dataSetValidUntil'],
                      'common:timeRepresentativenessDescription':
                        data?.lifeCycleModelInformation?.time?.[
                        'common:timeRepresentativenessDescription'
                        ],
                    },
                    geography: {
                      locationOfOperationSupplyOrProduction: {
                        '@location':
                          data?.lifeCycleModelInformation?.geography
                            ?.locationOfOperationSupplyOrProduction?.['@location'] === 'NULL'
                            ? {}
                            : (data?.lifeCycleModelInformation?.geography
                              ?.locationOfOperationSupplyOrProduction?.['@location'] ?? {}),
                        descriptionOfRestrictions:
                          data?.lifeCycleModelInformation?.geography
                            ?.locationOfOperationSupplyOrProduction?.descriptionOfRestrictions,
                      },
                      subLocationOfOperationSupplyOrProduction: {
                        '@subLocation':
                          data?.lifeCycleModelInformation?.geography
                            ?.subLocationOfOperationSupplyOrProduction?.['@subLocation'] === 'NULL'
                            ? {}
                            : (data?.lifeCycleModelInformation?.geography
                              ?.subLocationOfOperationSupplyOrProduction?.['@subLocation'] ?? {}),
                        descriptionOfRestrictions:
                          data?.lifeCycleModelInformation?.geography
                            ?.subLocationOfOperationSupplyOrProduction?.descriptionOfRestrictions,
                      },
                    },
                    technology: {
                      technologyDescriptionAndIncludedProcesses:
                        data?.lifeCycleModelInformation?.technology
                          ?.technologyDescriptionAndIncludedProcesses,
                      technologicalApplicability:
                        data?.lifeCycleModelInformation?.technology?.technologicalApplicability,
                      referenceToTechnologyPictogramme: {
                        '@type':
                          data?.lifeCycleModelInformation?.technology
                            ?.referenceToTechnologyPictogramme?.['@type'],
                        '@refObjectId':
                          data?.lifeCycleModelInformation?.technology
                            ?.referenceToTechnologyPictogramme?.['@refObjectId'],
                        '@version':
                          data?.lifeCycleModelInformation?.technology
                            ?.referenceToTechnologyPictogramme?.['@version'],
                        '@uri':
                          data?.lifeCycleModelInformation?.technology
                            ?.referenceToTechnologyPictogramme?.['@uri'],
                        'common:shortDescription':
                          data?.lifeCycleModelInformation?.technology
                            ?.referenceToTechnologyPictogramme?.['common:shortDescription'],
                      },
                      referenceToTechnologyFlowDiagrammOrPicture: {
                        '@type':
                          data?.lifeCycleModelInformation?.technology
                            ?.referenceToTechnologyFlowDiagrammOrPicture?.['@type'],
                        '@version':
                          data?.lifeCycleModelInformation?.technology
                            ?.referenceToTechnologyFlowDiagrammOrPicture?.['@version'],
                        '@refObjectId':
                          data?.lifeCycleModelInformation?.technology
                            ?.referenceToTechnologyFlowDiagrammOrPicture?.['@refObjectId'],
                        '@uri':
                          data?.lifeCycleModelInformation?.technology
                            ?.referenceToTechnologyFlowDiagrammOrPicture?.['@uri'],
                        'common:shortDescription':
                          data?.lifeCycleModelInformation?.technology
                            ?.referenceToTechnologyFlowDiagrammOrPicture?.[
                          'common:shortDescription'
                          ],
                      },
                    },
                    mathematicalRelations: {
                      modelDescription:
                        data?.lifeCycleModelInformation?.mathematicalRelations?.modelDescription,
                      variableParameter: {
                        '@name':
                          data?.lifeCycleModelInformation?.mathematicalRelations
                            ?.variableParameter?.['@name'],
                        formula:
                          data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                            ?.formula,
                        meanValue:
                          data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                            ?.meanValue,
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
                          data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                            ?.comment,
                      },
                    },
                  },
                  modellingAndValidation: {
                    LCIMethodAndAllocation: {
                      typeOfDataSet:
                        data?.modellingAndValidation?.LCIMethodAndAllocation?.typeOfDataSet ?? {},
                      LCIMethodPrinciple:
                        data?.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodPrinciple ??
                        {},
                      deviationsFromLCIMethodPrinciple:
                        data?.modellingAndValidation?.LCIMethodAndAllocation
                          ?.deviationsFromLCIMethodPrinciple,
                      LCIMethodApproaches:
                        data?.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodApproaches ??
                        {},
                      deviationsFromLCIMethodApproaches:
                        data?.modellingAndValidation?.LCIMethodAndAllocation
                          ?.deviationsFromLCIMethodApproaches,
                      modellingConstants:
                        data?.modellingAndValidation?.LCIMethodAndAllocation?.modellingConstants,
                      deviationsFromModellingConstants:
                        data?.modellingAndValidation?.LCIMethodAndAllocation
                          ?.deviationsFromModellingConstants,
                      referenceToLCAMethodDetails: {
                        '@type':
                          data?.modellingAndValidation?.LCIMethodAndAllocation
                            ?.referenceToLCAMethodDetails?.['@type'] ?? {},
                        '@refObjectId':
                          data?.modellingAndValidation?.LCIMethodAndAllocation
                            ?.referenceToLCAMethodDetails?.['@refObjectId'] ?? {},
                        '@uri':
                          data?.modellingAndValidation?.LCIMethodAndAllocation
                            ?.referenceToLCAMethodDetails?.['@uri'] ?? {},
                        '@version':
                          data?.modellingAndValidation?.LCIMethodAndAllocation
                            ?.referenceToLCAMethodDetails?.['@version'] ?? {},
                        'common:shortDescription':
                          data?.modellingAndValidation?.LCIMethodAndAllocation
                            ?.referenceToLCAMethodDetails?.['common:shortDescription'],
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
                        '@version':
                          data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                            ?.referenceToDataSource?.['@version'] ?? {},
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
                        data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                          ?.useAdviceForDataSet,
                    },
                    completeness: {
                      completenessProductModel:
                        data?.modellingAndValidation?.completeness?.completenessProductModel,
                      completenessElementaryFlows: {
                        '@type':
                          data?.modellingAndValidation?.completeness?.completenessElementaryFlows?.[
                          '@type'
                          ],
                        '@value':
                          data?.modellingAndValidation?.completeness?.completenessElementaryFlows?.[
                          '@value'
                          ],
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
                        data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                        'common:project'
                        ],
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
                      'common:timeStamp':
                        data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'],
                      'common:referenceToDataSetFormat': {
                        '@refObjectId':
                          data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetFormat'
                          ]?.['@refObjectId'],
                        '@type':
                          data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetFormat'
                          ]?.['@type'],
                        '@uri':
                          data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetFormat'
                          ]?.['@uri'],
                        '@version':
                          data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetFormat'
                          ]?.['@version'] ?? {},
                        'common:shortDescription':
                          data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetFormat'
                          ]?.['common:shortDescription'],
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
                        data?.administrativeInformation?.publicationAndOwnership?.[
                        'common:dataSetVersion'
                        ],
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
                        data?.administrativeInformation?.publicationAndOwnership?.[
                        'common:copyright'
                        ],
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
                        data?.administrativeInformation?.publicationAndOwnership?.[
                        'common:licenseType'
                        ],
                      'common:accessRestrictions':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                        'common:accessRestrictions'
                        ],
                    },
                  },
                  exchanges: {
                    exchange: newExchanges,
                  },
                  LCIAResults: {
                    LCIAResult: LCIAResults,
                  },
                },
              },
            });

            return newData;
          }
        }
        return null;
      }),
    );

    return sumFinalProductGroups.filter((item) => item !== null);
  }
  return [];
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
