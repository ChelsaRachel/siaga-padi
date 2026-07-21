# Design System

## Active Config

| platform | theme  |
| -------- | ------ |
| web      | fusion |
| mobile   | -      |

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
| web      | fusion   | ✓ active |
| web      | tactical | inactive |

> Siaga Padi uses **fusion**, customised to the "Tani Ramah" direction — soft
> natural colours (leaf green, rice yellow, warm earth), large corner radii,
> illustrative icons, and thin shadows. Primary users are farmers with varied
> digital literacy, often on a phone **outdoors in bright sunlight**, so colour
> choices must clear WCAG AA contrast, not just look friendly.