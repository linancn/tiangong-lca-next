import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const SNAPSHOT = path.join(ROOT, 'docker/volumes/db/init/data.sql');
const SOURCE_COMMIT = '470e66157fc0b363c3360ba952f75280cfa1ff73';

describe('self-hosted Database snapshot compatibility', () => {
  const sql = fs.readFileSync(SNAPSHOT, 'utf8');

  it('pins the canonical Database source and preserves the complete application schema boundary', () => {
    expect(sql).toContain(`-- Database source: ${SOURCE_COMMIT}`);
    expect(sql).toContain('-- Migration head: 20260902151000');
    for (const schema of ['api', 'private', 'util', 'archive', 'pgmq']) {
      expect(sql).toContain(`CREATE SCHEMA ${schema};`);
    }
    for (const schema of ['auth', 'storage', 'vault', 'supabase_migrations']) {
      expect(sql).not.toContain(`CREATE SCHEMA ${schema};`);
    }
    const exposed = fs.readFileSync(path.join(ROOT, 'docker/.env.example'), 'utf8');
    expect(exposed).toMatch(/^PGRST_DB_SCHEMAS=public,api,storage,graphql_public$/mu);
  });

  it('matches the generated Edge dataset command arguments and exact-version Hybrid APIs', () => {
    for (const name of [
      'cmd_dataset_create',
      'cmd_dataset_create_version',
      'cmd_dataset_save_draft',
    ]) {
      const signature = sql.match(new RegExp(`CREATE FUNCTION api\\.${name}\\(([^\\n]+)\\)`));
      expect(signature?.[1]).toContain('p_model_version text');
    }
    for (const kind of ['flow', 'process']) {
      expect(sql).toContain(`CREATE FUNCTION api.hybrid_search_${kind}_versions_v1(`);
    }
    expect(sql).toContain('CREATE FUNCTION api.portal_hybrid_search_v2(');
  });

  it('restores constrained executors and the Database-owned OAuth pre-request boundary', () => {
    expect(sql).toContain('CREATE ROLE api_internal_executor NOLOGIN INHERIT NOBYPASSRLS');
    expect(sql).toContain('CREATE ROLE portal_public_executor NOLOGIN NOINHERIT NOBYPASSRLS');
    expect(sql).toContain('GRANT authenticated TO api_internal_executor;');
    expect(sql).toContain(
      "ALTER ROLE authenticator SET pgrst.db_pre_request = 'api.oauth_client_pre_request';",
    );
    expect(sql).toContain('CREATE FUNCTION api.oauth_client_pre_request()');
  });

  it('contains only allowlisted migration bootstrap rows, never copied users or datasets', () => {
    const targets = [...sql.matchAll(/^INSERT INTO ([a-z_]+\.[a-z_0-9]+) /gmu)].map(
      (match) => match[1],
    );
    expect([...new Set(targets)].sort()).toEqual([
      'pgmq.meta',
      'private.api_capability_grants',
      'private.lcia_scope_closure_config',
      'private.lcia_scope_closure_reviewed_lcia_methods',
      'private.oauth_relation_capability_grants',
      'private.portal_catalog_facet_contract_v1',
      'private.portal_catalog_projection_contract_v1',
      'private.worker_job_kinds',
      'util.app_runtime_config',
      'util.embedding_queue_policy',
    ]);
    expect(targets.filter((target) => target === 'private.api_capability_grants')).toHaveLength(
      200,
    );
    expect(targets.filter((target) => target === 'pgmq.meta')).toHaveLength(2);
    expect(sql).not.toMatch(/^COPY /mu);
    expect(sql).not.toMatch(/^GRANT .*\bMAINTAIN\b.* ON TABLE /mu);
  });

  it('filters pg_dump metadata without dropping api/private/archive or modifying function bodies', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'next-snapshot-filter-'));
    try {
      const input = path.join(temp, 'input.sql');
      const output = path.join(temp, 'output.sql');
      const block = (name: string, type: string, schema: string, body: string) =>
        `--\n-- Name: ${name}; Type: ${type}; Schema: ${schema}; Owner: postgres\n--\n${body}\n`;
      fs.writeFileSync(
        input,
        [
          '\\restrict example\nSET transaction_timeout = 0;\n',
          ...['api', 'private', 'archive'].map((schema) =>
            block(schema, 'SCHEMA', '-', `CREATE SCHEMA ${schema};`),
          ),
          block(
            'sample()',
            'FUNCTION',
            'private',
            'CREATE FUNCTION private.sample() AS $$\nGRANT MAINTAIN ON TABLE fixture TO fixture;\n$$ LANGUAGE sql;',
          ),
          block(
            'TABLE sample',
            'ACL',
            'private',
            'GRANT SELECT,MAINTAIN,REFERENCES ON TABLE private.sample TO service_role;\nGRANT MAINTAIN ON TABLE private.sample TO anon;',
          ),
          block('SCHEMA api', 'ACL', '-', 'GRANT USAGE ON SCHEMA api TO authenticated;'),
          block('users', 'TABLE', 'auth', 'CREATE TABLE auth.users(secret text);'),
        ].join(''),
      );
      const result = spawnSync(
        'bash',
        [
          path.join(ROOT, 'docker/scripts/filter-data-sql.sh'),
          '--input',
          input,
          '--output',
          output,
        ],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(0);
      const filtered = fs.readFileSync(output, 'utf8');
      for (const schema of ['api', 'private', 'archive'])
        expect(filtered).toContain(`CREATE SCHEMA ${schema};`);
      expect(filtered).toContain(
        'GRANT SELECT,REFERENCES ON TABLE private.sample TO service_role;',
      );
      expect(filtered).toContain('GRANT MAINTAIN ON TABLE fixture TO fixture;');
      expect(filtered).not.toContain('GRANT MAINTAIN ON TABLE private.sample TO anon;');
      expect(filtered).toContain('GRANT USAGE ON SCHEMA api TO authenticated;');
      expect(filtered).not.toContain('CREATE TABLE auth.users');
      expect(filtered).not.toContain('transaction_timeout');
      expect(filtered).not.toContain('\\restrict');
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });

  it('refuses a remote or malformed source before connection and does not disclose its URL', () => {
    for (const url of [
      'postgresql://postgres:private-fixture-value@remote.invalid/postgres',
      'bad-private-fixture-value',
    ]) {
      const result = spawnSync(
        'bash',
        [path.join(ROOT, 'docker/scripts/sync-migrations-to-data-sql.sh'), '--check'],
        {
          encoding: 'utf8',
          env: { ...process.env, REMOTE_DB_URL: url },
        },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('isolated local migration-only Database rebuild');
      expect(result.stderr).not.toContain('private-fixture-value');
      expect(result.stdout).not.toContain('[sync-db] pull');
    }
  });
});
