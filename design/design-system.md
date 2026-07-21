# Design System

## Active Config

| platform | theme    |
| -------- | -------- |
| web      | tactical |
| mobile   | - |

> To switch: update table above. Active path → `./[platform]/[theme]/`

---

## File Reference

| File            | Web path                          | Mobile path                          |
| --------------- | --------------------------------- | ------------------------------------ |
| DESIGN.md       | `./web/[theme]/DESIGN.md`         | `./mobile/[theme]/DESIGN.md`         |
| CSS Variables   | `./web/[theme]/variable.css`      | `./mobile/[theme]/variable.css`      |
| Tailwind        | `./web/[theme]/tailwind.css`      | `./mobile/[theme]/tailwind.css`      |

Load on use: `DESIGN.md`, `variable.css`, `tailwind.css` — skip `design-token.json`.

---

## Available Themes

| Platform | Theme    | Status   |
| -------- | -------- | -------- |
| web      | tactical | ✓ active |
| web      | fusion   | inactive |