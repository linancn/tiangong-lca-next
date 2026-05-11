import { randomUUID } from 'node:crypto';
import path from 'node:path';

import type { SupabaseClient } from '@supabase/supabase-js';
import { FunctionRegion } from '@supabase/supabase-js';
import {
  createContact as createTidasContact,
  createFlow as createTidasFlow,
  createFlowProperty as createTidasFlowProperty,
  createProcess as createTidasProcess,
  createSource as createTidasSource,
  createUnitGroup as createTidasUnitGroup,
} from '@tiangong-lca/tidas-sdk/core';

import { deepClone, deepSortJson, readJsonFile } from './workflow-shared';

export type ReferenceSeedKey =
  | 'contact'
  | 'flow'
  | 'flowproperty'
  | 'process'
  | 'source'
  | 'unitgroup';

export type ReferenceSeedTable =
  | 'contacts'
  | 'flowproperties'
  | 'flows'
  | 'processes'
  | 'sources'
  | 'unitgroups';

type DatasetReferenceObject = {
  '@refObjectId': string;
  '@type': string;
  '@uri': string;
  '@version': string;
  'common:shortDescription': unknown;
};

export type ReferenceSeed = {
  id: string;
  name: string;
  reference: DatasetReferenceObject;
  table: ReferenceSeedTable;
  version: string;
};

export type ReferenceSeedMap = Partial<Record<ReferenceSeedKey, ReferenceSeed>>;

type ExistingSeedRecord = {
  id: string;
  json_ordered: Record<string, any>;
  rule_verification: boolean | null;
  state_code: number | null;
  team_id: string | null;
  user_id: string | null;
  version: string;
};

type SeedMeta = {
  fixturePath: string;
  folder: string;
  namePaths: string[][];
  permanentUriPath: string[];
  rootKey: string;
  shortDescriptionPath: string[];
  table: ReferenceSeedTable;
  type: string;
  uuidPath: string[];
  versionPath: string[];
};

type EnsureReferenceSeedInput = {
  accessToken: string;
  currentUserId: string;
  cwd?: string;
  generateIdFn?: () => string;
  requiredSeeds?: ReferenceSeedKey[];
  supabase: SupabaseClient;
};

type BuildSeedJsonInput = {
  bootstrapSourceWithoutOwner?: boolean;
  cwd: string;
  id: string;
  key: ReferenceSeedKey;
  seeds: ReferenceSeedMap;
  version?: string;
};

type CurrentDataset = {
  id: string;
  table: ReferenceSeedTable;
};

const SEED_NAMES: Record<ReferenceSeedKey, string> = {
  contact: 'test-contact-reference',
  flow: 'test-flow-reference',
  flowproperty: 'test-flowproperty-reference',
  process: 'test-process-reference',
  source: 'test-source-reference',
  unitgroup: 'test-unitgroup-reference',
};

