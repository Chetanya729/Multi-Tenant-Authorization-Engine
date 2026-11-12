# Multi-Tenant Authorization Engine

A Spring Boot backend that lets many organisations (tenants) share one application safely. It decides **who can do what**, keeps every tenant's data **isolated**, and lets admins create and change **roles and permissions at runtime**, with no code changes, restarts or re-logins.

## Features

- **Dynamic RBAC:** admins create duties (permissions) and roles through the API and assign them to users. Changes take effect on the user's **next request**.
- **Multi-tenancy:** each tenant owns its own users, roles and duties. Another tenant's data returns `404`, as if it did not exist.
- **Deny by default:** every endpoint must declare its access level; anything undeclared is refused.
- **Secure authentication:** BCrypt passwords, opaque short-lived access tokens, hashed refresh tokens, forced password change on first login.
- **Instant revocation:** logout, disabling a user and suspending a tenant end live sessions immediately.
- **Escalation guards:** nobody can grant, revoke or manage power they do not hold themselves.
- **Transfer approvals:** a sample business workflow. Employees submit money transfers, and finance managers approve them within their role's approval limit, never their own.
- **Audit log:** every security-relevant change records who, what and when, and never stores passwords or tokens.
- **VANGUARD dashboard:** a React app in `frontend/` whose menus and actions follow the signed-in user's live duties.

## How access is decided

```text
Platform tenant ── platform admin ── creates tenants, suspends them
Tenant (e.g. ABC Finance)
   └── users ──have──▶ roles ──carry──▶ duties (e.g. transfer:approve)
```

A request to a protected endpoint passes **all** of these checks:

1. **Valid token:** the access token's hash is found in Redis, which identifies the user and tenant. Otherwise `401`.
2. **Required duty:** the endpoint's `@RequiresPermission` duty is held **right now**, through an active role, in an active tenant, by an enabled user. Otherwise `403`.
3. **Service check:** `@PreAuthorize` checks the same duty again on the service method, so it cannot be bypassed through another controller.
4. **Tenant scope:** every query is filtered by the tenant from the token, never by anything the client sends. Other tenants' data returns `404`.

Duties are **never stored in tokens**. They are read from the database on every request, so revoking a duty or role is effective immediately.

### Endpoint access levels

| Level | Declared with | Example |
|---|---|---|
| Public | `permitAll` in `SecurityConfig` | `POST /api/auth/login` |
| Authenticated | `@AuthenticatedOnly` | `GET /api/me` |
| Duty-protected | `@RequiresPermission("user:create")` | `POST /api/users/create` |
| Platform-protected | `@RequiresPermission(value = "tenant:create", scope = PLATFORM)` | `POST /api/tenants/create` |

## Tech stack

**Backend:** Java 17 · Spring Boot 4 · Spring Security 7 · PostgreSQL · Flyway · Redis · Maven

**Dashboard:** React 19 · TypeScript · Vite · Tailwind CSS 4 · TanStack Query · Recharts

## Getting started

**Requirements:** Java 17+, PostgreSQL 15+, Redis

1. **Create the database**
   ```bash
   createdb -h localhost -U postgres multitenant_db
   ```
2. **Add `src/main/resources/application-local.yaml`** (git-ignored) with your database credentials:
   ```yaml
   spring:
     datasource:
       url: jdbc:postgresql://localhost:5432/multitenant_db
       username: your_db_user
       password: your_db_password
   ```
3. **Set the first platform admin** through environment variables. It is created once, on first start:
   ```bash
   export PLATFORM_ADMIN_EMAIL=admin@platform.test
   export PLATFORM_ADMIN_PASSWORD='choose-a-strong-password'
   ```
   Optional: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (defaults: `localhost`, `6379`, none).
4. **Run**
   ```bash
   ./mvnw spring-boot:run
   ```
   Flyway creates the schema, seeds the Platform tenant and its 21 duties, and the platform admin is created.
5. **Develop the dashboard** (Node 22+) in a second terminal, with hot reload:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:5173`. The dev server forwards `/api` calls to the backend on port 8080.
6. **Optional: load demo data.** This creates two organisations (Acme Finance and Globex Corp), roles, personas and transfers through the public API:
   ```bash
   cd frontend
   PLATFORM_ADMIN_EMAIL=admin@platform.test PLATFORM_ADMIN_PASSWORD='your-password' npm run seed:demo
   ```
   All demo accounts use `Demo-Pass-2026!`. Set `VITE_DEMO_MODE=true` in `frontend/.env.development` to show a demo-account picker on the sign-in page. Run the script against a fresh database; it stops if the demo data already exists.

For a live demo, consider raising the 5-minute access-token lifetime in `application-local.yaml` (`app.security.tokens.access-token-ttl: 60m`), since the refresh endpoint is not built yet.

### Build and deploy as one application

```bash
./mvnw clean package
java -jar target/Multi-Tenant-0.0.1-SNAPSHOT.jar
```

The Maven build downloads a project-local Node (no Node install needed), builds the dashboard and packs it into the jar. The API and the dashboard are then served together at `http://localhost:8080`. Use `-Dfrontend.skip=true` to build the API only.

