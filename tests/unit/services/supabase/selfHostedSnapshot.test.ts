import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const SNAPSHOT = path.join(ROOT, 'docker/volumes/db/init/data.sql');
const SOURCE_COMMIT = 'e9888c9385356ee6df66c2910a99e29f9fa7e08c';
const EDGE_COMMIT = '3f1748588a186465b00eb9056f1d8dc3d8843e80';

describe('self-hosted Database snapshot compatibility', () => {
  const sql = fs.readFileSync(SNAPSHOT, 'utf8');

  it('pins the canonical Database source and preserves the complete application schema boundary', () => {
    const sourceHeader = sql.split('\n').slice(0, 2).join('\n');
    expect(sourceHeader).toContain(`-- Database source: ${SOURCE_COMMIT}`);
    expect(sourceHeader).toContain('-- Migration head: 20260905170004');
    for (const schema of ['api', 'private', 'util', 'archive', 'pgmq']) {
      expect(sql).toContain(`CREATE SCHEMA ${schema};`);
    }
    for (const schema of ['auth', 'storage', 'vault', 'supabase_migrations']) {
      expect(sql).not.toContain(`CREATE SCHEMA ${schema};`);
    }
    const exposed = fs.readFileSync(path.join(ROOT, 'docker/.env.example'), 'utf8');
    expect(exposed).toMatch(/^PGRST_DB_SCHEMAS=public,api,storage,graphql_public$/mu);
  });

  it('pairs bundled Hybrid visibility and type forwarding with the V2 database contract', () => {
    const functionsRoot = path.join(ROOT, 'docker/volumes/functions');
    const receipt = JSON.parse(
      fs.readFileSync(path.join(functionsRoot, '.source-revision.json'), 'utf8'),
    );
    expect(receipt.commit).toBe(EDGE_COMMIT);
    for (const kind of ['flow', 'process']) {
      const entry = fs.readFileSync(
        path.join(functionsRoot, `${kind}_hybrid_search/index.ts`),
        'utf8',
      );
      expect(entry).toContain(`versionedRpcName: 'hybrid_search_${kind}_versions_v2'`);
      expect(entry).toContain('forwardVisibilityContext: true');
      expect(entry).toContain('requireSelectedTeamContext: true');
      const signature = sql.match(
        new RegExp(`CREATE FUNCTION api\\.hybrid_search_${kind}_versions_v2\\(([^\\n]+)\\)`),
      );
      expect(signature?.[1]).toContain('state_code_filter integer');
      expect(signature?.[1]).toContain('team_id_filter uuid');
    }
    const processEntry = fs.readFileSync(
      path.join(functionsRoot, 'process_hybrid_search/index.ts'),
      'utf8',
    );
    expect(processEntry).toContain('forwardProcessTypeFilter: true');
    const processSignature = sql.match(
      /CREATE FUNCTION api\.hybrid_search_process_versions_v2\(([^\n]+)\)/u,
    );
    expect(processSignature?.[1]).toContain('type_of_data_set_filter text');
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
    const roleBootstrap = sql.split('\n').slice(0, 30).join('\n');
    expect(roleBootstrap).toContain(
      'CREATE ROLE api_internal_executor NOLOGIN INHERIT NOBYPASSRLS',
    );
    expect(roleBootstrap).toContain(
      'CREATE ROLE portal_public_executor NOLOGIN NOINHERIT NOBYPASSRLS',
    );
    expect(roleBootstrap).toContain(
      'CREATE ROLE next_public_search_executor NOLOGIN NOINHERIT NOBYPASSRLS',
    );
    expect(roleBootstrap).toContain('GRANT authenticated TO api_internal_executor;');
    expect(roleBootstrap).not.toMatch(
      /^GRANT (?:api_internal_executor|portal_public_executor|next_public_search_executor) TO postgres\b/mu,
    );
    expect(sql).toContain('GRANT USAGE ON SCHEMA extensions TO portal_public_executor;');
    expect(sql).toContain(
      "ALTER ROLE authenticator SET pgrst.db_pre_request = 'api.oauth_client_pre_request';",
    );
    expect(sql).toContain('CREATE FUNCTION api.oauth_client_pre_request()');
    expect(sql).toContain(
      'CREATE CONSTRAINT TRIGGER trg_sync_auth_users_to_private_users AFTER INSERT OR DELETE OR UPDATE ON auth.users',
    );
    expect(sql).toContain('EXECUTE FUNCTION private.sync_auth_users_to_private_users();');
    const defaultPrivileges = sql
      .split('\n')
      .filter((line) => line.startsWith('ALTER DEFAULT PRIVILEGES'))
      .join('\n');
    expect(defaultPrivileges).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON FUNCTIONS FROM PUBLIC;',
    );
    for (const kind of ['TABLES', 'SEQUENCES', 'FUNCTIONS']) {
      expect(defaultPrivileges).toContain(
        `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON ${kind} FROM PUBLIC, anon, authenticated, service_role;`,
      );
    }
  });

  it('contains only allowlisted migration bootstrap rows, never copied users or datasets', () => {
    const targets = [...sql.matchAll(/^INSERT INTO ([a-z_]+\.[a-z_0-9]+) /gmu)].map(
      (match) => match[1],
    );
    expect([...new Set(targets)].sort()).toEqual([
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
      202,
    );
    expect(targets.filter((target) => target === 'pgmq.meta')).toHaveLength(0);
    for (const queue of ['dataset_extraction_jobs', 'embedding_jobs']) {
      expect(sql).toContain(`SELECT pgmq.create('${queue}');`);
    }
    expect(sql).toContain(
      'CREATE TRIGGER dataset_derivative_rebuild_embedding_visibility_fence BEFORE UPDATE OF vt ON pgmq.q_embedding_jobs',
    );
    expect(sql).not.toMatch(/^COPY /mu);
    expect(sql).not.toMatch(/^GRANT .*\bMAINTAIN\b.* ON TABLE /mu);
  });

  it('filters pg_dump metadata without dropping api/private/archive or modifying function bodies', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'next-snapshot-filter-'));
    try {
      const input = path.join(temp, 'input.sql');
      const output = path.join(temp, 'output.sql');
      const block = (
        name: string,
        type: string,
        schema: string,
        body: string,
        owner = 'postgres',
      ) => `--\n-- Name: ${name}; Type: ${type}; Schema: ${schema}; Owner: ${owner}\n--\n${body}\n`;
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
          block(
            'DEFAULT PRIVILEGES FOR FUNCTIONS',
            'DEFAULT ACL',
            '-',
            'ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON FUNCTIONS FROM PUBLIC;',
          ),
          block(
            'DEFAULT PRIVILEGES FOR FUNCTIONS',
            'DEFAULT ACL',
            '-',
            'ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin GRANT ALL ON FUNCTIONS TO authenticated;',
            'supabase_auth_admin',
          ),
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
      expect(filtered).toContain(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON FUNCTIONS FROM PUBLIC;',
      );
      expect(filtered).not.toContain('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin');
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
