# JobFlow

JobFlow is a job and project management application for freelancers and small
teams: track jobs for multiple clients, manage per-job tasks, follow an
activity history, and keep a personal dashboard of everything in flight.

Built with Next.js (App Router), TypeScript, Prisma, PostgreSQL, and NextAuth.

## Features

- **Authentication** — email/password accounts (bcrypt-hashed) and optional
  Google sign-in (enabled automatically when OAuth credentials are configured).
  JWT sessions with the Prisma adapter for account linking.
- **Dashboard** — live statistics computed from the database, scoped to the
  signed-in user: total, active, completed, cancelled, overdue, and
  due-within-7-days counts plus recent jobs.
- **Jobs** — create, edit, delete, search, filter, and sort. A documented
  workflow: Planning → In Progress → On Hold/Completed/Cancelled. Moving a job
  to Completed sets progress to 100%; leaving Completed resets it to 0%;
  every other edit preserves progress.
- **Tasks** — per-job task lists with due dates; completion status is
  persisted and visible on the Tasks page and the job detail page.
- **Activity history** — every create, edit, status/priority/deadline change,
  and task change is recorded in the same transaction as its mutation, scoped
  to the owning user.
- **Settings** — profile updates, theme preference, password change for
  password accounts, and a JSON data export of everything you own.

Every query and mutation is ownership-scoped: a signed-in user can only read
and change their own jobs, tasks, and activity.

## Getting started

```bash
npm install
cp .env.example .env      # then fill in your values
npm run db:deploy         # apply Prisma migrations
npm run db:seed           # optional: two demo accounts with 10 sample jobs
npm run dev               # http://localhost:3000
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | yes | Session signing secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | production | Public URL, e.g. `https://your-domain.com` |
| `GOOGLE_CLIENT_ID` | no | Enables Google sign-in when set together with the secret |
| `GOOGLE_CLIENT_SECRET` | no | Enables Google sign-in when set together with the client ID |

Google sign-in silently remains disabled when its credentials are missing.

### Seeded development accounts

`npm run db:seed` creates two isolated demo users (for local development
only — never seed a production database):

- `alex@jobflow.local` / `jobflow-demo-123` — 5 sample jobs
- `sam@jobflow.local` / `jobflow-demo-123` — 5 sample jobs

The seed is idempotent (safe to re-run) and never deletes or reassigns
existing data. Each account sees only its own jobs, which is why the dashboard
total differs from a raw database count of the `Job` table.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and start |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check without emitting |
| `npm test` | Vitest suite (unit + integration) |
| `npm run db:validate` | Validate the Prisma schema |
| `npm run db:migrate` | Create/apply migrations during development |
| `npm run db:deploy` | Apply pending migrations (use in CI/production) |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Prisma Studio |

## Testing

`npm test` runs the Vitest suite. Unit tests cover validation, mapping, and
presentation logic; integration tests run against the PostgreSQL database in
`DATABASE_URL`. **Point `DATABASE_URL` at a disposable test database before
running the suite** (the integration tests create and delete their own rows):

```bash
createdb jobflow_test
DATABASE_URL=postgresql://localhost/jobflow_test npm run db:deploy
DATABASE_URL=postgresql://localhost/jobflow_test npm test
```

## Deployment

1. Provision a PostgreSQL database and set `DATABASE_URL`.
2. Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` (the public URL of the deployment).
3. Optionally set the Google OAuth credentials and add the deployment callback
   URL (`<NEXTAUTH_URL>/api/auth/callback/google`) to the Google OAuth client.
4. Apply migrations: `npm run db:deploy`.
5. Build and start: `npm run build && npm start`.

## Architecture

- `lib/prisma.ts` — Prisma client singleton
- `lib/auth.ts` — NextAuth configuration (JWT sessions, Prisma adapter)
- `lib/jobs/` — `validation.ts` (zod schemas), `data-access.ts` (ownership-
  scoped queries and transactional mutations), `mapping.ts` (pure UI/DB
  mapping and activity rules), `presentation.ts` (formatters), `actions.ts`
  (server actions)
- `lib/tasks/` — task and activity data access and server actions
- `lib/auth-actions.ts`, `lib/account-actions.ts` — registration and
  account management server actions
- `app/(authenticated)/` — protected route group (server-side session check)
- `prisma/` — schema and migrations
