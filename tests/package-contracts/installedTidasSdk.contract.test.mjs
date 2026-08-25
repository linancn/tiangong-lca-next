import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const resolvedCoreEntry = fs.realpathSync(
  require.resolve('@tiangong-lca/tidas-sdk/core', { paths: [repositoryRoot] }),
);
const installedPackageRoot = path.resolve(path.dirname(resolvedCoreEntry), '../..');
const installedManifest = JSON.parse(
  fs.readFileSync(path.join(installedPackageRoot, 'package.json'), 'utf8'),
);
const installedCore = require(resolvedCoreEntry);

const datasetFactories = [
  ['Contact', 'createContact', 'contactDataSet'],
  ['Source', 'createSource', 'sourceDataSet'],
  ['UnitGroup', 'createUnitGroup', 'unitGroupDataSet'],
  ['FlowProperty', 'createFlowProperty', 'flowPropertyDataSet'],
  ['Flow', 'createFlow', 'flowDataSet'],
  ['Process', 'createProcess', 'processDataSet'],
  ['LifeCycleModel', 'createLifeCycleModel', 'lifeCycleModelDataSet'],
];

function assertStableErrorEnvelope(result, factoryName) {
  assert.equal(result.success, false, `${factoryName} empty data must fail strict validation`);
  assert.equal(result.mode, 'strict');
  assert.equal(typeof result.error, 'object');
  assert.equal(result.error?.name, 'ZodError');
  assert.equal(typeof result.error?.message, 'string');
  assert.ok(Array.isArray(result.error.issues));
  assert.ok(result.error.issues.length > 0);
  assert.ok(Array.isArray(result.validationIssues));
  assert.equal(result.validationIssues.length, result.error.issues.length);
  for (const [index, issue] of result.validationIssues.entries()) {
    const rawIssue = result.error.issues[index];
    assert.equal(typeof issue.code, 'string');
    assert.ok(Array.isArray(issue.path));
    assert.ok(['error', 'warning', 'info'].includes(issue.severity));
    assert.equal(issue.rawCode, rawIssue.code);
    assert.deepEqual(issue.path, rawIssue.path);
    assert.equal(issue.message, rawIssue.message);
  }
}

test('loads the exact released SDK from the installed package graph', () => {
  assert.equal(installedManifest.name, '@tiangong-lca/tidas-sdk');
  assert.equal(installedManifest.version, '0.2.0');
  assert.match(resolvedCoreEntry, /node_modules/u);
});

test('all seven dataset factories expose validateEnhanced and its stable error envelope', () => {
  for (const name of [
    'TIDAS_DEEP_VALIDATION',
    'TIDAS_INCLUDE_WARNINGS',
    'TIDAS_THROW_ON_ERROR',
    'TIDAS_VALIDATION_MODE',
  ]) {
    assert.equal(process.env[name], undefined, `${name} must use the SDK default`);
  }
  for (const [datasetName, factoryName, rootKey] of datasetFactories) {
    const factory = installedCore[factoryName];
    assert.equal(typeof factory, 'function', `${factoryName} must be exported`);

    const entity = factory({ [rootKey]: {} }, { mode: 'strict' });
    assert.equal(typeof entity.validateEnhanced, 'function');
    assert.equal(typeof entity.toJSON, 'function');
    assert.ok(entity.toJSON()[rootKey], `${datasetName} must retain its canonical root`);
    assertStableErrorEnvelope(entity.validateEnhanced(), factoryName);
  }
});
