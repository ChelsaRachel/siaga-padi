-- 0013_triage.sql
-- Siaga Padi — Sprint 05 (AI Triage & Rekomendasi) schema foundation.
-- Tables: analysis_results, question_bank, case_answers, recommendations.
-- Also extends cases with the FR-006 urgency flag.
-- Idempotent: `create table if not exists`, `add column if not exists`,
-- `create or replace function`, `drop policy/trigger if exists` + `create`,
-- seed rows `on conflict do nothing`.
--
-- Apply once per stack (after 0012): psql "$SUPABASE_DB_URL" -f 0013_triage.sql
--
-- Domain vocabulary is Indonesian, stored as-is (brief 03 §5.1) — same
-- convention as case photos and the knowledge base: `confidence_band`
-- ('tinggi'|'sedang'|'rendah'), `abstain_status` ('yakin'|'tidak_yakin'|
-- 'konflik'), `answer` ('ya'|'tidak'|'tidak_tahu'). Case STATUS remains the
-- canonical FRD English vocabulary from 0010 — that split is unchanged.
--
-- THE THREE INVARIANTS THIS FILE ENCODES (FR-005/FR-006/FR-007):
--   1. An analysis result is FROZEN. No update, no delete — a human correction
--      is a new review version in Sprint 06, never an edit of what the model
--      said. `model_version` + `threshold_version` make it reproducible.
--   2. A questionnaire answer NEVER rewrites an analysis label. `urgency_flag`
--      lives on `cases`, deliberately in a different table from the result, so
--      no answer can reach the label by accident.
--   3. A recommendation always records where it came from (`origin`) and what
--      it cited (`ref_codes`). "bukti tidak cukup" is a first-class origin —
--      the engine never invents advice to fill the card.

-- ---------------------------------------------------------------------------
-- analysis_results: the frozen CV verdict for one case.
-- candidates is an ordered jsonb array of AT MOST 3 entries, each
-- `{label, calibrated_score}` — the raw softmax never leaves the service.
-- evidence_maps is REVIEWER-ONLY payload (per-photo highlight refs); the DTO
-- layer drops it for petani.
-- ---------------------------------------------------------------------------
create table if not exists analysis_results (
    id                text primary key,
    case_id           text not null references cases(id),
    candidates        jsonb not null default '[]'::jsonb
                      check (jsonb_typeof(candidates) = 'array'
                             and jsonb_array_length(candidates) <= 3),
    confidence_band   text not null
                      check (confidence_band in ('tinggi', 'sedang', 'rendah')),
    abstain_status    text not null default 'yakin'
                      check (abstain_status in
                             ('yakin', 'tidak_yakin', 'konflik')),
    -- True when an `ambang` (borderline) photo fed the analysis: the score is
    -- penalised and the band may drop. Kept as its own column so the reviewer
    -- can tell "the model was unsure" from "the photo was weak".
    quality_penalty   boolean not null default false,
    model_version     text not null,
    threshold_version text not null,
    evidence_maps     jsonb not null default '[]'::jsonb,
    created_at        timestamptz not null default now(),
    -- One frozen result per case in this sprint; Sprint 06 corrections are
    -- review versions on top, not additional analysis rows.
    unique (case_id)
);

create index if not exists ix_analysis_results_case
    on analysis_results (case_id, created_at desc);

-- Freeze the row the moment it exists. Enforced for EVERY role — the service
-- key included, which is the whole point: no code path can quietly "fix" what
-- the model said on a case a penyuluh already read.
create or replace function forbid_analysis_result_mutation() returns trigger
language plpgsql
as $$
begin
    raise exception
        'analysis_results is immutable: corrections are new review versions'
        using errcode = '55000';
end;
$$;

drop trigger if exists trg_analysis_results_immutable on analysis_results;
create trigger trg_analysis_results_immutable
    before update or delete on analysis_results
    for each row execute function forbid_analysis_result_mutation();

-- ---------------------------------------------------------------------------
-- question_bank: expert-approved follow-up questions, VERSIONED.
-- The selector may only read rows with `approved` — an unapproved question can
-- never reach a farmer, exactly like an unapproved KB chunk (0012).
--
-- trigger_rules  {"diseases": [...], "phases": [...]}  empty/absent list = any
-- urgency_rules  {"ya": 2}                             weight per answer value
-- ---------------------------------------------------------------------------
create table if not exists question_bank (
    id            text primary key,
    code          text not null,
    text          text not null check (char_length(text) between 5 and 300),
    illustration  text,
    why_asked     text not null check (char_length(why_asked) between 5 and 300),
    trigger_rules jsonb not null default '{}'::jsonb,
    urgency_rules jsonb not null default '{}'::jsonb,
    ordinal       int not null default 0,
    version       int not null default 1 check (version >= 1),
    approved      boolean not null default false,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    unique (code, version)
);

