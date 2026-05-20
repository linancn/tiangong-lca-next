const DATA_SET_VERSION_PART_COUNT = 3;
const DEFAULT_DATA_SET_VERSION = '00.00.000';

function parseDataSetVersion(version: string | null | undefined): number[] | null {
  if (typeof version !== 'string') {
    return null;
  }

  const parts = version.split('.');
  if (parts.length !== DATA_SET_VERSION_PART_COUNT) {
    return null;
  }

  const numericParts = parts.map((part) => Number(part));
  if (numericParts.some((part) => !Number.isInteger(part) || part < 0)) {
    return null;
  }

  return numericParts;
}

export function compareDataSetVersions(
  leftVersion: string | null | undefined,
  rightVersion: string | null | undefined,
): number {
  const leftParts = parseDataSetVersion(leftVersion);
  const rightParts = parseDataSetVersion(rightVersion);

  if (!leftParts && !rightParts) {
    return String(leftVersion ?? '').localeCompare(String(rightVersion ?? ''));
  }

  if (!leftParts) {
    return -1;
  }

  if (!rightParts) {
    return 1;
  }

  for (let index = 0; index < DATA_SET_VERSION_PART_COUNT; index += 1) {
    if (leftParts[index] > rightParts[index]) {
      return 1;
    }
    if (leftParts[index] < rightParts[index]) {
      return -1;
    }
  }

  return 0;
}

export function getHighestDataSetVersion(versions: Array<string | null | undefined>): string {
  return versions.reduce<string>((highestVersion, version) => {
    if (!version) {
      return highestVersion;
    }
    if (!highestVersion || compareDataSetVersions(version, highestVersion) > 0) {
      return version;
    }
    return highestVersion;
  }, '');
}

export function getNextDataSetVersion(versions: Array<string | null | undefined>): string {
  const highestVersion = getHighestDataSetVersion(versions);
  if (!highestVersion) {
    return DEFAULT_DATA_SET_VERSION;
  }

  const parts = parseDataSetVersion(highestVersion);
  if (!parts) {
    return DEFAULT_DATA_SET_VERSION;
  }

  parts[2] += 1;

  if (parts[2] > 999) {
    parts[2] = 0;
    parts[1] += 1;
  }

  if (parts[1] > 99) {
    parts[1] = 0;
    parts[0] += 1;
  }

  return `${String(parts[0]).padStart(2, '0')}.${String(parts[1]).padStart(2, '0')}.${String(parts[2]).padStart(3, '0')}`;
}