const DATASET_META: Record<ReferenceSeedKey, SeedMeta> = {
  contact: {
    fixturePath: 'tests/data-workflows/fixtures/data/contacts/002_check_data_success.json',
    folder: 'contacts',
    namePaths: [
      ['contactDataSet', 'contactInformation', 'dataSetInformation', 'common:shortName'],
      ['contactDataSet', 'contactInformation', 'dataSetInformation', 'common:name'],
    ],
    permanentUriPath: [
      'contactDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:permanentDataSetURI',
    ],
    rootKey: 'contactDataSet',
    shortDescriptionPath: [
      'contactDataSet',
      'contactInformation',
      'dataSetInformation',
      'common:shortName',
    ],
    table: 'contacts',
    type: 'contact data set',
    uuidPath: ['contactDataSet', 'contactInformation', 'dataSetInformation', 'common:UUID'],
    versionPath: [
      'contactDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:dataSetVersion',
    ],
  },
  source: {
    fixturePath: 'tests/data-workflows/fixtures/data/sources/002_check_data_success.json',
    folder: 'sources',
    namePaths: [
      ['sourceDataSet', 'sourceInformation', 'dataSetInformation', 'common:shortName'],
      ['sourceDataSet', 'sourceInformation', 'dataSetInformation', 'common:name'],
    ],
    permanentUriPath: [
      'sourceDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:permanentDataSetURI',
    ],
    rootKey: 'sourceDataSet',
    shortDescriptionPath: [
      'sourceDataSet',
      'sourceInformation',
      'dataSetInformation',
      'common:shortName',
    ],
    table: 'sources',
    type: 'source data set',
    uuidPath: ['sourceDataSet', 'sourceInformation', 'dataSetInformation', 'common:UUID'],
    versionPath: [
      'sourceDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:dataSetVersion',
    ],
  },
  unitgroup: {
    fixturePath: 'tests/data-workflows/fixtures/data/unitgroups/002_check_data_success.json',
    folder: 'unitgroups',
    namePaths: [['unitGroupDataSet', 'unitGroupInformation', 'dataSetInformation', 'common:name']],
    permanentUriPath: [
      'unitGroupDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:permanentDataSetURI',
    ],
    rootKey: 'unitGroupDataSet',
    shortDescriptionPath: [
      'unitGroupDataSet',
      'unitGroupInformation',
      'dataSetInformation',
      'common:name',
    ],
    table: 'unitgroups',
    type: 'unit group data set',
    uuidPath: ['unitGroupDataSet', 'unitGroupInformation', 'dataSetInformation', 'common:UUID'],
    versionPath: [
      'unitGroupDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:dataSetVersion',
    ],
  },
  flowproperty: {
    fixturePath: 'tests/data-workflows/fixtures/data/flowProperties/002_check_data_success.json',
    folder: 'flowproperties',
    namePaths: [
      ['flowPropertyDataSet', 'flowPropertiesInformation', 'dataSetInformation', 'common:name'],
    ],
    permanentUriPath: [
      'flowPropertyDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:permanentDataSetURI',
    ],
    rootKey: 'flowPropertyDataSet',
    shortDescriptionPath: [
      'flowPropertyDataSet',
      'flowPropertiesInformation',
      'dataSetInformation',
      'common:name',
    ],
    table: 'flowproperties',
    type: 'flow property data set',
    uuidPath: [
      'flowPropertyDataSet',
      'flowPropertiesInformation',
      'dataSetInformation',
      'common:UUID',
    ],
    versionPath: [
      'flowPropertyDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:dataSetVersion',
    ],
  },
  flow: {
    fixturePath: 'tests/data-workflows/fixtures/data/flows/002_check_data_success.json',
    folder: 'flows',
    namePaths: [['flowDataSet', 'flowInformation', 'dataSetInformation', 'name', 'baseName']],
    permanentUriPath: [
      'flowDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:permanentDataSetURI',
    ],
    rootKey: 'flowDataSet',
    shortDescriptionPath: [
      'flowDataSet',
      'flowInformation',
      'dataSetInformation',
      'name',
      'baseName',
    ],
    table: 'flows',
    type: 'flow data set',
    uuidPath: ['flowDataSet', 'flowInformation', 'dataSetInformation', 'common:UUID'],
    versionPath: [
      'flowDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:dataSetVersion',
    ],
  },
  process: {
    fixturePath: 'tests/data-workflows/fixtures/data/processes/002_check_data_success.json',
    folder: 'processes',
    namePaths: [['processDataSet', 'processInformation', 'dataSetInformation', 'name', 'baseName']],
    permanentUriPath: [
      'processDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:permanentDataSetURI',
    ],
    rootKey: 'processDataSet',
    shortDescriptionPath: [
      'processDataSet',
      'processInformation',
      'dataSetInformation',
      'name',
      'baseName',
    ],
    table: 'processes',
    type: 'process data set',
    uuidPath: ['processDataSet', 'processInformation', 'dataSetInformation', 'common:UUID'],
    versionPath: [
      'processDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:dataSetVersion',
    ],
  },
};

const REFERENCE_SEED_DEPENDENCIES: Record<ReferenceSeedKey, ReferenceSeedKey[]> = {
  contact: ['source'],
  flow: ['contact', 'flowproperty', 'source'],
  flowproperty: ['contact', 'source', 'unitgroup'],
  process: ['contact', 'flow', 'source'],
  source: ['contact'],
  unitgroup: ['contact', 'source'],
};

const TYPE_TO_SEED_KEY = Object.values(DATASET_META).reduce<Record<string, ReferenceSeedKey>>(
  (accumulator, meta) => {
    const key = Object.keys(DATASET_META).find(
      (candidate) => DATASET_META[candidate as ReferenceSeedKey] === meta,
    ) as ReferenceSeedKey;
    accumulator[meta.type] = key;
    return accumulator;
  },
  {},
);

