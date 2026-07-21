# Siaga Padi — Project Overview

| Attribute | Value |
|---|---|
| Project name | Siaga Padi |
| Stage | **MVP** |
| Channel | Responsive Web Application / PWA (native mobile is Phase 2) |
| Product Owner / Technical Owner | Fahri Alfiansyah |
| CV & Dataset Owner | Chelsa Rachel Wibowo |
| Authoritative spec | [`docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md`](../docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md) |
| Target MVP | 16 Agustus 2026 |

## What it is

Siaga Padi is a rice pest/disease **early-warning and advisory** app for farmers and
extension officers (penyuluh). It is **penyuluh-assisted, farmer-accessible**: farmers
run simple self-checks; penyuluh act as reviewer and follow-up manager. Computer Vision
and LLM output is **triage / early indication only** — never a final agronomic diagnosis.

The full functional, data, AI, security, and testing baseline lives in the FRD above.
This overview is intentionally thin; the FRD is the source of truth.

## Stacks (this repo)

| Stack | Location | Status |
|---|---|---|
| Web (React 18 + Rspack + Zustand + shadcn/ui, Fusion theme) | `apps/web/` | Scaffolded (web-first) |
| Backend (FastAPI + Supabase, `be-python`) | `apps/backend/` | Scaffolded 2026-07-22 |

## Infrastructure

- **Supabase** (self-hosted, Docker) at `.supabase/` inside the repo root (gitignored).
  Credentials contract: `.supabase/credentials.env`. Brought up via
  `.claude/skills/supabase-init/`.
- The backend reads Supabase + secrets from `apps/backend/.env` (gitignored).

## Scope notes

- MVP scope allows a real database (Supabase) — see `.claude/rules/project-scope.md`.
- Keep the setup **lean**: the `be-python` boilerplate ships an `agent-mgmt` router and
  migration `0008_agent_mgmt.sql`. This project currently has **no agent workforce**, so
  the agent-management machinery is present but unused — do not expand it unless a
  concrete agent need appears.