create index if not exists ix_question_bank_approved
    on question_bank (approved, ordinal);

-- ---------------------------------------------------------------------------
-- case_answers: one answer per question per case.
-- `answered_by_profile_id` is the FILLER, which in assisted mode is the
-- penyuluh and not the case owner (brief 03 §5.1 "Pengisi").
-- ---------------------------------------------------------------------------
create table if not exists case_answers (
    id                     text primary key,
    case_id                text not null references cases(id),
    question_id            text not null references question_bank(id),
    answer                 text not null
                           check (answer in ('ya', 'tidak', 'tidak_tahu')),
    answered_by_profile_id text references siaga_profiles(id),
    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now(),
    unique (case_id, question_id)
);

create index if not exists ix_case_answers_case
    on case_answers (case_id, created_at);

-- ---------------------------------------------------------------------------
-- cases: FR-006 urgency. A risky ANSWER COMBINATION raises review priority and
-- adds escalation context. It deliberately lives here and not on
-- analysis_results — the label the model produced stays untouched.
-- ---------------------------------------------------------------------------
alter table cases add column if not exists urgency_flag boolean not null default false;

-- ---------------------------------------------------------------------------
-- recommendations: the two-view output for one analysis.
-- farmer_view    {indikasi, lakukan[], pantau[], hindari[], eskalasi}
-- technical_view {ringkasan, ketidakpastian, kutipan[], penanda[]}
-- ref_codes      every ref code cited anywhere in the two views
-- origin         'ai_engine' | 'rule_fallback' | 'insufficient_evidence'
--
-- The version columns are the per-case reproducibility record required by
-- brief 03 §5.3: which model, which thresholds, which question bank and which
-- provider produced this card.
-- ---------------------------------------------------------------------------
create table if not exists recommendations (
    id                    text primary key,
    case_id               text not null references cases(id),
    analysis_result_id    text not null references analysis_results(id),
    farmer_view           jsonb not null default '{}'::jsonb,
    technical_view        jsonb not null default '{}'::jsonb,
    ref_codes             text[] not null default '{}',
    origin                text not null
                          check (origin in ('ai_engine', 'rule_fallback',
                                            'insufficient_evidence')),
    model_version         text,
    threshold_version     text,
    question_bank_version text,
    provider_version      text,
    created_at            timestamptz not null default now(),
    unique (case_id)
);

