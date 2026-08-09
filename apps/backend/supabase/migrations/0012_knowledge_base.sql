-- 0012_knowledge_base.sql
-- Siaga Padi — Sprint 04 (Knowledge Base Governance) schema foundation.
-- Tables: kb_sources, kb_chunks, kb_audit_events, kb_retrieval_logs.
-- View: kb_active_chunks — THE active retrieval index.
-- Idempotent: `create table if not exists`, `create or replace view/function`,
-- `drop policy/trigger if exists` + `create`.
--
-- Apply once per stack (after 0011): psql "$SUPABASE_DB_URL" -f 0012_knowledge_base.sql
--
-- Domain vocabulary is stored in Indonesian directly (brief 06 §5.1) — same
-- convention as case photos: `status` ('draf'|'disetujui'|'dipensiunkan'),
-- `approval_status` ('menunggu'|'disetujui'|'ditolak'), `risk` ('aman'|'dibatasi').
--
-- THE TWO INVARIANTS THIS FILE ENCODES (FR-011):
--   1. Active index = approved + current + not-expired chunks of a non-retired
--      source. Drafts and rejects can NEVER leak into recommendation output.
--   2. Content changes create a NEW VERSION ROW under the SAME ref_code; the
--      previous row keeps its content forever (historical citations resolve).

