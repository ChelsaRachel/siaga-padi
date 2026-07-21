# HANDOVER — {{PROJECT_NAME}}

State snapshot for picking this up in a fresh session.
{{RELATED_DOCS_LINE}}  <!-- e.g. "Pair with CHANGELOG.md and docs/plan/." -->

- Repo: `{{REPO_PATH}}`
- Branch: `{{BRANCH}}` · {{REMOTE_STATUS}}  <!-- e.g. "local only, no remote pushed" + commit count + HEAD -->
- Goal (one line): {{PROJECT_GOAL}}

---

## 1. Orientation (read first)
{{ORIENTATION}}
<!-- The non-obvious mental model a newcomer needs before touching anything: key concepts,
     terminology that's easy to misread, transitional vs final architecture, etc. Delete if none. -->

## 2. Done so far
{{DONE}}
<!-- Per milestone/phase: what's complete and VERIFIED (not just written). Cite evidence
     (tests passing, screenshots, commit ids). Mark in-progress items explicitly. -->

## 3. Environment
{{ENVIRONMENT}}
<!-- Anything non-default a fresh agent must know: tool versions + install locations, services,
     credentials handling (where secrets live, what's gitignored), OS/sandbox quirks. -->

## 4. Build / run / test / verify
```
{{COMMANDS}}
```
<!-- Exact commands that work, including env vars, flags, and how to verify (run tests / capture
     a screenshot / hit an endpoint). Copy-pasteable. -->

## 5. Conventions & gotchas
{{CONVENTIONS}}
<!-- Project rules to keep (commit style, where to put things, what NOT to do) + concrete traps
     already hit this session (error → fix), so the next agent doesn't repeat them. -->

## 6. Next steps
{{NEXT}}
<!-- Ordered, concrete. The immediate next task first, then the broader sequence. -->

## 7. Blockers / decisions for the user
{{BLOCKERS}}
<!-- Things only the user can resolve (URLs, credentials, hardware, design choices). -->