create index if not exists ix_recommendations_case
    on recommendations (case_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS. Same model as 0010/0011/0012: the backend's service key bypasses these
-- — the service layer enforces identical scoping in code; RLS is defense in
-- depth for any anon/user-key PostgREST access. Helpers siaga_current_user_id()
-- / siaga_current_role() come from 0009.
--
-- Visibility mirrors the parent case (owner, binaan penyuluh, admin/reviewer),
-- which is exactly the rule `is_case_visible()` applies in code.
-- ---------------------------------------------------------------------------
alter table analysis_results enable row level security;
alter table question_bank enable row level security;
alter table case_answers enable row level security;
alter table recommendations enable row level security;

-- Shared visibility predicate, defined once so the three case-scoped policies
-- below cannot drift apart.
create or replace function siaga_case_is_visible(target_case_id text)
returns boolean
language sql
stable
as $$
    select exists (
        select 1
        from cases c
        where c.id = target_case_id
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
    );
$$;

drop policy if exists analysis_results_select on analysis_results;
create policy analysis_results_select on analysis_results
    for select
    using (siaga_case_is_visible(case_id));

-- Approved questions are readable by any signed-in user: the farmer answering
-- the questionnaire must be able to read the question text. Unapproved rows
-- never match — a draft question cannot reach a farmer.
drop policy if exists question_bank_approved_select on question_bank;
create policy question_bank_approved_select on question_bank
    for select
    using (siaga_current_user_id() is not null and approved);

drop policy if exists question_bank_curator_select on question_bank;
create policy question_bank_curator_select on question_bank
    for select
    using (siaga_current_role() in ('admin', 'domain_reviewer'));

drop policy if exists case_answers_select on case_answers;
create policy case_answers_select on case_answers
    for select
    using (siaga_case_is_visible(case_id));

drop policy if exists recommendations_select on recommendations;
create policy recommendations_select on recommendations
    for select
    using (siaga_case_is_visible(case_id));

-- ---------------------------------------------------------------------------
-- Question-bank seed — PLACEHOLDER SET, pending expert validation.
--
-- These rows are flagged `approved = true` so the Sprint 05 pipeline is
-- runnable end-to-end, but the wording and the urgency weights have NOT been
-- signed off by a domain expert yet. Chelsa / domain_reviewer must review this
-- set before pilot; the codes and the shape stay, the text may change.
-- Re-approval is a normal governance edit — no schema change needed.
--
-- Weights: a case reaches `urgency_flag` at a total of 3 (see
-- models/siaga_triage.py URGENCY_FLAG_THRESHOLD — keep both in sync).
-- ---------------------------------------------------------------------------
insert into question_bank
    (id, code, text, why_asked, trigger_rules, urgency_rules, ordinal, approved)
values
    ('qb-sebar-01', 'QST-SEBAR-01',
     'Apakah bercak menyebar ke daun lain dalam 3 hari terakhir?',
     'Penyebaran cepat menandakan serangan yang masih aktif.',
     '{}'::jsonb, '{"ya": 2}'::jsonb, 10, true),

    ('qb-luas-01', 'QST-LUAS-01',
     'Apakah lebih dari seperempat petak terlihat terserang?',
     'Luas serangan menentukan seberapa cepat penanganan diperlukan.',
     '{}'::jsonb, '{"ya": 2}'::jsonb, 20, true),

    ('qb-tetangga-01', 'QST-TETANGGA-01',
     'Apakah petak tetangga menunjukkan gejala serupa?',
     'Gejala yang sama di petak lain menandakan sebaran di wilayah.',
     '{}'::jsonb, '{"ya": 1}'::jsonb, 30, true),

    ('qb-hujan-01', 'QST-HUJAN-01',
     'Apakah 3 hari terakhir sering hujan atau berkabut?',
     'Cuaca lembap mempercepat perkembangan penyakit daun.',
     '{"diseases": ["blas_daun", "hawar_daun_bakteri"]}'::jsonb,
     '{"ya": 1}'::jsonb, 40, true),

    ('qb-pupuk-01', 'QST-PUPUK-01',
     'Apakah pemupukan nitrogen dilakukan dalam 2 minggu terakhir?',
     'Nitrogen berlebih membuat tanaman lebih rentan terhadap blas.',
     '{"diseases": ["blas_daun"]}'::jsonb, '{}'::jsonb, 50, true),

    ('qb-leher-01', 'QST-LEHER-01',
     'Apakah ada malai yang mengering atau patah di pangkalnya?',
     'Gejala di leher malai berisiko langsung menggagalkan panen.',
     '{"diseases": ["blas_daun"], "phases": ["REPRODUCTIVE", "RIPENING"]}'::jsonb,
     '{"ya": 3}'::jsonb, 60, true),

    ('qb-garis-01', 'QST-GARIS-01',
     'Apakah tepi daun menguning memanjang seperti garis basah?',
     'Pola di tepi daun membantu membedakan hawar daun bakteri.',
     '{"diseases": ["hawar_daun_bakteri"]}'::jsonb, '{}'::jsonb, 70, true),

    ('qb-air-01', 'QST-AIR-01',
     'Apakah petak tergenang air lebih tinggi dari biasanya?',
     'Genangan dan daun terluka mempermudah bakteri masuk.',
     '{"diseases": ["hawar_daun_bakteri"]}'::jsonb, '{"ya": 1}'::jsonb, 80, true),

    ('qb-bulat-01', 'QST-BULAT-01',
     'Apakah bercak berbentuk bulat kecil dan cokelat merata?',
     'Bentuk bercak membantu memastikan dugaan bercak cokelat.',
     '{"diseases": ["bercak_coklat"]}'::jsonb, '{}'::jsonb, 90, true),

    ('qb-tanah-01', 'QST-TANAH-01',
     'Apakah lahan ini jarang dipupuk atau tanahnya kurang subur?',
     'Bercak cokelat sering muncul pada tanaman yang kekurangan hara.',
     '{"diseases": ["bercak_coklat"]}'::jsonb, '{}'::jsonb, 100, true),

    ('qb-kerdil-01', 'QST-KERDIL-01',
     'Apakah tanaman terlihat lebih kerdil dibanding petak sekitarnya?',
     'Pertumbuhan terhambat melengkapi konteks saat foto belum meyakinkan.',
     '{}'::jsonb, '{"ya": 1}'::jsonb, 110, true)
on conflict (id) do nothing;
