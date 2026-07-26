-- 0009_siaga_auth.sql
-- Siaga Padi — Sprint 01 (Auth & Roles) schema foundation.
-- Tables: siaga_profiles, penyuluh_assignments, assisted_sessions, login_lockouts.
-- Idempotent: `create table if not exists`, `create index if not exists`,
-- `create or replace function`, `drop policy if exists` + `create policy`.
--
-- Apply once per stack: psql "$SUPABASE_DB_URL" -f 0009_siaga_auth.sql
-- Column names are snake_case (mirrors 0008_agent_mgmt.sql style).

-- ---------------------------------------------------------------------------
-- siaga_profiles: application profile on top of the boilerplate "user" table.
-- user_id is NULLABLE on purpose: assisted-only farmers (account_status =
-- 'didampingi') have no credentials and therefore no "user" row.
-- ---------------------------------------------------------------------------
create table if not exists siaga_profiles (
    id               text primary key,
    user_id          text unique references "user"(id) on delete set null,
    display_name     text not null,
    role             text not null
                     check (role in ('petani', 'penyuluh', 'admin', 'domain_reviewer')),
    area_kabupaten   text,
    area_kecamatan   text,
    account_status   text not null default 'mandiri'
                     check (account_status in ('mandiri', 'didampingi', 'locked', 'inactive')),
    research_consent boolean default false,
    location_consent boolean default false,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index if not exists ix_siaga_profiles_user_id
    on siaga_profiles (user_id);
create index if not exists ix_siaga_profiles_role
    on siaga_profiles (role);
create index if not exists ix_siaga_profiles_area_kecamatan
    on siaga_profiles (area_kecamatan);

-- ---------------------------------------------------------------------------
-- penyuluh_assignments: binaan scope per penyuluh (list of kecamatan).
-- One assignment row per penyuluh user.
-- ---------------------------------------------------------------------------
create table if not exists penyuluh_assignments (
    id             text primary key,
    user_id        text not null references "user"(id) on delete cascade,
    area_kecamatan text[] not null default '{}',
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create unique index if not exists ux_penyuluh_assignments_user_id
    on penyuluh_assignments (user_id);

-- ---------------------------------------------------------------------------
-- assisted_sessions: mode pendampingan audit trail. One row per session; the
-- row itself is the audit stamp (actor + subject + consent + time).
-- ---------------------------------------------------------------------------
create table if not exists assisted_sessions (
    id                 text primary key,
    actor_user_id      text not null references "user"(id),
    subject_profile_id text not null references siaga_profiles(id),
    consent_method     text not null
                       check (consent_method in ('lisan', 'tertulis', 'in_app')),
    started_at         timestamptz not null default now(),
    ended_at           timestamptz,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

create index if not exists ix_assisted_sessions_actor
    on assisted_sessions (actor_user_id);
create index if not exists ix_assisted_sessions_subject
    on assisted_sessions (subject_profile_id);
-- Fast lookup of open (not yet ended) sessions per actor.
create index if not exists ix_assisted_sessions_open
    on assisted_sessions (actor_user_id) where ended_at is null;

-- ---------------------------------------------------------------------------
-- login_lockouts: brute-force lockout state keyed by the SUBMITTED email
-- (lowercased), whether or not it matches an account — so timing/shape never
-- leaks account existence. 5 failures in a rolling 15-minute window locks the
-- email for 15 minutes (constants live in service/siaga_auth.py).
-- ---------------------------------------------------------------------------
create table if not exists login_lockouts (
    email             text primary key,
    failed_count      int not null default 0,
    window_started_at timestamptz,
    locked_until      timestamptz,
    updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS. The backend talks to PostgREST with the service-role key, which
-- BYPASSES these policies — that is expected: the service layer enforces the
-- same scoping in code, and RLS is the defense-in-depth layer for any
-- anon/user-key PostgREST access. The boilerplate issues its own JWTs; when
-- those are presented to PostgREST the claims surface via
-- current_setting('request.jwt.claims'). The boilerplate JWT payload carries
-- `user_id` and (for Siaga tokens) `role`.
-- ---------------------------------------------------------------------------
create or replace function siaga_current_user_id() returns text
language sql stable
as $$
    select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'user_id'
$$;

create or replace function siaga_current_role() returns text
language sql stable
as $$
    select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
$$;

alter table siaga_profiles enable row level security;
alter table assisted_sessions enable row level security;

-- petani: row-owner only.
drop policy if exists siaga_profiles_owner_select on siaga_profiles;
create policy siaga_profiles_owner_select on siaga_profiles
    for select
    using (user_id = siaga_current_user_id());

-- penyuluh: may read profiles whose kecamatan is inside their binaan areas.
drop policy if exists siaga_profiles_penyuluh_select on siaga_profiles;
create policy siaga_profiles_penyuluh_select on siaga_profiles
    for select
    using (
        exists (
            select 1
            from penyuluh_assignments pa
            where pa.user_id = siaga_current_user_id()
              and siaga_profiles.area_kecamatan = any (pa.area_kecamatan)
        )
    );

-- admin / domain_reviewer: read access via the role claim (FRD §Security).
drop policy if exists siaga_profiles_admin_select on siaga_profiles;
create policy siaga_profiles_admin_select on siaga_profiles
    for select
    using (siaga_current_role() in ('admin', 'domain_reviewer'));

-- assisted_sessions: the acting penyuluh reads own sessions.
drop policy if exists assisted_sessions_actor_select on assisted_sessions;
create policy assisted_sessions_actor_select on assisted_sessions
    for select
    using (actor_user_id = siaga_current_user_id());

-- assisted_sessions: admin / domain_reviewer read for oversight.
drop policy if exists assisted_sessions_admin_select on assisted_sessions;
create policy assisted_sessions_admin_select on assisted_sessions
    for select
    using (siaga_current_role() in ('admin', 'domain_reviewer'));
