import { supabase } from '@/services/supabase';

export const PUBLIC_ENTITY_TABLES = [
  'processes',
  'flows',
  'contacts',
  'sources',
  'unitgroups',
  'flowproperties',
  'lciamethods',
  'lifecyclemodels',
  'ilcd',
] as const;

export type PublicEntityTable = (typeof PUBLIC_ENTITY_TABLES)[number];

/**
 * Keep relation reads on the intentionally exposed public entity surface.
 * Legacy unit-test doubles predate Supabase's schema selector, so tests may
 * fall back to their mocked `from` method. Shipped runtimes fail closed.
 */
export function publicEntity(table: string) {
  if (!PUBLIC_ENTITY_TABLES.includes(table as PublicEntityTable)) {
    throw new Error(`Unsupported public entity table: ${table}`);
  }
  const schema = (supabase as any).schema;
  if (typeof schema !== 'function') {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Supabase client does not support explicit schema selection');
    }
    return (supabase as any).from(table);
  }
  const client = schema.call(supabase, 'public');
  return client.from(table);
}
