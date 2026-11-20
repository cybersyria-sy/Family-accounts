-- Family accounts: schema, security and helper functions

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);
create index people_family_idx on public.people(family_id);
create index people_user_idx on public.people(user_id);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  from_person uuid not null references public.people(id) on delete cascade, -- who gave
  to_person uuid not null references public.people(id) on delete cascade,   -- who received
  kind text not null default 'loan' check (kind in ('loan', 'repayment')),
  asset_type text not null check (asset_type in ('currency', 'gold', 'silver', 'share', 'other')),
  asset_code text not null default '',   -- USD / 21K / AAPL / custom name
  unit text not null default '',         -- g, shares, pcs ...
  amount numeric(20, 6) not null check (amount > 0),
  note text not null default '',
  entry_date date not null default current_date,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (from_person <> to_person)
);
create index entries_family_idx on public.entries(family_id, entry_date desc);

-- Is the current user a member of this family?
create or replace function public.is_member(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.people where family_id = fid and user_id = auth.uid());
$$;

-- Entries must link people of the same family
create or replace function public.check_entry_people()
returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.people
      where id in (new.from_person, new.to_person) and family_id = new.family_id) <> 2 then
    raise exception 'people must belong to the family';
  end if;
  return new;
end $$;
create trigger entries_people_check before insert or update on public.entries
  for each row execute function public.check_entry_people();

alter table public.families enable row level security;
alter table public.people enable row level security;
alter table public.entries enable row level security;

create policy "members read family" on public.families for select to authenticated using (public.is_member(id));
create policy "members update family" on public.families for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

create policy "members read people" on public.people for select to authenticated using (public.is_member(family_id));
-- New people are added without an account; accounts are linked only through join_family
create policy "members add people" on public.people for insert to authenticated
  with check (public.is_member(family_id) and user_id is null);
create policy "members rename people" on public.people for update to authenticated
  using (public.is_member(family_id)) with check (public.is_member(family_id));
create policy "members remove unlinked people" on public.people for delete to authenticated
  using (public.is_member(family_id) and user_id is null);

create policy "members read entries" on public.entries for select to authenticated using (public.is_member(family_id));
create policy "members add entries" on public.entries for insert to authenticated with check (public.is_member(family_id));
create policy "members edit entries" on public.entries for update to authenticated
  using (public.is_member(family_id)) with check (public.is_member(family_id));
create policy "members delete entries" on public.entries for delete to authenticated using (public.is_member(family_id));

-- Stop members from moving a person into another family or hijacking an account link
create or replace function public.guard_people_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.family_id <> old.family_id or new.user_id is distinct from old.user_id then
    if current_setting('app.joining', true) is distinct from 'on' then
      raise exception 'not allowed';
    end if;
  end if;
  return new;
end $$;
create trigger people_guard before update on public.people
  for each row execute function public.guard_people_update();

-- Create a family and add the caller as its first member
create or replace function public.create_family(p_family_name text, p_my_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.families(name, created_by) values (trim(p_family_name), auth.uid()) returning id into fid;
  insert into public.people(family_id, name, user_id) values (fid, trim(p_my_name), auth.uid());
  return fid;
end $$;

-- See a family's name and its people without an account, before joining
create or replace function public.preview_family(p_code text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', f.id, 'name', f.name,
    'unclaimed', coalesce((select json_agg(json_build_object('id', p.id, 'name', p.name) order by p.name)
                           from public.people p where p.family_id = f.id and p.user_id is null), '[]'::json))
  from public.families f where f.invite_code = p_code;
$$;

-- Join a family with its invite code, either as a new person or as an existing person without an account
create or replace function public.join_family(p_code text, p_my_name text, p_claim uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into fid from public.families where invite_code = p_code;
  if fid is null then raise exception 'invalid code'; end if;
  if exists (select 1 from public.people where family_id = fid and user_id = auth.uid()) then
    return fid;
  end if;
  perform set_config('app.joining', 'on', true);
  if p_claim is not null then
    update public.people set user_id = auth.uid()
      where id = p_claim and family_id = fid and user_id is null;
    if not found then raise exception 'person not available'; end if;
  else
    insert into public.people(family_id, name, user_id) values (fid, trim(p_my_name), auth.uid());
  end if;
  return fid;
end $$;

-- New invite code (old link stops working)
create or replace function public.reset_invite_code(p_family uuid)
returns text language plpgsql security definer set search_path = public as $$
declare c text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  if not public.is_member(p_family) then raise exception 'not allowed'; end if;
  update public.families set invite_code = c where id = p_family;
  return c;
end $$;

revoke execute on function public.create_family(text, text) from anon, public;
revoke execute on function public.join_family(text, text, uuid) from anon, public;
revoke execute on function public.reset_invite_code(uuid) from anon, public;
revoke execute on function public.preview_family(text) from anon, public;
grant execute on function public.create_family(text, text) to authenticated;
grant execute on function public.join_family(text, text, uuid) to authenticated;
grant execute on function public.reset_invite_code(uuid) to authenticated;
grant execute on function public.preview_family(text) to authenticated;
