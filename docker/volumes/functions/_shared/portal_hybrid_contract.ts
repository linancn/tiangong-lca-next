import { z } from 'zod';

const utf8Encoder = new TextEncoder();
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const VERSION_PATTERN = /^\d{2}\.\d{2}\.\d{3}$/u;
const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u;
const CANONICAL_DECIMAL_PATTERN =
  /^(?=(?:[^0-9]*[0-9]){1,38}[^0-9]*$)(?:0|-?(?:[1-9]\d*(?:\.\d*[1-9])?|0\.\d*[1-9]))$/u;
const PUBLIC_HTTPS_URI_PATTERN = /^https:\/\/[^/?#@\s]+(?:\/[^?#\s]*)?$/u;

function boundedText(options: {
  maximumCodePoints: number;
  maximumBytes: number;
  normalize?: (value: string) => string;
}): z.ZodPipe<z.ZodString, z.ZodTransform<string, string>> {
  return z
    .string()
    .transform((value) => options.normalize?.(value) ?? value.trim())
    .refine((value) => value.length > 0, 'value must not be blank')
    .refine(
      (value) => Array.from(value).length <= options.maximumCodePoints,
      'value exceeds code point limit',
    )
    .refine(
      (value) => utf8Encoder.encode(value).byteLength <= options.maximumBytes,
      'value exceeds UTF-8 byte limit',
    )
    .refine((value) => !CONTROL_CHARACTER_PATTERN.test(value), 'value contains control characters');
}

export const portalHybridQuerySchema = boundedText({
  maximumCodePoints: 512,
  maximumBytes: 2_048,
});
const filterTextSchema = boundedText({
  maximumCodePoints: 128,
  maximumBytes: 1_024,
  normalize: (value) => value.trim().toLowerCase(),
});
const yearSchema = z.number().int().min(0).max(9_999);

export const portalHybridFiltersSchema = z
  .object({
    accessLevel: z.enum(['open', 'metadata_only']).optional(),
    geography: filterTextSchema.optional(),
    classification: filterTextSchema.optional(),
    referenceYearFrom: yearSchema.optional(),
    referenceYearTo: yearSchema.optional(),
    processSubtype: filterTextSchema.optional(),
    source: filterTextSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.referenceYearFrom !== undefined &&
      value.referenceYearTo !== undefined &&
      value.referenceYearFrom > value.referenceYearTo
    ) {
      context.addIssue({
        code: 'custom',
        message: 'referenceYearFrom must not exceed referenceYearTo',
        path: ['referenceYearFrom'],
      });
    }
    if (utf8Encoder.encode(JSON.stringify(value)).byteLength > 4_096) {
      context.addIssue({
        code: 'custom',
        message: 'serialized filters exceed UTF-8 byte limit',
      });
    }
  });

export const portalHybridSearchRequestV1Schema = z
  .object({
    schemaVersion: z.literal('portal.hybrid-search-request.v1'),
    kind: z.enum(['process', 'flow']),
    query: portalHybridQuerySchema,
    filters: portalHybridFiltersSchema,
    limit: z.number().int().min(1).max(20),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.kind === 'flow' && value.filters.processSubtype !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'processSubtype is not valid for Flow search',
        path: ['filters', 'processSubtype'],
      });
    }
  });

const cursorSchema = z
  .string()
  .min(1)
  .max(4_096)
  .regex(/^[A-Za-z0-9_-]+$/u);
export const portalHybridSearchRequestV2Schema = z
  .object({
    schemaVersion: z.literal('portal.hybrid-search-request.v2'),
    kind: z.enum(['process', 'flow']),
    query: portalHybridQuerySchema,
    filters: portalHybridFiltersSchema,
    limit: z.number().int().min(1).max(20),
    cursor: cursorSchema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.kind === 'flow' && value.filters.processSubtype !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'processSubtype is not valid for Flow search',
        path: ['filters', 'processSubtype'],
      });
    }
  });
export const portalHybridSearchRequestSchema = z.union([
  portalHybridSearchRequestV1Schema,
  portalHybridSearchRequestV2Schema,
]);
export type PortalHybridSearchRequest = z.infer<typeof portalHybridSearchRequestSchema>;

