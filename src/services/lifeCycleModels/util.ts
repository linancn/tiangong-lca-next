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
          review: {
            'common:referenceToNameOfReviewerAndInstitution': {
              '@refObjectId':
                data?.modellingAndValidation?.validation?.review?.[
                  'common:referenceToNameOfReviewerAndInstitution'
                ]?.['@refObjectId'],
              '@type':
                data?.modellingAndValidation?.validation?.review?.[
                  'common:referenceToNameOfReviewerAndInstitution'
                ]?.['@type'],
              '@uri':
                data?.modellingAndValidation?.validation?.review?.[
                  'common:referenceToNameOfReviewerAndInstitution'
                ]?.['@uri'],
              '@version':
                data?.modellingAndValidation?.validation?.review?.[
                  'common:referenceToNameOfReviewerAndInstitution'
                ]?.['@version'],
              'common:shortDescription': getLangJson(
                data?.modellingAndValidation?.validation?.review?.[
                  'common:referenceToNameOfReviewerAndInstitution'
                ]?.['common:shortDescription'],
              ),
            },
            'common:referenceToCompleteReviewReport': {
              '@refObjectId':
                data?.modellingAndValidation?.validation?.review?.[
                  'common:referenceToCompleteReviewReport'
                ]?.['@refObjectId'],
              '@type':
                data?.modellingAndValidation?.validation?.review?.[
                  'common:referenceToCompleteReviewReport'
                ]?.['@type'],
              '@uri':
                data?.modellingAndValidation?.validation?.review?.[
                  'common:referenceToCompleteReviewReport'
                ]?.['@uri'],
              '@version':
                data?.modellingAndValidation?.validation?.review?.[
                  'common:referenceToCompleteReviewReport'
                ]?.['@version'],
              'common:shortDescription': getLangJson(
                data?.modellingAndValidation?.validation?.review?.[
                  'common:referenceToCompleteReviewReport'
                ]?.['common:shortDescription'],
              ),
            },
          },
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
              '@version':
                data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                  'common:referenceToComplianceSystem'
                ]?.['@version'],
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
            'common:nomenclatureCompliance':
              data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:nomenclatureCompliance'
              ],
            'common:methodologicalCompliance':
              data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:methodologicalCompliance'
              ],
            'common:reviewCompliance':
              data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:reviewCompliance'
              ],
            'common:documentationCompliance':
              data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:documentationCompliance'
              ],
            'common:qualityCompliance':
              data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:qualityCompliance'
              ],
          },
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
              data?.administrativeInformation?.publicationAndOwnership
                ?.referenceToEntitiesWithExclusiveAccess?.['@refObjectId'],
            '@type':
              data?.administrativeInformation?.publicationAndOwnership
                ?.referenceToEntitiesWithExclusiveAccess?.['@type'],
            '@uri':
              data?.administrativeInformation?.publicationAndOwnership
                ?.referenceToEntitiesWithExclusiveAccess?.['@uri'],
            '@version':
              data?.administrativeInformation?.publicationAndOwnership
                ?.referenceToEntitiesWithExclusiveAccess?.['@version'],
            'common:shortDescription': getLangJson(
              data?.administrativeInformation?.publicationAndOwnership
                ?.referenceToEntitiesWithExclusiveAccess?.['common:shortDescription'],
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
        referenceToReferenceProcess:
          data?.lifeCycleModelInformation?.quantitativeReference?.referenceToReferenceProcess,
      },
      technology: {
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
    },
    modellingAndValidation: {
      dataSourcesTreatmentEtc: {
        useAdviceForDataSet: getLangList(
          data?.modellingAndValidation?.dataSourcesTreatmentEtc?.useAdviceForDataSet,
        ),
      },
      validation: {
        review: {
          'common:referenceToNameOfReviewerAndInstitution': {
            '@refObjectId':
              data?.modellingAndValidation?.validation?.review?.[
                'common:referenceToNameOfReviewerAndInstitution'
              ]?.['@refObjectId'],
            '@type':
              data?.modellingAndValidation?.validation?.review?.[
                'common:referenceToNameOfReviewerAndInstitution'
              ]?.['@type'],
            '@uri':
              data?.modellingAndValidation?.validation?.review?.[
                'common:referenceToNameOfReviewerAndInstitution'
              ]?.['@uri'],
            '@version':
              data?.modellingAndValidation?.validation?.review?.[
                'common:referenceToNameOfReviewerAndInstitution'
              ]?.['@version'],
            'common:shortDescription': getLangList(
              data?.modellingAndValidation?.validation?.review?.[
                'common:referenceToNameOfReviewerAndInstitution'
              ]?.['common:shortDescription'],
            ),
          },
          'common:referenceToCompleteReviewReport': {
            '@refObjectId':
              data?.modellingAndValidation?.validation?.review?.[
                'common:referenceToCompleteReviewReport'
              ]?.['@refObjectId'],
            '@type':
              data?.modellingAndValidation?.validation?.review?.[
                'common:referenceToCompleteReviewReport'
              ]?.['@type'],
            '@uri':
              data?.modellingAndValidation?.validation?.review?.[
                'common:referenceToCompleteReviewReport'
              ]?.['@uri'],
            '@version':
              data?.modellingAndValidation?.validation?.review?.[
                'common:referenceToCompleteReviewReport'
              ]?.['@version'],
            'common:shortDescription': getLangList(
              data?.modellingAndValidation?.validation?.review?.[
                'common:referenceToCompleteReviewReport'
              ]?.['common:shortDescription'],
            ),
          },
        },
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
          'common:nomenclatureCompliance':
            data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
              'common:nomenclatureCompliance'
            ],
          'common:methodologicalCompliance':
            data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
              'common:methodologicalCompliance'
            ],
          'common:reviewCompliance':
            data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
              'common:reviewCompliance'
            ],
          'common:documentationCompliance':
            data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
              'common:documentationCompliance'
            ],
          'common:qualityCompliance':
            data?.modellingAndValidation?.complianceDeclarations?.compliance?.[
              'common:qualityCompliance'
            ],
        },
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
        'common:copyright':
          data?.administrativeInformation?.publicationAndOwnership?.['common:copyright'],
        referenceToEntitiesWithExclusiveAccess: {
          '@refObjectId':
            data?.administrativeInformation?.publicationAndOwnership
              ?.referenceToEntitiesWithExclusiveAccess?.['@refObjectId'],
          '@type':
            data?.administrativeInformation?.publicationAndOwnership
              ?.referenceToEntitiesWithExclusiveAccess?.['@type'],
          '@uri':
            data?.administrativeInformation?.publicationAndOwnership
              ?.referenceToEntitiesWithExclusiveAccess?.['@uri'],
          '@version':
            data?.administrativeInformation?.publicationAndOwnership
              ?.referenceToEntitiesWithExclusiveAccess?.['@version'],
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.publicationAndOwnership
              ?.referenceToEntitiesWithExclusiveAccess?.['common:shortDescription'],
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
        },
        quantitativeReference: {
          '@type': dbReferenceProcess?.quantitativeReference?.['@type'],
          referenceToReferenceFlow: referenceToReferenceFlow?.['@dataSetInternalID'],
          functionalUnitOrOther: dbReferenceProcess?.quantitativeReference?.functionalUnitOrOther,
        },
      },

      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'],
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
            'common:shortDescription':
              data?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]?.['common:shortDescription'],
          },
          'common:copyright':
            data?.administrativeInformation?.publicationAndOwnership?.['common:copyright'],
          'common:licenseType':
            data?.administrativeInformation?.publicationAndOwnership?.['common:licenseType'],
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
