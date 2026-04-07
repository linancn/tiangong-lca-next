alter table public.flowproperties
  drop constraint if exists flowproperties_state_code_check;

alter table public.flowproperties
  add constraint flowproperties_state_code_check
  check (state_code in (0, 20, 100, 200));
