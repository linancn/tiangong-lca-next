-- Reconcile intentional remote-only schema drift on main.
-- These columns and HNSW indexes were already removed manually on remote main.

drop index if exists public.flows_embedding_hnsw_idx;
alter table public.flows drop column if exists embedding;

drop index if exists public.processes_embedding_hnsw_idx;
alter table public.processes drop column if exists embedding;

drop index if exists public.lifecyclemodels_embedding_hnsw_idx;
alter table public.lifecyclemodels drop column if exists embedding;
