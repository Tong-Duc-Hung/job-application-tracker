# Job Application Tracker

A full-stack web application for managing job applications, interview schedules, preparation notes, statistics, and personal account settings in one place.

This project was developed as a **university internship project** to practice full-stack web development, relational database design, authentication, API development, testing, and cloud deployment.

**Live Demo:** [Job Application Tracker](https://job-application-tracker-3ioj5ah6b-hungs-projects-9eee1825.vercel.app)

### Demo Account

- **Email:** `demo@example.com`
- **Password:** `password123`

> This account is provided for demonstration and testing purposes only.

**Deployment:** Vercel (web application) + Neon PostgreSQL (database)

---

## Overview

Job Application Tracker helps job seekers organize the main information generated during a recruitment process. Instead of keeping application information, interview schedules, preparation notes, and results in separate places, the application provides a single authenticated workspace for each user.

The current implementation focuses on five main areas: job applications, interviews, notes, statistics, and account settings. Data is stored in PostgreSQL and is isolated by authenticated user.

---

## Features

### Authentication and session management

- Register with name, email, and password.
- Sign in and sign out with email/password authentication.
- Passwords are hashed with `bcryptjs` before being stored.
- Authentication uses signed JWT session tokens created with `jose`.
- Session tokens are stored in `httpOnly` cookies.
- Production cookies use the `Secure` flag and `SameSite=Lax`.
- "Remember me" sessions can persist for up to 30 days and are refreshed while the user remains active.
- Non-remembered sessions use a browser session cookie with a 12-hour JWT expiry as a fallback.
- Protected pages are guarded through `src/proxy.ts`.
- Changing the password increments `sessionVersion`, invalidating previously issued sessions.

### Dashboard

- Displays total applications, interviews, notes, and applications containing experience/lesson notes.
- Shows recent interview schedules.
- Shows application deadline alerts.
- Shows recently created applications.
- Provides shortcuts to the main tracking modules.

### Job applications

- Create, view, update, and delete job applications.
- Store company, position, location, salary, job URL, priority, status, applied date, deadline, and experience/lesson notes.
- Supports nine application statuses and three priority levels.
- Search applications and filter by status and priority.
- Sort by created date, applied date, deadline, or company.
- Paginated application list.
- Search/status/priority filters are synchronized with URL query parameters for shareable or bookmarkable filtered views.
- Automatically marks eligible overdue applications as expired while preserving final/result states.
- Quick-edit experience notes from the application list.
- Deleting an application cascades to its related interviews and notes.

### Interviews

- Create, view, update, and delete interview records.
- Every interview belongs to a job application.
- Store interview title, type, scheduled date/time, meeting location, meeting URL, result, and review.
- Supports HR, online assessment, technical, manager, final, and other interview types.
- Supports pending, passed, failed, cancelled, and no-show results.
- Search and filter interview records.
- Filter interviews by application, type, result, and date range through the API.
- List view grouped by application.
- Monthly calendar view.

### Notes

- Create, view, update, and delete preparation notes.
- A note is linked to exactly one job application or one interview.
- Browse notes by application or interview.
- Search note content and sort by newest/oldest.
- Ownership checks ensure a note can only be linked to data belonging to the authenticated user.

### Statistics

- Separate statistics views for applications and interviews.
- Filter statistics by date range.
- Application statistics include totals, status distribution, priority distribution, time-series data, active applications, applications in interview stages, responses, and offers.
- Interview statistics include totals, result distribution, interview-type distribution, time-series data, and success rate based on decided interviews.
- Charts are rendered with Recharts.

### Settings and account management

- Update display name.
- Upload an avatar image; the client resizes/compresses it and stores the result as a data URL.
- Change password.
- Choose Light, Dark, or System theme; the preference is persisted in the database.
- Export the user's profile, applications, interviews, and notes as JSON.
- View basic account statistics.
- Permanently delete the account after password confirmation.
- Account deletion cascades to related application, interview, and note data.

---

## Tech Stack

| Area               | Technology                              |
| ------------------ | --------------------------------------- |
| Framework          | Next.js App Router                      |
| Language           | TypeScript                              |
| UI                 | React                                   |
| Database           | PostgreSQL                              |
| Cloud database     | Neon PostgreSQL                         |
| ORM                | Prisma                                  |
| PostgreSQL adapter | `@prisma/adapter-pg`                    |
| Authentication     | Custom JWT sessions with `jose`         |
| Password hashing   | `bcryptjs`                              |
| Validation         | Zod                                     |
| Forms              | React Hook Form + `@hookform/resolvers` |
| Styling            | Tailwind CSS                            |
| Theme management   | `next-themes`                           |
| Charts             | Recharts                                |
| Icons              | `lucide-react`                          |
| Date utilities     | `date-fns`                              |
| E2E / UI testing   | Playwright                              |
| API testing        | Postman collection                      |
| Deployment         | Vercel                                  |

> Exact dependency versions should be taken from the repository's `package.json`.

---

## Architecture

The application uses a feature-oriented structure. Core domains such as applications, interviews, notes, and authentication separate validation, business logic, database access, and UI components where appropriate.

```
Browser / React UI
        |
        v
Next.js App Router
  - Server Components
  - Client Components
  - Route Handlers (/api/*)
        |
        v
Feature services
        |
        v
Repositories / Prisma queries
        |
        v
Prisma + @prisma/adapter-pg
        |
        v
Neon PostgreSQL
```

Authentication is handled separately with a signed JWT stored in an `httpOnly` cookie. `src/proxy.ts` protects page routes, while API routes validate the current session and scope database access to the authenticated user.

---

## Data Model

The main relational model is:

```
User (1) --------< Application (N) --------< Interview (N)
                       |                         |
                       |                         |
                       +--------< Note >---------+
```

A note belongs to exactly one application or one interview. This rule is enforced by application validation/business logic because both foreign keys are nullable at the database level.

The schema also contains an auxiliary `AuthRateLimit` model used by the authentication rate-limit implementation.

### Main entities

| Entity          | Purpose                                                 |
| --------------- | ------------------------------------------------------- |
| `User`          | Account, profile, password hash, theme, session version |
| `Application`   | Job application information and tracking status         |
| `Interview`     | Interview round linked to an application                |
| `Note`          | Preparation note linked to an application or interview  |
| `AuthRateLimit` | Auxiliary authentication request counter data           |

Foreign keys use cascade deletion where appropriate, so deleting a user or application removes dependent records.

---

## Project Structure

```
prisma/
  schema.prisma
  seed.ts
  migrations/

src/
  app/
    (auth)/
      login/
      register/
    (dashboard)/
      dashboard/
      applications/
      interviews/
      notes/
      statistics/
      settings/
    api/
      auth/
      applications/
      interviews/
      notes/
      statistics/
      settings/
    layout.tsx
    page.tsx
    loading.tsx
    error.tsx
    not-found.tsx

  features/
    auth/
    applications/
    interviews/
    notes/
    statistics/
    settings/

  shared/
    auth/
    config/
    db/
    hooks/
    theme/
    ui/
    utils/

  proxy.ts

tests/
  playwright/
  postman/
```

---

## API Overview

All application data routes require an authenticated session. Authentication routes are public where appropriate.

| Method                   | Route                    | Purpose                                       |
| ------------------------ | ------------------------ | --------------------------------------------- |
| `POST`                   | `/api/auth/register`     | Create an account                             |
| `POST`                   | `/api/auth/login`        | Authenticate and set the session cookie       |
| `POST`                   | `/api/auth/logout`       | Clear the session cookie                      |
| `GET`                    | `/api/auth/me`           | Get the current authenticated user            |
| `GET` / `POST`           | `/api/applications`      | List/search/filter applications or create one |
| `GET` / `PUT` / `DELETE` | `/api/applications/[id]` | Read, update, or delete one application       |
| `GET` / `POST`           | `/api/interviews`        | List/filter interviews or create one          |
| `GET` / `PUT` / `DELETE` | `/api/interviews/[id]`   | Read, update, or delete one interview         |
| `GET` / `POST`           | `/api/notes`             | List/filter notes or create one               |
| `GET` / `PUT` / `DELETE` | `/api/notes/[id]`        | Read, update, or delete one note              |
| `GET`                    | `/api/statistics`        | Return application or interview statistics    |
| `PUT`                    | `/api/settings/profile`  | Update name/avatar                            |
| `PUT`                    | `/api/settings/password` | Change password                               |
| `PUT`                    | `/api/settings/theme`    | Save theme preference                         |
| `GET`                    | `/api/settings/export`   | Export user data as JSON                      |
| `DELETE`                 | `/api/settings/account`  | Permanently delete the account                |

The API validates request data with Zod and scopes protected queries to the authenticated user.

---

## Local Development

### Prerequisites

- Node.js compatible with the repository's Next.js/Prisma versions.
- npm.
- A PostgreSQL database.

### 1. Install dependencies

```
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root.

```
DATABASE_URL="your-neon-pooled-postgresql-connection-string"
DIRECT_URL="your-neon-direct-postgresql-connection-string"
JWT_SECRET="replace-with-a-long-random-secret"
AUTH_COOKIE_NAME="jat_session"
```

`DATABASE_URL` is used for the application database connection, while `DIRECT_URL` is used for Prisma migration operations when a direct Neon connection is required. `JWT_SECRET` is required for signed authentication sessions. `AUTH_COOKIE_NAME` is optional; when omitted, the application uses `jat_session`.

Never commit real production credentials or secrets to GitHub.

### 3. Apply database migrations

Using the scripts from this project:

```
npm run prisma:migrate:deploy
```

For local schema development, use the project's migration workflow rather than replacing committed migration history with `prisma db push`.

### 4. Optional: seed development data

```
npm run prisma:seed
```

The seed file contains demo data intended for development/testing. Do not seed a real production database unless you explicitly want demo records there.

### 5. Start the development server

```
npm run dev
```

Open:

```
http://localhost:3000
```

The root route redirects unauthenticated users to `/login` and authenticated users to `/dashboard`.

---

## Deployment with Vercel and Neon

The current architecture is suitable for a Vercel + Neon deployment: Vercel hosts the Next.js application and Neon provides PostgreSQL.

### 1. Create the Neon database

Create a Neon PostgreSQL project and obtain its PostgreSQL connection string.

Obtain both the pooled and direct PostgreSQL connection strings from Neon and configure them as:

```ini
DATABASE_URL="your-neon-pooled-postgresql-connection-string"
DIRECT_URL="your-neon-direct-postgresql-connection-string"
```

### 2. Configure Vercel

Import the GitHub repository into Vercel and add the following environment variables in the Vercel project settings:

```
DATABASE_URL="your-neon-pooled-postgresql-connection-string"
DIRECT_URL="your-neon-direct-postgresql-connection-string"
JWT_SECRET="your-production-random-secret"
AUTH_COOKIE_NAME="jat_session"
```

Set the variables for the environments you actually use (Production and, if needed, Preview/Development).

### 3. Apply production migrations

Before using the deployed application with a new production database, apply the committed Prisma migrations to the Neon database:

```
npm run prisma:migrate:deploy
```

Run migrations against the intended Neon production database. Do not run the demo seed on production unless demo data is intentionally required.

### 4. Deploy

Deploy or redeploy the project from Vercel after the required environment variables and database schema are ready.

In production, the authentication cookie is automatically configured with the `Secure` flag because the source checks `NODE_ENV === "production"`.

### Production Deployment

The application is deployed and publicly accessible through Vercel.

The production database is hosted on Neon PostgreSQL.

---

## Testing

The repository contains two complementary testing resources.

### Playwright

The repository contains Playwright tests covering authentication, navigation, application workflows, interview workflows, notes, dashboard behavior, statistics, settings, security-related UI behavior, account isolation, and end-to-end workflows.

Run the full Playwright suite with:

```
npx playwright test
```

Useful examples:

```
npx playwright test tests/playwright/auth.spec.ts
npx playwright test tests/playwright/applications.spec.ts
npx playwright test tests/playwright/interviews.spec.ts
npx playwright test tests/playwright/settings.spec.ts
```

### Postman

The repository includes:

```
tests/postman/JobTracker.postman_collection.json
```

The current collection contains **196 request entries** covering authentication, protected API access, Applications, Interviews, Notes, Statistics, Settings, cross-account data isolation, cascade deletion, password-change session invalidation, and account deletion.

Import the collection into Postman to execute the API scenarios against the desired environment.

> Test pass/fail results should only be claimed from an actual recorded test run.

---

## Security and Data Isolation

The implementation includes several security-oriented measures appropriate to the project's scope:

- Password hashing with `bcryptjs`.
- Signed JWT sessions using `jose`.
- `httpOnly` authentication cookie.
- `Secure` cookie in production.
- `SameSite=Lax` cookie policy.
- Generic login error for unknown email vs. incorrect password to reduce account enumeration.
- Session invalidation after password changes through `sessionVersion`.
- Zod validation for server-side API inputs.
- User-scoped database queries for applications, interviews, statistics, settings, and notes.
- Ownership validation before linking notes or interviews to another record.
- Cascade deletion for dependent data.

---

## Known Limitations

This is an academic/internship project rather than a production recruitment platform. The following limitations should be kept explicit:

- The authentication rate-limit infrastructure exists, but the current threshold logic should be treated as incomplete until it is corrected and re-tested; it should not be presented as a fully working security control yet.
- There is no email verification, password-recovery flow, or OAuth/social login in the reviewed source.
- Avatar images are compressed in the browser and stored as data URLs in PostgreSQL; this is acceptable for the current project scope but is not ideal for large-scale production storage.
- Test files and Postman scenarios are present, but pass/fail results should only be claimed from an actual recorded test run.

---

## Project Scope

The goal of this project is to demonstrate a complete full-stack workflow for a job-application tracking system: designing a relational data model, implementing authenticated CRUD features, validating input, isolating user data, presenting aggregated statistics, testing important workflows, and deploying the application with a managed web platform and PostgreSQL service.

The project intentionally stays focused on personal application tracking. It does not attempt to be a recruitment marketplace, ATS, or employer-facing hiring platform.