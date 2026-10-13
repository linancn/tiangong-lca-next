/** Keep a supplied singleton/array shape while applying each field's existing conversion. */
export function mapTidasRepeated(value: any, convert: (item: any, index: number) => any): any {
  return Array.isArray(value) ? value.map(convert) : convert(value, 0);
}

/** Reference identities are data; the separate review policy still requires one selection. */
export function hasTidasReference(value: unknown, id: unknown): boolean {
  return (Array.isArray(value) ? value : [value]).some((reference) => reference === id);
}

/** Adapt legacy singleton values to Ant Design multiple-select values without changing empty state. */
export function toTidasMultiSelectValue(value: any): any {
  return value === null || value === undefined || Array.isArray(value) ? value : [value];
}

/** Legacy detail renderers consume the first system; the complete systems are rendered separately. */
export function firstTidasRepeated(value: any): any {
  return Array.isArray(value) ? value[0] : value;
}
