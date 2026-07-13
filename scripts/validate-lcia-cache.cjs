#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const BUNDLE_VERSION = '1.2.4';
const BUNDLE_VERSION_PROVENANCE = {
  scheme: 'legacy_frontend_cache_release.v1',
  repository: 'linancn/tiangong-lca-next',
  commit: 'd054b46fd99f8b981ffebe598f5d174da23dd0cd',
  path: 'src/components/LCIACacheMonitor/index.tsx',
  value: BUNDLE_VERSION,
};
const IDENTITY_ALIASES = [
  {
    method_id: '503699e0-eca9-4089-8bf8-e0f49c93e578',
    method_version: '01.01.000',
    artifact_locator_id: '9ec743ea-6b00-400d-a53b-61547a3fc03c',
    status: 'verified',
    evidence: {
      repository: 'tiangong-lca/data',
      commit: 'def9510358d12256ccfa9f530ddcb78038da0454',
      path: 'tiangong_lca_data/lciamethods/9ec743ea-6b00-400d-a53b-61547a3fc03c.xml',
      sha256: '84203510df0a0700e385cd1b08288859bff79d0127df02edb3b26882145d33c2',
      identity_field: 'LCIAMethodDataSet.LCIAMethodInformation.dataSetInformation.common:UUID',
    },
  },
];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION_RE = /^\d{2}\.\d{2}\.\d{3}$/;

const root = path.resolve(__dirname, '..');
const bundleDir = path.join(root, 'public', 'lciamethods');
const manifestPath = path.join(bundleDir, 'cache_manifest.json');
const listPath = path.join(bundleDir, 'list.json');
const factorPath = path.join(bundleDir, 'flow_factors.json.gz');
const evidenceSourcePath = path.join(root, 'src', 'services', 'lciaMethods', 'evidence.ts');

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function assertEqual(errors, label, actual, expected) {
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    errors.push({ label, actual, expected });
  }
}

function buildFactorStats(factors, errors) {
  const methods = new Map();
  const distribution = new Map();
  let keysWithDuplicateMethodEntries = 0;

  for (const [flowDirectionKey, group] of Object.entries(factors)) {
    if (!/^[0-9a-f-]+:(INPUT|OUTPUT)$/i.test(flowDirectionKey)) {
      errors.push({ label: 'factor_flow_direction_key', actual: flowDirectionKey });
    }
    const entries = Array.isArray(group?.factor) ? group.factor : [];
    if (entries.length === 0) {
      errors.push({ label: 'factor_group_empty', actual: flowDirectionKey });
    }
    const ids = [];
    for (const entry of entries) {
      const methodId = String(entry?.key ?? '').trim();
      const factorValue = Number(entry?.value);
      if (!UUID_RE.test(methodId)) {
        errors.push({
          label: 'factor_method_id',
          actual: methodId,
          flow_direction_key: flowDirectionKey,
        });
      }
      if (!Number.isFinite(factorValue)) {
        errors.push({
          label: 'factor_value_nonfinite',
          actual: entry?.value,
          method_id: methodId,
          flow_direction_key: flowDirectionKey,
        });
      }
      ids.push(methodId);
      const stats = methods.get(methodId) ?? { factorEntryCount: 0, keys: new Set() };
      stats.factorEntryCount += 1;
      stats.keys.add(flowDirectionKey);
      methods.set(methodId, stats);
    }
    const uniqueIds = new Set(ids);
    distribution.set(uniqueIds.size, (distribution.get(uniqueIds.size) ?? 0) + 1);
    if (uniqueIds.size !== ids.length) {
      keysWithDuplicateMethodEntries += 1;
    }
  }

  return {
    methods,
    summary: {
      schema_version: 'lcia.factor_index_summary.v1',
      flow_direction_key_count: Object.keys(factors).length,
      factor_entry_count: Array.from(methods.values()).reduce(
        (sum, item) => sum + item.factorEntryCount,
        0,
      ),
      method_flow_direction_key_count: Array.from(methods.values()).reduce(
        (sum, item) => sum + item.keys.size,
        0,
      ),
      duplicate_entry_count: Array.from(methods.values()).reduce(
        (sum, item) => sum + item.factorEntryCount - item.keys.size,
        0,
      ),
      max_method_count_per_key: Math.max(...distribution.keys()),
      all_methods_key_count: distribution.get(methods.size) ?? 0,
      keys_with_duplicate_method_entries: keysWithDuplicateMethodEntries,
      method_count_distribution: Array.from(distribution.entries())
        .sort(([left], [right]) => left - right)
        .map(([methodCount, keyCount]) => ({
          method_count: methodCount,
          flow_direction_key_count: keyCount,
        })),
    },
  };
}

