---
name: icon
description: Implementation guide for using icons. Phosphor Web (CSS) is the only allowed icon source. Covers direct usage, renderIcon utility, weight variants, menu config wiring, and CDN proxy configuration.
---

# Icon Skill (React / TypeScript / Next.js)

---

## Setup (already done in boilerplate — do not touch)

Phosphor CSS is loaded via `<link>` tags in `index.html` (for Vite) or `layout.tsx` (for Next.js), served from local assets:

```html
<link rel="stylesheet" type="text/css" href="/cdn-assets/icons/@phosphor-icons/regular/style.css" />
<link rel="stylesheet" type="text/css" href="/cdn-assets/icons/@phosphor-icons/thin/style.css" />
<link rel="stylesheet" type="text/css" href="/cdn-assets/icons/@phosphor-icons/light/style.css" />
<link rel="stylesheet" type="text/css" href="/cdn-assets/icons/@phosphor-icons/bold/style.css" />
<link rel="stylesheet" type="text/css" href="/cdn-assets/icons/@phosphor-icons/fill/style.css" />
<link rel="stylesheet" type="text/css" href="/cdn-assets/icons/@phosphor-icons/duotone/style.css" />
```

- ❌ Do NOT add `@import url(...)` for Phosphor in any CSS file
- ❌ `@phosphor-icons/react` must NOT be in `package.json`
- ✅ Icons are available globally — no per-component setup needed

---

## Proxy Configuration for CDN Assets

Because the boilerplate uses the `/cdn-assets` path, the application requires a reverse proxy to correctly route these requests to the external CDN (`https://assets.ebdeskfusion.ai`) in both development and production environments.

### 1. Vite Config (`vite.config.ts` for Development)
Ensure the proxy rewrite is configured to strip the `/cdn-assets` prefix:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/cdn-assets': {
        target: 'https://assets.ebdeskfusion.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cdn-assets/, '')
      }
    }
  }
});
```

### 2. Next.js Config (`next.config.mjs` or `next.config.js`)
If you are using Next.js, use the `rewrites` function to map incoming `/cdn-assets/...` requests to the external CDN URL:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/cdn-assets/:path*',
        destination: 'https://assets.ebdeskfusion.ai/:path*',
      },
    ];
  },
};

export default nextConfig;
```

### 3. Rspack Config (`rspack.dev.ts` for Development)
If the project uses Rspack instead of Vite, configure the dev server proxy with the same rewrite:

```ts
// rspack.dev.ts — development proxy
proxy: {
  '/cdn-assets': {
    target: 'https://assets.ebdeskfusion.ai',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/cdn-assets/, ''),
  },
}
```

### 4. Nginx Config (`nginx.conf` for Production)
Ensure the location block includes a trailing slash on the `proxy_pass` to handle the URL rewrite automatically:

```nginx
location /cdn-assets/ {
    proxy_pass https://assets.ebdeskfusion.ai/;
    proxy_ssl_server_name on;
    proxy_set_header Host assets.ebdeskfusion.ai;
}
```

---

## Pattern 1 — Direct `<i>` tag

Use for static, hardcoded icons in shell components, buttons, and UI elements.

```tsx
{/* Regular (default weight) */}
<i className="ph ph-house" aria-hidden="true" />

{/* Fill weight */}
<i className="ph-fill ph-fire" aria-hidden="true" />

{/* Bold weight */}
<i className="ph-bold ph-warning" aria-hidden="true" />

{/* Size via Tailwind arbitrary */}
<i className="ph ph-house text-[20px]" aria-hidden="true" />

{/* Size + color */}
<i className="ph-fill ph-fire text-[22px] text-secondary-500" aria-hidden="true" />
```

