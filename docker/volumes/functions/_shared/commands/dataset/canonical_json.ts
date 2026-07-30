const KEY_ENCODER = new TextEncoder();

function compareUtf8Keys(left: string, right: string): number {
  const leftBytes = KEY_ENCODER.encode(left);
  const rightBytes = KEY_ENCODER.encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);

  for (let index = 0; index < length; index += 1) {
    const diff = leftBytes[index] - rightBytes[index];
    if (diff !== 0) {
      return diff;
    }
  }

  return leftBytes.length - rightBytes.length;
}

function stringifyJsonValue(value: unknown): string | undefined {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifyJsonValue(item) ?? 'null').join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareUtf8Keys(left, right))
      .flatMap(([key, item]) => {
        const serialized = stringifyJsonValue(item);
        return serialized === undefined ? [] : [`${JSON.stringify(key)}:${serialized}`];
      });
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function stableJsonStringify(value: unknown): string {
  const serialized = stringifyJsonValue(value);
  if (serialized === undefined) {
    throw new TypeError('Cannot stringify an undefined JSON value');
  }
  return serialized;
}

export async function stableJsonSha256(value: unknown): Promise<string> {
  const payload = new TextEncoder().encode(stableJsonStringify(value));
  const digest = await crypto.subtle.digest('SHA-256', payload);
  return bytesToHex(new Uint8Array(digest));
}