- Dashboard routes such as `/users` return `index.html`, and the React router takes over in the browser.
- Hashed files under `/assets` are cached for a year; `index.html` is fetched fresh on every load, so a new release is picked up immediately.
- API responses keep `Cache-Control: no-store`, and the strict Content-Security-Policy applies to the dashboard too. Only `/actuator/health` is open.
- Running from IntelliJ skips the Maven frontend step, so use `npm run dev` there.

### Run the API in Docker

The `Dockerfile` builds the API only (the dashboard can be hosted separately, for example on Cloudflare Pages). It runs on a JRE as a non-root user with the `prod` profile. Local secrets (`application-local.yaml`) are excluded by `.dockerignore`.

```bash
docker build -t vanguard-api .
docker run -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/multitenant_db \
  -e SPRING_DATASOURCE_USERNAME=postgres -e SPRING_DATASOURCE_PASSWORD=… \
  -e REDIS_HOST=host.docker.internal \
  -e PLATFORM_ADMIN_EMAIL=… -e PLATFORM_ADMIN_PASSWORD=… \
  -e APP_CORS_ALLOWED_ORIGINS=http://localhost:5173 \
  vanguard-api
```

| Variable | Purpose | Default |
|---|---|---|
| `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | PostgreSQL connection (JDBC URL: `jdbc:postgresql://host:port/db`) | `localhost:5432/multitenant_db`, `postgres` |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_USERNAME` / `REDIS_PASSWORD` / `REDIS_DATABASE` | Redis connection | `localhost`, `6379`, none, none, `0` |
| `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` | First platform admin, created once on the first start | none |
| `APP_CORS_ALLOWED_ORIGINS` | Comma-separated dashboard origins allowed to call the API; patterns such as `https://*.my-project.pages.dev` work | `http://localhost:5173` |
| `PORT` | HTTP port (set automatically by Railway) | `8080` |
| `ACCESS_TOKEN_TTL` | Access-token lifetime, e.g. `15m` | `5m` |
| `SPRING_PROFILES_ACTIVE` | Profile; the image sets `prod` | `local` |
| `JAVA_OPTS` | JVM options; the image caps the heap at 75% of the container's memory | see `Dockerfile` |

Health check: `GET /actuator/health` returns `{"status":"UP"}`.

## Typical flow

```text
1. Platform admin logs in                     POST /api/auth/login
2. Creates a tenant + its first admin         POST /api/tenants/create
3. Tenant admin sets their own password       POST /api/auth/first-password
4. Creates a duty                             POST /api/permissions/create   {"code":"transfer:approve"}
5. Creates a role                             POST /api/roles/create         {"name":"FINANCE_MANAGER"}
6. Adds the duty to the role                  PUT  /api/roles/{roleId}/permissions/{permissionId}
7. Creates a user with that role              POST /api/users/create
8. The user sets a password, logs in          GET  /api/me  → duties: ["transfer:approve"]
```

## Transfer approval workflow

A sample business feature built on the engine: an employee requests a transfer and a finance manager approves it.

**Setup (tenant admin, once):**

```text
Duties   transfer:create · transfer:read · transfer:approve
Roles    EMPLOYEE         → transfer:create
         FINANCE_MANAGER  → transfer:read, transfer:approve
Limit    PUT /api/roles/{roleId}/approval-limit   {"approvalLimit": 50000}
```

**Flow:**

```text
Rahul (EMPLOYEE)          POST /api/transfers/create   {"amount":40000,"currency":"INR","description":"Vendor invoice"}
                          → status PENDING
Priya (FINANCE_MANAGER)   POST /api/transfers/{id}/approve   {"note":"OK"}
                          → status APPROVED, decidedBy priya
or                        POST /api/transfers/{id}/reject    {"note":"Over budget"}   (note required)
                          → status REJECTED
```

**An approval passes these checks in order:**

| # | Check | Otherwise |
|---|---|---|
| 1 | Caller holds `transfer:approve` right now | `403` |
| 2 | Transfer belongs to the caller's tenant | `404` |
| 3 | Transfer is still `PENDING` | `409` |
| 4 | Caller is not the requester | `403` |
| 5 | Amount is within the highest approval limit of the caller's active roles (no limit means no approval) | `403` |
| 6 | Nobody decided it at the same moment (optimistic locking with `@Version`) | `409` |

**Rules:**

- Anyone can see their own transfers. Seeing all of the tenant's transfers needs `transfer:read`. Anyone else asking for a transfer by ID gets `404`.
- You cannot change the approval limit of a role you hold.
- PostgreSQL enforces the core rules as constraints too: the amount must be positive, the currency must be 3 letters, the decision fields must match the status, and the approver can never be the requester.
- Submit, approve, reject and limit changes are all written to the audit log.

## API reference

All endpoints except login and first-password need `Authorization: Bearer <accessToken>`.