const uuidSchema = z.string().regex(UUID_PATTERN);
const versionSchema = z.string().regex(VERSION_PATTERN);
const lowerHexSha256Schema = z.string().regex(/^[0-9a-f]{64}$/u);
const localizedTextSchema = z.array(
  z
    .object({
      language: z.string().min(2).max(35).regex(LANGUAGE_PATTERN),
      value: z.string(),
    })
    .strict(),
);
const publicDatasetKeySchema = z
  .object({
    kind: z.enum(['process', 'flow']),
    id: uuidSchema,
    version: versionSchema,
  })
  .strict();
const publicCapabilitiesSchema = z
  .object({
    metadataVisible: z.literal(true),
    exchangesVisible: z.boolean(),
    lciaVisible: z.boolean(),
    publicArtifactVisible: z.boolean(),
    citationVisible: z.literal(true),
    policyVersion: z.string().min(1),
    reasonCodes: z
      .array(z.string().min(1))
      .refine((values) => new Set(values).size === values.length, 'reasonCodes must be unique'),
  })
  .strict();
const geographySchema = z
  .object({
    code: z.string().min(1).nullable(),
    label: localizedTextSchema,
    precision: z.enum(['country', 'province', 'city', 'other', 'unknown']),
  })
  .strict();
const nullableNonEmptyStringSchema = z.string().min(1).nullable();
const publicCardReferenceSchema = z
  .object({
    kind: z.enum(['reference_product', 'reference_flow_property']),
    name: localizedTextSchema,
  })
  .strict();
const completeFunctionalUnitSchema = z
  .object({
    amount: z.string().regex(CANONICAL_DECIMAL_PATTERN),
    unit: z.string().min(1),
    description: localizedTextSchema,
  })
  .strict();
const publicSourceSchema = z
  .object({
    databaseId: nullableNonEmptyStringSchema,
    databaseVersion: nullableNonEmptyStringSchema,
    sourceRecordId: nullableNonEmptyStringSchema,
    providerName: localizedTextSchema,
    licenseId: nullableNonEmptyStringSchema,
    licenseUrl: z.string().url().regex(PUBLIC_HTTPS_URI_PATTERN).nullable(),
  })
  .strict();
const publicCardQualitySchema = z
  .object({
    reviewStatus: nullableNonEmptyStringSchema,
  })
  .strict();
const publicCardContextSchema = z
  .object({
    reference: publicCardReferenceSchema,
    functionalUnit: completeFunctionalUnitSchema.nullable(),
    technology: localizedTextSchema,
    source: publicSourceSchema,
    quality: publicCardQualitySchema,
  })
  .strict();

const hybridReasonCodeSchema = z.enum(['lexical_public_projection', 'semantic_public_projection']);
const hybridEvidenceSchema = z
  .object({
    lexicalRank: z.number().int().min(1).nullable(),
    semanticRank: z.number().int().min(1).nullable(),
    semanticDistance: z
      .string()
      .regex(CANONICAL_DECIMAL_PATTERN)
      .refine((value) => !value.startsWith('-'), 'semantic distance must be non-negative')
      .nullable(),
  })
  .strict()
  .refine(
    (value) => (value.semanticRank === null) === (value.semanticDistance === null),
    'semantic rank and distance must be present together',
  );

export const portalPublicHybridMatchSchema = z
  .object({
    kind: z.literal('hybrid'),
    algorithmVersion: z.literal('portal-hybrid-rank-v1'),
    score: z.number().min(0).max(1),
    reasonCodes: z
      .array(hybridReasonCodeSchema)
      .min(1)
      .max(2)
      .refine((values) => new Set(values).size === values.length, 'reasonCodes must be unique'),
    evidence: hybridEvidenceSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const lexicalReason = value.reasonCodes.includes('lexical_public_projection');
    const semanticReason = value.reasonCodes.includes('semantic_public_projection');
    if (lexicalReason !== (value.evidence.lexicalRank !== null)) {
      context.addIssue({
        code: 'custom',
        message: 'lexical evidence and reason code must correspond',
        path: ['reasonCodes'],
      });
    }
    if (
      semanticReason !==
      (value.evidence.semanticRank !== null && value.evidence.semanticDistance !== null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'semantic evidence and reason code must correspond',
        path: ['reasonCodes'],
      });
    }
  });

export const portalPublicHybridCandidateSchema = z
  .object({
    key: publicDatasetKeySchema,
    accessLevel: z.enum(['open', 'metadata_only']),
    capabilities: publicCapabilitiesSchema,
    names: localizedTextSchema,
    summary: localizedTextSchema,
    geography: geographySchema,
    referenceYear: yearSchema.nullable(),
    context: publicCardContextSchema,
    modifiedAt: z.string().datetime({ offset: true }),
    match: portalPublicHybridMatchSchema,
  })
  .strict();

