---
name: git-flow
description: |
  End-to-end git workflow for GitHub projects: authentication via the GitHub CLI (`gh`) or SSH,
  feature-branch naming, Conventional Commits (no watermark trailers), narrow staging, push +
  Pull Request flow, CHANGELOG.md per Keep a Changelog, semver tagging, and recovery moves for the
  common failure modes (auth failed, non-fast-forward, protected-branch rejection, wrong commit on
  wrong branch).

  Use this skill whenever the user asks to: commit, stage, push, branch, open a PR, tag, release,
  bump version, draft a CHANGELOG entry, set up auth for a fresh clone, or recover from a failed
  push / pre-commit hook.

  Triggers: "commit", "push", "buatkan commit message", "buatkan branch", "open PR", "tag release",
  "bump version", "/git", "atur changelog", "kenapa push gagal", "force push?"
---

# git-flow (GitHub)

End-to-end git workflow for **GitHub** repositories. Every unit of work happens on a short-lived
feature branch and lands on the integration branch via a **Pull Request (PR)**.

This skill describes how to run git locally and keep history readable. It **does not** open PRs for
review, do code review, or run CI — those belong to `/review`, human reviewers, and the repo's
GitHub Actions.

### Team conventions baked in

- **Trunk = `development`** — the shared, protected integration branch. `main` is reserved for
  released/stable code once the project ships (not required during MVP).
- **One feature = one branch**, always branched off the latest `development`.
- **Branches are KEPT after merge** (not deleted) — this team prefers a transparent, auditable
  branch history. (Note: the PR record + merge commit already preserve full history on GitHub even
  if a branch is later deleted; keeping them is a deliberate team choice, not a technical necessity.)
- **No watermark trailers** in commit messages — no `Co-Authored-By`, no tool signatures. Keep
  subjects and bodies clean.

---

## Step 0 — Pre-conditions

1. Repo is initialised (`git status` returns cleanly).
2. Remote is set: `git remote -v` lists `origin` pointing at the GitHub URL
   (`https://github.com/<owner>/<repo>.git` or `git@github.com:<owner>/<repo>.git`).
3. `git config user.email` and `user.name` resolve — set them once globally if not:
   ```bash
   git config --global user.email "you@example.com"
   git config --global user.name  "Your Name"
   ```
4. Any `.env` is gitignored. Sanity-check before you ever stage:
   ```bash
   grep -nE '(^|/)\.env($|\.)' .gitignore || echo "WARNING: add .env / .env.* to .gitignore"
   git check-ignore -v .env 2>/dev/null || echo "note: no .env present yet"
   ```

If any of the above fails, stop and fix that first — never invent a remote, never commit `.env`.

---

## Step 1 — Authenticate to GitHub (once per machine)

GitHub does **not** use account passwords for git over HTTPS. Pick one method and let git's
credential helper hold the secret — **never** put a token in the remote URL or in `.git/config`.

### Option A — GitHub CLI (recommended)

```bash
gh auth login        # choose: GitHub.com → HTTPS → "Login with a web browser"
gh auth status       # verify: "Logged in to github.com as <you>"
```

`gh auth login` configures git's credential helper to use the OS keychain, so plain
`git push` / `git pull` just work — no token ever touches the shell history or the repo.

### Option B — SSH keys

```bash
ssh-keygen -t ed25519 -C "you@example.com"     # if you don't have a key yet
# add ~/.ssh/id_ed25519.pub to GitHub → Settings → SSH and GPG keys
git remote set-url origin git@github.com:<owner>/<repo>.git
ssh -T git@github.com                          # verify: "Hi <you>! You've successfully authenticated"
```

### Option C — Fine-grained Personal Access Token (only if A/B unavailable)

