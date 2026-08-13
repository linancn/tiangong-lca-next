import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import { generateFlowMarkdown, normalizeJsonOrdered } from './flow_extraction.ts';
import {
  generateContactMarkdown,
  generateFlowPropertyMarkdown,
  generateSourceMarkdown,
  generateUnitGroupMarkdown,
} from './foundation_dataset_extraction.ts';
import {
  projectContactSearchText,
  projectFlowPropertySearchText,
  projectFlowSearchText,
  projectLifecycleModelSearchText,
  projectProcessSearchText,
  projectSourceSearchText,
  projectUnitGroupSearchText,
  type SearchTextProjector,
} from './search_text_projection.ts';

export type DatasetExtractionKind = 'extracted_md' | 'search_text';
export type DatasetEntityKind =
  'flow' | 'process' | 'lifecyclemodel' | 'contact' | 'flowproperty' | 'source' | 'unitgroup';
export type SupportedDatasetEntityKind = DatasetEntityKind;

export interface DatasetExtractionJobMessage {
  schema: string;
  table: string;
  id: string;
  version: string;
  entity_kind: DatasetEntityKind;
  extraction_kind: DatasetExtractionKind;
  created_at?: string;
}

export interface ClaimedDatasetExtractionJob {
  msg_id: number;
  read_ct: number;
  message: DatasetExtractionJobMessage;
}

export interface DatasetExtractionJobResult {
  msg_id: number;
  entity_kind?: string;
  extraction_kind?: string;
  table?: string;
  id?: string;
  version?: string;
  status: 'success' | 'stale' | 'retry' | 'failed' | 'unsupported';
  duration_ms: number;
  error_code?: string;
  error_message?: string;
}

export interface DatasetExtractionWorkerResult {
  claimed: number;
  acked: number;
  results: DatasetExtractionJobResult[];
}

type MarkdownGenerator = (jsonOrdered: unknown) => string;

export interface DatasetExtractionWorkerOptions {
  supabase: SupabaseClient;
  batchSize?: number;
  visibilityTimeoutSeconds?: number;
  maxReadCount?: number;
  markdownGenerator?: MarkdownGenerator;
  markdownGenerators?: Partial<Record<SupportedDatasetEntityKind, MarkdownGenerator>>;
  searchTextProjectors?: Partial<Record<SupportedDatasetEntityKind, SearchTextProjector>>;
}

interface RpcEnvelope<T> {
  ok?: boolean;
  data?: T;
  code?: string;
  status?: number;
  message?: string;
}

interface DatasetExtractionTarget {
  table: string;
  generator?: MarkdownGenerator;
  searchTextProjector: SearchTextProjector;
}

const DATASET_EXTRACTION_TARGETS: Readonly<
  Record<SupportedDatasetEntityKind, DatasetExtractionTarget>
> = {
  flow: {
    table: 'flows',
    generator: generateFlowMarkdown,
    searchTextProjector: projectFlowSearchText,
  },
  process: { table: 'processes', searchTextProjector: projectProcessSearchText },
  lifecyclemodel: {
    table: 'lifecyclemodels',
    searchTextProjector: projectLifecycleModelSearchText,
  },
  contact: {
    table: 'contacts',
    generator: generateContactMarkdown,
    searchTextProjector: projectContactSearchText,
  },
  flowproperty: {
    table: 'flowproperties',
    generator: generateFlowPropertyMarkdown,
    searchTextProjector: projectFlowPropertySearchText,
  },
  source: {
    table: 'sources',
    generator: generateSourceMarkdown,
    searchTextProjector: projectSourceSearchText,
  },
  unitgroup: {
    table: 'unitgroups',
    generator: generateUnitGroupMarkdown,
    searchTextProjector: projectUnitGroupSearchText,
  },
};

function positiveInteger(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isFinite(value ?? NaN)) return fallback;
  return Math.min(Math.max(Math.trunc(value!), 1), max);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string'
    ? value
    : value === undefined || value === null
      ? ''
      : String(value);
}

function parseClaimedJob(value: unknown): ClaimedDatasetExtractionJob {
  const raw = asRecord(value);
  const message = asRecord(raw.message);
  return {
    msg_id: Number(raw.msg_id),
    read_ct: Number(raw.read_ct ?? 0),
    message: {
      schema: asString(message.schema),
      table: asString(message.table),
      id: asString(message.id),
      version: asString(message.version),
      entity_kind: asString(message.entity_kind) as DatasetEntityKind,
      extraction_kind: asString(message.extraction_kind) as DatasetExtractionKind,
      created_at: message.created_at === undefined ? undefined : asString(message.created_at),
    },
  };
}

