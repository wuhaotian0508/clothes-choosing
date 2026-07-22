create table public.clothes_user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role = 'admin'),
  created_at timestamptz not null default now()
);

create table public.clothes_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.clothes_wardrobe_items (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clothes_liked_outfits (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clothes_recommendation_records (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clothes_user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index clothes_profiles_email_idx on public.clothes_profiles (email);
create index clothes_profiles_last_seen_at_idx
  on public.clothes_profiles (last_seen_at desc);
create index clothes_wardrobe_items_user_id_idx
  on public.clothes_wardrobe_items (user_id);
create index clothes_liked_outfits_user_id_idx
  on public.clothes_liked_outfits (user_id);
create index clothes_recommendation_records_user_id_idx
  on public.clothes_recommendation_records (user_id);

alter table public.clothes_user_roles enable row level security;
alter table public.clothes_profiles enable row level security;
alter table public.clothes_wardrobe_items enable row level security;
alter table public.clothes_liked_outfits enable row level security;
alter table public.clothes_recommendation_records enable row level security;
alter table public.clothes_user_settings enable row level security;

revoke all on table public.clothes_user_roles from anon;
revoke all on table public.clothes_profiles from anon;
revoke all on table public.clothes_wardrobe_items from anon;
revoke all on table public.clothes_liked_outfits from anon;
revoke all on table public.clothes_recommendation_records from anon;
revoke all on table public.clothes_user_settings from anon;

grant usage on schema public to authenticated;
grant select on table public.clothes_user_roles to authenticated;
grant select, insert, update on table public.clothes_profiles to authenticated;
grant select, insert, update, delete on table public.clothes_wardrobe_items to authenticated;
grant select, insert, update, delete on table public.clothes_liked_outfits to authenticated;
grant select, insert, update, delete on table public.clothes_recommendation_records to authenticated;
grant select, insert, update, delete on table public.clothes_user_settings to authenticated;

create policy "Users can read their clothes role"
on public.clothes_user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users and admins can read clothes profiles"
on public.clothes_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.clothes_user_roles
    where clothes_user_roles.user_id = (select auth.uid())
      and clothes_user_roles.role = 'admin'
  )
);

create policy "Users can insert their clothes profile"
on public.clothes_profiles
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and email = coalesce((select auth.jwt()) ->> 'email', '')
);

create policy "Users can update their clothes profile"
on public.clothes_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and email = coalesce((select auth.jwt()) ->> 'email', '')
);

create policy "Users and admins can read wardrobe items"
on public.clothes_wardrobe_items
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.clothes_user_roles
    where clothes_user_roles.user_id = (select auth.uid())
      and clothes_user_roles.role = 'admin'
  )
);

create policy "Users can insert their wardrobe items"
on public.clothes_wardrobe_items
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their wardrobe items"
on public.clothes_wardrobe_items
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their wardrobe items"
on public.clothes_wardrobe_items
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users and admins can read liked outfits"
on public.clothes_liked_outfits
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.clothes_user_roles
    where clothes_user_roles.user_id = (select auth.uid())
      and clothes_user_roles.role = 'admin'
  )
);

create policy "Users can insert their liked outfits"
on public.clothes_liked_outfits
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their liked outfits"
on public.clothes_liked_outfits
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their liked outfits"
on public.clothes_liked_outfits
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users and admins can read recommendation records"
on public.clothes_recommendation_records
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.clothes_user_roles
    where clothes_user_roles.user_id = (select auth.uid())
      and clothes_user_roles.role = 'admin'
  )
);

create policy "Users can insert their recommendation records"
on public.clothes_recommendation_records
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their recommendation records"
on public.clothes_recommendation_records
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their recommendation records"
on public.clothes_recommendation_records
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users and admins can read user settings"
on public.clothes_user_settings
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.clothes_user_roles
    where clothes_user_roles.user_id = (select auth.uid())
      and clothes_user_roles.role = 'admin'
  )
);

create policy "Users can insert their outfit settings"
on public.clothes_user_settings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their outfit settings"
on public.clothes_user_settings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their outfit settings"
on public.clothes_user_settings
for delete
to authenticated
using ((select auth.uid()) = user_id);