let activeReferenceSeeds: ReferenceSeedMap | undefined;

export async function ensureReferenceSeeds(
  input: EnsureReferenceSeedInput,
): Promise<ReferenceSeedMap | undefined> {
  if (shouldSkipReferenceSeedsForUnitTests()) {
    return undefined;
  }

  const cwd = input.cwd ?? process.cwd();
  const generateIdFn = input.generateIdFn ?? randomUUID;
  const requiredSeeds = expandRequiredReferenceSeeds(input.requiredSeeds ?? ['contact', 'source']);
  const context = {
    ...input,
    cwd,
    generateIdFn,
  };
  const seeds: ReferenceSeedMap = {};

  if (requiredSeeds.has('source')) {
    seeds.source = await ensureSingleReferenceSeed(context, 'source', seeds, {
      bootstrapSourceWithoutOwner: true,
    });
  }
  if (requiredSeeds.has('contact')) {
    seeds.contact = await ensureSingleReferenceSeed(context, 'contact', seeds);
  }
  if (requiredSeeds.has('source') && seeds.contact) {
    seeds.source = await ensureSingleReferenceSeed(context, 'source', seeds);
  }
  if (requiredSeeds.has('unitgroup')) {
    seeds.unitgroup = await ensureSingleReferenceSeed(context, 'unitgroup', seeds);
  }
  if (requiredSeeds.has('flowproperty')) {
    seeds.flowproperty = await ensureSingleReferenceSeed(context, 'flowproperty', seeds);
  }
  if (requiredSeeds.has('flow')) {
    seeds.flow = await ensureSingleReferenceSeed(context, 'flow', seeds);
  }
  if (requiredSeeds.has('process')) {
    seeds.process = await ensureSingleReferenceSeed(context, 'process', seeds);
  }

  return seeds;
}

export function getReferenceSeedKeysForTable(table: ReferenceSeedTable): ReferenceSeedKey[] {
  const key = tableToSeedKey(table);
  return key ? Array.from(expandRequiredReferenceSeeds([key])) : ['contact', 'source'];
}

export async function activateReferenceSeedsForSmoke(input: EnsureReferenceSeedInput) {
  const seeds = await ensureReferenceSeeds(input);
  setActiveReferenceSeeds(seeds);
  return seeds;
}

export function setActiveReferenceSeeds(seeds: ReferenceSeedMap | undefined) {
  activeReferenceSeeds = seeds;
}

export function clearActiveReferenceSeeds() {
  activeReferenceSeeds = undefined;
}

export function patchJsonOrderedWithActiveReferenceSeeds(
  jsonOrdered: Record<string, any>,
  options: {
    currentDataset?: CurrentDataset;
  } = {},
) {
  if (!activeReferenceSeeds) {
    return jsonOrdered;
  }

  return patchJsonOrderedWithReferenceSeeds(jsonOrdered, activeReferenceSeeds, options);
}

export function patchJsonOrderedWithReferenceSeeds(
  jsonOrdered: Record<string, any>,
  seeds: ReferenceSeedMap | undefined,
  _options: {
    currentDataset?: CurrentDataset;
  } = {},
) {
  if (!seeds) {
    return jsonOrdered;
  }

  replaceReferenceObjects(jsonOrdered, seeds);
  patchLifeCycleModelRuntimeReferences(jsonOrdered, seeds);
  return jsonOrdered;
}

export function buildReferenceSeedFromJsonOrdered(input: {
  id: string;
  jsonOrdered: Record<string, any>;
  key: ReferenceSeedKey;
  version: string;
}): ReferenceSeed {
  const meta = DATASET_META[input.key];
  const shortDescription = getNestedValue(input.jsonOrdered, meta.shortDescriptionPath);

  if (shortDescription === undefined) {
    throw new Error(`Unable to resolve short description for ${input.key} reference seed.`);
  }

  return {
    id: input.id,
    name: SEED_NAMES[input.key],
    reference: {
      '@refObjectId': input.id,
      '@type': meta.type,
      '@uri': `../${meta.folder}/${input.id}.xml`,
      '@version': input.version,
      'common:shortDescription': deepClone(shortDescription),
    },
    table: meta.table,
    version: input.version,
  };
}

