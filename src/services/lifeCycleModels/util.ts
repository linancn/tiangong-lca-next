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
} from '../general/util';
import { genProcessName } from '../processes/util';
import { supabase } from '../supabase';

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
    const outputExchange = sourceEdges.map((e: any) => {
      const targetNode = nodes?.find((n: any) => n?.id === e?.target?.cell);

      return removeEmptyObjects({
        '@flowUUID': e?.data?.connection?.outputExchange?.['@flowUUID'],
        downstreamProcess: {
          '@flowUUID': e?.data?.connection?.outputExchange?.downstreamProcess?.['@flowUUID'],
          '@id': targetNode?.['@dataSetInternalID'],
        },
      });
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
        return {
          ...node,
          label: genProcessName(node?.data?.label, lang),
        };
      }) ?? [],
    edges: data?.xflow?.edges ?? [],
  };
}

const genProcessTree = (
  thisModelProcess: any,
  modelProcesses: any[],
  dbProcessExchanges: any[],
): any => {
  const dbPE = dbProcessExchanges?.find(
    (p: any) => p?.id === thisModelProcess?.referenceToProcess?.['@refObjectId'],
  );
  const upstreamProcess = modelProcesses.filter((p: any) =>
    p?.connections?.outputExchange?.some(
      (o: any) => o?.downstreamProcess?.['@id'] === thisModelProcess?.['@dataSetInternalID'],
    ),
  );
  return {
    // modelProcess: thisModelProcess,
    dbProcessExchanges: dbPE,
    upstreamProcesses:
      upstreamProcess?.map((p: any) => {
        const outputExchange = p?.connections?.outputExchange?.find(
          (o: any) => o?.downstreamProcess?.['@id'] === thisModelProcess?.['@dataSetInternalID'],
        );
        return {
          connection: {
            thisFlowId: outputExchange?.downstreamProcess?.['@flowUUID'],
            upstreamFlowId: outputExchange?.['@flowUUID'],
          },
          upstreamProcess: genProcessTree(p, modelProcesses, dbProcessExchanges),
        };
      }) ?? [],
  };
};

const genProcessExchange = (processTree: any, amount?: number, outputFlowId?: any) => {
  let newExchange: any[] = [];

  let adjustedAmount = amount;
  if (adjustedAmount === undefined || adjustedAmount === null || isNaN(adjustedAmount)) {
    adjustedAmount = 1;
  }

  const exchange = processTree?.dbProcessExchanges?.exchange;
  if (outputFlowId) {
    const outputExchange = exchange?.find(
      (e: any) =>
        e?.exchangeDirection.toUpperCase() === 'OUTPUT' &&
        e?.referenceToFlowDataSet?.['@refObjectId'] === outputFlowId,
    );

    const resultingAmount = Number(outputExchange?.resultingAmount);
    if (isNaN(resultingAmount) || resultingAmount === 0) {
      return [];
    }

    const p = adjustedAmount / resultingAmount;

    if (processTree?.upstreamProcesses?.length > 0) {
      processTree?.upstreamProcesses?.forEach((u: any) => {
        const inputExchange = exchange?.find(
          (e: any) =>
            e?.exchangeDirection.toUpperCase() === 'INPUT' &&
            e?.referenceToFlowDataSet?.['@refObjectId'] === u?.connection?.thisFlowId,
        );

        exchange?.forEach((e: any) => {
          if (
            e?.['@dataSetInternalID'] !== inputExchange?.['@dataSetInternalID'] &&
            e?.['@dataSetInternalID'] !== outputExchange?.['@dataSetInternalID']
          ) {
            newExchange.push({
              ...e,
              meanAmount: Number(e?.resultingAmount) * p,
              resultingAmount: Number(e?.resultingAmount) * p,
            });
          }
        });
        if (u?.upstreamProcess) {
          const uExchange = genProcessExchange(
            u?.upstreamProcess,
            p * Number(inputExchange?.resultingAmount),
            u?.connection?.upstreamFlowId,
          );

          uExchange?.forEach((e: any) => {
            newExchange.push(e);
          });
        }
      });
    } else {
      exchange?.forEach((e: any) => {
        if (e?.['@dataSetInternalID'] !== outputExchange?.['@dataSetInternalID']) {
          newExchange.push({
            ...e,
            meanAmount: Number(e?.resultingAmount) * p,
            resultingAmount: Number(e?.resultingAmount) * p,
          });
        }
      });
    }
  } else {
    if (processTree?.upstreamProcesses?.length > 0) {
      processTree?.upstreamProcesses?.forEach((u: any) => {
        const inputExchange = exchange?.find(
          (e: any) =>
            e?.exchangeDirection.toUpperCase() === 'INPUT' &&
            e?.referenceToFlowDataSet?.['@refObjectId'] === u?.connection?.thisFlowId,
        );

        exchange?.forEach((e: any) => {
          if (e?.['@dataSetInternalID'] !== inputExchange?.['@dataSetInternalID']) {
            newExchange.push({
              ...e,
              meanAmount: Number(e?.meanAmount),
              resultingAmount: Number(e?.resultingAmount),
            });
          }
        });

        if (u?.upstreamProcess) {
          const uExchange = genProcessExchange(
            u?.upstreamProcess,
            adjustedAmount * Number(inputExchange?.resultingAmount),
            u?.connection?.upstreamFlowId,
          );

          uExchange?.forEach((e: any) => {
            newExchange.push(e);
          });
        }
      });
    } else {
      exchange?.forEach((e: any) => {
        newExchange.push({
          ...e,
          meanAmount: Number(e?.meanAmount),
          resultingAmount: Number(e?.resultingAmount),
        });
      });
    }
  }
  return newExchange;
};