export const portalPublicHybridCandidatePageV1Schema = z
  .object({
    schemaVersion: z.literal('portal.public-hybrid-candidate-page.v1'),
    kind: z.enum(['process', 'flow']),
    queryFingerprint: lowerHexSha256Schema,
    items: z.array(portalPublicHybridCandidateSchema).max(20),
  })
  .strict()
  .superRefine((value, context) => {
    const candidateKeys = value.items.map(
      (item) => `${item.key.kind}:${item.key.id}@${item.key.version}`,
    );
    if (new Set(candidateKeys).size !== candidateKeys.length) {
      context.addIssue({
        code: 'custom',
        message: 'candidate identities must be unique',
        path: ['items'],
      });
    }
    value.items.forEach((item, index) => {
      if (item.key.kind !== value.kind) {
        context.addIssue({
          code: 'custom',
          message: 'candidate kind must match page kind',
          path: ['items', index, 'key', 'kind'],
        });
      }
    });
  });

const interpretationTextSchema = portalHybridQuerySchema;
export const portalHybridInterpretationSchema = z
  .object({
    source: z.literal('model_generated'),
    advisory: z.literal(true),
    semanticQuery: interpretationTextSchema,
    terms: z
      .array(
        z
          .object({
            language: z.enum(['en', 'zh-CN']),
            value: interpretationTextSchema,
          })
          .strict(),
      )
      .min(1)
      .max(12)
      .refine(
        (values) =>
          new Set(values.map((value) => `${value.language}\u0000${value.value}`)).size ===
          values.length,
        'interpretation terms must be unique',
      ),
  })
  .strict();

export type PortalHybridInterpretation = z.infer<typeof portalHybridInterpretationSchema>;

export const portalHybridSearchPageV1Schema = z
  .object({
    schemaVersion: z.literal('portal.hybrid-search-page.v1'),
    kind: z.enum(['process', 'flow']),
    queryFingerprint: lowerHexSha256Schema,
    interpretation: portalHybridInterpretationSchema,
    items: z.array(portalPublicHybridCandidateSchema).max(20),
  })
  .strict()
  .superRefine((value, context) => {
    const candidateKeys = value.items.map(
      (item) => `${item.key.kind}:${item.key.id}@${item.key.version}`,
    );
    if (new Set(candidateKeys).size !== candidateKeys.length) {
      context.addIssue({
        code: 'custom',
        message: 'candidate identities must be unique',
        path: ['items'],
      });
    }
    value.items.forEach((item, index) => {
      if (item.key.kind !== value.kind) {
        context.addIssue({
          code: 'custom',
          message: 'candidate kind must match page kind',
          path: ['items', index, 'key', 'kind'],
        });
      }
    });
  });

export const portalPublicHybridMatchV2Schema = z
  .object({
    ...portalPublicHybridMatchSchema.shape,
    algorithmVersion: z.literal('portal-hybrid-rank-v2'),
  })
  .strict()
  .superRefine((value, context) => {
    const lexical = value.evidence.lexicalRank;
    const semantic = value.evidence.semanticRank;
    if (
      value.reasonCodes.includes('lexical_public_projection') !== (lexical !== null) ||
      value.reasonCodes.includes('semantic_public_projection') !== (semantic !== null) ||
      (lexical !== null && lexical > 200) ||
      (semantic !== null && semantic > 200)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'bounded evidence must match actual branches',
      });
    }
  });

export const portalPublicHybridCandidateV2Schema = z
  .object({
    ...portalPublicHybridCandidateSchema.shape,
    match: portalPublicHybridMatchV2Schema,
  })
  .strict();

const versionGroupSchema = z
  .object({
    key: publicDatasetKeySchema,
    matches: z
      .array(
        z
          .object({
            key: publicDatasetKeySchema,
            match: portalPublicHybridMatchV2Schema,
          })
          .strict(),
      )
      .min(1)
      .max(400),
  })
  .strict();
