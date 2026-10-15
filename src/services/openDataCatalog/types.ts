export type OpenDataDatasetKind =
  'process' | 'flow' | 'lifecyclemodel' | 'contact' | 'source' | 'unitgroup' | 'flowproperty';

// Main Open Data catalogs opt into catalog routing; selectors retain their own query semantics.
export function getOpenDataCatalogArgs(dataSource: string): [] | [true] {
  if (dataSource === 'tg') return [true];
  return [];
}