async function ensureSingleReferenceSeed(
  context: EnsureReferenceSeedInput & {
    cwd: string;
    generateIdFn: () => string;
  },
  key: ReferenceSeedKey,
  seeds: ReferenceSeedMap,
  options: {
    bootstrapSourceWithoutOwner?: boolean;
  } = {},
): Promise<ReferenceSeed> {
  const meta = DATASET_META[key];
  const existing = await findExistingSeedRecord(context.supabase, context.currentUserId, key);
  const id = existing?.id ?? context.generateIdFn();
  const version =
    existing?.version ??
    getNestedValue<string>(
      (await loadSeedFixtureJson(key, context.cwd)) as Record<string, any>,
      meta.versionPath,
    ) ??
    '01.01.000';
  const desiredJsonOrdered = await buildReferenceSeedJsonOrdered({
    bootstrapSourceWithoutOwner: options.bootstrapSourceWithoutOwner,
    cwd: context.cwd,
    id,
    key,
    seeds,
    version,
  });
  const ruleVerification = computeReferenceSeedRuleVerification(key, desiredJsonOrdered);

  if (existing) {
    if (
      existing.rule_verification === ruleVerification &&
      JSON.stringify(deepSortJson(existing.json_ordered)) ===
        JSON.stringify(deepSortJson(desiredJsonOrdered))
    ) {
      return buildReferenceSeedFromJsonOrdered({
        id: existing.id,
        jsonOrdered: existing.json_ordered,
        key,
        version: existing.version,
      });
    }

    const updateResult = await context.supabase.functions.invoke('app_dataset_save_draft', {
      body: {
        id,
        jsonOrdered: desiredJsonOrdered,
        ruleVerification,
        table: meta.table,
        version,
      },
      headers: {
        Authorization: `Bearer ${context.accessToken}`,
      },
      region: FunctionRegion.UsEast1,
    });

    if (updateResult.error) {
      throw new Error(
        `Update ${SEED_NAMES[key]} reference seed failed: ${updateResult.error.message}.`,
      );
    }
  } else {
    const createResult = await context.supabase.functions.invoke('app_dataset_create', {
      body: {
        id,
        jsonOrdered: desiredJsonOrdered,
        ruleVerification,
        table: meta.table,
      },
      headers: {
        Authorization: `Bearer ${context.accessToken}`,
      },
      region: FunctionRegion.UsEast1,
    });

    if (createResult.error) {
      throw new Error(
        `Create ${SEED_NAMES[key]} reference seed failed: ${createResult.error.message}.`,
      );
    }
  }

  const record = await querySeedRecord(context.supabase, meta.table, id, version);
  return buildReferenceSeedFromJsonOrdered({
    id: record.id,
    jsonOrdered: record.json_ordered,
    key,
    version: record.version,
  });
}

async function buildReferenceSeedJsonOrdered(input: BuildSeedJsonInput) {
  const meta = DATASET_META[input.key];
  const fixtureJsonOrdered = await loadSeedFixtureJson(input.key, input.cwd);
  const jsonOrdered = replaceRuntimeIdPlaceholders(deepClone(fixtureJsonOrdered), input.id);
  const version = input.version ?? getNestedValue<string>(jsonOrdered, meta.versionPath);

  if (!version) {
    throw new Error(`Unable to resolve version for ${SEED_NAMES[input.key]}.`);
  }

  setNestedValue(jsonOrdered, meta.uuidPath, input.id);
  setNestedValue(jsonOrdered, meta.versionPath, version);
  setNestedValue(
    jsonOrdered,
    meta.permanentUriPath,
    buildPermanentDataSetUri(input.key, input.id, version),
  );
  meta.namePaths.forEach((namePath) => {
    const existingName = getNestedValue(jsonOrdered, namePath);
    if (existingName && typeof existingName === 'object') {
      setNestedValue(jsonOrdered, namePath, {
        ...(existingName as Record<string, unknown>),
        '#text': SEED_NAMES[input.key],
      });
      return;
    }
    setNestedValue(jsonOrdered, namePath, {
      '#text': SEED_NAMES[input.key],
      '@xml:lang': 'en',
    });
  });

  patchReferenceSeedDependencies(jsonOrdered, input.key, input.seeds, {
    bootstrapSourceWithoutOwner: input.bootstrapSourceWithoutOwner,
    id: input.id,
    version,
  });

  return jsonOrdered;
}

