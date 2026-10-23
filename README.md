# Multi-Tenant Authorization Engine

A Spring Boot backend that lets many organisations share one application safely. It controls **who can do what**, keeps each organisation's data **separate**, and lets admins change **roles and permissions at runtime**, with no code changes or restarts.

## Features

- **Dynamic RBAC:** create permissions and roles, and assign them, through APIs. Changes apply on the next request.
- **Multi-tenancy:** each organisation sees only its own users, roles and records.
- **Two-level control:** the platform decides which permissions each organisation may use; each organisation decides who gets them.
- **Deny by default:** anything not explicitly allowed is refused.
- **Secure auth:** BCrypt passwords, short-lived access tokens, rotating refresh tokens with theft detection.
- **Audit log:** every security-relevant change records who, what and when.
- **Sample workflow:** employees submit transfer requests; authorised managers approve them. No real money moves.

## How access is decided

A user can perform an action only if **all three** are true:

1. the permission is **active** in the catalogue;
2. the user's organisation is **entitled** to it;
3. one of the user's **roles** contains it.

## Users

| Role | Can do |
|---|---|
| Platform admin | Create organisations, manage the permission catalogue and each organisation's entitlements |
| Org admin | Manage users and roles within their own organisation |
| Manager | Approve or reject transfer requests |
| Employee | Submit and track their own requests |

Roles other than the built-in admin roles are created by admins at runtime.

## Tech stack

Java 17 · Spring Boot 4 · Spring Security · PostgreSQL · Flyway · Redis · Maven · JUnit 5 · Testcontainers

## Getting started

**Requirements:** Java 17+, PostgreSQL, Redis

1. **Create the database**
   ```bash
   createdb -h localhost -U postgres multitenant_db
   ```
2. **Add `src/main/resources/application-local.yaml`** (not committed):
   ```yaml
   spring:
     datasource:
       url: jdbc:postgresql://localhost:5432/multitenant_db
       username: your_db_user
       password: your_db_password
   ```
3. **Set the first platform admin** with the environment variables `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`.
4. **Run**
   ```bash
   ./mvnw spring-boot:run
   ```
   Flyway creates the schema and the platform admin is set up automatically.
5. **Test**
   ```bash
   ./mvnw test
   ```

## Main APIs

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/login` · `/refresh` · `/logout` |
| Permissions | `/api/permissions` |
| Tenants and entitlements | `/api/platform/tenants` |
| Users | `/api/users` |
| Roles and assignments | `/api/roles` · `/api/roles/{id}/permissions` · `/api/users/{id}/roles` |
| Transfers | `/api/transfers` |
| Audit | `/api/audit-logs` |

All requests except login and refresh need `Authorization: Bearer <token>`.

**Responses:** `401` not logged in · `403` not allowed · `404` not found, or belongs to another organisation · `409` conflict

## Permission format

`resource:action`, lowercase, e.g. `transfer:approve`, `user:create`, `tenant:create`.

## Author

**Chetanya Bansal**
