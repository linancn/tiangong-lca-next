import { createLifeCycleModel as createTidasLifeCycleModel } from '@tiangong-lca/tidas-sdk';
import { v4 } from 'uuid';
import {
  classificationToJsonList,
  classificationToStringList,
  convertCopyrightToBoolean,
  convertToUTCISOString,
  formatDateTime,
  getLangJson,
  getLangList,
  getLangText,
  jsonToList,
  listToJson,
  removeEmptyObjects,
} from '../general/util';
import { genProcessName, genProcessNameJson } from '../processes/util';
import { FormLifeCycleModel } from './data';

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

export const genReferenceToResultingProcess = (
  lifeCycleModelProcesses: any,
  version: string,
  data: any,
) => {
  if (!lifeCycleModelProcesses || lifeCycleModelProcesses.length === 0 || !data) {
    return data;
  }

  const referenceToResultingProcess = lifeCycleModelProcesses.map((process: any) => {
    return {
      '@refObjectId': process?.modelInfo?.id,
      '@type': 'process data set',
      '@uri': `../processes/${process?.modelInfo?.id}.xml`,
      '@version': version,
      'common:shortDescription': genProcessNameJson(
        process?.data?.processDataSet?.processInformation?.dataSetInformation?.name,
      ),
    };
  });
  console.log('referenceToResultingProcess', referenceToResultingProcess, data);
  data['lifeCycleModelDataSet']['lifeCycleModelInformation']['dataSetInformation'][
    'referenceToResultingProcess'
  ] = referenceToResultingProcess;
  return data;
};
export function genLifeCycleModelJsonOrdered(id: string, data: any) {
  const nodes = data?.model?.nodes;

  let referenceToReferenceProcess = null;
  const processInstance = nodes?.map((n: any) => {
    if (n?.data?.quantitativeReference === '1') {
      referenceToReferenceProcess = n?.data?.index;
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
          '@id': targetNode?.data?.index,
        };
      });
      return {
        '@flowUUID': key,
        downstreamProcess: listToJson(downstreamProcesses),
      };
    });

    return removeEmptyObjects({
      '@dataSetInternalID': n?.data?.index ?? {},
      // '@multiplicationFactor': n?.data?.multiplicationFactor ?? {},
      // scalingFactor: n?.data?.scalingFactor,
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
            jsonToList(data?.modellingAndValidation?.validation?.review)?.map((review: any) => {
              return {
                '@type': review?.['@type'] ?? {},
                'common:scope': listToJson(
                  jsonToList(review?.['common:scope'])?.map((scope: any) => {
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
            jsonToList(data?.modellingAndValidation?.complianceDeclarations?.compliance)?.map(
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
          'common:timeStamp': formatDateTime(new Date()),
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
          'common:permanentDataSetURI': `https://lcdn.tiangong.earth/datasetdetail/lifecyclemodel.xhtml?uuid=${id}&version=${data?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion']}`,
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
          'common:timeStamp': convertToUTCISOString(
            data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'],
          ),
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
          'common:copyright': convertCopyrightToBoolean(
            data?.administrativeInformation?.publicationAndOwnership?.['common:copyright'],
          ),
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
        const nodeWidth = node?.size?.width ?? node?.width ?? 350;
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
        targetInputFlowId: item.targetInputFlowId ?? '-',
        targetInputFlowName: getLangText(item.targetInputFlowName, lang),
        targetInputFlowGeneralComment: getLangText(item.targetInputFlowGeneralComment, lang),
      });
    });
  }
  return [];
}
