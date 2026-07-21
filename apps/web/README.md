# React.js Web Application Template

## Tech Stack

- **Core:** React 18+, TypeScript (strict mode, no `any`)
- **State Management:** Zustand
- **API Client:** Axios with interceptors
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix-based)
- **Data Tables:** React Table (@tanstack/react-table)
- **Data Visualization:** Apache ECharts
- **Maps:** Mapbox GL JS
- **Form Handling:** React Hook Form
- **Validation:** Yup

## Architecture

### Component Architecture

- Functional components with React hooks
- Atomic design pattern for components
- Separation of business logic (custom hooks) from UI

### State Management

- Global state: Zustand stores
- Local state: React hooks (`useState`, `useReducer`)
- Server state: React Query (if needed)

### Folder Structure

```
web-reactjs/
├── public/                      # STATIC ASSETS (Directly copied to dist)
│   ├── favicon.ico
│   ├── manifest.json            # PWA: Manifest for app identity
│   ├── robots.txt
│   ├── sw.js                    # Service Worker (If manual)
│   ├── icons/                   # PWA: Icon (192x192, 512x512)
│   └── images/                  # Static images (Logo, Placeholder)
│
├── .babelrc                     # Transpiler configuration
├── .eslintrc.json               # Code Quality: Linter
├── .gitignore                   # Git ignore rules
├── .nvmrc                       # Node Version Manager config
├── .prettierrc.json             # Code Style: Formatter
├── components.json              # shadcn/ui configuration
├── design-tokens.json           # Design System: Tokens from Figma
├── globals.css                  # Global CSS legacy / utilities
├── index.html                   # HTML Entry point
├── package-lock.json            # Lock file for dependencies
├── package.json                 # Dependencies & Scripts (Rspack, PWA, etc)
├── postcss.config.js            # CSS Processing: Tailwind 4 & PostCSS
├── proxy.config.json            # Dev server proxy configuration
├── README.md                    # Project documentation
├── rspack.config.ts             # Build Tool: Core Rspack configuration
├── rspack.dev.ts                # Build Tool: Development environment setup
├── rspack.prod.ts               # Build Tool: Production build & optimization
├── tsconfig.json                # TypeScript: Config & Path Alias (@/*)
│
└── src/
    ├── main.tsx                 # Entry Point: Client Root & PWA Register
    ├── index.css                # CSS Entry: Combines all styles
    ├── App.tsx                  # Root Component (Legacy/Reference)
    ├── pwa-register.js          # Logic: Service Worker registration
    ├── report-web-vitals.js     # Performance monitoring
    ├── setup-tests.js           # Test environment setup
    │
    ├── routes/                  # ROUTING ENGINE
    │   ├── index.tsx            # Master Router & RouterProvider
    │   ├── main.routes.tsx      # Config: /dashboard, /topic
    │   ├── admin.routes.tsx     # Config: /administrator
    │   ├── auth.routes.tsx      # Config: /auth
    │   └── guards/              # ROUTE PROTECTION
    │       ├── AuthGuard.tsx    # Protected route check
    │       └── RoleGuard.tsx    # RBAC (Role Based Access Control)
    │
    ├── assets/                  # PROCESSED ASSETS (Compressed by Bundler)
    │   ├── icons/               # SVGs as components/assets
    │   └── images/              # Images imported in JS/TS
    │
    ├── components/              # ATOMIC COMPONENT DESIGN
    │   ├── ui/                  # Shadcn/UI (Atomic: Button, Input, Modal)
    │   ├── layout/              # Layout: AppLayout, Sidebar, Navbar
    │   ├── domain/              # Logic-heavy: MapViewer, FlightMonitor
    │   └── wrappers/            # HOCs: MapboxProvider, EchartsWrapper
    │
    ├── config/                  # APP CONFIGURATION
    │   ├── constants.ts         # Static data, Enums
    │   ├── theme-config.ts      # Theme colors for JS (Echarts/Charts)
    │   └── env.ts               # Type-safe ENV variables
    │
    ├── hooks/                   # Custom React Hooks (Re-usable)
    │
    ├── styles/                  # GLOBAL THEME & TAILWIND 4
    │   ├── theme.css            # @theme Tailwind 4 (Custom colors, fonts)
    │   ├── variables.css        # CSS Variables (:root tokens)
    │   └── components.css       # Custom CSS classes / UI overrides
    │
    ├── stores/                  # State Management (Zustand)
    │   ├── useUserStore.ts
    │   └── useAppStore.ts
    │
    ├── services/                # API LAYER (Axios/Fetcher)
    │   ├── api-client.ts        # Axios Instance & Interceptors
    │   └── modules/             # Resource-based: authService, flightService
    │
    ├── types/                   # TypeScript Definitions
    │   ├── api.d.ts             # Interface API Response/Request
    │   ├── models.d.ts          # Interface Entity (User, Project)
    │   └── theme.d.ts           # Type for custom theme/config
    │
    ├── utils/                   # Utility Functions (Pure Functions)
    │   ├── cn.ts                # Tailwind Merge & Clsx helper
    │   ├── date-formatter.ts
    │   └── map-helpers.ts       # Specific logic for GeoJSON/Mapbox
    │
    └── pages/                   # ROUTE COMPONENTS (Page-based)
        ├── dashboard/           # Folder per page (Modular)
        │   ├── index.tsx
        │   ├── hooks/           # Custom hooks for this page
        │   └── parts/           # Sub-components for this page
        └── auth/
            └── login.tsx
```

## Component Wrappers

This template uses **High-Level Component Wrapper** architecture:

| Use Case       | Component                         | Documentation                          |
| -------------- | --------------------------------- | -------------------------------------- |
| Authentication | `<AuthComponent>`                 | `@/docs/web-component-auth.md`         |
| Admin Layout   | `<AppLayout>`, `<AdminComponent>` | `@/docs/web-component-admin-layout.md` |
| Data Display   | `<DataList>`                      | `@/docs/web-component-data-crud.md`    |
| Data Forms     | `<DataForm>`                      | `@/docs/web-component-data-crud.md`    |

**⚠️ DO NOT** build UI components (tables, forms, pagination, modals) from scratch using raw HTML tags.

## Conventions

### Naming

- Variables/Functions: `camelCase`
- Components/Interfaces: `PascalCase`
- Files: `kebab-case`

### TypeScript

- Strict typing enabled
- No `any` type allowed
- Use interfaces for component props

### Imports

- Use absolute paths: `@/components/ui/` instead of `../../components/ui/`

## API & Authentication

- JWT-based authentication
- Axios interceptors for:
  - Token injection (Authorization header)
  - Error handling and token refresh

## Maps (Mapbox GL JS)

- Access tokens stored in environment variables
- Component: `mapbox-gl` with TypeScript definitions

```bash
npm install mapbox-gl @types/mapbox-gl
```

## Data Visualization (ECharts)

- Responsive charts themed with shadcn/ui colors
- Package: `echarts` with React wrapper

```bash
npm install echarts echarts-for-react
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint
```

## Environment Variables

```env
REACT_MAPBOX_TOKEN=your_mapbox_access_token
```

## Best Practices

1. **Read documentation first** - Check `@/docs/` for component contracts
2. **Separate concerns** - Keep business logic in custom hooks
3. **Type safety** - Define interfaces for all props and API responses
4. **Error handling** - Use Axios interceptors for centralized error handling
5. **Responsive design** - All components must be responsive by default
