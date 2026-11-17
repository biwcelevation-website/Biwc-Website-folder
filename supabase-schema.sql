create table if not exists public.contact_submissions (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) <= 200),
  email text not null check (char_length(email) <= 320),
  subject text not null check (char_length(subject) <= 200),
  message text not null check (char_length(message) <= 10000),
  submitted_at timestamptz not null default now()
);

create table if not exists public.prayer_requests (
  id bigint generated always as identity primary key,
  name text check (name is null or char_length(name) <= 200),
  email text check (email is null or char_length(email) <= 320),
  prayer_request text not null check (char_length(prayer_request) <= 10000),
  privacy_consent boolean not null check (privacy_consent),
  submitted_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscriptions (
  id bigint generated always as identity primary key,
  email text not null check (char_length(email) <= 320),
  submitted_at timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.newsletter_subscriptions enable row level security;

grant usage on schema public to anon;
grant usage on schema public to authenticated;

revoke all on public.contact_submissions, public.prayer_requests, public.newsletter_subscriptions
  from anon, authenticated;

grant insert on public.contact_submissions, public.prayer_requests, public.newsletter_subscriptions
  to anon;

drop policy if exists "Allow anonymous contact submissions" on public.contact_submissions;
create policy "Allow anonymous contact submissions"
  on public.contact_submissions for insert to anon with check (true);

drop policy if exists "Allow anonymous prayer requests" on public.prayer_requests;
create policy "Allow anonymous prayer requests"
  on public.prayer_requests for insert to anon with check (true);

drop policy if exists "Allow anonymous newsletter subscriptions" on public.newsletter_subscriptions;
create policy "Allow anonymous newsletter subscriptions"
  on public.newsletter_subscriptions for insert to anon with check (true);

create table if not exists public.biwc_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.biwc_admins enable row level security;
revoke all on public.biwc_admins from anon, authenticated;

create or replace function public.is_biwc_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.biwc_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_biwc_admin() from public, anon, authenticated;
grant execute on function public.is_biwc_admin() to authenticated;

grant select on public.contact_submissions, public.prayer_requests, public.newsletter_subscriptions
  to authenticated;

drop policy if exists "Allow BIWC admins to read contact submissions" on public.contact_submissions;
create policy "Allow BIWC admins to read contact submissions"
  on public.contact_submissions for select to authenticated
  using ((select public.is_biwc_admin()));

drop policy if exists "Allow BIWC admins to read prayer requests" on public.prayer_requests;
create policy "Allow BIWC admins to read prayer requests"
  on public.prayer_requests for select to authenticated
  using ((select public.is_biwc_admin()));

drop policy if exists "Allow BIWC admins to read newsletter subscriptions" on public.newsletter_subscriptions;
create policy "Allow BIWC admins to read newsletter subscriptions"
  on public.newsletter_subscriptions for select to authenticated
  using ((select public.is_biwc_admin()));
