-- PTP Phase 0: identity, moderated reports, coarse/exact location separation, and audit baseline.
-- Apply with: supabase db push
-- Never edit an applied migration; add a new timestamped migration instead.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

create type public.app_role as enum ('user', 'moderator', 'admin');
create type public.report_status as enum ('pending', 'reviewed', 'published', 'rejected', 'removed', 'expired');
create type public.report_category as enum (
  'road_closure',
  'weather_environmental_hazard',
  'lighting_accessibility_issue',
  'scam_or_unsafe_business_practice',
  'public_safety_concern',
  'event_protest_or_crowd_disruption',
  'other_travel_update'
);
create type public.flag_reason as enum ('privacy', 'harassment', 'misinformation', 'inaccurate_location', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  age_confirmed_at timestamptz,
  privacy_settings jsonb not null default '{}'::jsonb,
  emergency_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null default 'user',
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id),
  primary key (user_id, role)
);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('moderator', 'admin')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80), '')
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'user');

  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create table public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category public.report_category not null,
  description text not null check (char_length(description) between 1 and 2000),
  occurred_at timestamptz not null,
  -- Coarse public location only; never store an address in this table.
  public_location extensions.geography(Point, 4326) not null,
  location_precision_meters integer not null check (location_precision_meters >= 100),
  source_url text,
  status public.report_status not null default 'pending',
  expires_at timestamptz not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > occurred_at)
);

create index safety_reports_public_location_idx
  on public.safety_reports using gist (public_location);
create index safety_reports_public_feed_idx
  on public.safety_reports (status, expires_at desc, created_at desc);

-- Exact locations are physically separate so a public report query cannot expose them.
create table public.report_private_locations (
  report_id uuid primary key references public.safety_reports(id) on delete cascade,
  exact_location extensions.geography(Point, 4326) not null,
  created_at timestamptz not null default now()
);

create table public.content_flags (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid not null references public.safety_reports(id) on delete cascade,
  reason public.flag_reason not null,
  notes text check (char_length(notes) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, report_id)
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.safety_reports(id) on delete cascade,
  moderator_id uuid not null references public.profiles(id),
  decision public.report_status not null,
  rationale text not null check (char_length(rationale) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index moderation_actions_report_idx
  on public.moderation_actions (report_id, created_at desc);

create trigger safety_reports_set_updated_at
  before update on public.safety_reports
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.safety_reports enable row level security;
alter table public.report_private_locations enable row level security;
alter table public.content_flags enable row level security;
alter table public.moderation_actions enable row level security;

create policy "profiles: user or staff can read"
  on public.profiles for select
  using (id = auth.uid() or public.is_staff());

create policy "profiles: user can update self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "reports: public reads active published reports"
  on public.safety_reports for select
  using (status = 'published' and expires_at > now());

create policy "reports: author reads own reports"
  on public.safety_reports for select
  using (author_id = auth.uid());

create policy "reports: staff reads all"
  on public.safety_reports for select
  using (public.is_staff());

create policy "reports: authenticated user submits own report"
  on public.safety_reports for insert to authenticated
  with check (author_id = auth.uid() and status = 'pending');

create policy "reports: author updates pending report"
  on public.safety_reports for update to authenticated
  using (author_id = auth.uid() and status = 'pending')
  with check (author_id = auth.uid() and status = 'pending');

create policy "reports: staff moderates"
  on public.safety_reports for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "private report locations: author or staff reads"
  on public.report_private_locations for select
  using (
    public.is_staff()
    or exists (
      select 1 from public.safety_reports
      where id = report_id and author_id = auth.uid()
    )
  );

create policy "private report locations: author inserts own"
  on public.report_private_locations for insert to authenticated
  with check (
    exists (
      select 1 from public.safety_reports
      where id = report_id and author_id = auth.uid()
    )
  );

create policy "flags: user creates own"
  on public.content_flags for insert to authenticated
  with check (reporter_id = auth.uid());

create policy "flags: user reads own or staff reads all"
  on public.content_flags for select
  using (reporter_id = auth.uid() or public.is_staff());

create policy "flags: staff updates"
  on public.content_flags for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "moderation actions: staff reads"
  on public.moderation_actions for select
  using (public.is_staff());

create policy "moderation actions: staff inserts"
  on public.moderation_actions for insert to authenticated
  with check (public.is_staff());

comment on table public.report_private_locations is
  'Exact report locations. Do not query from the client except for the submitting user; public maps use safety_reports.public_location.';
comment on table public.moderation_actions is
  'Append-only application audit history. No UPDATE or DELETE policy is intentionally provided.';