async function loadSeedFixtureJson(key: ReferenceSeedKey, cwd: string) {
  const fixture = await readJsonFile<{
    jsonOrdered?: Record<string, any>;
    json_ordered?: Record<string, any>;
  }>(path.resolve(cwd, DATASET_META[key].fixturePath));
  const jsonOrdered = fixture.jsonOrdered ?? fixture.json_ordered;

  if (!jsonOrdered || typeof jsonOrdered !== 'object') {
    throw new Error(`Reference seed fixture for ${key} is missing jsonOrdered.`);
  }

  return jsonOrdered;
}

async function findExistingSeedRecord(
  supabase: SupabaseClient,
  currentUserId: string,
  key: ReferenceSeedKey,
) {
  const meta = DATASET_META[key];
  const result = await supabase
    .from(meta.table)
    .select('id,json_ordered,user_id,state_code,version,team_id,rule_verification')
    .eq('user_id', currentUserId)
    .is('team_id', null)
    .limit(1000);

  if (result.error) {
    throw new Error(`Query ${SEED_NAMES[key]} reference seed failed: ${result.error.message}.`);
  }

  const records = ((result.data ?? []) as ExistingSeedRecord[])
    .filter((record) => extractDatasetName(key, record.json_ordered) === SEED_NAMES[key])
    .sort((left, right) => compareDatasetVersion(right.version, left.version));

  return records[0];
}

async function querySeedRecord(
  supabase: SupabaseClient,
  table: ReferenceSeedTable,
  id: string,
  version: string,
): Promise<ExistingSeedRecord> {
  const result = await supabase
    .from(table)
    .select('id,json_ordered,user_id,state_code,version,team_id,rule_verification')
    .eq('id', id)
    .eq('version', version)
    .maybeSingle<ExistingSeedRecord>();

  if (result.error || !result.data) {
    throw new Error(`Query reference seed ${table}/${id}/${version} failed.`);
  }

  return result.data;
}

function patchReferenceSeedDependencies(
  jsonOrdered: Record<string, any>,
  key: ReferenceSeedKey,
  seeds: ReferenceSeedMap,
  options: {
    bootstrapSourceWithoutOwner?: boolean;
    id: string;
    version: string;
  },
) {
  const selfReference = buildReferenceSeedFromJsonOrdered({
    id: options.id,
    jsonOrdered,
    key,
    version: options.version,
  });

  switch (key) {
    case 'contact':
      setContactDataSetFormat(jsonOrdered, requireSeed(seeds, 'source'));
      setContactOwnership(jsonOrdered, selfReference);
      return;
    case 'source':
      setSourceDataSetFormat(jsonOrdered, selfReference);
      if (options.bootstrapSourceWithoutOwner) {
        deleteNestedValue(jsonOrdered, [
          'sourceDataSet',
          'administrativeInformation',
          'publicationAndOwnership',
          'common:referenceToOwnershipOfDataSet',
        ]);
      } else {
        setSourceOwnership(jsonOrdered, requireSeed(seeds, 'contact'));
      }
      return;
    case 'unitgroup':
      setUnitGroupSourceReferences(jsonOrdered, requireSeed(seeds, 'source'));
      setUnitGroupOwnership(jsonOrdered, requireSeed(seeds, 'contact'));
      return;
    case 'flowproperty':
      setFlowpropertySourceReferences(jsonOrdered, requireSeed(seeds, 'source'));
      setFlowpropertyOwnership(jsonOrdered, requireSeed(seeds, 'contact'));
      setFlowpropertyUnitGroup(jsonOrdered, requireSeed(seeds, 'unitgroup'));
      return;
    case 'flow':
      setFlowFlowproperty(jsonOrdered, requireSeed(seeds, 'flowproperty'));
      setFlowSourceReferences(jsonOrdered, requireSeed(seeds, 'source'));
      setFlowContactReferences(jsonOrdered, requireSeed(seeds, 'contact'));
      return;
    case 'process':
      setProcessFlowReference(jsonOrdered, requireSeed(seeds, 'flow'));
      setProcessSourceReferences(jsonOrdered, requireSeed(seeds, 'source'));
      setProcessContactReferences(jsonOrdered, requireSeed(seeds, 'contact'));
      return;
  }
}

