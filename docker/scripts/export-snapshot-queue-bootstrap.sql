-- Queue tables are extension-owned and absent from pg_dump. Recreate only
-- reviewed empty queues through PGMQ, then restore the Database-owned fence.
begin transaction read only;

do $queue_guard$
begin
  if (select count(*) from pgmq.meta) <> 2
     or exists (
       select from pgmq.meta
       where queue_name not in ('dataset_extraction_jobs', 'embedding_jobs')
          or is_partitioned or is_unlogged
     ) then
    raise exception 'Expected two reviewed logged, non-partitioned queues';
  end if;
  if (select count(*)
      from pg_catalog.pg_class relation
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
      join pg_catalog.pg_roles owner on owner.oid = relation.relowner
      where namespace.nspname = 'pgmq'
        and relation.relname in ('q_dataset_extraction_jobs', 'a_dataset_extraction_jobs',
                                 'q_embedding_jobs', 'a_embedding_jobs')
        and relation.relkind = 'r' and relation.relpersistence = 'p'
        and owner.rolname = 'postgres') <> 4 then
    raise exception 'Reviewed queue storage or ownership is missing';
  end if;
  if not exists (
    select from pg_catalog.pg_trigger trigger_record
    where trigger_record.tgrelid = 'pgmq.q_embedding_jobs'::regclass
      and trigger_record.tgname = 'dataset_derivative_rebuild_embedding_visibility_fence'
      and trigger_record.tgfoid = 'util.guard_dataset_derivative_rebuild_embedding_visibility()'::regprocedure
      and not trigger_record.tgisinternal and trigger_record.tgenabled = 'O'
      and octet_length(trigger_record.tgargs) = 0
  ) then
    raise exception 'Canonical embedding visibility fence is missing';
  end if;
end
$queue_guard$;

select 'SET ROLE postgres;';
select format('SELECT pgmq.create(%L);', queue_name)
from pgmq.meta
order by queue_name;
select 'RESET ROLE;';

select pg_catalog.pg_get_triggerdef(trigger_record.oid, true) || ';'
from pg_catalog.pg_trigger trigger_record
where trigger_record.tgrelid = 'pgmq.q_embedding_jobs'::regclass
  and trigger_record.tgname = 'dataset_derivative_rebuild_embedding_visibility_fence';

commit;
