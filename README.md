# Multi-Tenant Authorization Engine

A Spring Boot backend that lets many organisations (tenants) share one application safely. It decides **who can do what**, keeps every tenant's data **isolated**, and lets admins create and change **roles and permissions at runtime**, with no code changes, restarts or re-logins.

## Features

- **Dynamic RBAC:** admins create duties (permissions) and roles through the API and assign them to users. Changes take effect on the user's **next request**.
- **Multi-tenancy:** each tenant owns its own users, roles and duties. Another tenant's data returns `404`, as if it did not exist.
- **Deny by default:** every endpoint must declare its access level; anything undeclared is refused.
- **Secure authentication:** BCrypt passwords, opaque short-lived access tokens, hashed refresh tokens, forced password change on first login.
- **Instant revocation:** logout, disabling a user and suspending a tenant end live sessions immediately.
- **Escalation guards:** nobody can grant, revoke or manage power they do not hold themselves.
- **Audit log:** every security-relevant change records who, what and when, and never stores passwords or tokens.
- **Web console:** a small UI at `/` for trying every endpoint.

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

Java 17 · Spring Boot 4 · Spring Security 7 · PostgreSQL · Flyway · Redis · Thymeleaf (console) · Maven

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
5. **Open the console** at `http://localhost:8080/`, or use Postman.

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

## API reference

All endpoints except login and first-password need `Authorization: Bearer <accessToken>`.

| Area | Method and path | Required duty |
|---|---|---|
| Auth | `POST /api/auth/login` | Public |
| | `POST /api/auth/first-password` | Public |
| | `POST /api/auth/logout` | Authenticated |
| | `GET /api/me` | Authenticated |
| Tenants | `POST /api/tenants/create` | `tenant:create` (platform) |
| | `POST /api/tenants/{id}/suspend` · `/reactivate` | `tenant:suspend` (platform) |
| Users | `POST /api/users/create` | `user:create` |
| | `GET /api/users/{id}/permissions` | `user:read` |
| | `PUT` / `DELETE /api/users/{userId}/roles/{roleId}` | `role:assign` / `role:revoke` |
| | `POST /api/users/{id}/disable` · `/enable` | `user:disable` |
| Roles | `POST /api/roles/create` · `GET /api/roles/list` | `role:create` / `role:read` |
| | `PUT` / `DELETE /api/roles/{roleId}/permissions/{permissionId}` | `permission:assign` / `permission:revoke` |
| Duties | `POST /api/permissions/create` · `GET /api/permissions` | `permission:create` / `permission:read` |
| | `POST /api/permissions/{id}/deactivate` · `/activate` | `permission:deactivate` |
| Audit | `GET /api/audit-logs/list?page=0&size=20` | `audit:read` |

**Status codes:** `400` invalid input · `401` not logged in or bad credentials · `403` not allowed, or `PASSWORD_CHANGE_REQUIRED` · `404` not found, or another tenant's data · `409` already exists

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
├── controller    REST endpoints and the console page
├── dto           Request and response records
├── entity        JPA entities (tenant, user, role, permission, links, tokens, audit)
├── enums         Tenant type/status, permission scope, disable reasons
├── exception     Custom exceptions and the global error handler
├── repository    Spring Data repositories, including the live duty queries
├── security      Token filter, authorization manager, annotations, duty checker
└── service       Business logic for auth, tenants, users, roles, duties, audit
src/main/resources/db/migration   Flyway migrations V1–V5
```

## Known limitations and roadmap

- **Not built yet:** the refresh endpoint (`POST /api/auth/refresh`, with rotation and reuse detection) and the sample transfer workflow (submit, then approve with tenant, status, approval-limit and not-your-own checks).
- **Testing:** an automated integration and negative test suite for the acceptance criteria is still to be added.
- **Rate limiting:** login and first-password have no rate limit yet. The planned design is a Redis fixed-window counter per IP and per email.
- **Scale:** request-scoped caching of duty lookups, read replicas, Row-Level Security in PostgreSQL, SSO/SCIM and per-tenant quotas are on the roadmap.

## Author

**Chetanya Bansal**
