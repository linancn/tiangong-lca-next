/**
 * Comprehensive tests for Antchain API service
 * Path: src/services/antchain/api.ts
 *
 * This test suite covers:
 * 1. Normal usage scenarios based on actual business usage
 * 2. Edge cases and boundary conditions
 * 3. Negative/adversarial tests for robustness validation
 */

import {
  createCalculation,
  queryCalculationResults,
  queryCalculationStatus,
  runCalculationWorkflow,
} from '@/services/antchain/api';
import { supabase } from '@/services/supabase';

jest.mock('@/services/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const invokeMock = supabase.functions.invoke as unknown as jest.Mock;

// Standard test data from actual usage patterns
const validParams1 = {
  dataSetInternalID: 'node-1',
  id: 'dataset-1',
  version: '01.00.000',
};

const validParams2 = {
  dataSetInternalID: 'node-2',
  id: 'dataset-2',
  version: '01.00.000',
};

describe('Antchain API service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runCalculationWorkflow', () => {
    describe('Normal usage scenarios', () => {
      it('invokes the run_antchain_calculation function and returns data', async () => {
        const mockResponse = { success: true, data: { vectorList: [1, 2, 3] } };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await runCalculationWorkflow(validParams1, validParams2);

        expect(invokeMock).toHaveBeenCalledWith('run_antchain_calculation', {
          method: 'POST',
          body: {
            dataSetParams1: validParams1,
            dataSetParams2: validParams2,
          },
        });
        expect(result).toBe(mockResponse);
      });

      it('handles successful response with empty results', async () => {
        const mockResponse = { success: true, data: { vectorList: [] } };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await runCalculationWorkflow(validParams1, validParams2);

        expect(result).toBe(mockResponse);
        expect(result.data.vectorList).toHaveLength(0);
      });
    });

    describe('Error handling', () => {
      it('throws an error when the edge function returns an error', async () => {
        invokeMock.mockResolvedValueOnce({
          data: null,
          error: { message: 'calculation failed' },
        });

        await expect(runCalculationWorkflow(validParams1, validParams2)).rejects.toThrow(
          'calculation failed',
        );
      });

      it('throws an error with detailed message on network failure', async () => {
        const detailedError = {
          message: 'Network error: Failed to connect to edge function',
        };
        invokeMock.mockResolvedValueOnce({ data: null, error: detailedError });

        await expect(runCalculationWorkflow(validParams1, validParams2)).rejects.toThrow(
          'Network error: Failed to connect to edge function',
        );
      });
    });

    describe('Boundary and edge cases', () => {
      it('handles same dataset parameters for both nodes', async () => {
        const mockResponse = { success: true, data: { vectorList: [0] } };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await runCalculationWorkflow(validParams1, validParams1);

        expect(invokeMock).toHaveBeenCalledWith('run_antchain_calculation', {
          method: 'POST',
          body: {
            dataSetParams1: validParams1,
            dataSetParams2: validParams1,
          },
        });
        expect(result).toBe(mockResponse);
      });

      it('handles extremely long dataset IDs', async () => {
        const longIdParams = {
          ...validParams1,
          id: 'a'.repeat(1000),
        };
        const mockResponse = { success: true };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await runCalculationWorkflow(longIdParams, validParams2);

        expect(result).toBe(mockResponse);
      });
    });

    describe('Adversarial tests', () => {
      it('handles parameters with special characters in IDs', async () => {
        const specialCharParams = {
          dataSetInternalID: 'node<script>alert(1)</script>',
          id: "dataset-'; DROP TABLE datasets; --",
          version: '../../../etc/passwd',
        };
        const mockResponse = { success: true };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await runCalculationWorkflow(specialCharParams, validParams2);

        expect(invokeMock).toHaveBeenCalledWith('run_antchain_calculation', {
          method: 'POST',
          body: {
            dataSetParams1: specialCharParams,
            dataSetParams2: validParams2,
          },
        });
        expect(result).toBe(mockResponse);
      });

      it('handles parameters with null bytes', async () => {
        const nullByteParams = {
          dataSetInternalID: 'node\x00injection',
          id: 'dataset\x00test',
          version: '01.00\x00.000',
        };
        const mockResponse = { success: true };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await runCalculationWorkflow(nullByteParams, validParams2);

        expect(result).toBe(mockResponse);
      });

      it('handles parameters with Unicode characters', async () => {
        const unicodeParams = {
          dataSetInternalID: '节点-数据集-🚀',
          id: '数据集-测试-🔬',
          version: '01.00.000-测试',
        };
        const mockResponse = { success: true };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await runCalculationWorkflow(unicodeParams, validParams2);

        expect(result).toBe(mockResponse);
      });

      it('handles empty string parameters', async () => {
        const emptyParams = {
          dataSetInternalID: '',
          id: '',
          version: '',
        };
        const mockResponse = { success: true };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await runCalculationWorkflow(emptyParams, emptyParams);

        expect(result).toBe(mockResponse);
      });
    });
  });

  describe('createCalculation', () => {
    describe('Normal usage scenarios', () => {
      it('includes optional identifiers when provided', async () => {
        const mockResponse = { success: true, instanceId: 'instance-123' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await createCalculation(
          validParams1,
          validParams2,
          'project-1',
          'env-1',
          'app-1',
        );

        expect(invokeMock).toHaveBeenCalledWith('create_calculation', {
          method: 'POST',
          body: {
            dataSetParams1: validParams1,
            dataSetParams2: validParams2,
            projectId: 'project-1',
            envId: 'env-1',
            appId: 'app-1',
          },
        });
        expect(result).toBe(mockResponse);
      });

      it('omits optional identifiers when not provided', async () => {
        const mockResponse = { success: true, instanceId: 'instance-123' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        await createCalculation(validParams1, validParams2);

        const [, options] = invokeMock.mock.calls[0];
        expect(options.body).toEqual({
          dataSetParams1: validParams1,
          dataSetParams2: validParams2,
        });
      });

      it('includes only projectId when other IDs are not provided', async () => {
        const mockResponse = { success: true, instanceId: 'instance-123' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        await createCalculation(validParams1, validParams2, 'project-1');

        const [, options] = invokeMock.mock.calls[0];
        expect(options.body).toEqual({
          dataSetParams1: validParams1,
          dataSetParams2: validParams2,
          projectId: 'project-1',
        });
        expect(options.body).not.toHaveProperty('envId');
        expect(options.body).not.toHaveProperty('appId');
      });
    });

    describe('Error handling', () => {
      it('throws an error when the edge function reports failure', async () => {
        invokeMock.mockResolvedValueOnce({
          data: null,
          error: { message: 'creation failed' },
        });

        await expect(createCalculation(validParams1, validParams2)).rejects.toThrow(
          'creation failed',
        );
      });

      it('throws an error when authentication fails', async () => {
        invokeMock.mockResolvedValueOnce({
          data: null,
          error: { message: 'Authentication failed: Invalid credentials' },
        });

        await expect(createCalculation(validParams1, validParams2)).rejects.toThrow(
          'Authentication failed: Invalid credentials',
        );
      });

      it('throws an error when resource quota is exceeded', async () => {
        invokeMock.mockResolvedValueOnce({
          data: null,
          error: { message: 'Resource quota exceeded' },
        });

        await expect(createCalculation(validParams1, validParams2)).rejects.toThrow(
          'Resource quota exceeded',
        );
      });
    });

    describe('Boundary and edge cases', () => {
      it('handles undefined optional parameters explicitly passed', async () => {
        const mockResponse = { success: true, instanceId: 'instance-123' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        await createCalculation(validParams1, validParams2, undefined, undefined, undefined);

        const [, options] = invokeMock.mock.calls[0];
        expect(options.body).toEqual({
          dataSetParams1: validParams1,
          dataSetParams2: validParams2,
        });
      });

      it('handles mix of defined and undefined optional parameters', async () => {
        const mockResponse = { success: true, instanceId: 'instance-123' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        await createCalculation(validParams1, validParams2, 'project-1', undefined, 'app-1');

        const [, options] = invokeMock.mock.calls[0];
        expect(options.body).toEqual({
          dataSetParams1: validParams1,
          dataSetParams2: validParams2,
          projectId: 'project-1',
          appId: 'app-1',
        });
        expect(options.body).not.toHaveProperty('envId');
      });
    });

    describe('Adversarial tests', () => {
      it('handles extremely long optional ID strings', async () => {
        const longProjectId = 'P'.repeat(10000);
        const longEnvId = 'E'.repeat(10000);
        const longAppId = 'A'.repeat(10000);
        const mockResponse = { success: true, instanceId: 'instance-123' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await createCalculation(
          validParams1,
          validParams2,
          longProjectId,
          longEnvId,
          longAppId,
        );

        expect(result).toBe(mockResponse);
        const [, options] = invokeMock.mock.calls[0];
        expect(options.body.projectId).toHaveLength(10000);
      });

      it('handles optional IDs with injection attempts', async () => {
        const mockResponse = { success: true, instanceId: 'instance-123' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        await createCalculation(
          validParams1,
          validParams2,
          "'; DROP TABLE projects; --",
          '<script>alert("XSS")</script>',
          '../../../etc/passwd',
        );

        const [, options] = invokeMock.mock.calls[0];
        expect(options.body.projectId).toBe("'; DROP TABLE projects; --");
        expect(options.body.envId).toBe('<script>alert("XSS")</script>');
        expect(options.body.appId).toBe('../../../etc/passwd');
      });

      it('handles empty string optional parameters', async () => {
        const mockResponse = { success: true, instanceId: 'instance-123' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        await createCalculation(validParams1, validParams2, '', '', '');

        const [, options] = invokeMock.mock.calls[0];
        // Empty strings should be included as they are truthy in the conditional
        expect(options.body).not.toHaveProperty('projectId');
        expect(options.body).not.toHaveProperty('envId');
        expect(options.body).not.toHaveProperty('appId');
      });
    });

    describe('Response validation', () => {
      it('handles response without instanceId', async () => {
        const mockResponse = { success: true };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await createCalculation(validParams1, validParams2);

        expect(result).toBe(mockResponse);
        expect(result.instanceId).toBeUndefined();
      });

      it('handles response with additional unexpected fields', async () => {
        const mockResponse = {
          success: true,
          instanceId: 'instance-123',
          unexpectedField: 'unexpected value',
          nestedObject: { foo: 'bar' },
        };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await createCalculation(validParams1, validParams2);

        expect(result).toBe(mockResponse);
        expect(result).toHaveProperty('unexpectedField');
        expect(result).toHaveProperty('nestedObject');
      });
    });
  });

  describe('queryCalculationStatus', () => {
    describe('Normal usage scenarios', () => {
      it('passes optional project and environment identifiers', async () => {
        const mockResponse = { status: 'INSTANCE_COMPLETED', coDatasetId: 'dataset-123' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationStatus('instance-123', 'project-1', 'env-1');

        expect(invokeMock).toHaveBeenCalledWith('query_calculation_status', {
          method: 'POST',
          body: {
            instanceId: 'instance-123',
            projectId: 'project-1',
            envId: 'env-1',
          },
        });
        expect(result).toBe(mockResponse);
      });

      it('omits optional identifiers when not provided', async () => {
        const mockResponse = { status: 'RUNNING' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        await queryCalculationStatus('instance-123');

        const [, options] = invokeMock.mock.calls[0];
        expect(options.body).toEqual({
          instanceId: 'instance-123',
        });
      });

      it('handles all possible status values', async () => {
        const statusValues = [
          'INSTANCE_COMPLETED',
          'SUCCESS',
          'RUNNING',
          'PENDING',
          'FAILED',
          'ERROR',
          'TIMEOUT',
          'INSTANCE_TERMINATED',
          'CANCELLED',
        ];

        for (const status of statusValues) {
          const mockResponse = { status };
          invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

          const result = await queryCalculationStatus('instance-123');

          expect(result.status).toBe(status);
        }
      });
    });

    describe('Error handling', () => {
      it('throws an error when the edge function reports failure', async () => {
        invokeMock.mockResolvedValueOnce({
          data: null,
          error: { message: 'status failed' },
        });

        await expect(queryCalculationStatus('instance-123')).rejects.toThrow('status failed');
      });

      it('throws an error when instance not found', async () => {
        invokeMock.mockResolvedValueOnce({
          data: null,
          error: { message: 'Instance not found' },
        });

        await expect(queryCalculationStatus('non-existent-instance')).rejects.toThrow(
          'Instance not found',
        );
      });
    });

    describe('Boundary and edge cases', () => {
      it('handles empty instanceId', async () => {
        const mockResponse = { status: 'ERROR', message: 'Invalid instance ID' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationStatus('');

        expect(invokeMock).toHaveBeenCalledWith('query_calculation_status', {
          method: 'POST',
          body: {
            instanceId: '',
          },
        });
        expect(result).toBe(mockResponse);
      });

      it('handles very long instanceId', async () => {
        const longInstanceId = 'I'.repeat(5000);
        const mockResponse = { status: 'RUNNING' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationStatus(longInstanceId);

        expect(result).toBe(mockResponse);
      });
    });

    describe('Adversarial tests', () => {
      it('handles instanceId with special characters', async () => {
        const specialInstanceId = 'instance-<script>alert(1)</script>';
        const mockResponse = { status: 'ERROR' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationStatus(specialInstanceId);

        expect(invokeMock).toHaveBeenCalledWith('query_calculation_status', {
          method: 'POST',
          body: {
            instanceId: specialInstanceId,
          },
        });
        expect(result).toBe(mockResponse);
      });

      it('handles instanceId with SQL injection attempts', async () => {
        const sqlInjectionId = "instance-123'; DROP TABLE instances; --";
        const mockResponse = { status: 'ERROR' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationStatus(sqlInjectionId);

        expect(result).toBe(mockResponse);
      });

      it('handles instanceId with path traversal attempts', async () => {
        const pathTraversalId = '../../../etc/passwd';
        const mockResponse = { status: 'ERROR' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationStatus(pathTraversalId);

        expect(result).toBe(mockResponse);
      });

      it('handles Unicode characters in instanceId', async () => {
        const unicodeInstanceId = '实例-测试-🚀';
        const mockResponse = { status: 'RUNNING' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationStatus(unicodeInstanceId);

        expect(result).toBe(mockResponse);
      });
    });

    describe('Response structure validation', () => {
      it('handles response with missing status field', async () => {
        const mockResponse = { message: 'Status unavailable' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationStatus('instance-123');

        expect(result).toBe(mockResponse);
        expect(result.status).toBeUndefined();
      });

      it('handles response with additional metadata', async () => {
        const mockResponse = {
          status: 'RUNNING',
          progress: 75,
          estimatedTimeRemaining: 120,
          metadata: { key: 'value' },
        };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationStatus('instance-123');

        expect(result).toBe(mockResponse);
        expect(result.progress).toBe(75);
      });
    });
  });

  describe('queryCalculationResults', () => {
    describe('Normal usage scenarios', () => {
      it('includes limit when provided and returns data', async () => {
        const mockResponse = {
          success: true,
          data: [{ valueList: [1.23, 4.56, 7.89] }],
        };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults('dataset-1', 10);

        expect(invokeMock).toHaveBeenCalledWith('query_calculation_results', {
          method: 'POST',
          body: {
            coDatasetId: 'dataset-1',
            limit: 10,
          },
        });
        expect(result).toBe(mockResponse);
      });

      it('includes limit of 0 when explicitly provided', async () => {
        const mockResponse = { success: true, data: [] };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults('dataset-1', 0);

        expect(invokeMock).toHaveBeenCalledWith('query_calculation_results', {
          method: 'POST',
          body: {
            coDatasetId: 'dataset-1',
            limit: 0,
          },
        });
        expect(result).toBe(mockResponse);
      });

      it('omits limit when it is undefined', async () => {
        const mockResponse = { success: true, data: [] };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        await queryCalculationResults('dataset-1');

        const [, options] = invokeMock.mock.calls[0];
        expect(options.body).toEqual({
          coDatasetId: 'dataset-1',
        });
      });

      it('handles large result sets', async () => {
        const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
          valueList: [i, i * 2, i * 3],
        }));
        const mockResponse = { success: true, data: largeDataSet };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults('dataset-1', 1000);

        expect(result.data).toHaveLength(1000);
      });
    });

    describe('Error handling', () => {
      it('throws an error when the edge function reports failure', async () => {
        invokeMock.mockResolvedValueOnce({
          data: null,
          error: { message: 'results failed' },
        });

        await expect(queryCalculationResults('dataset-1')).rejects.toThrow('results failed');
      });

      it('throws an error when dataset not found', async () => {
        invokeMock.mockResolvedValueOnce({
          data: null,
          error: { message: 'Dataset not found' },
        });

        await expect(queryCalculationResults('non-existent-dataset')).rejects.toThrow(
          'Dataset not found',
        );
      });

      it('throws an error when results not ready', async () => {
        invokeMock.mockResolvedValueOnce({
          data: null,
          error: { message: 'Results not ready yet' },
        });

        await expect(queryCalculationResults('dataset-1')).rejects.toThrow('Results not ready yet');
      });
    });

    describe('Boundary and edge cases', () => {
      it('handles empty coDatasetId', async () => {
        const mockResponse = { success: false, error: 'Invalid dataset ID' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults('');

        expect(result).toBe(mockResponse);
      });

      it('handles negative limit values', async () => {
        const mockResponse = { success: true, data: [] };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults('dataset-1', -10);

        expect(invokeMock).toHaveBeenCalledWith('query_calculation_results', {
          method: 'POST',
          body: {
            coDatasetId: 'dataset-1',
            limit: -10,
          },
        });
        expect(result).toBe(mockResponse);
      });

      it('handles extremely large limit values', async () => {
        const mockResponse = { success: true, data: [] };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults('dataset-1', Number.MAX_SAFE_INTEGER);

        expect(invokeMock).toHaveBeenCalledWith('query_calculation_results', {
          method: 'POST',
          body: {
            coDatasetId: 'dataset-1',
            limit: Number.MAX_SAFE_INTEGER,
          },
        });
        expect(result).toBe(mockResponse);
      });

      it('handles floating point limit values', async () => {
        const mockResponse = { success: true, data: [] };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults('dataset-1', 10.5);

        expect(invokeMock).toHaveBeenCalledWith('query_calculation_results', {
          method: 'POST',
          body: {
            coDatasetId: 'dataset-1',
            limit: 10.5,
          },
        });
        expect(result).toBe(mockResponse);
      });

      it('handles null as limit (should be included since null !== undefined)', async () => {
        const mockResponse = { success: true, data: [] };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        await queryCalculationResults('dataset-1', null as any);

        // null is not undefined, so it IS included in the body
        const [, options] = invokeMock.mock.calls[0];
        expect(options.body).toEqual({
          coDatasetId: 'dataset-1',
          limit: null,
        });
      });
    });

    describe('Adversarial tests', () => {
      it('handles coDatasetId with SQL injection attempts', async () => {
        const sqlInjectionId = "dataset-1'; SELECT * FROM sensitive_data; --";
        const mockResponse = { success: false, error: 'Invalid dataset ID' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults(sqlInjectionId);

        expect(invokeMock).toHaveBeenCalledWith('query_calculation_results', {
          method: 'POST',
          body: {
            coDatasetId: sqlInjectionId,
          },
        });
        expect(result).toBe(mockResponse);
      });

      it('handles coDatasetId with XSS attempts', async () => {
        const xssAttemptId = '<script>alert("XSS")</script>';
        const mockResponse = { success: false, error: 'Invalid dataset ID' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults(xssAttemptId);

        expect(result).toBe(mockResponse);
      });

      it('handles coDatasetId with path traversal attempts', async () => {
        const pathTraversalId = '../../../etc/passwd';
        const mockResponse = { success: false, error: 'Invalid dataset ID' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults(pathTraversalId);

        expect(result).toBe(mockResponse);
      });

      it('handles very long coDatasetId', async () => {
        const longDatasetId = 'D'.repeat(10000);
        const mockResponse = { success: true, data: [] };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults(longDatasetId);

        expect(result).toBe(mockResponse);
      });

      it('handles Unicode characters in coDatasetId', async () => {
        const unicodeDatasetId = '数据集-测试-🚀';
        const mockResponse = { success: true, data: [] };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults(unicodeDatasetId);

        expect(result).toBe(mockResponse);
      });

      it('handles special numeric values for limit (NaN, Infinity)', async () => {
        const mockResponse = { success: true, data: [] };

        // Test NaN
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });
        await queryCalculationResults('dataset-1', NaN);
        let [, options] = invokeMock.mock.calls[invokeMock.mock.calls.length - 1];
        expect(options.body.limit).toBeNaN();

        // Test Infinity
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });
        await queryCalculationResults('dataset-1', Infinity);
        [, options] = invokeMock.mock.calls[invokeMock.mock.calls.length - 1];
        expect(options.body.limit).toBe(Infinity);

        // Test -Infinity
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });
        await queryCalculationResults('dataset-1', -Infinity);
        [, options] = invokeMock.mock.calls[invokeMock.mock.calls.length - 1];
        expect(options.body.limit).toBe(-Infinity);
      });
    });

    describe('Response structure validation', () => {
      it('handles response with empty data array', async () => {
        const mockResponse = { success: true, data: [] };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults('dataset-1');

        expect(result.data).toHaveLength(0);
      });

      it('handles response with null data', async () => {
        const mockResponse = { success: true, data: null };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults('dataset-1');

        expect(result.data).toBeNull();
      });

      it('handles response with nested valueList structure', async () => {
        const mockResponse = {
          success: true,
          data: [{ valueList: [1.23, 4.56, 7.89] }, { valueList: [9.87, 6.54, 3.21] }],
        };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults('dataset-1');

        expect(result.data).toHaveLength(2);
        expect(result.data[0].valueList).toHaveLength(3);
      });

      it('handles response without expected data structure', async () => {
        const mockResponse = { unexpectedField: 'value' };
        invokeMock.mockResolvedValueOnce({ data: mockResponse, error: null });

        const result = await queryCalculationResults('dataset-1');

        expect(result).toBe(mockResponse);
        expect(result).not.toHaveProperty('success');
        expect(result).not.toHaveProperty('data');
      });
    });
  });

  describe('Integration scenarios', () => {
    describe('Complete workflow patterns', () => {
      it('simulates successful end-to-end calculation workflow', async () => {
        // Step 1: Create calculation
        const createResponse = { success: true, instanceId: 'instance-abc123' };
        invokeMock.mockResolvedValueOnce({ data: createResponse, error: null });

        const createResult = await createCalculation(validParams1, validParams2);
        expect(createResult.instanceId).toBe('instance-abc123');

        // Step 2: Query status (running)
        const statusRunning = { status: 'RUNNING' };
        invokeMock.mockResolvedValueOnce({ data: statusRunning, error: null });

        let statusResult = await queryCalculationStatus('instance-abc123');
        expect(statusResult.status).toBe('RUNNING');

        // Step 3: Query status (completed)
        const statusCompleted = { status: 'INSTANCE_COMPLETED', coDatasetId: 'dataset-xyz789' };
        invokeMock.mockResolvedValueOnce({ data: statusCompleted, error: null });

        statusResult = await queryCalculationStatus('instance-abc123');
        expect(statusResult.status).toBe('INSTANCE_COMPLETED');
        expect(statusResult.coDatasetId).toBe('dataset-xyz789');

        // Step 4: Query results
        const resultsResponse = {
          success: true,
          data: [{ valueList: [10.5, 20.3, 30.7] }],
        };
        invokeMock.mockResolvedValueOnce({ data: resultsResponse, error: null });

        const results = await queryCalculationResults('dataset-xyz789');
        expect(results.success).toBe(true);
        expect(results.data[0].valueList).toHaveLength(3);
      });

      it('simulates workflow with calculation failure', async () => {
        // Step 1: Create calculation
        const createResponse = { success: true, instanceId: 'instance-fail123' };
        invokeMock.mockResolvedValueOnce({ data: createResponse, error: null });

        await createCalculation(validParams1, validParams2);

        // Step 2: Query status (failed)
        const statusFailed = {
          status: 'FAILED',
          error: 'Calculation error: Invalid input data',
        };
        invokeMock.mockResolvedValueOnce({ data: statusFailed, error: null });

        const statusResult = await queryCalculationStatus('instance-fail123');
        expect(statusResult.status).toBe('FAILED');
        expect(statusResult.error).toContain('Invalid input data');
      });
    });

    describe('Error recovery patterns', () => {
      it('handles retry scenario after temporary failure', async () => {
        // First attempt fails
        invokeMock.mockResolvedValueOnce({
          data: null,
          error: { message: 'Temporary service unavailable' },
        });

        await expect(createCalculation(validParams1, validParams2)).rejects.toThrow(
          'Temporary service unavailable',
        );

        // Second attempt succeeds
        const createResponse = { success: true, instanceId: 'instance-retry123' };
        invokeMock.mockResolvedValueOnce({ data: createResponse, error: null });

        const result = await createCalculation(validParams1, validParams2);
        expect(result.instanceId).toBe('instance-retry123');
      });
    });
  });
});
