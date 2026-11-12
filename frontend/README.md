# VANGUARD

VANGUARD is the web interface for the Multi-Tenant Authorization Engine backend. Menus and actions follow the signed-in user's current permissions, which are re-read from `GET /api/me` every 15 seconds. The backend enforces every rule; the interface only hides what would be refused.

## Run

```bash
npm install
npm run dev          # http://localhost:5173, forwards /api to http://localhost:8080
```

Use `VITE_API_TARGET=http://host:port npm run dev` to point at another backend.

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check and build to `dist/`, calling the API on the same origin (used when Spring Boot serves the dashboard) |
| `npm run build:pages` | Build for Cloudflare Pages, calling the API at `VITE_API_BASE_URL` from `.env.cloudflare` |
| `npm run preview` | Serve the build (also forwards `/api`) |
| `npm run seed:demo` | Load demo organisations, users and transfers into an empty backend |

## Deploy to Cloudflare Pages

Production layout: dashboard at `https://madora.in`, API at `https://api.madora.in` (Railway).

| Pages setting | Value |
|---|---|
| Root directory | `frontend` |
| Build command | `npm run build:pages` |
| Build output directory | `dist` |
| Node version | from `.nvmrc` (22) |

- `.env.cloudflare` sets `VITE_API_BASE_URL=https://api.madora.in`. A Pages environment variable with the same name overrides it. The value is built into the bundle, so changing it needs a new deployment.
- The build writes `dist/_headers`. Pages applies it as security headers on every page and as one-year caching for `/assets/*`. The Content-Security-Policy allows API calls only to `VITE_API_BASE_URL`, which must be `https`.
- Pages serves `index.html` for routes such as `/users`, so reloads and shared links work.
- Keep Cloudflare features that inject scripts (Rocket Loader, Email Obfuscation, Web Analytics auto-injection) off, or the Content-Security-Policy will block them.
- The backend must allow the dashboard's origin. On Railway set `APP_CORS_ALLOWED_ORIGINS=https://madora.in,https://www.madora.in`, and add `https://*.<project>.pages.dev` if you use preview deployments.

## Demo data

```bash
PLATFORM_ADMIN_EMAIL=… PLATFORM_ADMIN_PASSWORD=… npm run seed:demo
```

All demo accounts use the password `Demo-Pass-2026!`. To show a demo-account picker on the sign-in page, set `VITE_DEMO_MODE=true` in `.env.development`. Demo accounts are left out of the build when it is `false`.

## Screens

| Screen | Required permission |
|---|---|
| Overview, Profile | Any signed-in user |
| My requests | `transfer:create` |
| Approvals | `transfer:approve` and `transfer:read` |
| All transfers | `transfer:read` |
| Users | `user:read` |
| Roles | `role:read` |
| Permissions | `permission:read` |
| Audit log | `audit:read` |
| Organisations | `tenant:read` (platform) |
