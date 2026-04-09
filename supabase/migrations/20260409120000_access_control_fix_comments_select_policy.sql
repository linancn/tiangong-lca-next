drop policy if exists "Enable read open data access for reviews" on public.comments;
drop policy if exists "comments select by review participants" on public.comments;

create policy "comments select by review participants"
on public.comments
for select
to authenticated
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.reviews as r
    where r.id = comments.review_id
      and (
        public.cmd_review_is_review_admin(auth.uid())
        or (
          public.policy_is_current_user_in_roles(
            '00000000-0000-0000-0000-000000000000'::uuid,
            array['review-member']::text[]
          )
          and r.reviewer_id ? auth.uid()::text
        )
        or ((r.json -> 'user' ->> 'id')::uuid = auth.uid())
      )
  )
);
