import type { OpenDataDatasetKind } from '../openDataCatalog/types';

/** Stable codes, never localized labels, cross the dataset query boundary. */
export type DatasetClassificationFilterValue = {
  scope: 'classification' | 'elementary';
  code: string;
  system?: string;
  path?: string[];
};

export type DatasetTableParams = {
  current?: number;
  pageSize?: number;
  classification?: DatasetClassificationFilterValue[];
  datasetFilters?: Record<string, unknown>;
};

export const DATASET_CLASSIFICATION_TYPES: Record<OpenDataDatasetKind, string> = {
  process: 'Process',
  flow: 'Flow',
  lifecyclemodel: 'LifeCycleModel',
  flowproperty: 'FlowProperty',
  unitgroup: 'UnitGroup',
  source: 'Source',
  contact: 'Contact',
};

export function withDatasetClassification(
  params: DatasetTableParams,
  filters: unknown = {},
): Record<string, any> {
  return {
    ...(filters && typeof filters === 'object' && !Array.isArray(filters) ? filters : {}),
    ...params.datasetFilters,
    ...(params.classification !== undefined ? { classification: params.classification } : {}),
  };
}