function setContactDataSetFormat(jsonOrdered: Record<string, any>, source: ReferenceSeed) {
  setNestedValue(
    jsonOrdered,
    [
      'contactDataSet',
      'administrativeInformation',
      'dataEntryBy',
      'common:referenceToDataSetFormat',
    ],
    cloneReference(source),
  );
}

function setContactOwnership(jsonOrdered: Record<string, any>, contact: ReferenceSeed) {
  setNestedValue(
    jsonOrdered,
    [
      'contactDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:referenceToOwnershipOfDataSet',
    ],
    cloneReference(contact),
  );
}

function setSourceDataSetFormat(jsonOrdered: Record<string, any>, source: ReferenceSeed) {
  setNestedValue(
    jsonOrdered,
    [
      'sourceDataSet',
      'administrativeInformation',
      'dataEntryBy',
      'common:referenceToDataSetFormat',
    ],
    cloneReference(source),
  );
}

function setSourceOwnership(jsonOrdered: Record<string, any>, contact: ReferenceSeed) {
  setNestedValue(
    jsonOrdered,
    [
      'sourceDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:referenceToOwnershipOfDataSet',
    ],
    cloneReference(contact),
  );
}

function setUnitGroupSourceReferences(jsonOrdered: Record<string, any>, source: ReferenceSeed) {
  setNestedValue(
    jsonOrdered,
    [
      'unitGroupDataSet',
      'modellingAndValidation',
      'complianceDeclarations',
      'compliance',
      'common:referenceToComplianceSystem',
    ],
    cloneReference(source),
  );
  setNestedValue(
    jsonOrdered,
    [
      'unitGroupDataSet',
      'administrativeInformation',
      'dataEntryBy',
      'common:referenceToDataSetFormat',
    ],
    cloneReference(source),
  );
}

function setUnitGroupOwnership(jsonOrdered: Record<string, any>, contact: ReferenceSeed) {
  setNestedValue(
    jsonOrdered,
    [
      'unitGroupDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:referenceToOwnershipOfDataSet',
    ],
    cloneReference(contact),
  );
}

function setFlowpropertySourceReferences(jsonOrdered: Record<string, any>, source: ReferenceSeed) {
  setNestedValue(
    jsonOrdered,
    [
      'flowPropertyDataSet',
      'modellingAndValidation',
      'complianceDeclarations',
      'compliance',
      'common:referenceToComplianceSystem',
    ],
    cloneReference(source),
  );
  setNestedValue(
    jsonOrdered,
    [
      'flowPropertyDataSet',
      'administrativeInformation',
      'dataEntryBy',
      'common:referenceToDataSetFormat',
    ],
    cloneReference(source),
  );
}

function setFlowpropertyOwnership(jsonOrdered: Record<string, any>, contact: ReferenceSeed) {
  setNestedValue(
    jsonOrdered,
    [
      'flowPropertyDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:referenceToOwnershipOfDataSet',
    ],
    cloneReference(contact),
  );
}

function setFlowpropertyUnitGroup(jsonOrdered: Record<string, any>, unitgroup: ReferenceSeed) {
  setNestedValue(
    jsonOrdered,
    [
      'flowPropertyDataSet',
      'flowPropertiesInformation',
      'quantitativeReference',
      'referenceToReferenceUnitGroup',
    ],
    cloneReference(unitgroup),
  );
}

function setFlowFlowproperty(jsonOrdered: Record<string, any>, flowproperty: ReferenceSeed) {
  setNestedValue(
    jsonOrdered,
    ['flowDataSet', 'flowProperties', 'flowProperty', 'referenceToFlowPropertyDataSet'],
    cloneReference(flowproperty),
  );
}

function setFlowSourceReferences(jsonOrdered: Record<string, any>, source: ReferenceSeed) {
  setNestedValue(
    jsonOrdered,
    [
      'flowDataSet',
      'modellingAndValidation',
      'complianceDeclarations',
      'compliance',
      'common:referenceToComplianceSystem',
    ],
    cloneReference(source),
  );
  setNestedValue(
    jsonOrdered,
    ['flowDataSet', 'administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat'],
    cloneReference(source),
  );
}

