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
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the build (also forwards `/api`) |
| `npm run seed:demo` | Load demo organisations, users and transfers into an empty backend |

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
