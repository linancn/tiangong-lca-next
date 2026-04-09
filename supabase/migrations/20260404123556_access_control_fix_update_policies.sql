drop policy if exists "update by owner and admin" on public.teams;

create policy "update by owner and admin"
on public.teams
for update
to authenticated
using (
  exists (
    select 1
    from public.roles r
    where r.user_id = auth.uid()
      and r.team_id = teams.id
      and r.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.roles r
    where r.user_id = auth.uid()
      and r.team_id = teams.id
      and r.role in ('owner', 'admin')
  )
);

drop policy if exists "update by review-admin or data owener" on public.comments;
drop policy if exists "comments update by reviewer self" on public.comments;
drop policy if exists "comments update by review-admin" on public.comments;

create policy "comments update by reviewer self"
on public.comments
for update
to authenticated
using (reviewer_id = auth.uid())
with check (reviewer_id = auth.uid());

create policy "comments update by review-admin"
on public.comments
for update
to authenticated
using (
  public.policy_is_current_user_in_roles(
    '00000000-0000-0000-0000-000000000000'::uuid,
    array['review-admin']::text[]
  )
)
with check (
  public.policy_is_current_user_in_roles(
    '00000000-0000-0000-0000-000000000000'::uuid,
    array['review-admin']::text[]
  )
);

drop policy if exists "transitional_update_owner_draft_only" on public.contacts;
create policy "transitional_update_owner_draft_only"
on public.contacts
for update
to authenticated
using (state_code = 0 and user_id = auth.uid())
with check (state_code = 0 and user_id = auth.uid());

drop policy if exists "transitional_update_owner_draft_only" on public.sources;
create policy "transitional_update_owner_draft_only"
on public.sources
for update
to authenticated
using (state_code = 0 and user_id = auth.uid())
with check (state_code = 0 and user_id = auth.uid());

drop policy if exists "transitional_update_owner_draft_only" on public.unitgroups;
create policy "transitional_update_owner_draft_only"
on public.unitgroups
for update
to authenticated
using (state_code = 0 and user_id = auth.uid())
with check (state_code = 0 and user_id = auth.uid());

drop policy if exists "transitional_update_owner_draft_only" on public.flowproperties;
create policy "transitional_update_owner_draft_only"
on public.flowproperties
for update
to authenticated
using (state_code = 0 and user_id = auth.uid())
with check (state_code = 0 and user_id = auth.uid());

drop policy if exists "transitional_update_owner_draft_only" on public.flows;
create policy "transitional_update_owner_draft_only"
on public.flows
for update
to authenticated
using (state_code = 0 and user_id = auth.uid())
with check (state_code = 0 and user_id = auth.uid());

drop policy if exists "transitional_update_owner_draft_only" on public.processes;
create policy "transitional_update_owner_draft_only"
on public.processes
for update
to authenticated
using (state_code = 0 and user_id = auth.uid())
with check (state_code = 0 and user_id = auth.uid());

drop policy if exists "transitional_update_owner_draft_only" on public.lifecyclemodels;
create policy "transitional_update_owner_draft_only"
on public.lifecyclemodels
for update
to authenticated
using (state_code = 0 and user_id = auth.uid())
with check (state_code = 0 and user_id = auth.uid());

drop policy if exists "transitional_reviews_update_submitter_only" on public.reviews;
create policy "transitional_reviews_update_submitter_only"
on public.reviews
for update
to authenticated
using (
  auth.uid() is not null
  and ((json -> 'user' ->> 'id')::uuid) = auth.uid()
)
with check (
  auth.uid() is not null
  and ((json -> 'user' ->> 'id')::uuid) = auth.uid()
);

drop policy if exists "notifications_delete_recipient_only" on public.notifications;
create policy "notifications_delete_recipient_only"
on public.notifications
for delete
to authenticated
using (auth.uid() = recipient_user_id);
