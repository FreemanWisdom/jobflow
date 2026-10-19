# JobFlow

JobFlow is a Next.js job and project management application backed by PostgreSQL and Prisma.

## Database Setup

Install PostgreSQL and create a local database. Set `DATABASE_URL` in `.env` or `.env.local` to the connection string for that database. Environment files are ignored by Git; never commit credentials.

The schema uses Prisma migrations:

```bash
npm run db:validate
npm run db:migrate
```

The development seed is repeatable. It upserts the deterministic development user and ten fictional jobs, so running it again updates those records instead of creating duplicates:

```bash
npm run db:seed
```

Inspect local records with:

```bash
npm run db:studio
```

Server-side Job operations live in `lib/jobs/data-access.ts`. They validate incoming data, scope operations to a user ID, and serialize Decimal budgets as strings for predictable transport. Dashboard recent Jobs intentionally use the five most recently updated records for a compact summary; the Jobs page retrieves the complete set. Authentication is intentionally not implemented yet; operations default to the seeded development user until an authenticated user ID can be supplied.

## Development Commands

```bash
npm run dev
npm run lint
npm run build
```
# jobflow
