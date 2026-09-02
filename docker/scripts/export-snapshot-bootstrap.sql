-- Read-only catalog export from a disposable migration-only Database rebuild.
-- The generated roles/settings are Database-owned facts, not new Next schema.
begin transaction read only;

do $source_guard$
declare
  target record;
  populated boolean;
begin
  for target in
    select namespace.nspname, relation.relname
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where relation.relkind in ('r', 'p')
      and namespace.nspname in ('api', 'private', 'public', 'util', 'archive', 'pgmq')
      and (namespace.nspname || '.' || relation.relname) not in (
        'private.api_capability_grants',
        'private.lcia_scope_closure_config',
        'private.lcia_scope_closure_reviewed_lcia_methods',
        'private.oauth_relation_capability_grants',
        'private.portal_catalog_facet_contract_v1',
        'private.portal_catalog_projection_contract_v1',
        'private.worker_job_kinds',
        'util.app_runtime_config',
        'util.embedding_queue_policy',
        'pgmq.meta'
      )
  loop
    execute format('select exists(select from %I.%I limit 1)', target.nspname, target.relname)
      into populated;
    if populated then
      raise exception 'Snapshot source is not a migration-only empty database: %.%',
        target.nspname, target.relname;
    end if;
  end loop;
  if exists (select from auth.users) then
    raise exception 'Snapshot source must contain no Auth users';
  end if;
  if (select count(*) from pg_catalog.pg_roles
      where rolname in ('api_internal_executor', 'portal_public_executor')
        and not (rolsuper or rolcanlogin or rolbypassrls or rolcreatedb or rolcreaterole or rolreplication)) <> 2 then
    raise exception 'Expected two constrained Database executor roles';
  end if;
  if not exists (
    select from pg_catalog.pg_db_role_setting settings
    join pg_catalog.pg_roles role on role.oid = settings.setrole
    where role.rolname = 'authenticator' and settings.setdatabase = 0
      and 'pgrst.db_pre_request=api.oauth_client_pre_request' = any(settings.setconfig)
  ) then
    raise exception 'Canonical OAuth pre-request setting is missing';
  end if;
end
$source_guard$;

select format(
  'CREATE ROLE %I NOLOGIN %s NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION NOSUPERUSER;',
  rolname, case when rolinherit then 'INHERIT' else 'NOINHERIT' end
)
from pg_catalog.pg_roles
where rolname in ('api_internal_executor', 'portal_public_executor')
order by rolname;

select format('GRANT %I TO %I%s;', role.rolname, member.rolname,
  case when membership.admin_option then ' WITH ADMIN OPTION' else '' end)
from pg_catalog.pg_auth_members membership
join pg_catalog.pg_roles role on role.oid = membership.roleid
join pg_catalog.pg_roles member on member.oid = membership.member
where (role.rolname in ('api_internal_executor', 'portal_public_executor')
       and member.rolname = 'postgres')
   or (role.rolname = 'authenticated' and member.rolname = 'api_internal_executor')
order by role.rolname, member.rolname;

-- Managed schema definitions stay with Supabase, but our NOINHERIT Portal
-- executor still needs its canonical explicit USAGE grant on extensions.
select format('GRANT %s ON SCHEMA %I TO %I%s;',
  acl.privilege_type, namespace.nspname, role.rolname,
  case when acl.is_grantable then ' WITH GRANT OPTION' else '' end)
from pg_catalog.pg_namespace namespace
cross join lateral aclexplode(namespace.nspacl) acl
join pg_catalog.pg_roles role on role.oid = acl.grantee
where namespace.nspname = 'extensions'
  and role.rolname in ('api_internal_executor', 'portal_public_executor')
order by namespace.nspname, role.rolname, acl.privilege_type;

select format('ALTER ROLE authenticator SET pgrst.db_pre_request = %L;',
  substring(setting from length('pgrst.db_pre_request=') + 1))
from pg_catalog.pg_db_role_setting settings
join pg_catalog.pg_roles role on role.oid = settings.setrole
cross join lateral unnest(settings.setconfig) setting
where role.rolname = 'authenticator' and settings.setdatabase = 0
  and setting = 'pgrst.db_pre_request=api.oauth_client_pre_request';

commit;