function buildManifest(inputs, errors) {
  const { listBytes, factorBytes, decompressedFactorBytes, list, factors } = inputs;
  const factorStats = buildFactorStats(factors, errors);
  const aliasByLocator = new Map(
    IDENTITY_ALIASES.map((alias) => [alias.artifact_locator_id, alias]),
  );
  const methods = (Array.isArray(list.files) ? list.files : [])
    .map((listed) => {
      const locatorId = String(listed?.id ?? '').trim();
      const version = String(listed?.version ?? '').trim();
      const filename = String(listed?.filename ?? '').trim();
      const alias = aliasByLocator.get(locatorId);
      const methodId = alias?.method_id ?? locatorId;
      if (!UUID_RE.test(locatorId) || !UUID_RE.test(methodId)) {
        errors.push({ label: 'method_uuid', actual: { locatorId, methodId } });
      }
      if (!VERSION_RE.test(version)) {
        errors.push({ label: 'method_version', actual: version, method_id: methodId });
      }
      if (filename !== `${locatorId}_${version}.json.gz`) {
        errors.push({ label: 'method_filename', actual: filename, method_id: methodId });
      }
      if (alias && alias.method_version !== version) {
        errors.push({
          label: 'identity_alias_version',
          actual: version,
          expected: alias.method_version,
          method_id: methodId,
        });
      }
      const stats = factorStats.methods.get(methodId) ?? {
        factorEntryCount: 0,
        keys: new Set(),
      };
      return {
        method_id: methodId,
        method_version: version,
        artifact_locator_id: locatorId,
        artifact_filename: filename,
        factor_entry_count: stats.factorEntryCount,
        unique_flow_direction_key_count: stats.keys.size,
        duplicate_entry_count: stats.factorEntryCount - stats.keys.size,
      };
    })
    .sort((left, right) => left.method_id.localeCompare(right.method_id));

  const methodIds = methods.map((method) => method.method_id);
  const locatorIds = methods.map((method) => method.artifact_locator_id);
  assertEqual(errors, 'method_count', methods.length, 25);
  assertEqual(errors, 'method_ids_unique', new Set(methodIds).size, methods.length);
  assertEqual(errors, 'locator_ids_unique', new Set(locatorIds).size, methods.length);
  assertEqual(
    errors,
    'factor_method_membership',
    Array.from(factorStats.methods.keys()).sort(),
    [...methodIds].sort(),
  );

  const methodsWithAliases = methods
    .filter((method) => method.method_id !== method.artifact_locator_id)
    .map(({ method_id, method_version, artifact_locator_id }) => ({
      method_id,
      method_version,
      artifact_locator_id,
    }));
  assertEqual(
    errors,
    'identity_alias_membership',
    methodsWithAliases,
    IDENTITY_ALIASES.map(({ method_id, method_version, artifact_locator_id }) => ({
      method_id,
      method_version,
      artifact_locator_id,
    })),
  );

  const methodManifestSha256 = sha256(canonicalJson(methods));
  const identityProjection = methods.map(({ method_id, method_version, artifact_locator_id }) => ({
    method_id,
    method_version,
    artifact_locator_id,
  }));
  const methodIdentityManifestSha256 = sha256(canonicalJson(identityProjection));
  const factorManifestSha256 = sha256(canonicalJson(factors));
  const files = {
    list: {
      path: 'list.json',
      media_type: 'application/json',
      byte_size: listBytes.length,
      sha256: sha256(listBytes),
    },
    factors: {
      path: 'flow_factors.json.gz',
      media_type: 'application/gzip',
      byte_size: factorBytes.length,
      decompressed_byte_size: decompressedFactorBytes.length,
      sha256: sha256(factorBytes),
      decompressed_sha256: sha256(decompressedFactorBytes),
      canonical_sha256: factorManifestSha256,
    },
  };
  const sourceSnapshotHashInput = {
    schema_version: 'lcia.static_cache_bundle.v1',
    source_kind: 'static_cache_bundle',
    bundle_version: BUNDLE_VERSION,
    method_manifest_sha256: methodManifestSha256,
    method_identity_manifest_sha256: methodIdentityManifestSha256,
    factor_manifest_sha256: factorManifestSha256,
    files,
  };

  return {
    schema_version: 'lcia.static_cache_bundle.v1',
    source_kind: 'static_cache_bundle',
    bundle_version: BUNDLE_VERSION,
    bundle_version_provenance: BUNDLE_VERSION_PROVENANCE,
    source_snapshot_sha256: sha256(canonicalJson(sourceSnapshotHashInput)),
    method_manifest_sha256: methodManifestSha256,
    method_identity_manifest_sha256: methodIdentityManifestSha256,
    factor_manifest_sha256: factorManifestSha256,
    hash_algorithm: 'sha256',
    canonicalization: 'sorted_object_keys_preserve_array_order.v1',
    source_snapshot_hash_input: sourceSnapshotHashInput,
    method_membership_status: 'consistent_with_verified_aliases',
    release_ready: true,
    files,
    identity_aliases: IDENTITY_ALIASES,
    methods,
    factor_index_summary: factorStats.summary,
  };
}

