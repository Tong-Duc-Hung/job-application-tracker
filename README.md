# Job Application Tracker

A full-stack job application & interview tracker for job seekers, built with **Next.js (App Router) + TypeScript + Prisma + PostgreSQL**.

Manage your applications, schedule and track interviews, view stats, and keep your profile & data under your control — all in one place.

## Features

- **Auth**: email/password register & login, JWT session cookie (httpOnly), protected routes via middleware
- **Dashboard**: status summary cards, upcoming interviews, deadline alerts, recent applications, quick-add actions
- **Applications**: full CRUD in modals (no page navigation), search, filter by status/priority, sort, pagination, URL-synced filters
- **Interviews**: full CRUD, List and Calendar views, linked 1-to-many to an Application
- **Statistics**: read-only charts — applications by status/priority/month, interview outcomes & success rate
- **Settings**: profile, password change, appearance (theme preference), data export (JSON) & account deletion

## Tech stack

| Layer          | Choice                                   |
| -------------- | ----------------------------------------- |
| Framework      | Next.js 16 (App Router, Route Handlers)   |
| Language       | TypeScript (strict mode)                  |
| Database       | PostgreSQL                                |
| ORM            | Prisma                                    |
| Auth           | Custom JWT (via `jose`, edge-compatible) + `bcryptjs` password hashing |
| Validation     | Zod                                        |
| Forms          | React Hook Form + `@hookform/resolvers`   |
| Styling        | Tailwind CSS                               |
| Charts         | Recharts                                   |
| Icons          | lucide-react                               |
| E2E tests      | Playwright                                 |

> **Note on auth**: the spec mentioned both NextAuth and JWT as options. This build uses a small, self-contained JWT/cookie implementation (`src/shared/auth/`) rather than pulling in NextAuth, since the spec's own file tree includes a `shared/auth/jwt.ts` helper and it keeps the auth logic fully readable in one place. Swapping in NextAuth later is straightforward if you want built-in OAuth providers.

## Getting started

### 1. Prerequisites

- Node.js 18.18+ (20 LTS recommended)
- A PostgreSQL database (local, Docker, or a hosted one like Supabase/Neon/Railway)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and replace the PostgreSQL connection string and
secrets with values for your machine. On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then edit `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/job_tracker?schema=public"
JWT_SECRET="generate one with: openssl rand -base64 32"
AUTH_COOKIE_NAME="jat_session"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Set up the database

For a brand-new database, set `DATABASE_URL` in `.env` to that database and
run:

```bash
npm run prisma:migrate:deploy
npm run prisma:seed        # optional demo data: demo@example.com / password123
```

Use `npm run prisma:migrate` when changing the schema during local
development; it creates a new migration. Do not use `prisma db push` for a
database that should remain compatible with the committed migration history.

For an existing database, CI, or a deployed environment, apply the committed
migrations before starting the app:

```bash
npm run prisma:migrate:deploy
```

Demo login after seeding: `demo@example.com` / `password123`

### 5. Run the app

```bash
npm run dev
```

Visit http://localhost:3000 — you'll land on `/login` if signed out, or `/dashboard` if signed in.

### Test database

Create a separate PostgreSQL database for E2E tests and put its connection
string in `.env.test` (a test database must never be the same database as
`.env`). `npm run test:e2e` automatically applies committed migrations and
re-seeds the test database before Playwright starts. The seed is repeatable:
it resets only its demo users' applications, interviews, and notes.

## Project structure

```
prisma/                   Prisma schema, migrations, seed script
src/
  app/
    (auth)/                Login & Register pages (route group, no URL prefix)
    (dashboard)/            Dashboard, Applications, Interviews, Statistics, Settings
    api/                    Route Handlers: auth, applications, interviews, statistics, settings
    layout.tsx, globals.css, loading.tsx, error.tsx, not-found.tsx
  features/                 Business logic per domain
    auth/                    schema (Zod), repository (Prisma queries), service (business rules), components
    applications/            same layering
    interviews/               same layering
    statistics/                read-only aggregate queries + chart components
    settings/                   profile/password/theme/data-export logic
  shared/
    db/prisma.ts             Prisma client singleton
    auth/                     jwt.ts (sign/verify), session.ts (cookie -> current user)
    ui/                       Button, Input/Select/Textarea, Modal, Table, Badge, Card, Toast, Sidebar…
    utils/                     cn, date formatting, API error helpers
  middleware.ts               Route guard (redirects based on session cookie)