GitHub → **Settings → Developer settings → Fine-grained tokens** → scope to the single repo,
grant **Contents: Read and write** (add **Pull requests: Read and write** if you'll use `gh pr`).
Let the credential manager store it on first `git push` (git will prompt once). Set the shortest
sensible expiry and rotate before it lapses.

### Never do

- ❌ Don't run `git remote set-url origin https://<TOKEN>@github.com/...` — that persists the token
  in `.git/config`; any teammate who inspects the config or a shared shell leaks it.
- ❌ Don't store a token unprotected in `~/.netrc` or echo it in chat/logs.
- ❌ Don't commit `.env` (the gitignore check in Step 0 is non-negotiable).

---

## Step 2 — Branching

### Model

- `development` — protected integration branch. **No direct pushes**; everything lands via PR.
- `feat/<slug>` — new features, e.g. `feat/tani-ramah-design`.
- `fix/<slug>` — bug fixes, e.g. `fix/map-blank-on-load`.
- `chore/<slug>` — non-functional housekeeping, e.g. `chore/rspack-config`.
- `refactor/<slug>` — refactors without behaviour change.
- `docs/<slug>` — pure documentation work.
- `hotfix/<slug>` — urgent patch (branch off the released commit).

Slug rules: lowercase, kebab-case, ≤ 4 words, semantically tied to the unit of work.

> Personal branches (`dev-fahri`, `dev-chelsa`) are legacy. Prefer one feature branch per unit of
> work — they keep PRs small, reviewable, and independently mergeable.

### Always branch off the latest `development`

```bash
git switch development
git pull                              # get the latest integration state
git switch -c feat/<slug>             # start your feature from there
```

While a feature is in flight, resync periodically so conflicts stay small:

```bash
git switch feat/<slug>
git fetch origin
git merge origin/development          # or: git rebase origin/development (feature branch only)
```

> Use `git switch` in scripts — unlike `checkout` it can't accidentally restore files.

---

## Step 3 — Stage narrowly

```bash
git status --short                   # always look first
git diff --stat                      # see the magnitude of the change
git add <specific paths>             # never -A unless you reviewed everything
git diff --cached --stat             # confirm what is actually staged
```

Rules:

- ❌ Never `git add -A` / `git add .` in a directory you haven't `git status`-ed first — it
  routinely catches `.env`, large binaries, IDE leftovers, and log dirs.
- ❌ Never stage `node_modules/`, `dist/`, `build/`, `*.log`, `*.pyc`, `__pycache__/`, `.DS_Store`.
  If any appear in `git status`, fix `.gitignore` first.
- ✅ Stage by path or pattern: `git add apps/web/src/pages apps/web/src/styles/`.
- ✅ Use `git add -p <path>` to commit hunks selectively when one file mixes two concerns.

---

## Step 4 — Commit with Conventional Commits

Every commit subject is `<type>(<scope>): <imperative summary>`.

### Allowed types

| Type       | When                                                             |
| ---------- | ---------------------------------------------------------------- |
| `feat`     | New user-visible behaviour or new module                         |
| `fix`      | Bug fix without changing public API                              |
| `chore`    | Tooling, scripts, deps bump, no source behaviour change          |
| `docs`     | Docs only (README, CHANGELOG, /docs)                             |
| `refactor` | Internal change, same behaviour, same API                        |
| `perf`     | Observable performance fix                                       |
| `test`     | Test-only change                                                 |
| `build`    | Build system / bundler / Dockerfile                              |
| `ci`       | CI pipeline only                                                 |
| `style`    | Whitespace / formatter; never mixed with logic changes           |
| `revert`   | Revert of a prior commit (paste the reverted SHA in body)        |

### Scope

Optional but encouraged. Use the smallest meaningful surface: a page, a module, a file.
Examples: `feat(auth):`, `fix(map):`, `chore(web):`.

### Subject line

- Imperative mood — "add", "fix", "rename" — not "added", "fixes".
- ≤ 50 characters when possible; hard cap 72.
- No trailing period. Lowercase except proper nouns and code identifiers.

### Body

Write a body whenever the **why** isn't obvious from the subject. It answers:

1. What was wrong / what motivated the change.
2. What changed (one line per affected surface — file, module, page).
3. Why this approach over the obvious alternative, if the choice is non-trivial.

Keep paragraphs short, wrap at ~72 cols, code identifiers in backticks, and cross-reference issue
IDs (`#42`) when the change targets a specific one.

### No trailers / no watermark

Commit messages end at the body. **Do not** append `Co-Authored-By`, tool signatures, or any
watermark line.

> If your Claude Code CLI auto-appends a `Co-Authored-By` trailer, turn it off durably by setting
> `"includeCoAuthoredBy": false` in `~/.claude/settings.json` (or the repo's `.claude/settings.json`).

### One-shot commit

```bash
git commit -m "$(cat <<'EOF'
feat(auth): add login page + auth store

- LoginPage wires the shadcn form to useAuthStore.
- AuthGuard now redirects unauthenticated users to /login.
EOF
)"
```

Always use the heredoc form (`<<'EOF'`) — `-m "..."` single lines drop newlines and break body
formatting.

### Rules

- ❌ Never `--no-verify`. Pre-commit hooks exist for a reason; fix the failure, re-stage, recommit.
- ❌ Never `--amend` a commit that has already been pushed unless you fully control the branch and
  have warned every reader.
- ❌ Never split one logical change into N commits to "look productive"; never glue N logical
  changes into one to "save time".
- ✅ One commit = one reversible idea.

---

## Step 5 — Push and open a Pull Request

With auth set up in Step 1, pushing is plain git — no token in the URL.

```bash
git push -u origin feat/<slug>       # first push sets upstream; later pushes are just `git push`
```

Then open a PR **into `development`**:

```bash
gh pr create --base development --head feat/<slug> --fill
# --fill seeds title/body from your commits; edit before submitting if needed.
# Or open it from the GitHub web UI: "Compare & pull request".
```

PR hygiene:

- Target `development` (never push straight to it).
- Keep the PR scoped to one feature; link the issue (`Closes #42`) when there is one.
- Request review from your teammate; merge only after approval + green CI.
- **Do not delete the branch on merge** (team keeps merged branches). In the GitHub merge dialog,
  leave "Delete branch" unchecked; disable auto-delete in Settings → General → Pull Requests.

### What to do on auth / push failure

- `fatal: Authentication failed` → `gh auth status`; if stale, `gh auth refresh` (or re-run
  `gh auth login`). Never fall back to typing a password.
- `! [remote rejected] ... (protected branch hook declined)` → you tried to push to a protected
  branch (e.g. `development`). Push to your feature branch and open a PR instead.
- `non-fast-forward` (someone pushed first) → `git fetch && git merge origin/<branch>` (or
  `git rebase origin/<branch>` on a feature branch), resolve conflicts, push again.

### Force push

- ❌ Never `--force` (or `-f`) to `development` / `main`. Use `--force-with-lease` on a **feature**
  branch only, after warning anyone else who fetches it.
- Prefer undoing via a new commit (`git revert <sha>`) over rewriting shared history.

---

## Step 6 — CHANGELOG.md

Keep a `CHANGELOG.md` at the repo root in the
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) format — hand-maintained, one entry
per *meaningful* commit, grouped under semver release headings.

```markdown
# Changelog

All notable changes follow this file. Format: Keep a Changelog; commits follow Conventional Commits.

## [Unreleased]

### Added
- `path/to/file` — one-line summary.
### Changed
- ...
### Fixed
- ...
### Removed
- ...

## [0.2.0] — 2026-07-21

### Added (`<short-sha>`) — `feat(scope): <subject>`
- One-line outcome.
```

Maintenance loop:

1. After each meaningful commit, add an entry under `## [Unreleased]` in the right category.
2. At release, rename `[Unreleased]` → `[x.y.z] — YYYY-MM-DD` and add a fresh empty `[Unreleased]`.
3. Reference each commit by short SHA so the entry maps back to git.

---

## Step 7 — Tag a release (semver)

Annotated tags only — lightweight tags drop the tagger/message/date and break release tooling.

```bash
git tag -a v0.2.0 -m "v0.2.0 — <one-line summary>"
git push origin v0.2.0          # push one tag
# or: git push origin --tags    # push all local tags
```

### Semver rules

| Bump  | When                                                             |
| ----- | ---------------------------------------------------------------- |
| Major | Backward-incompatible change (API / route / DB schema break)     |
| Minor | New feature, backward-compatible                                  |
| Patch | Bug fix or doc-only change                                        |

Pre-1.0: bump the minor on each meaningful slice (`v0.1.0` → `v0.2.0` → …); reserve `v1.0.0` for the
first production-ready slice. Keep the version in sync across CHANGELOG, `package.json`,
`pyproject.toml`, and any tagged Docker image.

> Don't move a tag that's already pushed — cut a fresh patch (`v0.2.1`) instead.

---

## Step 8 — Recovery moves

| Symptom                                                          | Fix                                                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Pre-commit hook fails the commit                                  | Read the hook output, fix the issue, `git add` the fix, commit again. **Never** `--no-verify`.               |
| Push rejected: `non-fast-forward`                                 | Someone pushed first. `git fetch && git rebase origin/<branch>` (resolve conflicts), then push.             |
| Push rejected: `(protected branch hook declined)`                 | You pushed to a protected branch. Push to a feature branch + open a PR into `development`.                    |
| `fatal: Authentication failed`                                    | `gh auth status` → `gh auth refresh` / re-login. **Never** prompt for a password.                           |
| Token/secret leaked into a commit                                 | Rotate it immediately (GitHub → the token's settings). If it hit `development`/`main`, rewrite history with git-filter-repo, coordinate a force-push, and post an incident note. |
| Accidentally committed `node_modules/` or `.env`                 | `git rm --cached -r <path>` → fix `.gitignore` → new commit. If it hit a shared branch, treat as a leak above. |
| Wrong commit on the wrong branch                                  | `git reset --soft HEAD~N` to keep changes staged, `git switch <correct-branch>`, commit fresh.               |
| Undo the last commit but keep changes                             | `git reset --soft HEAD~1` (staged) or `git reset HEAD~1` (unstaged). Avoid `--hard` unless you mean it.       |
| Abandon the last commit entirely                                  | `git reset --hard HEAD~1` — **destructive**, the working tree is overwritten.                                |
| Amend the last (unpushed) commit                                  | `git commit --amend` (message) or `git add <fix> && git commit --amend --no-edit` (fold in a fix).           |
| Amend an already-pushed commit                                    | Don't. Push a follow-up commit. If you truly must, coordinate first and use `--force-with-lease`.            |

---

## Step 9 — Project git memory

The active project's git facts live in `docs/` and the repo's `CONTRIBUTING.md`:

- Remote host/owner/repo, trunk name (`development`), and branch policy → `CONTRIBUTING.md`.
- In-progress work handover → `docs/HANDOVER.md` (see the `session-handover` skill).

Sharing this workflow with a teammate: the skill lives at `.claude/skills/git-flow/` — it only
travels with the repo if `.claude/skills/` is committed and pushed. Review what else under `.claude/`
you want public before pushing it.

---

## Quick reference card

```bash
# === one-time per machine ===
gh auth login && gh auth status          # or set up SSH (Step 1, Option B)

# === start a feature ===
git switch development && git pull
git switch -c feat/<slug>

# === per commit ===
git status --short
git diff --stat
git add <paths>
git diff --cached --stat
git commit -m "$(cat <<'EOF'
<type>(<scope>): <subject ≤ 50 chars>

<why + what — one line per surface>
EOF
)"

# === push + PR (into development) ===
git push -u origin feat/<slug>
gh pr create --base development --head feat/<slug> --fill
# leave "Delete branch" UNCHECKED on merge (team keeps merged branches)

# === changelog ===
# Add the commit under ## [Unreleased] → ### {Added|Changed|Fixed|...} in CHANGELOG.md.

# === tag a release ===
git tag -a v<x.y.z> -m "v<x.y.z> — <one-line>"
git push origin v<x.y.z>
```