**Icon slug format:** kebab-case matching [phosphoricons.com](https://phosphoricons.com)
- ✅ `chart-line-up`, `clock-countdown`, `wifi-high`
- ❌ `chartLineUp`, `ClockCountdown`, `WifiHigh`

---

## Pattern 2 — `renderIcon()` utility

Use when icon name/type/weight comes from config (e.g. menu items, dynamic data).

```tsx
import { renderIcon } from '@/utils/icon-renderer'
import type { IconWeight } from '@/utils/icon-renderer'

// Basic
renderIcon({ icon: 'house' })

// With weight
renderIcon({ icon: 'house', weight: 'fill' })

// With size
renderIcon({ icon: 'house', weight: 'bold', size: 20 })

// From menu config
renderIcon({
  icon: item.icon,
  iconType: item.additional?.iconType,         // 'phosphor' | 'svg-code'
  weight: item.additional?.iconStyle as IconWeight ?? 'regular',
  size: 16,
})
```

---

## Weight Reference

| Weight | `<i>` class | `renderIcon` weight |
|---|---|---|
| Regular | `ph ph-{name}` | `'regular'` |
| Fill | `ph-fill ph-{name}` | `'fill'` |
| Bold | `ph-bold ph-{name}` | `'bold'` |
| Light | `ph-light ph-{name}` | `'light'` |
| Duotone | `ph-duotone ph-{name}` | `'duotone'` |

---

## Menu Config Wiring

In `app.menu.ts` / `administrator.menu.ts`, icon fields:

```ts
{
  icon: 'chart-line-up',        // Phosphor slug — used in renderIcon({ icon: item.icon })
  additional: {
    iconType: 'phosphor',       // always 'phosphor' for standard icons
    iconStyle: 'regular',       // default weight (inactive state)
    iconStyleActive: 'fill',    // weight when nav item is active
  }
}
```

AppHeader automatically passes `iconStyle` to `renderIcon` for active/inactive states.

---

## `renderIcon` utility location

```
src/utils/icon-renderer.tsx
```

```tsx
export type IconType = 'phosphor' | 'svg-code'
export type IconWeight = 'regular' | 'fill' | 'bold' | 'light' | 'duotone'

export function renderIcon({ icon, iconType = 'phosphor', weight = 'regular', size, className }: RenderIconOptions): React.ReactElement | null
```

---

## svg-code — Custom Brand Icons

Only for icons not available in Phosphor (e.g. brand logos, custom design team assets):

```ts
// In menu config
{
  icon: '<svg viewBox="0 0 24 24">...</svg>',
  additional: { iconType: 'svg-code', ... }
}

// Direct usage
renderIcon({ icon: '<svg>...</svg>', iconType: 'svg-code', size: 20 })
```

⚠️ Never use `svg-code` with user-supplied strings — XSS risk.

---

## Finding icon slugs

1. Visit [phosphoricons.com](https://phosphoricons.com)
2. Search by keyword
3. Copy the icon name → convert to kebab-case
   - `ChartLineUp` → `chart-line-up`
   - `ClockCountdown` → `clock-countdown`
   - `WifiHigh` → `wifi-high`

---

## Rules & Constraints

### Icon Library Standard

**Only Phosphor Web (CSS) is allowed.** No React icon packages.

| Library                           | Status                                              |
| --------------------------------- | --------------------------------------------------- |
| Phosphor Web CSS (`ph ph-{name}`) | ✅ Required                                         |
| `@phosphor-icons/react`           | ❌ Forbidden                                        |
| `lucide-react`                    | ❌ Forbidden                                        |
| `react-icons`                     | ❌ Forbidden                                        |
| Raw inline SVG in JSX             | ❌ Forbidden (use `svg-code` type via `renderIcon`) |

### svg-code Type

Only use `iconType: 'svg-code'` for:

- Brand/logo icons not available in Phosphor
- Custom icons provided by the design team as SVG strings

**Never use `svg-code` for:**

- User-supplied content (XSS risk)
- Icons that exist in Phosphor

---

## Pre-Submission Checklist

- [ ] No import from `lucide-react`, `@phosphor-icons/react`, or `react-icons`
- [ ] All icons use `<i className="ph{-weight} ph-{name}">` or `renderIcon()`
- [ ] `aria-hidden="true"` on all decorative icons
- [ ] Accessible icons (standalone without label text) have `aria-label` on the parent button
- [ ] Icon slug is kebab-case matching Phosphor icon name (e.g. `chart-line-up`, not `chartLineUp`)
- [ ] `iconType: 'phosphor'` set in menu config `additional` field
- [ ] Proxy configuration for `/cdn-assets` is properly set in Vite, Next.js, and/or Nginx depending on the project