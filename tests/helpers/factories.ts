/**
 * Test data factories for creating mock data
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Create a mock classification object
 */
export const createMockClassification = (overrides?: any) => ({
  id: uuidv4(),
  value: 'test-value',
  label: 'Test Label',
  children: [],
  ...overrides,
});

/**
 * Create a mock flow property
 */
export const createMockFlowProperty = (overrides?: any) => ({
  id: uuidv4(),
  version: '01.00.000',
  refFlowPropertytId: uuidv4(),
  typeOfDataSet: 'Flow property',
  ...overrides,
});

/**
 * Create a mock unit group
 */
export const createMockUnitGroup = (overrides?: any) => ({
  id: uuidv4(),
  version: '01.00.000',
  refUnitGroupId: uuidv4(),
  name: 'Test Unit Group',
  ...overrides,
});

/**
 * Create a mock unit
 */
export const createMockUnit = (overrides?: any) => ({
  id: uuidv4(),
  version: '01.00.000',
  name: 'kg',
  generalComment: 'Kilogram',
  ...overrides,
});

/**
 * Create a mock flow data
 */
export const createMockFlowData = (overrides?: any) => ({
  referenceToFlowDataSetId: uuidv4(),
  referenceToFlowDataSetVersion: '01.00.000',
  typeOfDataSet: 'Elementary flow',
  ...overrides,
});

/**
 * Create mock API response
 */
export const createMockApiResponse = <T>(data: T, overrides?: any) => ({
  data,
  error: null,
  status: 200,
  ...overrides,
});

/**
 * Create mock API error response
 */
export const createMockApiError = (message: string = 'API Error', overrides?: any) => ({
  data: null,
  error: {
    message,
    code: 'ERROR',
  },
  status: 500,
  ...overrides,
});
