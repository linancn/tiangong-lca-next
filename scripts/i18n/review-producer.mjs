function normalizeStableId(value) {
  const normalized = typeof value === 'string' ? value.normalize('NFC').trim().toLowerCase() : '';
  return /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/u.test(normalized) ? normalized : '';
}

export function normalizeProducerActor(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!['ai-system', 'human-team'].includes(value.type)) return null;
  const id = normalizeStableId(value.id);
  const displayName =
    typeof value.displayName === 'string' ? value.displayName.normalize('NFC').trim() : '';
  if (id === '' || displayName === '') return null;
  return { type: value.type, id, displayName };
}

export function producerActorKey(value) {
  const actor = normalizeProducerActor(value);
  return actor ? `${actor.type}:${actor.id}` : '';
}
