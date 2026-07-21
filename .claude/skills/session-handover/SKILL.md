---
name: session-handover
description: Generate a HANDOVER doc + a paste-ready CONTINUATION PROMPT so in-progress work can be picked up by a fresh/empty session (or another person/agent) with full context and no chat history. Use when the user asks to "hand over", "handover", "buatkan handover", "continue in a new/fresh session", "lanjutkan ke sesi lain/baru/kosong", "continuation/kickoff prompt", "context dump for next session", "document where we are so someone else can continue", or wants to wrap up a session into a resumable package. Project-agnostic — works for any codebase or task.
---

# Session Handover

Produce two artifacts so work continues seamlessly elsewhere:
1. **HANDOVER.md** — durable state snapshot (what's done/verified, env, build/run, conventions, next, blockers).
2. **CONTINUATION-PROMPT** — a copy-paste first message that boots a fresh agent into the work.

Templates: `assets/HANDOVER.template.md`, `assets/CONTINUE-PROMPT.template.md`. Read both, fill every
`{{PLACEHOLDER}}`, delete the `<!-- guidance -->` comments. The two must agree — the prompt is the
dense distillation of the handover.

## Core principle
The reader has **zero chat history**. Capture only what they can't trivially re-derive, but everything
they can't. Favor **verified** state with evidence over claims. Never invent commands, paths, or status —
if unknown, run a command to find out, or mark it explicitly as unknown/TODO.

## Workflow

### 1. Gather state (don't guess — inspect)
- **Git**: branch, commit count, HEAD short hash, recent `git log --oneline`, remote presence
  (`git remote -v`), uncommitted/untracked files. Commit or note any loose work first.
- **Build/run/test**: find the real commands (README, package.json scripts, CMake presets, Makefile,
  CI workflow). **Run the verify path** (tests / build / launch) and record exact working commands +
  required env vars/flags. If a screenshot or endpoint is how you verify, note how to produce it.
- **Environment**: non-default tool versions + install locations, services/ports, how secrets are
  handled (where they live, what's gitignored), OS/sandbox quirks that bit you.
- **Project intent**: skim the project's own plan/spec/roadmap/changelog/acceptance docs; link them in
  the reading list rather than restating.
- **Done vs in-progress**: per milestone, what is complete AND verified vs partial. Cite evidence.
- **Gotchas**: concrete traps hit this session (error → fix) so they aren't repeated.
- **Blockers**: what only the user can decide/provide.

### 2. Write the artifacts
- Pick a docs location (prefer existing `docs/`, else repo root). Write `HANDOVER.md` and
  `CONTINUE-PROMPT.md` from the templates.
- The CONTINUATION-PROMPT's reading list MUST point to HANDOVER.md first, then the project's own docs.
- Keep the prompt dense (it's the new agent's entire starting context) and end it with: verify each
  change + "Confirm you've read the docs above, then proceed."

### 3. Deliver
- If a repo: commit both (Conventional Commits, e.g. `docs: handover + continuation prompt`). Don't
  push unless the user asked.
- Tell the user the two file paths and the 3-step handover: open a fresh session in the work dir →
  paste the CONTINUE-PROMPT block → the new agent reads HANDOVER + plan and continues.

## Notes
- Scale to the work: a small task needs a short handover; a multi-phase build needs the full template.
- If the user wants only one artifact (just the prompt, or just the doc), produce that one.
- Re-running on a later session: update the existing files in place rather than duplicating.
