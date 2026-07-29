import { z } from 'zod';

// PostgreSQL's uuid type preserves the canonical 8-4-4-4-12 text shape but
// does not require RFC version or variant bits. Some imported ILCD identities
// intentionally use those wider UUID values, so validate the database wire
// format here instead of rejecting them with Zod's RFC-aware z.uuid().
const postgresUuidTextSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid PostgreSQL UUID text',
  );

const rawEmbeddingFtJobSchema = z.object({
  jobId: z.number().int().positive(),
  id: postgresUuidTextSchema,
  version: z.string().trim().min(1),
  schema: z.string(),
  table: z.string(),
  contentFunction: z.string(),
  embeddingColumn: z.string(),
});

export type EmbeddingFtJob = z.infer<typeof rawEmbeddingFtJobSchema>;

const ALLOWED_CONTENT_FUNCTIONS: Readonly<Record<string, ReadonlySet<string>>> = {
  flows: new Set(['flows_embedding_ft_input', 'flows_derivative_rebuild_embedding_input']),
  processes: new Set([
    'processes_embedding_ft_input',
    'processes_derivative_rebuild_embedding_input',
  ]),
  lifecyclemodels: new Set(['lifecyclemodels_embedding_ft_input']),
  contacts: new Set(['contacts_embedding_ft_input']),
  flowproperties: new Set(['flowproperties_embedding_ft_input']),
  sources: new Set(['sources_embedding_ft_input']),
  unitgroups: new Set(['unitgroups_embedding_ft_input']),
};

export class EmbeddingFtJobError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'EmbeddingFtJobError';
    this.code = code;
  }
}

export function assertAllowedEmbeddingFtJob(job: EmbeddingFtJob): EmbeddingFtJob {
  const allowedFunctions = ALLOWED_CONTENT_FUNCTIONS[job.table];
  if (
    job.schema !== 'public' ||
    job.embeddingColumn !== 'embedding_ft' ||
    !allowedFunctions?.has(job.contentFunction)
  ) {
    throw new EmbeddingFtJobError(
      'UNSUPPORTED_EMBEDDING_TARGET',
      `unsupported embedding target ${job.schema}.${job.table}/${job.contentFunction}/${job.embeddingColumn}`,
    );
  }
  return job;
}

export function parseEmbeddingFtJobs(value: unknown): EmbeddingFtJob[] {
  const parsed = z.array(rawEmbeddingFtJobSchema).safeParse(value);
  if (!parsed.success) {
    throw new EmbeddingFtJobError(
      'INVALID_EMBEDDING_JOB_BATCH',
      `invalid request body: ${parsed.error.message}`,
    );
  }
  return parsed.data.map(assertAllowedEmbeddingFtJob);
}

export function allowedEmbeddingFtTables(): string[] {
  return Object.keys(ALLOWED_CONTENT_FUNCTIONS).sort();
}
