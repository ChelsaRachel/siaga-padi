# Continuation Prompt — paste into a fresh session

Copy everything in the block below as the first message to the new agent.

---

You are continuing **{{PROJECT_NAME}}**. {{PROJECT_GOAL}}

WORK DIR: `{{REPO_PATH}}` (git branch `{{BRANCH}}` — {{REMOTE_STATUS}}; do NOT push without asking).
{{KEY_SOURCES_LINE}}  <!-- other repos/paths this work reads from, if any -->

FIRST, read these in order (do not skip):
{{READING_LIST}}
<!-- numbered: HANDOVER.md first, then the project's plan/spec/changelog/acceptance docs -->

KEY FACTS:
{{KEY_FACTS}}
<!-- 4-8 bullets: toolchain + how to build/run/verify, the orientation model, what's done,
     where to put outputs. Dense; this is the only context the new agent starts with. -->

RULES: {{RULES}}
<!-- the project's working rules to keep + the must-not-break gotchas, in one paragraph -->

NEXT TASK: {{NEXT_TASK}}
<!-- the immediate next task, concretely, then the broader sequence. End with: -->
Verify each visible change ({{VERIFY_METHOD}}). Confirm you've read the docs above, then proceed.

---
