import { exportDataApi } from '@/services/general/api';
import JSZip from 'jszip';

type ExportBundleParams = {
  modelId: string;
  modelVersion: string;
};

type RefItem = {
  id: string;
  version?: string;
};

type LcaBundleMissingProcess = {
  process_uuid: string;
  version?: string;
  reason: string;
};

type LcaBundleMissingFlow = {
  flow_uuid: string;
  version?: string;
  process_uuid?: string;
  reason: string;
};

type LcaBundleManifest = {
  bundle_schema_version: string;
  source_system: string;
  exported_at: string;
  model_uuid: string;
  model_file: string;
  process_dir: string;
  flow_dir: string;
  stats: {
    model_count: number;
    process_file_count: number;
    flow_file_count: number;
    missing_process_count: number;
    missing_flow_count: number;
  };
  missing_processes: LcaBundleMissingProcess[];
  missing_flows: LcaBundleMissingFlow[];
};

const toArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const buildJsonFileName = (
  table: 'lifecyclemodels' | 'processes' | 'flows',
  id: string,
  version: string,
) => `${table}_${id}_${version}.json`;

const readModelProcessRefs = (modelJson: any): RefItem[] => {
  const processInstances = toArray(
    modelJson?.lifeCycleModelDataSet?.lifeCycleModelInformation?.technology?.processes
      ?.processInstance,
  );
  const deduped = new Map<string, RefItem>();
  processInstances.forEach((instance) => {
    const id = instance?.referenceToProcess?.['@refObjectId'];
    const version = instance?.referenceToProcess?.['@version'];
    if (typeof id === 'string' && id.length > 0) {
      deduped.set(`${id}@${version ?? ''}`, { id, version });
    }
  });
  return Array.from(deduped.values());
};

const readProcessFlowRefs = (processJson: any): RefItem[] => {
  const exchanges = toArray(processJson?.processDataSet?.exchanges?.exchange);
  const deduped = new Map<string, RefItem>();
  exchanges.forEach((exchange) => {
    const id = exchange?.referenceToFlowDataSet?.['@refObjectId'];
    const version = exchange?.referenceToFlowDataSet?.['@version'];
    if (typeof id === 'string' && id.length > 0) {
      deduped.set(`${id}@${version ?? ''}`, { id, version });
    }
  });
  return Array.from(deduped.values());
};

export async function exportLcaModelBundle({
  modelId,
  modelVersion,
}: ExportBundleParams): Promise<{ blob: Blob; fileName: string; manifest: LcaBundleManifest }> {
  const modelExport = await exportDataApi('lifecyclemodels', modelId, modelVersion);
  const modelRecord = modelExport?.data?.[0];
  if (!modelRecord?.json_ordered) {
    throw new Error('Failed to load lifecycle model');
  }

  const modelJson = modelRecord.json_ordered;
  const modelFilePayload = modelRecord.json_tg
    ? {
        ...modelRecord.json_ordered,
        json_tg: modelRecord.json_tg,
      }
    : modelRecord.json_ordered;
  const modelUuid =
    modelJson?.lifeCycleModelDataSet?.lifeCycleModelInformation?.dataSetInformation?.[
      'common:UUID'
    ] ?? modelId;
  const exportedAt = new Date().toISOString();
  const processRefs = readModelProcessRefs(modelJson);
  const missingProcesses: LcaBundleManifest['missing_processes'] = [];
  const processFiles: Array<{ path: string; json: unknown; id: string; version: string }> = [];
  const flowRefMap = new Map<string, { id: string; version?: string; processId: string }>();

  const processResults = await Promise.all(
    processRefs.map(async (ref) => ({
      ref,
      result: await exportDataApi('processes', ref.id, ref.version ?? ''),
    })),
  );

  processResults.forEach(({ ref, result }) => {
    const processRecord = result?.data?.[0];
    if (!processRecord?.json_ordered) {
      missingProcesses.push({
        process_uuid: ref.id,
        version: ref.version,
        reason: 'referenced by model but not found',
      });
      return;
    }

    const resolvedVersion = ref.version ?? modelVersion;
    processFiles.push({
      path: `process/${buildJsonFileName('processes', ref.id, resolvedVersion)}`,
      json: processRecord.json_ordered,
      id: ref.id,
      version: resolvedVersion,
    });

    readProcessFlowRefs(processRecord.json_ordered).forEach((flowRef) => {
      flowRefMap.set(`${flowRef.id}@${flowRef.version ?? ''}`, {
        id: flowRef.id,
        version: flowRef.version,
        processId: ref.id,
      });
    });
  });

  const missingFlows: LcaBundleManifest['missing_flows'] = [];
  const flowFiles: Array<{ path: string; json: unknown; id: string; version: string }> = [];
  const flowResults = await Promise.all(
    Array.from(flowRefMap.values()).map(async (ref) => ({
      ref,
      result: await exportDataApi('flows', ref.id, ref.version ?? ''),
    })),
  );

  flowResults.forEach(({ ref, result }) => {
    const flowRecord = result?.data?.[0];
    if (!flowRecord?.json_ordered) {
      missingFlows.push({
        flow_uuid: ref.id,
        version: ref.version,
        process_uuid: ref.processId,
        reason: 'referenced by process but not found',
      });
      return;
    }

    const resolvedVersion = ref.version ?? modelVersion;
    flowFiles.push({
      path: `flow/${buildJsonFileName('flows', ref.id, resolvedVersion)}`,
      json: flowRecord.json_ordered,
      id: ref.id,
      version: resolvedVersion,
    });
  });

  const modelFile = `model/${buildJsonFileName('lifecyclemodels', modelUuid, modelVersion)}`;
  const manifest: LcaBundleManifest = {
    bundle_schema_version: 'tidas-lca-bundle-v1',
    source_system: 'tiangong-lca',
    exported_at: exportedAt,
    model_uuid: modelUuid,
    model_file: modelFile,
    process_dir: 'process',
    flow_dir: 'flow',
    stats: {
      model_count: 1,
      process_file_count: processFiles.length,
      flow_file_count: flowFiles.length,
      missing_process_count: missingProcesses.length,
      missing_flow_count: missingFlows.length,
    },
    missing_processes: missingProcesses,
    missing_flows: missingFlows,
  };

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file(modelFile, JSON.stringify(modelFilePayload, null, 2));
  processFiles.forEach((item) => {
    zip.file(item.path, JSON.stringify(item.json, null, 2));
  });
  flowFiles.forEach((item) => {
    zip.file(item.path, JSON.stringify(item.json, null, 2));
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  return {
    blob,
    fileName: `tidas_lca_bundle_${modelUuid}.zip`,
    manifest,
  };
}