function resolveTarget(job: ClaimedDatasetExtractionJob): DatasetExtractionTarget {
  const message = job.message;
  if (!message.id || !message.version || !Number.isSafeInteger(job.msg_id) || job.msg_id < 1) {
    throw Object.assign(new Error('Dataset extraction job is missing a valid identity'), {
      code: 'INVALID_JOB_MESSAGE',
    });
  }
  if (message.extraction_kind !== 'extracted_md' && message.extraction_kind !== 'search_text') {
    throw Object.assign(new Error('Unsupported dataset extraction kind'), {
      code: 'UNSUPPORTED_EXTRACTION_KIND',
    });
  }

  const target = DATASET_EXTRACTION_TARGETS[message.entity_kind as SupportedDatasetEntityKind];
  if (message.schema !== 'public' || !target || target.table !== message.table) {
    throw Object.assign(new Error('Unsupported dataset extraction job entity'), {
      code: 'UNSUPPORTED_ENTITY_KIND',
    });
  }
  return target;
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const code = Reflect.get(error, 'code');
    if (typeof code === 'string' && code.trim()) return code;
  }
  return 'DATASET_EXTRACTION_JOB_FAILED';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function recordTerminalFailure(
  supabase: SupabaseClient,
  job: ClaimedDatasetExtractionJob,
  reason: string,
  message: string,
): Promise<void> {
  const { error } = await supabase.rpc('cmd_dataset_extraction_record_failure', {
    p_msg_id: job.msg_id,
    p_read_count: job.read_ct,
    p_reason: reason,
    p_message: job.message,
    p_last_error: message,
    p_delete: true,
  });
  if (error) throw error;
}

async function fetchDatasetJson(
  supabase: SupabaseClient,
  table: string,
  id: string,
  version: string,
): Promise<unknown | null> {
  const { data, error } = await supabase
    .schema('public')
    .from(table)
    .select('id,version,json_ordered')
    .eq('id', id)
    .eq('version', version)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeJsonOrdered((data as { json_ordered?: unknown }).json_ordered) : null;
}

async function updateDatasetExtraction(
  supabase: SupabaseClient,
  table: string,
  id: string,
  version: string,
  values: { extracted_md?: string; search_text?: string[] },
): Promise<void> {
  const { error } = await supabase
    .schema('public')
    .from(table)
    .update(values)
    .eq('id', id)
    .eq('version', version);
  if (error) throw error;
}

async function processDatasetJob(
  supabase: SupabaseClient,
  job: ClaimedDatasetExtractionJob,
  generators: Partial<Record<SupportedDatasetEntityKind, MarkdownGenerator>>,
  searchTextProjectors: Record<SupportedDatasetEntityKind, SearchTextProjector>,
): Promise<'success' | 'stale'> {
  const target = resolveTarget(job);
  const { id, version, entity_kind: entityKind } = job.message;
  const kind = entityKind as SupportedDatasetEntityKind;
  if (job.message.extraction_kind === 'extracted_md' && !generators[kind]) {
    throw Object.assign(new Error(`No extracted_md generator registered for ${kind}`), {
      code: 'UNSUPPORTED_ENTITY_KIND',
    });
  }
  const datasetJson = await fetchDatasetJson(supabase, target.table, id, version);
  if (datasetJson === null) return 'stale';

  const searchText = searchTextProjectors[kind](datasetJson, id);
  if (searchText.length === 0) {
    throw Object.assign(new Error('Empty search text projection'), {
      code: 'EMPTY_SEARCH_TEXT',
    });
  }

  if (job.message.extraction_kind === 'search_text') {
    await updateDatasetExtraction(supabase, target.table, id, version, {
      search_text: searchText,
    });
    return 'success';
  }

  const markdownGenerator = generators[kind]!;
  const markdown = markdownGenerator(datasetJson);
  if (!markdown.trim()) {
    throw Object.assign(new Error('Empty extracted markdown'), {
      code: 'EMPTY_EXTRACTED_MD',
    });
  }
  await updateDatasetExtraction(supabase, target.table, id, version, {
    extracted_md: markdown,
    search_text: searchText,
  });
  return 'success';
}

