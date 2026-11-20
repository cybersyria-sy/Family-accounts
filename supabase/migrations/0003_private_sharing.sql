-- Transactions are private to the people in them (and whoever recorded them).
-- A user can give another family member read-only access to all their transactions.

create table public.shares (
  family_id uuid not null references public.families(id) on delete cascade,
  owner_user uuid not null default auth.uid() references auth.users(id) on delete cascade,
  viewer_user uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (family_id, owner_user, viewer_user),
  check (owner_user <> viewer_user)
);
alter table public.shares enable row level security;

create or replace function public.is_user_in_family(fid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.people where family_id = fid and user_id = uid);
$$;

create policy "see my shares" on public.shares for select to authenticated
  using (owner_user = auth.uid() or viewer_user = auth.uid());
create policy "share my transactions" on public.shares for insert to authenticated
  with check (owner_user = auth.uid() and public.is_member(family_id) and public.is_user_in_family(family_id, viewer_user));
create policy "stop sharing" on public.shares for delete to authenticated
  using (owner_user = auth.uid());

-- Can the current user change this entry? (they are in it, or they recorded it)
create or replace function public.can_edit_entry(fid uuid, a uuid, b uuid, creator uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_member(fid) and (
    creator = auth.uid()
    or exists (select 1 from public.people p where p.id in (a, b) and p.user_id = auth.uid())
  );
$$;

-- Can the current user see this entry? (can edit it, or someone in it shared with them)
create or replace function public.can_see_entry(fid uuid, a uuid, b uuid, creator uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_edit_entry(fid, a, b, creator)
    or (public.is_member(fid) and exists (
      select 1 from public.shares s
      where s.family_id = fid and s.viewer_user = auth.uid()
        and (s.owner_user = creator
             or s.owner_user in (select p.user_id from public.people p where p.id in (a, b) and p.user_id is not null))));
$$;

alter policy "members read entries" on public.entries
  using (public.can_see_entry(family_id, from_person, to_person, created_by));
alter policy "members read entries" on public.entries rename to "read own or shared entries";
alter policy "members edit entries" on public.entries
  using (public.can_edit_entry(family_id, from_person, to_person, created_by))
  with check (public.can_edit_entry(family_id, from_person, to_person, created_by));
alter policy "members edit entries" on public.entries rename to "edit own entries";
alter policy "members delete entries" on public.entries
  using (public.can_edit_entry(family_id, from_person, to_person, created_by));
alter policy "members delete entries" on public.entries rename to "delete own entries";

revoke execute on function public.is_user_in_family(uuid, uuid) from anon, public;
revoke execute on function public.can_edit_entry(uuid, uuid, uuid, uuid) from anon, public;
revoke execute on function public.can_see_entry(uuid, uuid, uuid, uuid) from anon, public;
grant execute on function public.is_user_in_family(uuid, uuid) to authenticated;
grant execute on function public.can_edit_entry(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.can_see_entry(uuid, uuid, uuid, uuid) to authenticated;
grant select, insert, delete on public.shares to authenticated;