| Area | Method and path | Required duty |
|---|---|---|
| Auth | `POST /api/auth/login` | Public |
| | `POST /api/auth/first-password` | Public |
| | `POST /api/auth/logout` | Authenticated |
| | `GET /api/me` | Authenticated |
| Tenants | `POST /api/tenants/create` | `tenant:create` (platform) |
| | `GET /api/tenants/list?page=0&size=20` | `tenant:read` (platform) |
| | `POST /api/tenants/{id}/suspend` · `/reactivate` | `tenant:suspend` (platform) |
| Users | `POST /api/users/create` | `user:create` |
| | `GET /api/users/list?page=0&size=20` | `user:read` |
| | `GET /api/users/{id}/permissions` | `user:read` |
| | `PUT` / `DELETE /api/users/{userId}/roles/{roleId}` | `role:assign` / `role:revoke` |
| | `POST /api/users/{id}/disable` · `/enable` | `user:disable` |
| Roles | `POST /api/roles/create` · `GET /api/roles/list` | `role:create` / `role:read` |
| | `PUT` / `DELETE /api/roles/{roleId}/permissions/{permissionId}` | `permission:assign` / `permission:revoke` |
| | `PUT /api/roles/{roleId}/approval-limit` | `role:update` |
| Duties | `POST /api/permissions/create` · `GET /api/permissions` | `permission:create` / `permission:read` |
| | `POST /api/permissions/{id}/deactivate` · `/activate` | `permission:deactivate` |
| Transfers | `POST /api/transfers/create` | `transfer:create` |
| | `GET /api/transfers/mine?page=0&size=20` | Authenticated |
| | `GET /api/transfers/list?status=PENDING&page=0&size=20` (status optional) | `transfer:read` |
| | `GET /api/transfers/{id}` | Requester, or `transfer:read` |
| | `POST /api/transfers/{id}/approve` · `/reject` | `transfer:approve` |
| Audit | `GET /api/audit-logs/list?page=0&size=20` | `audit:read` |

**Status codes:** `400` invalid input · `401` not logged in or bad credentials · `403` not allowed, or `PASSWORD_CHANGE_REQUIRED` · `404` not found, or another tenant's data · `409` already exists, or a transfer already decided

**Duty format:** `resource:action` in lowercase, e.g. `user:create`. The `tenant:` and `platform:` prefixes are reserved. Each new tenant gets 18 standard admin duties; business duties such as `transfer:approve` are created by the tenant admin.

## Security design

| Topic | Decision |
|---|---|
| Access tokens | Random 256-bit opaque tokens, stored only as SHA-256 hashes in Redis, 5-minute lifetime |
| Refresh tokens | Hashed in PostgreSQL with a family ID for rotation, 7-day lifetime, revoked (not deleted) on logout or disable |
| Passwords | BCrypt. New users get a one-time temporary password (24 h) and must set their own before tokens are issued. |
| Login errors | Wrong password and unknown email return the same response, so accounts cannot be discovered |
| Revocation | Logout ends one session; disabling a user or suspending a tenant ends all of their sessions immediately |
| Escalation | Granting duties, assigning roles and disabling users all require the caller to hold the admin duties involved. System roles and duties cannot be edited, and the last admin cannot be removed. |
| Redis outage | Fails closed: requests are treated as unauthenticated (`401`) |

## Project structure

```text
src/main/java/org/example/multitenant
├── config        Security, password and token configuration
├── controller    REST endpoints
├── dto           Request and response records
├── entity        JPA entities (tenant, user, role, permission, links, tokens, audit, transfer)
├── enums         Tenant type/status, permission scope, disable reasons, transfer status
├── exception     Custom exceptions and the global error handler
├── repository    Spring Data repositories, including the live duty queries
├── security      Token filter, authorization manager, annotations, duty checker
└── service       Business logic for auth, tenants, users, roles, duties, transfers, audit
src/main/resources/db/migration   Flyway migrations V1–V6

frontend/src
├── api           Fetch client, types and one function per endpoint
├── auth          Session, live /api/me polling, sign-in and sign-out
├── components    Layout shell, navigation rules and UI building blocks
├── pages         Overview, profile, transfers, users, roles, permissions, audit, organisations
└── demo          Demo account list shared with scripts/seed-demo.mjs
```

## Known limitations and roadmap

- **Not built yet:** the refresh endpoint (`POST /api/auth/refresh`, with rotation and reuse detection). Until then the dashboard signs users out when the access token expires.
- **Approval limits** are plain numbers compared with the transfer amount; there is no currency conversion.
- **Testing:** an automated integration and negative test suite for the acceptance criteria is still to be added.
- **Rate limiting:** login and first-password have no rate limit yet. The planned design is a Redis fixed-window counter per IP and per email.
- **Scale:** request-scoped caching of duty lookups, read replicas, Row-Level Security in PostgreSQL, SSO/SCIM and per-tenant quotas are on the roadmap.

## Author

**[Chetanya Bansal](https://chetanya.co.in/)**
