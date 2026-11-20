-- A share can also allow editing (adding/changing/deleting the owner's transactions)
alter table public.shares add column can_edit boolean not null default false;
grant update (can_edit) on public.shares to authenticated;
create policy "change my shares" on public.shares for update to authenticated
  using (owner_user = auth.uid()) with check (owner_user = auth.uid());

create or replace function public.can_edit_entry(fid uuid, a uuid, b uuid, creator uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_member(fid) and (
    creator = auth.uid()
    or exists (select 1 from public.people p where p.id in (a, b) and p.user_id = auth.uid())
    or exists (
      select 1 from public.shares s
      where s.family_id = fid and s.viewer_user = auth.uid() and s.can_edit
        and (s.owner_user = creator
             or s.owner_user in (select p.user_id from public.people p where p.id in (a, b) and p.user_id is not null)))
  );
$$;