tests/
  playwright/                 E2E specs for auth, applications, interviews
  postman/collection.json     Manual API testing collection
```

This mirrors the functional spec's suggested layout: `app/` for routes, `features/` for business logic (service → repository → Prisma), `shared/` for cross-cutting UI and utilities.

## Data model

Three tables, two 1-to-N relationships (see `prisma/schema.prisma` for the source of truth):

```
users (1) ──< applications (N) ──< interviews (N)
```

- A `User` owns many `Application`s.
- Each `Application` owns many `Interview`s.
- Deleting a user or application cascades to their applications/interviews (`onDelete: Cascade`), matching the "delete account removes all data" requirement in Settings.

A couple of fields were added beyond the original DB-design doc's table because the functional spec calls for them: `Interview.title`, `Interview.meetingUrl` and `Interview.review`, `Application.experience`, and password-reset/rate-limit records. Enums (`ApplicationStatus`, `Priority`, `InterviewType`, `InterviewResult`, and `Theme`) match the schema exactly.

## API overview

All routes below (except `/api/auth/*`) require a valid session cookie and are scoped to the authenticated user — every query filters by `userId`, so one account can never read or modify another's data.

| Method | Route                          | Purpose                          |
| ------ | ------------------------------- | --------------------------------- |
| POST   | `/api/auth/register`            | Create account                    |
| POST   | `/api/auth/login`                | Log in, sets session cookie       |
| POST   | `/api/auth/logout`               | Clears session cookie             |
| GET    | `/api/auth/me`                    | Current user                      |
| GET/POST | `/api/applications`             | List (search/filter/sort/paginate) & create |
| GET/PUT/DELETE | `/api/applications/[id]`   | Read, update, delete one          |
| GET/POST | `/api/interviews`                | List & create                     |
| GET/PUT/DELETE | `/api/interviews/[id]`      | Read, update, delete one          |
| GET    | `/api/statistics?tab=applications\|interviews` | Aggregate stats  |
| PUT    | `/api/settings/profile`           | Update name/phone/avatar          |
| PUT    | `/api/settings/password`           | Change password                   |
| PUT    | `/api/settings/theme`               | Save theme preference             |
| GET    | `/api/settings/export`               | Download all data as JSON         |
| DELETE | `/api/settings/account`               | Delete account (cascades)         |

Import `tests/postman/collection.json` into Postman for ready-made requests against the API endpoints. Run Register and Login first so Postman stores the session cookie.

## Testing

```bash
npm run test:e2e
```

Playwright specs cover the auth redirect guard, register/login, Applications CRUD, Interviews tabs, Notes/Statistics/Settings UI workflows, and authenticated API workflows for Applications, Interviews, Notes, Statistics, Settings, validation, logout, and unauthorized access. The test command prepares `.env.test` automatically by applying migrations and running the seed before Playwright starts the dev server (see `playwright.config.ts`).

To run one spec or one test:

```bash
npx playwright test tests/playwright/auth.spec.ts
npx playwright test tests/playwright/applications.spec.ts --headed
npx playwright test tests/playwright/api.spec.ts
npx playwright test tests/playwright/workflow.spec.ts
```

## Notes & next steps

- **Dark mode**: the Settings > Appearance preference is saved to the database, but only light-theme Tailwind classes are wired up in this build — add `dark:` variants where you want them and toggle a `dark` class based on `user.theme`.
- **Rate limiting / email verification**: not included; add before shipping publicly.
- **File uploads for avatars**: the Profile form currently accepts an avatar as a URL string rather than a file upload — swap in your preferred storage (S3, Cloudinary, etc.) if you want direct image uploads.
- **NextAuth / OAuth**: if you want Google/GitHub login later, `src/features/auth/` and `src/shared/auth/` are the two places to swap in NextAuth without touching the rest of the app, since every other feature only calls `getCurrentUser()` / `requireUserId()`.
