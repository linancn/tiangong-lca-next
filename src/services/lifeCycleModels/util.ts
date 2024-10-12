import { v4 } from 'uuid';
import {
  classificationToJsonList,
  classificationToStringList,
  getLangJson,
  getLangList,
  getLangText,
  listToJson,
  removeEmptyObjects,
} from '../general/util';

export function genLifeCycleModelJsonOrdered(id: string, data: any, oldData: any) {
  const nodes = data?.model?.nodes?.map((n: any, index: number) => {
    return {
      ...n,
      '@dataSetInternalID': index.toString(),
    };
  });

  const processInstance = nodes?.map((n: any) => {
    const sourceEdges = data?.model?.edges?.filter((e: any) => e?.source?.cell === n?.id);
    const outputExchange = sourceEdges.map((e: any) => {
      const targetNode = nodes?.find((n: any) => n?.id === e?.target?.cell);
      return {
        '@flowUUID': e?.data?.exchange?.[0]?.sourceOutputFlowId,
        downstreamProcess: {
          '@flowUUID': e?.data?.exchange?.[0]?.targetInputFlowId,
          '@id': targetNode?.['@dataSetInternalID'],
        },
      };
    });
    return {
      '@dataSetInternalID': n?.['@dataSetInternalID'],
      '@multiplicationFactor': n?.data?.multiplicationFactor,
      referenceToProcess: {
        '@refObjectId': n?.data?.id,
        '@type': 'process data set',
        '@uri': '../processes/' + n?.data?.id + '.xml',
        '@version': n?.data?.version,
        'common:shortDescription': n?.data?.shortDescription,
      },
      groups: {},
      parameters: {},
      connections: {
        outputExchange: listToJson(outputExchange),
      },
    };
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
              data?.lifeCycleModelInformation?.dataSetInformation?.treatmentStandardsRoutes,
            ),
            mixAndLocationTypes: getLangJson(
              data?.lifeCycleModelInformation?.dataSetInformation?.mixAndLocationTypes,
            ),
            functionalUnitFlowProperties: getLangJson(
              data?.lifeCycleModelInformation?.dataSetInformation?.functionalUnitFlowProperties,
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
          referenceToReferenceProcess:
            data?.lifeCycleModelInformation?.quantitativeReference?.referenceToReferenceProcess,
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
            data?.lifeCycleModelInformation?.dataSetInformation?.treatmentStandardsRoutes,
          ),
          mixAndLocationTypes: getLangList(
            data?.lifeCycleModelInformation?.dataSetInformation?.mixAndLocationTypes,
          ),
          functionalUnitFlowProperties: getLangList(
            data?.lifeCycleModelInformation?.dataSetInformation?.functionalUnitFlowProperties,
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
          label: getLangText(node?.data?.label, lang),
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
        targetInputFlowId: item.targetOutputFlowId ?? '-',
        targetInputFlowName: getLangText(item.targetInputFlowName, lang),
        targetInputFlowGeneralComment: getLangText(item.targetInputFlowGeneralComment, lang),
      });
    });
  }
  return [];
}