-- ---------------------------------------------------------------------------
-- kb_sources: one registered document (BB Padi, Balai POPT, IRRI, …).
-- license_note is NOT NULL on purpose — brief 06 §6.2 requires the legal basis
-- to be recorded for every source, including public government documents.
-- Retirement is non-destructive: status flips + retired_at is stamped, the rows
-- stay so old case references still resolve.
-- ---------------------------------------------------------------------------
create table if not exists kb_sources (
    id                    text primary key,
    title                 text not null check (char_length(title) between 3 and 300),
    publisher             text not null check (char_length(publisher) between 2 and 200),
    published_date        text,
    edition_version       text,
    license_note          text not null check (char_length(license_note) between 3 and 500),
    category              text,
    source_url            text,
    status                text not null default 'draf'
                          check (status in ('draf', 'disetujui', 'dipensiunkan')),
    -- brief 06 §3.2: a source that disappears online stays usable but is
    -- labelled — 'arsip' = we hold a legal copy, 'tidak_tersedia' = gone.
    availability_status   text not null default 'tersedia'
                          check (availability_status in
                                 ('tersedia', 'arsip', 'tidak_tersedia')),
    document_fingerprint  text,
    last_reviewed_at      timestamptz,
    retired_at            timestamptz,
    registered_by_profile_id text references siaga_profiles(id),
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

create index if not exists ix_kb_sources_status
    on kb_sources (status, created_at desc);
create index if not exists ix_kb_sources_publisher
    on kb_sources (publisher);

-- ---------------------------------------------------------------------------
-- kb_chunks: one reference chunk, ONE VERSION of it.
-- ref_code ('RUJ-BLAS-004') is stable across versions — it is what a
-- recommendation card cites. (ref_code, version) is unique; only one row per
-- ref_code may be current (partial unique index below).
--
-- policy_flag carries the FR-011 narration control: dosage/brand-bearing
-- content is linkable as penyuluh reading but is NEVER narrated to petani.
-- The Sprint 05 safety checker reads this flag from the retrieval payload.
-- ---------------------------------------------------------------------------
create table if not exists kb_chunks (
    id              text primary key,
    ref_code        text not null,
    source_id       text not null references kb_sources(id),
    source_version  text,
    location        text,
    content         text not null check (char_length(content) > 0),
    disease_tags    text[] not null default '{}',
    phase_tags      text[] not null default '{}',
    action_type     text,
    audience        text not null default 'penyuluh'
                    check (audience in ('petani', 'penyuluh')),
    risk            text not null default 'aman'
                    check (risk in ('aman', 'dibatasi')),
    policy_flag     text check (policy_flag is null or policy_flag in
                                ('memuat_dosis', 'memuat_merek',
                                 'memuat_dosis_dan_merek')),
    approval_status text not null default 'menunggu'
                    check (approval_status in
                           ('menunggu', 'disetujui', 'ditolak')),
    reject_reason   text check (reject_reason is null or
                                char_length(reject_reason) <= 500),
    decided_by_profile_id text references siaga_profiles(id),
    decided_at      timestamptz,
    version         int not null default 1 check (version >= 1),
    is_current      boolean not null default true,
    -- brief 06 §1.1 "disetujui + belum kedaluwarsa": an approval may carry an
    -- expiry (e.g. seasonal guidance) — expired chunks drop out of the index.
    valid_until     timestamptz,
    ordinal         int not null default 0,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (ref_code, version)
);

create unique index if not exists ux_kb_chunks_ref_current
    on kb_chunks (ref_code) where is_current;
create index if not exists ix_kb_chunks_source
    on kb_chunks (source_id, ordinal);
create index if not exists ix_kb_chunks_approval
    on kb_chunks (approval_status, is_current);
create index if not exists ix_kb_chunks_disease
    on kb_chunks using gin (disease_tags);
create index if not exists ix_kb_chunks_phase
    on kb_chunks using gin (phase_tags);

-- ---------------------------------------------------------------------------
-- Content is never overwritten in place. Only the governance columns of an
-- EXISTING version row may change (approval decision, currency flag, expiry);
-- a content edit must be written as a new version row under the same ref_code.
-- Enforced for EVERY role — the service key included.
-- ---------------------------------------------------------------------------
create or replace function forbid_kb_chunk_content_rewrite() returns trigger
language plpgsql
as $$
begin
    if new.content is distinct from old.content
       or new.ref_code is distinct from old.ref_code
       or new.version is distinct from old.version then
        raise exception
            'kb_chunks content is versioned: insert a new version row instead'
            using errcode = '55000';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_kb_chunks_no_rewrite on kb_chunks;
create trigger trg_kb_chunks_no_rewrite
    before update on kb_chunks
    for each row execute function forbid_kb_chunk_content_rewrite();

-- ---------------------------------------------------------------------------
-- kb_active_chunks — THE active retrieval index (single definition, so the
-- runtime, the retrieval test and any future consumer cannot drift).
-- Draft/rejected chunks, superseded versions, expired approvals and chunks of
-- a retired source are all excluded here, once.
-- ---------------------------------------------------------------------------
create or replace view kb_active_chunks as
select c.*
from kb_chunks c
join kb_sources s on s.id = c.source_id
where c.approval_status = 'disetujui'
  and c.is_current
  and (c.valid_until is null or c.valid_until > now())
  and s.status <> 'dipensiunkan'
  and s.retired_at is null;

-- ---------------------------------------------------------------------------
-- kb_audit_events: append-only trail of every governance decision — source
-- registration/edit/retire, ingest, chunk approve/reject/revise, version
-- activation. Sprint 08 adds the second-person approval on top of this trail.
-- ---------------------------------------------------------------------------
create table if not exists kb_audit_events (
    id               text primary key,
    entity_type      text not null check (entity_type in ('source', 'chunk')),
    entity_id        text not null,
    ref_code         text,
    action           text not null,
    actor_profile_id text references siaga_profiles(id),
    reason           text check (reason is null or char_length(reason) <= 500),
    detail           jsonb,
    created_at       timestamptz not null default now()
);

create index if not exists ix_kb_audit_entity
    on kb_audit_events (entity_type, entity_id, created_at);

create or replace function forbid_kb_audit_mutation() returns trigger
language plpgsql
as $$
begin
    raise exception 'kb_audit_events is append-only'
        using errcode = '55000';
end;
$$;

drop trigger if exists trg_kb_audit_append_only on kb_audit_events;
create trigger trg_kb_audit_append_only
    before update or delete on kb_audit_events
    for each row execute function forbid_kb_audit_mutation();

-- ---------------------------------------------------------------------------
-- kb_retrieval_logs: brief 06 §5.3 — the log keeps the REFERENCE CODES and the
-- coarse query facets only, never the full request payload (a case's photos,
-- notes and location must not be duplicated into a knowledge-base log).
-- ---------------------------------------------------------------------------
create table if not exists kb_retrieval_logs (
    id               text primary key,
    channel          text not null check (channel in ('runtime', 'uji')),
    actor_profile_id text references siaga_profiles(id),
    disease          text,
    phase            text,
    audience         text,
    action_type      text,
    ref_codes        text[] not null default '{}',
    result_count     int not null default 0,
    created_at       timestamptz not null default now()
);

create index if not exists ix_kb_retrieval_logs_created
    on kb_retrieval_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS. Same model as 0009/0010/0011: the backend's service key bypasses these
-- — the service layer enforces identical scoping in code; RLS is defense in
-- depth for any anon/user-key PostgREST access. Helpers siaga_current_user_id()
-- / siaga_current_role() come from 0009.
--
-- Curation surface (sources, raw chunks, audit, logs): admin + domain_reviewer.
-- Approved chunks are readable by every signed-in user, because the
-- recommendation reference drawer (Sprint 05) shows them to petani/penyuluh.
-- ---------------------------------------------------------------------------
alter table kb_sources enable row level security;
alter table kb_chunks enable row level security;
alter table kb_audit_events enable row level security;
alter table kb_retrieval_logs enable row level security;

drop policy if exists kb_sources_curator_select on kb_sources;
create policy kb_sources_curator_select on kb_sources
    for select
    using (siaga_current_role() in ('admin', 'domain_reviewer'));

-- A signed-in reader may resolve the source metadata of a chunk they can see
-- (citation header: title, publisher, edition) — never a draft-only source.
drop policy if exists kb_sources_cited_select on kb_sources;
create policy kb_sources_cited_select on kb_sources
    for select
    using (
        siaga_current_user_id() is not null
        and exists (
            select 1 from kb_chunks c
            where c.source_id = kb_sources.id
              and c.approval_status = 'disetujui'
        )
    );

drop policy if exists kb_chunks_curator_select on kb_chunks;
create policy kb_chunks_curator_select on kb_chunks
    for select
    using (siaga_current_role() in ('admin', 'domain_reviewer'));

-- Approved chunks (current OR historical) are citation targets: a penyuluh
-- opening an old case must still resolve the version that was cited then.
-- Pending/rejected chunks never match this policy — drafts cannot leak.
drop policy if exists kb_chunks_approved_select on kb_chunks;
create policy kb_chunks_approved_select on kb_chunks
    for select
    using (
        siaga_current_user_id() is not null
        and approval_status = 'disetujui'
    );

drop policy if exists kb_audit_curator_select on kb_audit_events;
create policy kb_audit_curator_select on kb_audit_events
    for select
    using (siaga_current_role() in ('admin', 'domain_reviewer'));

drop policy if exists kb_retrieval_logs_curator_select on kb_retrieval_logs;
create policy kb_retrieval_logs_curator_select on kb_retrieval_logs
    for select
    using (siaga_current_role() in ('admin', 'domain_reviewer'));
