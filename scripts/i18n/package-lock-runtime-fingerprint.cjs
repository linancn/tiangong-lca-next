'use strict';

const { createHash } = require('node:crypto');

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]),
  );
}

function parsePackageLock(input) {
  const parsed =
    typeof input === 'string' || Buffer.isBuffer(input)
      ? JSON.parse(input.toString())
      : JSON.parse(JSON.stringify(input));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('package-lock input must be a JSON object.');
  }
  return parsed;
}

function packageLockRuntimeProjection(input) {
  const projected = parsePackageLock(input);
  delete projected.version;
  const rootPackage = projected.packages?.[''];
  if (rootPackage && typeof rootPackage === 'object' && !Array.isArray(rootPackage)) {
    delete rootPackage.version;
  }
  return stable(projected);
}

function packageLockRuntimeDigest(input) {
  return createHash('sha256')
    .update(`${JSON.stringify(packageLockRuntimeProjection(input))}\n`)
    .digest('hex');
}

module.exports = {
  packageLockRuntimeDigest,
  packageLockRuntimeProjection,
};