function setFlowContactReferences(jsonOrdered: Record<string, any>, contact: ReferenceSeed) {
  setNestedValue(
    jsonOrdered,
    [
      'flowDataSet',
      'administrativeInformation',
      'dataEntryBy',
      'common:referenceToPersonOrEntityEnteringTheData',
    ],
    cloneReference(contact),
  );
  setNestedValue(
    jsonOrdered,
    [
      'flowDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:referenceToOwnershipOfDataSet',
    ],
    cloneReference(contact),
  );
}

function setProcessFlowReference(jsonOrdered: Record<string, any>, flow: ReferenceSeed) {
  const exchange = jsonOrdered?.processDataSet?.exchanges?.exchange;
  if (Array.isArray(exchange) && exchange[0]) {
    exchange[0].referenceToFlowDataSet = cloneReference(flow);
  }
}

function setProcessSourceReferences(jsonOrdered: Record<string, any>, source: ReferenceSeed) {
  setNestedValue(
    jsonOrdered,
    [
      'processDataSet',
      'modellingAndValidation',
      'dataSourcesTreatmentAndRepresentativeness',
      'referenceToDataSource',
    ],
    cloneReference(source),
  );
  setNestedValue(
    jsonOrdered,
    [
      'processDataSet',
      'administrativeInformation',
      'dataEntryBy',
      'common:referenceToDataSetFormat',
    ],
    cloneReference(source),
  );
}

function setProcessContactReferences(jsonOrdered: Record<string, any>, contact: ReferenceSeed) {
  setNestedValue(
    jsonOrdered,
    [
      'processDataSet',
      'administrativeInformation',
      'dataEntryBy',
      'common:referenceToPersonOrEntityEnteringTheData',
    ],
    cloneReference(contact),
  );
  setNestedValue(
    jsonOrdered,
    [
      'processDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:referenceToOwnershipOfDataSet',
    ],
    cloneReference(contact),
  );
  setNestedValue(
    jsonOrdered,
    [
      'processDataSet',
      'administrativeInformation',
      'common:commissionerAndGoal',
      'common:referenceToCommissioner',
    ],
    cloneReference(contact),
  );
}

function replaceReferenceObjects(value: unknown, seeds: ReferenceSeedMap) {
  if (Array.isArray(value)) {
    value.forEach((item) => replaceReferenceObjects(item, seeds));
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  const objectValue = value as Record<string, any>;
  const referenceType = typeof objectValue['@type'] === 'string' ? objectValue['@type'] : '';
  const seedKey = TYPE_TO_SEED_KEY[referenceType];

  if (seedKey && seeds[seedKey] && !isIntentionalMissingReference(objectValue)) {
    Object.assign(objectValue, cloneReference(seeds[seedKey]));
  }

  Object.values(objectValue).forEach((child) => {
    replaceReferenceObjects(child, seeds);
  });
}

function patchLifeCycleModelRuntimeReferences(
  jsonOrdered: Record<string, any>,
  seeds: ReferenceSeedMap,
) {
  const flow = seeds.flow;
  if (!flow) {
    return;
  }

  const nodes = jsonOrdered?.lifeCycleModelDataSet?.model?.node;
  if (Array.isArray(nodes)) {
    nodes.forEach((node) => {
      if (typeof node?.id === 'string' && node.id.startsWith('INPUT:')) {
        node.id = `INPUT:${flow.id}`;
      }
      if (node?.data && typeof node.data === 'object') {
        node.data.flowId = flow.id;
      }
    });
  }
}

function isIntentionalMissingReference(reference: Record<string, any>) {
  const refObjectId = String(reference['@refObjectId'] ?? '');
  return reference['@version'] === '99.99.999' || refObjectId.startsWith('00000000-');
}

function computeReferenceSeedRuleVerification(
  key: ReferenceSeedKey,
  jsonOrdered: Record<string, any>,
) {
  switch (key) {
    case 'contact':
      return createTidasContact(jsonOrdered).validateEnhanced().success;
    case 'source':
      return createTidasSource(jsonOrdered).validateEnhanced().success;
    case 'unitgroup':
      return createTidasUnitGroup(jsonOrdered).validateEnhanced().success;
    case 'flowproperty':
      return createTidasFlowProperty(jsonOrdered).validateEnhanced().success;
    case 'flow':
      return createTidasFlow(jsonOrdered).validateEnhanced().success;
    case 'process':
      return createTidasProcess(jsonOrdered).validateEnhanced().success;
  }
}

function extractDatasetName(key: ReferenceSeedKey, jsonOrdered: Record<string, any>) {
  for (const namePath of DATASET_META[key].namePaths) {
    const value = getNestedValue(jsonOrdered, namePath);
    const text = extractTextValue(value);
    if (text) {
      return text;
    }
  }

  return undefined;
}

function extractTextValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = extractTextValue(item);
      if (text) {
        return text;
      }
    }
    return undefined;
  }

  if (value && typeof value === 'object') {
    const text = (value as Record<string, unknown>)['#text'];
    return typeof text === 'string' ? text : undefined;
  }

  return undefined;
}

