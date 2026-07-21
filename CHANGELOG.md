# Changelog

All notable changes to Siaga Padi are recorded here.
Format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/);
commits follow [Conventional Commits](https://www.conventionalcommits.org/).

Entries are added under `## [Unreleased]` as work lands on `development`, and
promoted to a versioned heading at release time. Each entry cites the short SHA
so it maps back to git.

## [Unreleased]

### Added

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

### Changed

- (`71fc4e0`) `docs(web): update icon skill to the bundled-npm approach` — icons
  are bundled from npm instead of fetched from an external network.
- (`7bfab55`) `docs: replace boilerplate README with Siaga Padi`.
- (`1b94e64`) `docs: refresh handover + continuation prompt`.
- (`d6f39b1`) `chore: neutralize wording in gitignore comment`.

### Fixed

- (`4a8b5f4`) `fix(web): remove external-network deps and patch vulnerable packages` —
  dropped dependencies that only resolved on a private network and patched
  `axios`, `dompurify`, and `react-router-dom`.

### Security

- (`52a2005`) `chore: add gitignore and ignore internal-only tooling` — keeps
  private tooling and secrets out of the repository.
