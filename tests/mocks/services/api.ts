/**
 * Mock API services for testing
 */

// Mock flow properties API
export const mockFlowPropertiesApi = {
  getFlowProperties: jest.fn(),
  createFlowProperty: jest.fn(),
  updateFlowProperty: jest.fn(),
  deleteFlowProperty: jest.fn(),
};

// Mock flows API
export const mockFlowsApi = {
  getFlows: jest.fn(),
  createFlow: jest.fn(),
  updateFlow: jest.fn(),
  deleteFlow: jest.fn(),
};

// Mock unit groups API
export const mockUnitGroupsApi = {
  getReferenceUnitGroups: jest.fn(),
  getReferenceUnits: jest.fn(),
  createUnitGroup: jest.fn(),
  updateUnitGroup: jest.fn(),
  deleteUnitGroup: jest.fn(),
};

// Mock processes API
export const mockProcessesApi = {
  getProcesses: jest.fn(),
  createProcess: jest.fn(),
  updateProcess: jest.fn(),
  deleteProcess: jest.fn(),
};

// Mock sources API
export const mockSourcesApi = {
  getSources: jest.fn(),
  createSource: jest.fn(),
  updateSource: jest.fn(),
  deleteSource: jest.fn(),
};

// Reset all API mocks
export const resetApiMocks = () => {
  Object.values(mockFlowPropertiesApi).forEach((fn) => fn.mockReset());
  Object.values(mockFlowsApi).forEach((fn) => fn.mockReset());
  Object.values(mockUnitGroupsApi).forEach((fn) => fn.mockReset());
  Object.values(mockProcessesApi).forEach((fn) => fn.mockReset());
  Object.values(mockSourcesApi).forEach((fn) => fn.mockReset());
};