function replaceRuntimeIdPlaceholders<T>(value: T, runtimeId: string): T {
  if (typeof value === 'string') {
    return value.replace(/__RUNTIME_[A-Z_]+_ID__/gu, runtimeId) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceRuntimeIdPlaceholders(item, runtimeId)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        replaceRuntimeIdPlaceholders(child, runtimeId),
      ]),
    ) as T;
  }

  return value;
}

function cloneReference(seed: ReferenceSeed) {
  return deepClone(seed.reference);
}

function requireSeed(seeds: ReferenceSeedMap, key: ReferenceSeedKey) {
  const seed = seeds[key];
  if (!seed) {
    throw new Error(
      `Reference seed ${SEED_NAMES[key]} is required before creating dependent seed.`,
    );
  }
  return seed;
}

function tableToSeedKey(table: ReferenceSeedTable): ReferenceSeedKey | undefined {
  return (Object.keys(DATASET_META) as ReferenceSeedKey[]).find(
    (key) => DATASET_META[key].table === table,
  );
}

function expandRequiredReferenceSeeds(keys: ReferenceSeedKey[]) {
  const expanded = new Set<ReferenceSeedKey>();
  const visit = (key: ReferenceSeedKey) => {
    if (expanded.has(key)) {
      return;
    }

    expanded.add(key);
    REFERENCE_SEED_DEPENDENCIES[key].forEach(visit);
  };

  keys.forEach(visit);
  return expanded;
}

function buildPermanentDataSetUri(key: ReferenceSeedKey, id: string, version: string) {
  switch (key) {
    case 'unitgroup':
      return `https://lcdn.tiangong.earth/unitgroups/${id}?version=${version}`;
    case 'contact':
      return `https://lcdn.tiangong.earth/datasetdetail/contact.xhtml?uuid=${id}&version=${version}`;
    case 'flow':
      return `https://lcdn.tiangong.earth/datasetdetail/productFlow.xhtml?uuid=${id}&version=${version}`;
    case 'flowproperty':
      return `https://lcdn.tiangong.earth/datasetdetail/flowproperty.xhtml?uuid=${id}&version=${version}`;
    case 'process':
      return `https://lcdn.tiangong.earth/datasetdetail/process.xhtml?uuid=${id}&version=${version}`;
    case 'source':
      return `https://lcdn.tiangong.earth/datasetdetail/source.xhtml?uuid=${id}&version=${version}`;
  }
}

function compareDatasetVersion(left: string, right: string) {
  const leftParts = left.split('.').map((part) => Number(part));
  const rightParts = right.split('.').map((part) => Number(part));

  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function getNestedValue<T = unknown>(source: Record<string, any>, keys: readonly string[]) {
  let current: any = source;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  return current as T | undefined;
}

function setNestedValue(source: Record<string, any>, keys: readonly string[], value: unknown) {
  let current: Record<string, any> = source;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;
      return;
    }

    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  });
}

function deleteNestedValue(source: Record<string, any>, keys: readonly string[]) {
  let current: Record<string, any> | undefined = source;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const child: unknown = current?.[keys[index]];
    if (!child || typeof child !== 'object') {
      return;
    }
    current = child as Record<string, any>;
  }
  delete current?.[keys[keys.length - 1]];
}

function shouldSkipReferenceSeedsForUnitTests() {
  const referenceSeedsEnabled =
    process.env.DATA_WORKFLOW_REFERENCE_SEEDS_IN_JEST === '1' ||
    process.env.SMOKE_REFERENCE_SEEDS_IN_JEST === '1';

  return process.env.NODE_ENV === 'test' && !referenceSeedsEnabled;
}
