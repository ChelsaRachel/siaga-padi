# Changelog

All notable changes to Siaga Padi are recorded here.
Format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/);
commits follow [Conventional Commits](https://www.conventionalcommits.org/).

Entries are added under `## [Unreleased]` as work lands on `development`, and
promoted to a versioned heading at release time. Each entry cites the short SHA
so it maps back to git.

## [Unreleased]

### Added

- (`9ff4c2b`) `feat(backend): add be-python FastAPI scaffold` — backend service
  layer at `apps/backend/`, moving the project to MVP stage. JWT bearer auth,
  user/group/permission/organization CRUD, and the `/agent-mgmt/*` router,
  wired to a local self-hosted Supabase.
- (`e6aede2`) `test(web): add Vitest infrastructure and PWA service/store test coverage` —
  Vitest config and setup plus tests for the API, offline-draft-storage and PWA
  services, and the PWA store.
- (`4ad8146`) `feat(web): add offline PWA support with Workbox service worker` —
  offline app shell and service worker registration.
- (`8ee160a`) `feat(design): apply Tani Ramah palette and resolve theme conflict` —
  farmer-friendly natural palette wired into the design tokens.
- (`09230bf`) `feat(web): rebrand boilerplate identity to Siaga Padi` —
  app identity, manifest, and theme colour.
- (`e6ad4cd`) `chore(web): scaffold React 18 + Rspack app` — initial web app
  under `apps/web/`.
- (`e40d8aa`) `chore: add project scaffolding directories`.
- (`4641926`) `docs: add CONTRIBUTING guide + GitHub-adapted git-flow`.
- (`4f84d39`) `docs: add draft FRD for MVP, mobile android, and web PWA` — the
  functional baseline the build works against.

### Changed

- (`71fc4e0`) `docs(web): update icon skill to the bundled-npm approach` — icons
  are bundled from npm instead of fetched from an external network.
- (`7bfab55`) `docs: replace boilerplate README with Siaga Padi`.
- (`1b94e64`) `docs: refresh handover + continuation prompt`.
- (`d6f39b1`) `chore: neutralize wording in gitignore comment`.

### Fixed

- (`9ff4c2b`) Backend dependencies could not resolve or boot as shipped —
  repinned `httpx` 0.28.1 to 0.27.2 (`supabase` 2.10.0 requires <0.28) and added
  the missing `dnspython` and `email-validator`, imported at runtime by
  `dto/auth.py` and pydantic `EmailStr`.
- (`4a8b5f4`) `fix(web): remove external-network deps and patch vulnerable packages` —
  dropped dependencies that only resolved on a private network and patched
  `axios`, `dompurify`, and `react-router-dom`.

### Security

- (`9ff4c2b`) Removed a dead commented block in `service/external_auth.py` that
  carried unrelated third-party PII and token-shaped strings, and excluded
  `/.supabase/` from git — the local stack holds live secrets and the Postgres
  datadir.
- (`52a2005`) Added the root gitignore and excluded private internal tooling —
  keeps that tooling and any secrets out of the repository.