function main() {
  const errors = [];
  const listBytes = fs.readFileSync(listPath);
  const factorBytes = fs.readFileSync(factorPath);
  const decompressedFactorBytes = zlib.gunzipSync(factorBytes);
  const inputs = {
    listBytes,
    factorBytes,
    decompressedFactorBytes,
    list: JSON.parse(listBytes.toString('utf8')),
    factors: JSON.parse(decompressedFactorBytes.toString('utf8')),
  };
  const expectedManifest = buildManifest(inputs, errors);
  const writeMode = process.argv.includes('--write');

  if (writeMode && errors.length === 0) {
    fs.writeFileSync(manifestPath, `${JSON.stringify(expectedManifest, null, 2)}\n`);
  }

  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assertEqual(errors, 'cache_manifest', manifest, expectedManifest);
  const manifestSha256 = sha256(manifestBytes);
  const evidenceSource = fs.readFileSync(evidenceSourcePath, 'utf8');
  const manifestLockMatch = evidenceSource.match(
    /STATIC_LCIA_CACHE_MANIFEST_SHA256\s*=\s*['"]([0-9a-f]{64})['"]/,
  );
  assertEqual(
    errors,
    'frontend_manifest_sha256_lock',
    manifestLockMatch?.[1] ?? null,
    manifestSha256,
  );

  const report = {
    schema_version: 'lcia.static_cache_bundle.validation.v1',
    valid: errors.length === 0,
    write_mode: writeMode,
    bundle_manifest_path: 'lciamethods/cache_manifest.json',
    bundle_manifest_sha256: manifestSha256,
    source_snapshot_sha256: expectedManifest.source_snapshot_sha256,
    method_manifest_sha256: expectedManifest.method_manifest_sha256,
    method_identity_manifest_sha256: expectedManifest.method_identity_manifest_sha256,
    factor_manifest_sha256: expectedManifest.factor_manifest_sha256,
    method_count: expectedManifest.methods.length,
    factor_index_summary: expectedManifest.factor_index_summary,
    errors,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main();
