-- 0011_case_photos.sql
-- Siaga Padi — Sprint 03 (Photo & Quality) schema foundation.
-- Table: case_photos. Bucket: case-photos (private, signed-URL access only).
-- Also extends cases with the FR-004 "needs human review" escalation flag.
-- Idempotent: `create table if not exists`, `add column if not exists`,
-- `drop policy if exists` + `create`, bucket insert `on conflict do nothing`.
--
-- Apply once per stack (after 0010): psql "$SUPABASE_DB_URL" -f 0011_case_photos.sql
--
-- quality_status stores the petani-facing Indonesian vocabulary directly
-- ('layak'|'ditolak'|'ambang'|'tidak_pasti') because FR-004 defines these as
-- the DOMAIN values (brief §5.1) — unlike case status there is no separate
-- canonical/display split. Raw technical scores are NEVER stored or returned;
-- they exist only in server logs (BR: petani never sees technical scores).

-- ---------------------------------------------------------------------------
-- case_photos: one row per accepted-or-rejected upload attempt on a slot.
-- fingerprint is the sha256 of the ORIGINAL uploaded bytes — unique per case
-- so an identical re-send (retry/replay) can never duplicate a photo.
-- Rejected rows are retained for UX evaluation but flagged never_for_training.
-- ---------------------------------------------------------------------------
create table if not exists case_photos (
    id                     text primary key,
    case_id                text not null references cases(id),
    slot_no                int  not null check (slot_no between 1 and 3),
    storage_path           text not null,
    quality_status         text not null
                           check (quality_status in
                                  ('layak', 'ditolak', 'ambang', 'tidak_pasti')),
    reject_reasons         text[] not null default '{}'
                           check (coalesce(array_length(reject_reasons, 1), 0) <= 3),
    retake_count           int  not null default 0 check (retake_count >= 0),
    fingerprint            text not null,
    quality_config_version text not null,
    exif_stripped          boolean not null default true,
    never_for_training     boolean not null default false,
    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now(),
    unique (case_id, fingerprint)
);

create index if not exists ix_case_photos_case
    on case_photos (case_id, created_at);
create index if not exists ix_case_photos_case_slot
    on case_photos (case_id, slot_no);

-- ---------------------------------------------------------------------------
-- cases: FR-004 escalation — after 3 failed retakes the user may send the
-- case to human review as-is. This is a FLAG (not a status): the state
-- machine §6.5 has no DRAFT→NEEDS_REVIEW edge; Sprint 06 routes flagged
-- cases into the review queue marked "kualitas foto rendah".
-- ---------------------------------------------------------------------------
alter table cases add column if not exists needs_human_review boolean not null default false;
alter table cases add column if not exists review_reason text
    check (review_reason is null or char_length(review_reason) <= 200);

-- ---------------------------------------------------------------------------
-- Storage bucket `case-photos` — PRIVATE. No public reads; the backend
-- (service key) writes normalized images and mints short-lived signed URLs.
-- No storage.objects policies are created on purpose: with RLS enabled and
-- zero policies, anon/user-key reads are denied while signed URLs (service
-- role) keep working — exactly the access model the contract requires.
-- Full-res originals are only stored under research consent (not in MVP path).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'case-photos',
    'case-photos',
    false,
    10485760,  -- 10 MB — normalized uploads are far smaller; hard backstop
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS. Same model as 0010: the backend's service key bypasses these — the
-- service layer enforces identical scoping in code; RLS is defense in depth
-- for any anon/user-key PostgREST access. Visibility mirrors the parent case.
-- ---------------------------------------------------------------------------
alter table case_photos enable row level security;

drop policy if exists case_photos_select on case_photos;
create policy case_photos_select on case_photos
    for select
    using (
        exists (
            select 1
            from cases c
            where c.id = case_photos.case_id
              and (
                  exists (
                      select 1 from siaga_profiles p
                      where p.id = c.owner_profile_id
                        and p.user_id = siaga_current_user_id()
                  )
                  or exists (
                      select 1 from penyuluh_assignments pa
                      where pa.user_id = siaga_current_user_id()
                        and (
                            c.area_kecamatan = any (pa.area_kecamatan)
                            or exists (
                                select 1 from fields f
                                where f.id = c.field_id
                                  and f.area_kecamatan = any (pa.area_kecamatan)
                            )
                        )
                  )
                  or siaga_current_role() in ('admin', 'domain_reviewer')
              )
        )
    );
