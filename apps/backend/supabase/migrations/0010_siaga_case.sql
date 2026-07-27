-- 0010_siaga_case.sql
-- Siaga Padi — Sprint 02 (Case Management) schema foundation.
-- Tables: fields (lahan), cases, case_events, data_deletion_requests.
-- Idempotent: `create table if not exists`, `create index if not exists`,
-- `create or replace function`, `drop policy/trigger if exists` + `create`.
--
-- Apply once per stack (after 0009): psql "$SUPABASE_DB_URL" -f 0010_siaga_case.sql
--
-- Status values are the CANONICAL FRD §6.5 states (English, uppercase).
-- The petani-facing Indonesian stages (draf/difoto/diproses/…) are a DISPLAY
-- mapping applied in the DTO layer (models/siaga_case.py DISPLAY_STAGE_MAP),
-- never stored. Rationale: Sprint 03/05/06 need the full state machine
-- (QUALITY_REJECTED, NEEDS_CONTEXT, …) and the brief declares the FRD
-- authoritative on conflict.
--
-- location_mode / growth_stage follow FRD FR-002 §9.2.8 enums.

-- ---------------------------------------------------------------------------
-- fields (lahan): free-named plots owned by a siaga profile.
-- coords is opt-in ONLY (BR-002-02) — jsonb {"lat": .., "lng": ..} or null.
-- ---------------------------------------------------------------------------
create table if not exists fields (
    id               text primary key,
    owner_profile_id text not null references siaga_profiles(id),
    name             text not null check (char_length(name) between 2 and 100),
    area_kabupaten   text,
    area_kecamatan   text,
    coords           jsonb,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index if not exists ix_fields_owner
    on fields (owner_profile_id);
create index if not exists ix_fields_area_kecamatan
    on fields (area_kecamatan);

-- ---------------------------------------------------------------------------
-- cases: one observation on one lahan at one time (BR-002-04).
-- field_id is NULLABLE: "belum tahu" cases carry only the administrative
-- area (AF-02). Area columns are denormalized onto the case so RLS scoping
-- and manual_area/unknown cases work without a field row.
-- idempotency_key is UNIQUE: replaying the same key returns the existing
-- case (ERR-003), never a duplicate.
-- ---------------------------------------------------------------------------
create table if not exists cases (
    id                    text primary key,
    case_code             text not null unique,
    owner_profile_id      text not null references siaga_profiles(id),
    created_by_profile_id text not null references siaga_profiles(id),
    assisted_session_id   text references assisted_sessions(id),
    field_id              text references fields(id),
    growth_stage          text not null default 'UNKNOWN'
                          check (growth_stage in
                                 ('SEEDLING', 'VEGETATIVE', 'REPRODUCTIVE',
                                  'RIPENING', 'UNKNOWN')),
    location_mode         text not null default 'AREA_ONLY'
                          check (location_mode in ('EXACT_GPS', 'AREA_ONLY', 'NONE')),
    coords                jsonb,
    area_kabupaten        text,
    area_kecamatan        text,
    status                text not null default 'DRAFT'
                          check (status in
                                 ('DRAFT', 'CAPTURED', 'QUALITY_REJECTED', 'QUEUED',
                                  'PROCESSING_CV', 'NEEDS_CONTEXT',
                                  'GENERATING_RECOMMENDATION', 'AUTO_TRIAGE_READY',
                                  'NEEDS_REVIEW', 'REVISION_REQUIRED', 'REVIEWED',
                                  'CLOSED', 'FAILED', 'ARCHIVED', 'CANCELLED')),
    notes                 text check (notes is null or char_length(notes) <= 500),
    observed_at           timestamptz not null,
    idempotency_key       text not null unique,
    config_version_id     text,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

create index if not exists ix_cases_owner
    on cases (owner_profile_id);
create index if not exists ix_cases_status
    on cases (status);
create index if not exists ix_cases_field
    on cases (field_id);
create index if not exists ix_cases_area_kecamatan
    on cases (area_kecamatan);
create index if not exists ix_cases_created_at
    on cases (created_at desc);

-- Human-facing case code 'KS-YYYY-NNNNNN' (sequence does not reset per year —
-- acceptable for MVP scale; the year segment is informational).
create sequence if not exists case_code_seq;

create or replace function next_case_code() returns text
language sql volatile
as $$
    select 'KS-' || to_char(now(), 'YYYY') || '-'
                 || lpad(nextval('case_code_seq')::text, 6, '0')
$$;

-- ---------------------------------------------------------------------------
-- DB-level state-machine guard (FRD §6.5–6.6). Mirrors the single-source
-- Python table in models/siaga_case.py — keep the two in sync on any change.
-- STR-010: any ACTIVE state may go to CANCELLED (CLOSED/ARCHIVED/CANCELLED
-- are not active). No other skipping is legal.
-- ---------------------------------------------------------------------------
create or replace function enforce_case_transition() returns trigger
language plpgsql
as $$
declare
    legal boolean := false;
begin
    if new.status = old.status then
        return new;
    end if;

    legal := case old.status
        when 'DRAFT'                     then new.status in ('CAPTURED', 'CANCELLED')
        when 'CAPTURED'                  then new.status in ('QUALITY_REJECTED', 'QUEUED', 'CANCELLED')
        when 'QUALITY_REJECTED'          then new.status in ('CAPTURED', 'CANCELLED')
        when 'QUEUED'                    then new.status in ('PROCESSING_CV', 'FAILED', 'CANCELLED')
        when 'PROCESSING_CV'             then new.status in ('NEEDS_CONTEXT', 'FAILED', 'CANCELLED')
        when 'NEEDS_CONTEXT'             then new.status in ('GENERATING_RECOMMENDATION', 'CANCELLED')
        when 'GENERATING_RECOMMENDATION' then new.status in ('AUTO_TRIAGE_READY', 'NEEDS_REVIEW', 'FAILED', 'CANCELLED')
        when 'AUTO_TRIAGE_READY'         then new.status in ('NEEDS_REVIEW', 'REVIEWED', 'CLOSED', 'CANCELLED')
        when 'NEEDS_REVIEW'              then new.status in ('REVIEWED', 'REVISION_REQUIRED', 'CANCELLED')
        when 'REVISION_REQUIRED'         then new.status in ('CAPTURED', 'NEEDS_CONTEXT', 'CANCELLED')
        when 'REVIEWED'                  then new.status in ('CLOSED', 'CANCELLED')
        when 'CLOSED'                    then new.status in ('ARCHIVED')
        when 'FAILED'                    then new.status in ('QUEUED', 'CANCELLED')
        else false  -- ARCHIVED and CANCELLED are terminal
    end;

    if not legal then
        raise exception 'illegal case status transition: % -> %', old.status, new.status
            using errcode = '23514';
    end if;

    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists trg_cases_transition on cases;
create trigger trg_cases_transition
    before update of status on cases
    for each row execute function enforce_case_transition();

-- ---------------------------------------------------------------------------
-- case_events: append-only audit of every status transition — the linimasa
-- source. from_status NULL marks the creation event (→ DRAFT).
-- Append-only is enforced for EVERY role (service key included) by trigger.
-- ---------------------------------------------------------------------------
create table if not exists case_events (
    id                text primary key,
    case_id           text not null references cases(id),
    from_status       text,
    to_status         text not null,
    actor_profile_id  text references siaga_profiles(id),
    note              text,
    created_at        timestamptz not null default now()
);

create index if not exists ix_case_events_case
    on case_events (case_id, created_at);

create or replace function forbid_case_event_mutation() returns trigger
language plpgsql
as $$
begin
    raise exception 'case_events is append-only'
        using errcode = '55000';
end;
$$;

drop trigger if exists trg_case_events_append_only on case_events;
create trigger trg_case_events_append_only
    before update or delete on case_events
    for each row execute function forbid_case_event_mutation();

-- ---------------------------------------------------------------------------
-- data_deletion_requests: BR-002-05 — recorded, processed per retention
-- policy (never an instant wipe).
-- ---------------------------------------------------------------------------
create table if not exists data_deletion_requests (
    id           text primary key,
    profile_id   text not null references siaga_profiles(id),
    reason       text check (reason is null or char_length(reason) <= 500),
    status       text not null default 'tercatat'
                 check (status in ('tercatat', 'diproses', 'selesai', 'ditolak')),
    requested_at timestamptz not null default now(),
    processed_at timestamptz
);

create index if not exists ix_deletion_requests_profile
    on data_deletion_requests (profile_id);

-- ---------------------------------------------------------------------------
-- RLS. Same model as 0009: the backend's service key bypasses these — the
-- service layer enforces identical scoping in code; RLS is defense in depth
-- for any anon/user-key PostgREST access. Helpers siaga_current_user_id() /
-- siaga_current_role() come from 0009.
-- ---------------------------------------------------------------------------
alter table fields enable row level security;
alter table cases enable row level security;
alter table case_events enable row level security;
alter table data_deletion_requests enable row level security;

-- fields: owner reads own lahan.
drop policy if exists fields_owner_select on fields;
create policy fields_owner_select on fields
    for select
    using (
        exists (
            select 1 from siaga_profiles p
            where p.id = fields.owner_profile_id
              and p.user_id = siaga_current_user_id()
        )
    );

-- fields: penyuluh reads lahan inside binaan kecamatan.
drop policy if exists fields_penyuluh_select on fields;
create policy fields_penyuluh_select on fields
    for select
    using (
        exists (
            select 1 from penyuluh_assignments pa
            where pa.user_id = siaga_current_user_id()
              and fields.area_kecamatan = any (pa.area_kecamatan)
        )
    );

-- cases: owner reads own cases (including assisted-created — ownership is
-- the subject petani, creator is recorded separately).
drop policy if exists cases_owner_select on cases;
create policy cases_owner_select on cases
    for select
    using (
        exists (
            select 1 from siaga_profiles p
            where p.id = cases.owner_profile_id
              and p.user_id = siaga_current_user_id()
        )
    );

-- cases: penyuluh reads cases in binaan kecamatan (case area, or its field's).
drop policy if exists cases_penyuluh_select on cases;
create policy cases_penyuluh_select on cases
    for select
    using (
        exists (
            select 1 from penyuluh_assignments pa
            where pa.user_id = siaga_current_user_id()
              and (
                  cases.area_kecamatan = any (pa.area_kecamatan)
                  or exists (
                      select 1 from fields f
                      where f.id = cases.field_id
                        and f.area_kecamatan = any (pa.area_kecamatan)
                  )
              )
        )
    );

-- cases: admin / domain_reviewer read for oversight.
drop policy if exists cases_admin_select on cases;
create policy cases_admin_select on cases
    for select
    using (siaga_current_role() in ('admin', 'domain_reviewer'));

-- case_events: visible when the parent case is visible (predicates inlined).
drop policy if exists case_events_select on case_events;
create policy case_events_select on case_events
    for select
    using (
        exists (
            select 1
            from cases c
            where c.id = case_events.case_id
              and (
                  exists (
                      select 1 from siaga_profiles p
                      where p.id = c.owner_profile_id
                        and p.user_id = siaga_current_user_id()
                  )
                  or exists (
                      select 1 from penyuluh_assignments pa
                      where pa.user_id = siaga_current_user_id()
                        and c.area_kecamatan = any (pa.area_kecamatan)
                  )
                  or siaga_current_role() in ('admin', 'domain_reviewer')
              )
        )
    );

-- data_deletion_requests: requester reads own requests; admin reads all.
drop policy if exists deletion_requests_owner_select on data_deletion_requests;
create policy deletion_requests_owner_select on data_deletion_requests
    for select
    using (
        exists (
            select 1 from siaga_profiles p
            where p.id = data_deletion_requests.profile_id
              and p.user_id = siaga_current_user_id()
        )
    );

drop policy if exists deletion_requests_admin_select on data_deletion_requests;
create policy deletion_requests_admin_select on data_deletion_requests
    for select
    using (siaga_current_role() = 'admin');
