/**
 * Tests for comments utility functions
 * Path: src/services/comments/util.ts
 *
 * Coverage focuses on:
 * - Process JSON generation with review and compliance data (used in process review forms)
 * - Data transformation from JSON to structured format (used in form data binding)
 */

import { genProcessFromData, genProcessJsonOrdered } from '@/services/comments/util';

jest.mock('@/services/general/util', () => ({
  getLangJson: jest.fn((data) => data),
  getLangList: jest.fn((data) => (Array.isArray(data) ? data : data ? [data] : [])),
  jsonToList: jest.fn((data) => (Array.isArray(data) ? data : data ? [data] : [])),
  listToJson: jest.fn((data) => (Array.isArray(data) && data.length === 1 ? data[0] : data)),
  removeEmptyObjects: jest.fn((obj) => obj),
}));

describe('Comments Utility Functions (src/services/comments/util.ts)', () => {
  describe('genProcessJsonOrdered', () => {
    it('generates ordered JSON with review data', () => {
      const inputData = {
        modellingAndValidation: {
          validation: {
            review: [
              {
                '@type': 'Independent internal review',
                'common:scope': [
                  {
                    '@name': 'Scope 1',
                    'common:method': {
                      '@name': 'Method 1',
                    },
                  },
                ],
                'common:dataQualityIndicators': {
                  'common:dataQualityIndicator': [
                    {
                      '@name': 'Indicator 1',
                      '@value': 'Good',
                    },
                  ],
                },
                'common:reviewDetails': [{ '@xml:lang': 'en', '#text': 'Review details' }],
                'common:referenceToNameOfReviewerAndInstitution': {
                  '@refObjectId': 'reviewer-123',
                  '@type': 'contact data set',
                  '@uri': '../contacts/reviewer-123',
                  '@version': '01.00.000',
                  'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Reviewer Name' }],
                },
                'common:otherReviewDetails': [{ '@xml:lang': 'en', '#text': 'Other details' }],
                'common:referenceToCompleteReviewReport': {
                  '@refObjectId': 'report-123',
                  '@type': 'source data set',
                  '@uri': '../sources/report-123',
                  '@version': '01.00.000',
                  'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Review Report' }],
                },
              },
            ],
          },
          complianceDeclarations: {
            compliance: [
              {
                'common:referenceToComplianceSystem': {
                  '@refObjectId': 'system-123',
                  '@type': 'source data set',
                  '@uri': '../sources/system-123',
                  '@version': '01.00.000',
                  'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Compliance System' }],
                },
                'common:approvalOfOverallCompliance': 'Fully compliant',
                'common:nomenclatureCompliance': 'Fully compliant',
                'common:methodologicalCompliance': 'Fully compliant',
                'common:reviewCompliance': 'Fully compliant',
                'common:documentationCompliance': 'Fully compliant',
                'common:qualityCompliance': 'Fully compliant',
              },
            ],
          },
        },
      };

      const result = genProcessJsonOrdered('process-123', inputData);

      expect(result).toHaveProperty('processDataSet');
      expect(result.processDataSet).toHaveProperty('modellingAndValidation');
      expect(result.processDataSet.modellingAndValidation).toHaveProperty('validation');
      expect(result.processDataSet.modellingAndValidation).toHaveProperty('complianceDeclarations');
    });

    it('handles missing review data gracefully', () => {
      const inputData = {
        modellingAndValidation: {
          validation: {
            review: undefined,
          },
          complianceDeclarations: {
            compliance: undefined,
          },
        },
      };

      const result = genProcessJsonOrdered('process-123', inputData);

      expect(result).toHaveProperty('processDataSet');
      expect(result.processDataSet.modellingAndValidation).toBeDefined();
      expect(result.processDataSet.modellingAndValidation.validation).toBeDefined();
    });

    it('fills missing fields with empty objects', () => {
      const inputData = {
        modellingAndValidation: {
          validation: {
            review: [
              {
                '@type': 'Review',
                'common:scope': [],
              },
            ],
          },
          complianceDeclarations: {
            compliance: [
              {
                'common:approvalOfOverallCompliance': 'Approved',
              },
            ],
          },
        },
      };

      const result = genProcessJsonOrdered('process-123', inputData);

      expect(result).toHaveProperty('processDataSet');
      expect(result.processDataSet.modellingAndValidation.validation).toBeDefined();
      expect(result.processDataSet.modellingAndValidation.complianceDeclarations).toBeDefined();
    });

    it('processes multiple reviews and compliance declarations', () => {
      const inputData = {
        modellingAndValidation: {
          validation: {
            review: [
              { '@type': 'Review 1', 'common:scope': [] },
              { '@type': 'Review 2', 'common:scope': [] },
            ],
          },
          complianceDeclarations: {
            compliance: [
              { 'common:approvalOfOverallCompliance': 'Fully compliant' },
              { 'common:approvalOfOverallCompliance': 'Not compliant' },
            ],
          },
        },
      };

      const result = genProcessJsonOrdered('process-123', inputData);

      const reviews = result.processDataSet.modellingAndValidation.validation.review;
      const compliances =
        result.processDataSet.modellingAndValidation.complianceDeclarations.compliance;

      expect(Array.isArray(reviews) || reviews).toBeTruthy();
      expect(Array.isArray(compliances) || compliances).toBeTruthy();
    });
  });

  describe('genProcessFromData', () => {
    it('converts ordered JSON back to editable data format', () => {
      const inputData = {
        modellingAndValidation: {
          validation: {
            review: {
              '@type': 'Independent internal review',
              'common:scope': { '@name': 'Scope 1' },
              'common:dataQualityIndicators': {
                'common:dataQualityIndicator': {
                  '@name': 'Indicator 1',
                  '@value': 'Good',
                },
              },
              'common:reviewDetails': { '@xml:lang': 'en', '#text': 'Review details' },
              'common:referenceToNameOfReviewerAndInstitution': {
                '@refObjectId': 'reviewer-123',
                '@type': 'contact data set',
                '@uri': '../contacts/reviewer-123',
                '@version': '01.00.000',
                'common:shortDescription': { '@xml:lang': 'en', '#text': 'Reviewer Name' },
              },
              'common:otherReviewDetails': { '@xml:lang': 'en', '#text': 'Other details' },
              'common:referenceToCompleteReviewReport': {
                '@refObjectId': 'report-123',
                '@type': 'source data set',
                '@uri': '../sources/report-123',
                '@version': '01.00.000',
                'common:shortDescription': { '@xml:lang': 'en', '#text': 'Review Report' },
              },
            },
          },
          complianceDeclarations: {
            compliance: {
              'common:referenceToComplianceSystem': {
                '@refObjectId': 'system-123',
                '@type': 'source data set',
                '@uri': '../sources/system-123',
                '@version': '01.00.000',
                'common:shortDescription': { '@xml:lang': 'en', '#text': 'Compliance System' },
              },
              'common:approvalOfOverallCompliance': 'Fully compliant',
              'common:nomenclatureCompliance': 'Fully compliant',
              'common:methodologicalCompliance': 'Fully compliant',
              'common:reviewCompliance': 'Fully compliant',
              'common:documentationCompliance': 'Fully compliant',
              'common:qualityCompliance': 'Fully compliant',
            },
          },
        },
      };

      const result = genProcessFromData(inputData);

      expect(result).toHaveProperty('modellingAndValidation');
      expect(result.modellingAndValidation).toHaveProperty('validation');
      expect(result.modellingAndValidation).toHaveProperty('complianceDeclarations');
    });

    it('converts single objects to arrays for reviews', () => {
      const inputData = {
        modellingAndValidation: {
          validation: {
            review: {
              '@type': 'Single Review',
              'common:scope': { '@name': 'Scope' },
            },
          },
          complianceDeclarations: {
            compliance: null,
          },
        },
      };

      const result = genProcessFromData(inputData);

      const reviews = result.modellingAndValidation.validation.review;
      expect(Array.isArray(reviews)).toBe(true);
      expect(reviews.length).toBeGreaterThan(0);
    });

    it('handles missing nested properties', () => {
      const inputData = {
        modellingAndValidation: {
          validation: {
            review: {
              '@type': 'Review',
              'common:referenceToNameOfReviewerAndInstitution': {
                '@refObjectId': 'reviewer-123',
                // Missing other fields
              },
            },
          },
          complianceDeclarations: {
            compliance: {
              'common:referenceToComplianceSystem': {
                '@refObjectId': 'system-123',
                // Missing other fields
              },
            },
          },
        },
      };

      const result = genProcessFromData(inputData);

      const review = result.modellingAndValidation.validation.review[0];
      expect(review['common:referenceToNameOfReviewerAndInstitution']['@refObjectId']).toBe(
        'reviewer-123',
      );
      expect(review['common:referenceToNameOfReviewerAndInstitution']['@type']).toBeUndefined();
    });

    it('preserves all compliance fields', () => {
      const inputData = {
        modellingAndValidation: {
          validation: {
            review: [],
          },
          complianceDeclarations: {
            compliance: {
              'common:referenceToComplianceSystem': {
                '@refObjectId': 'system-123',
              },
              'common:approvalOfOverallCompliance': 'Approved',
              'common:nomenclatureCompliance': 'Yes',
              'common:methodologicalCompliance': 'Yes',
              'common:reviewCompliance': 'Yes',
              'common:documentationCompliance': 'Yes',
              'common:qualityCompliance': 'Yes',
            },
          },
        },
      };

      const result = genProcessFromData(inputData);

      const compliance = result.modellingAndValidation.complianceDeclarations.compliance[0];
      expect(compliance['common:approvalOfOverallCompliance']).toBe('Approved');
      expect(compliance['common:nomenclatureCompliance']).toBe('Yes');
      expect(compliance['common:methodologicalCompliance']).toBe('Yes');
      expect(compliance['common:reviewCompliance']).toBe('Yes');
      expect(compliance['common:documentationCompliance']).toBe('Yes');
      expect(compliance['common:qualityCompliance']).toBe('Yes');
    });
  });
});
