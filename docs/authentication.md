# Authentication

SkillPulse splits identity from authorization.

```text
Clerk authenticates identity
Express verifies the Bearer token
PostgreSQL stores the application User, role, and organization
```

Frontend role labels are UX only. The API is the security boundary.

## Responsibilities

| System | Owns |
| --- | --- |
| Clerk | Sign-in, sign-up, session, JWT |
| SkillPulse `User` | `clerkUserId`, `role`, `organizationId` |
| Express | Token verification, user sync, RBAC, org scope |

Passwords are never stored in SkillPulse.

## Local setup

1. Create a Clerk application.
2. Copy the publishable key and secret key into root `.env` (see `.env.example`).
3. Restart `pnpm dev:web` and `pnpm dev:api`.

Sign-up and sign-in use **email and password** (then an email verification code). Phone/SMS is disabled because Clerk does not support Indian numbers on the SMS allowlist.

Required variables:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
```

Never commit `.env` or `apps/api/.env`.

## Authentication flow

```text
User signs in with Clerk
  → Next.js session
  → Authorization: Bearer <token>
  → Express requireAuth()
  → Clerk token verification
  → find-or-create SkillPulse User (default role LEARNER)
  → req.user
```

First sign-in creates a `LEARNER`. Repeated sign-in reuses the same row (`clerkUserId` is unique). Clients cannot choose `PLATFORM_ADMIN`, `GOVERNMENT_MANAGER`, or `INSTITUTE_ADMIN`.

## Application roles

| Role | Typical use |
| --- | --- |
| PLATFORM_ADMIN | Platform operators |
| GOVERNMENT_MANAGER | Government labour-market managers |
| INSTITUTE_ADMIN | Training institute admins |
| EMPLOYER | Employer users |
| TRAINER | Trainers |
| LEARNER | Default for new accounts |

`requireAuth()` and `requireRole(...)` live in Express middleware.

## Organization isolation

`organizationId` on the authenticated User is the source of scope.

`PLATFORM_ADMIN` and `GOVERNMENT_MANAGER` may resolve a requested organization. All other roles receive 403 if they supply a different `organizationId`.

## Protected frontend routes

Public: `/`, `/sign-in`, `/sign-up`

Protected (Clerk session required): `/dashboard`, `/jobs`, `/skills`, `/courses`, `/curricula`, `/gaps`, `/recommendations`, `/employers`, `/outcomes`, `/settings`, `/decisions`, `/quality`, `/programs`

Next.js 16 uses `apps/web/proxy.ts` (`clerkMiddleware`). That is the request interception file (formerly `middleware.ts`).

## HTTP status

| Status | Meaning |
| --- | --- |
| 401 | Missing or invalid identity |
| 403 | Authenticated but not allowed |
| 404 | Resource not found |

`GET /health` and `GET /health/db` do not require Clerk.