export async function processDatasetExtractionJobs(
  options: DatasetExtractionWorkerOptions,
): Promise<DatasetExtractionWorkerResult> {
  const batchSize = positiveInteger(options.batchSize, 5, 50);
  const visibilityTimeoutSeconds = positiveInteger(options.visibilityTimeoutSeconds, 300, 3600);
  const maxReadCount = positiveInteger(options.maxReadCount, 5, 100);
  const generators: Partial<Record<SupportedDatasetEntityKind, MarkdownGenerator>> = {
    flow: options.markdownGenerator ?? DATASET_EXTRACTION_TARGETS.flow.generator,
    process: DATASET_EXTRACTION_TARGETS.process.generator,
    lifecyclemodel: DATASET_EXTRACTION_TARGETS.lifecyclemodel.generator,
    contact: DATASET_EXTRACTION_TARGETS.contact.generator,
    flowproperty: DATASET_EXTRACTION_TARGETS.flowproperty.generator,
    source: DATASET_EXTRACTION_TARGETS.source.generator,
    unitgroup: DATASET_EXTRACTION_TARGETS.unitgroup.generator,
    ...options.markdownGenerators,
  };
  const searchTextProjectors: Record<SupportedDatasetEntityKind, SearchTextProjector> = {
    process: DATASET_EXTRACTION_TARGETS.process.searchTextProjector,
    flow: DATASET_EXTRACTION_TARGETS.flow.searchTextProjector,
    lifecyclemodel: DATASET_EXTRACTION_TARGETS.lifecyclemodel.searchTextProjector,
    contact: DATASET_EXTRACTION_TARGETS.contact.searchTextProjector,
    flowproperty: DATASET_EXTRACTION_TARGETS.flowproperty.searchTextProjector,
    source: DATASET_EXTRACTION_TARGETS.source.searchTextProjector,
    unitgroup: DATASET_EXTRACTION_TARGETS.unitgroup.searchTextProjector,
    ...options.searchTextProjectors,
  };

  const { data, error } = await options.supabase.rpc('cmd_dataset_extraction_claim', {
    p_qty: batchSize,
    p_vt_seconds: visibilityTimeoutSeconds,
    p_max_read_count: maxReadCount,
  });
  if (error) throw error;

  const envelope = data as RpcEnvelope<unknown[]>;
  if (envelope?.ok === false) {
    throw Object.assign(new Error(envelope.message ?? 'Dataset extraction claim failed'), {
      code: envelope.code ?? 'DATASET_EXTRACTION_CLAIM_FAILED',
      status: envelope.status,
    });
  }

  const jobs = Array.isArray(envelope?.data) ? envelope.data.map(parseClaimedJob) : [];
  const ackIds: number[] = [];
  const results: DatasetExtractionJobResult[] = [];

  for (const job of jobs) {
    const startedAt = Date.now();
    const baseLog = {
      msg_id: job.msg_id,
      entity_kind: job.message.entity_kind,
      table: job.message.table,
      id: job.message.id,
      version: job.message.version,
      extraction_kind: job.message.extraction_kind,
      retry_count: job.read_ct,
    };

    try {
      const status = await processDatasetJob(
        options.supabase,
        job,
        generators,
        searchTextProjectors,
      );
      ackIds.push(job.msg_id);
      const result = { ...baseLog, status, duration_ms: Date.now() - startedAt };
      console.log('[dataset_extraction_job]', { ...result, stage: status });
      results.push(result);
    } catch (caught) {
      const code = errorCode(caught);
      const message = errorMessage(caught);
      const unsupported =
        code === 'UNSUPPORTED_ENTITY_KIND' || code === 'UNSUPPORTED_EXTRACTION_KIND';
      const terminal = unsupported || code === 'INVALID_JOB_MESSAGE' || job.read_ct >= maxReadCount;
      if (terminal) await recordTerminalFailure(options.supabase, job, code, message);

      const result = {
        ...baseLog,
        status: unsupported
          ? ('unsupported' as const)
          : terminal
            ? ('failed' as const)
            : ('retry' as const),
        duration_ms: Date.now() - startedAt,
        error_code: code,
        error_message: message,
      };
      console.error('[dataset_extraction_job]', { ...result, stage: result.status });
      results.push(result);
    }
  }

  if (ackIds.length > 0) {
    const { error: ackError } = await options.supabase.rpc('cmd_dataset_extraction_ack', {
      p_msg_ids: ackIds,
    });
    if (ackError) throw ackError;
  }

  return { claimed: jobs.length, acked: ackIds.length, results };
}
