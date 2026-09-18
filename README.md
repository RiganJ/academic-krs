# Academic KRS

Laravel 12 + React/Vite application for managing student course
enrollments (KRS) with PostgreSQL server-side querying.

## Requirements

- PHP 8.2+
- Composer
- Node.js 20+
- PostgreSQL 14+

PostgreSQL is required for the five-million-row acceptance dataset because
the seeder uses `generate_series()`, and the search uses PostgreSQL `ILIKE`
and `pg_trgm` indexes.

## Local setup

Create a PostgreSQL database and user, then configure `.env`:

```sql
CREATE USER academic_krs WITH PASSWORD 'change-this-password';
CREATE DATABASE academic_krs OWNER academic_krs;
```

```powershell
composer install
npm install
Copy-Item .env.example .env
php artisan key:generate
```

Set these values in `.env`:

```dotenv
APP_URL=http://localhost:8000
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=academic_krs
DB_USERNAME=academic_krs
DB_PASSWORD=change-this-password
CORS_ALLOWED_ORIGINS=
```

Run migrations and build the frontend:

```powershell
php artisan migrate
npm run build
php artisan serve --host=127.0.0.1 --port=8000
```

For development with Vite hot reload:

```powershell
npm run dev
```

## Seed data

The command resets `students`, `courses`, and `enrollments`, then creates:

- 35,000 students using NIM `YY + PPPP + NN`;
- the requested number of courses;
- the requested number of enrollments.

The default acceptance dataset is five million enrollments:

```powershell
php artisan academic:seed --count=5000000 --courses=200
```

The same dataset can be generated through Laravel's root seeder:

```powershell
php artisan db:seed
```

Smaller smoke test:

```powershell
php artisan academic:seed --count=10000 --courses=200
```

The command validates that the final enrollment count is exactly the
requested count. It inserts students and courses in batches and creates
enrollments in 100,000-row PostgreSQL batches without building five million
PHP objects.

Verify the result:

```powershell
php artisan tinker --execute="dump(DB::table('students')->count()); dump(DB::table('courses')->count()); dump(DB::table('enrollments')->count());"
```

Expected acceptance result:

```text
35000
200
5000000
```

## API and UI behavior

The single-page enrollment UI provides:

- create, read, update, and hard-delete enrollment;
- create transaction covering `students`, `courses`, and `enrollments`;
- server-side pagination with `page` and `page_size`;
- header sorting with ASC/DESC indicators;
- status and semester quick filters;
- 400 ms debounced server-side search over NIM, student name, and course
  code;
- advanced filters for all displayed data, including `student_email` and
  `credits`;
- `equal`, `contains`, `startsWith`, `in` (comma-separated), and `between`
  (comma-separated `min,max`) operators;
- filter groups with AND/OR logic;
- multi-column ordering;
- CSV export for the complete filtered result.

Advanced filter semantics:

- `AND`: every condition in the group must match;
- `OR`: at least one condition in the group must match;
- `group_logic`: combines Group A and Group B using the selected logic;
- multi-column sorting applies `orderBy` clauses in the order shown in the
  UI; AND/OR applies to filters, not sorting.

Create uses strict uniqueness validation: an existing NIM, email, or course
code returns HTTP 422 rather than silently overwriting existing master data.
Update changes only enrollment fields (`academic_year`, `semester`, and
`status`). Delete is a hard delete of the enrollment only; its student and
course remain intact.

## Export

```text
GET /api/enrollments/export
GET /api/enrollments/export?status=APPROVED
```

The export is CSV, includes all matching rows rather than only the current
page, and uses `streamDownload()` plus a database cursor. This keeps PHP
memory bounded for the five-million-row scenario. A production deployment
should configure reverse-proxy timeouts appropriately; an asynchronous queue
can be introduced if exports need to outlive a request.

## Performance and security

The schema indexes foreign keys, status, semester, academic year, credits,
and the common academic-year/semester/status combination. PostgreSQL
`pg_trgm` GIN indexes support substring search for NIM, names, course codes,
and email.

All user-controlled sort fields are mapped through a server-side whitelist.
Filter values are bound query parameters; filter operators and values are
validated before use. Form Requests validate all create/update fields, and
database unique/FK constraints remain the final integrity boundary.

CORS is same-origin by default. If a separate trusted frontend origin is
required, set `CORS_ALLOWED_ORIGINS` to a comma-separated allowlist. Do not
use `*` with credentialed requests.

Laravel logs unexpected exceptions to `storage/logs/laravel.log`.

## Acceptance checks

Run the backend tests and frontend build:

```powershell
php artisan test
npm run build
```

Manual acceptance checks:

1. Seed and verify the three counts above.
2. Create a new student, course, and enrollment and verify the three rows.
3. Submit invalid frontend and API payloads and verify clear 4xx errors.
4. Change page, page size, header sorting, status, and semester filters.
5. Search partial NIM, student name, and course code.
6. Apply multiple advanced filters, reset them, then test Group A/B AND and
   OR.
7. Update status/semester/year and verify the row refreshes.
8. Delete an enrollment and verify student/course remain.
9. Export without filters and verify the CSV contains the header plus the
   complete filtered count.

## Deployment

Configure PostgreSQL environment variables, then:

```powershell
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Serve the `public` directory through a web server and use HTTPS. The
repository and application URL are deployment deliverables and cannot be
created from a local workspace without repository and hosting credentials.
Complete these final steps before submission:

```powershell
git init
git add .
git commit -m "Prepare academic KRS application"
git branch -M main
git remote add origin https://github.com/<OWNER>/<REPOSITORY>.git
git push -u origin main
```

Deploy the project to a PHP-capable HTTPS host with PostgreSQL, run the
deployment commands above, seed the acceptance dataset, and record the real
URLs in the submission form:

```text
Public repository: https://github.com/<OWNER>/<REPOSITORY>
Online application: https://<DEPLOYED_HOST>
Export endpoint: https://<DEPLOYED_HOST>/api/enrollments/export
```

Never commit `.env`, database passwords, or generated secrets. Set
`CORS_ALLOWED_ORIGINS` to the exact deployed frontend origin only when the
frontend and API use different origins.
