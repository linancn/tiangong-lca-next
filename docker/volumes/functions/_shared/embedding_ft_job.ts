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

export type EmbeddingFtFunctionTarget = Readonly<{
  schema: string;
  function: string;
}>;

const ALLOWED_EMBEDDING_FT_TARGETS: Readonly<
  Record<string, Readonly<Record<string, EmbeddingFtFunctionTarget>>>
> = {
  flows: {
    flows_embedding_ft_input: {
      schema: 'api',
      function: 'flows_embedding_ft_input',
    },
    flows_derivative_rebuild_embedding_input: {
      schema: 'private',
      function: 'flows_derivative_rebuild_embedding_input',
    },
  },
  processes: {
    processes_embedding_ft_input: {
      schema: 'api',
      function: 'processes_embedding_ft_input',
    },
    processes_derivative_rebuild_embedding_input: {
      schema: 'private',
      function: 'processes_derivative_rebuild_embedding_input',
    },
  },
  lifecyclemodels: {
    lifecyclemodels_embedding_ft_input: {
      schema: 'api',
      function: 'lifecyclemodels_embedding_ft_input',
    },
  },
  contacts: {
    contacts_embedding_ft_input: {
      schema: 'public',
      function: 'contacts_embedding_ft_input',
    },
  },
  flowproperties: {
    flowproperties_embedding_ft_input: {
      schema: 'public',
      function: 'flowproperties_embedding_ft_input',
    },
  },
  sources: {
    sources_embedding_ft_input: {
      schema: 'public',
      function: 'sources_embedding_ft_input',
    },
  },
  unitgroups: {
    unitgroups_embedding_ft_input: {
      schema: 'public',
      function: 'unitgroups_embedding_ft_input',
    },
  },
};

export class EmbeddingFtJobError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'EmbeddingFtJobError';
    this.code = code;
  }
}

export function embeddingFtFunctionTarget(job: EmbeddingFtJob): EmbeddingFtFunctionTarget {
  const target = ALLOWED_EMBEDDING_FT_TARGETS[job.table]?.[job.contentFunction];
  if (job.schema !== 'public' || job.embeddingColumn !== 'embedding_ft' || !target) {
    throw new EmbeddingFtJobError(
      'UNSUPPORTED_EMBEDDING_TARGET',
      `unsupported embedding target ${job.schema}.${job.table}/${job.contentFunction}/${job.embeddingColumn}`,
    );
  }
  return target;
}

export function assertAllowedEmbeddingFtJob(job: EmbeddingFtJob): EmbeddingFtJob {
  embeddingFtFunctionTarget(job);
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
  return Object.keys(ALLOWED_EMBEDDING_FT_TARGETS).sort();
}

type PostgresSqlTag<TQuery> = {
  (strings: TemplateStringsArray, ...values: unknown[]): TQuery;
  (identifier: string): unknown;
};

export function buildEmbeddingFtContentQuery<TQuery>(
  sql: PostgresSqlTag<TQuery>,
  job: EmbeddingFtJob,
): TQuery {
  const target = embeddingFtFunctionTarget(job);

  return sql`
    select
      id,
      version,
      ${sql(target.schema)}.${sql(target.function)}(t) as content
    from
      ${sql(job.schema)}.${sql(job.table)} t
    where
      id = ${job.id} and version = ${job.version}
  `;
}
