/**
 * Test data fixtures
 */

// Classification test data
export const mockClassificationData = [
  {
    id: '1',
    value: 'category1',
    label: 'Category 1',
    children: [
      {
        id: '1-1',
        value: 'subcategory1',
        label: 'Subcategory 1',
        children: [],
      },
      {
        id: '1-2',
        value: 'subcategory2',
        label: 'Subcategory 2',
        children: [],
      },
    ],
  },
  {
    id: '2',
    value: 'category2',
    label: 'Category 2',
    children: [],
  },
];

// Flow property test data
export const mockFlowPropertyData = {
  id: 'flow-prop-123',
  version: '01.00.000',
  refFlowPropertytId: 'ref-flow-prop-456',
  typeOfDataSet: 'Flow property',
  name: 'Mass',
  generalComment: 'Test flow property',
};

// Unit group test data
export const mockUnitGroupData = {
  id: 'unit-group-123',
  version: '01.00.000',
  refUnitGroupId: 'ref-unit-group-456',
  name: 'Units of mass',
  generalComment: 'Test unit group',
};

// Unit test data
export const mockUnitData = {
  id: 'unit-123',
  version: '01.00.000',
  name: 'kg',
  generalComment: 'Kilogram',
  conversionFactor: 1,
};

// Flow test data
export const mockFlowData = {
  referenceToFlowDataSetId: 'flow-123',
  referenceToFlowDataSetVersion: '01.00.000',
  typeOfDataSet: 'Elementary flow',
  name: 'Carbon dioxide',
  casNumber: '124-38-9',
};

// API response templates
export const mockSuccessResponse = <T>(data: T) => ({
  data,
  error: null,
  status: 200,
  statusText: 'OK',
});

export const mockErrorResponse = (message: string = 'API Error') => ({
  data: null,
  error: {
    message,
    code: 'ERROR',
  },
  status: 500,
  statusText: 'Internal Server Error',
});

// List response with pagination
export const mockListResponse = <T>(items: T[], total?: number) => ({
  data: items,
  total: total ?? items.length,
  page: 1,
  pageSize: 10,
  error: null,
  status: 200,
});