const sumProcessExchange = (processExchange: any[]) => {
  const sumData =
    processExchange?.reduce((acc, curr) => {
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

  let allExchange: any = [];

  const referenceToReferenceProcess =
    data?.lifeCycleModelInformation?.quantitativeReference?.referenceToReferenceProcess;

  const referenceProcess = processInstance.find(
    (p: any) => p?.['@dataSetInternalID'] === referenceToReferenceProcess,
  );

  const dbReferenceProcess = dbProcessExchanges.find(
    (p: any) => p?.id === referenceProcess?.referenceToProcess?.['@refObjectId'],
  ) as any;

  const flowQuantitativeReference = dbReferenceProcess?.exchange?.find(
    (e: any) =>
      e?.['@dataSetInternalID'] ===
      dbReferenceProcess?.quantitativeReference?.referenceToReferenceFlow,
  );

  if (referenceProcess) {
    const processTree = genProcessTree(referenceProcess, processInstance, dbProcessExchanges);
    allExchange = genProcessExchange(processTree);
  }

  const sumExchange = sumProcessExchange(allExchange);

  const thisFlowQuantitativeReference = sumExchange.find(
    (e: any) =>
      e?.referenceToFlowDataSet?.['@refObjectId'] ===
        flowQuantitativeReference?.referenceToFlowDataSet?.['@refObjectId'] &&
      e?.exchangeDirection.toUpperCase() ===
        flowQuantitativeReference?.exchangeDirection.toUpperCase(),
  );

  const targetAmount = refNode?.data?.targetAmount;
  const originalAmount = thisFlowQuantitativeReference?.resultingAmount;
  const adjustedAmount = targetAmount / originalAmount;

  const exchange = sumExchange.map((e: any) => {
    if (e['@dataSetInternalID'] === thisFlowQuantitativeReference['@dataSetInternalID']) {
      return {
        ...e,
        meanAmount: targetAmount,
        resultingAmount: targetAmount,
      };
    } else {
      return {
        ...e,
        meanAmount: e.meanAmount * adjustedAmount,
        resultingAmount: e.resultingAmount * adjustedAmount,
      };
    }
  });

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
          referenceToReferenceFlow: thisFlowQuantitativeReference?.['@dataSetInternalID'],
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
        exchange: [...exchange],
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