const versionPageShape = {
  schemaVersion: z.literal('portal.public-hybrid-candidate-page.v2'),
  kind: z.enum(['process', 'flow']),
  queryFingerprint: lowerHexSha256Schema,
  items: z.array(portalPublicHybridCandidateV2Schema).max(20),
  candidateCount: z.number().int().min(0).max(400),
  datasetCount: z.number().int().min(0).max(400),
  versionGroups: z.array(versionGroupSchema).max(20),
  nextCursor: cursorSchema.nullable(),
};
const versionPageBaseSchema = z.object(versionPageShape).strict();
type VersionPageShape = Omit<z.infer<typeof versionPageBaseSchema>, 'schemaVersion'>;

function validateVersionGroups(value: VersionPageShape, context: z.RefinementCtx): void {
  const keyOf = (key: z.infer<typeof publicDatasetKeySchema>) =>
    key.kind + ':' + key.id + '@' + key.version;
  const fail = (message: string) => context.addIssue({ code: 'custom', message });
  if (
    value.items.length !== value.versionGroups.length ||
    value.datasetCount > value.candidateCount ||
    value.items.length > value.datasetCount ||
    (value.candidateCount === 0 && (value.datasetCount !== 0 || value.nextCursor !== null))
  )
    fail('version-group envelope counts must agree');

  const groups = new Set<string>();
  const keys = new Set<string>();
  let covered = 0;
  value.versionGroups.forEach((group, index) => {
    const item = value.items[index];
    const first = group.matches[0];
    if (
      !item ||
      !first ||
      item.key.kind !== value.kind ||
      keyOf(group.key) !== keyOf(item.key) ||
      keyOf(first.key) !== keyOf(item.key) ||
      JSON.stringify(first.match) !== JSON.stringify(item.match) ||
      groups.has(group.key.id)
    ) {
      fail('representative must be the unique best matching version of its group');
    }
    groups.add(group.key.id);
    const previousItem = value.items[index - 1];
    if (
      item &&
      previousItem &&
      (item.match.score > previousItem.match.score ||
        (item.match.score === previousItem.match.score &&
          (item.key.id < previousItem.key.id ||
            (item.key.id === previousItem.key.id && item.key.version > previousItem.key.version))))
    ) {
      fail('representatives must be ordered by score descending, id ascending, version descending');
    }
    let previous: (typeof group.matches)[number] | undefined;
    for (const match of group.matches) {
      const key = keyOf(match.key);
      if (
        match.key.kind !== value.kind ||
        match.key.id !== group.key.id ||
        keys.has(key) ||
        (previous &&
          (match.match.score > previous.match.score ||
            (match.match.score === previous.match.score &&
              match.key.version > previous.key.version)))
      ) {
        fail('group matches must retain unique, ordered exact-version evidence');
      }
      keys.add(key);
      covered += 1;
      previous = match;
    }
  });
  if (
    covered > value.candidateCount ||
    (value.datasetCount === value.items.length && covered !== value.candidateCount)
  )
    fail('version coverage must agree with the bounded candidate union');
}

export const portalPublicHybridCandidatePageV2Schema =
  versionPageBaseSchema.superRefine(validateVersionGroups);
export const portalPublicHybridCandidatePageSchema = z.union([
  portalPublicHybridCandidatePageV1Schema,
  portalPublicHybridCandidatePageV2Schema,
]);
export type PortalPublicHybridCandidatePage = z.infer<typeof portalPublicHybridCandidatePageSchema>;

export const portalHybridSearchPageV2Schema = z
  .object({
    ...versionPageShape,
    schemaVersion: z.literal('portal.hybrid-search-page.v2'),
    interpretation: portalHybridInterpretationSchema,
  })
  .strict()
  .superRefine(validateVersionGroups);
export const portalHybridSearchPageSchema = z.union([
  portalHybridSearchPageV1Schema,
  portalHybridSearchPageV2Schema,
]);
export type PortalHybridSearchPage = z.infer<typeof portalHybridSearchPageSchema>;

export const portalHybridModelCacheSchema = z
  .object({
    schemaVersion: z.literal('portal.hybrid-model-cache.v2'),
    interpretation: portalHybridInterpretationSchema,
    queryTerms: z
      .array(interpretationTextSchema)
      .min(1)
      .max(12)
      .refine((values) => new Set(values).size === values.length, 'query terms must be unique'),
    queryEmbedding: z.array(z.number().finite()).length(1_024),
  })
  .strict();

export type PortalHybridModelCache = z.infer<typeof portalHybridModelCacheSchema>;

export { CANONICAL_DECIMAL_PATTERN };
