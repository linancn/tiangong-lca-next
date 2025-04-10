import {
  getLangJson,
  getLangList,
  jsonToList,
  listToJson,
  removeEmptyObjects,
} from '../general/util';

export function genProcessJsonOrdered(id: string, data: any) {
  return removeEmptyObjects({
    processDataSet: {
      modellingAndValidation: {
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
                referenceToCompleteReviewReport: {
                  '@refObjectId':
                    review?.['referenceToCompleteReviewReport']?.['@refObjectId'] ?? {},
                  '@type': review?.['referenceToCompleteReviewReport']?.['@type'] ?? {},
                  '@uri': review?.['referenceToCompleteReviewReport']?.['@uri'] ?? {},
                  '@version': review?.['referenceToCompleteReviewReport']?.['@version'] ?? {},
                  'common:shortDescription': getLangJson(
                    review?.['referenceToCompleteReviewReport']?.['common:shortDescription'],
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
    },
  });
}

export function genProcessFromData(data: any) {
  return removeEmptyObjects({
    modellingAndValidation: {
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
            referenceToCompleteReviewReport: {
              '@refObjectId': review?.['referenceToCompleteReviewReport']?.['@refObjectId'],
              '@type': review?.['referenceToCompleteReviewReport']?.['@type'],
              '@uri': review?.['referenceToCompleteReviewReport']?.['@uri'],
              '@version': review?.['referenceToCompleteReviewReport']?.['@version'],
              'common:shortDescription': getLangList(
                review?.['referenceToCompleteReviewReport']?.['common:shortDescription'],
              ),
            },
          };
        }),
      },
    },
  });
}
