# Phase 7 — Hardening, CI/CD, Deploy

> **Goal:** security review, performance review, test coverage targets, i18n/RTL completion, CI/CD pipeline, and deployment readiness.
> **Exit gate:** staging environment runs the full system, CI passes on every PR, coverage targets met, security review signed off.

---

## 1. Test Coverage (Original §23 Phase 7)

### 1.1 Backend Coverage Targets

| Area | Target |
|------|--------|
| `app/Services/` | 80% line coverage |
| `app/Policies/` | 90% line coverage (security-critical) |
| `app/Http/Controllers/` | 70% line coverage |
| `app/Models/` | 60% line coverage |
| Critical paths: auth, media upload, Package 09 | 100% |

Use `php artisan test --coverage` (Pest) or `vendor/bin/phpunit --coverage-html public/coverage`. Configure `phpunit.xml`/`pest.json` to enforce minimums.

### 1.2 Frontend Coverage Targets

| Area | Target |
|------|--------|
| `src/components/` (shared) | 80% |
| `src/pages/` | 70% |
| `src/services/` | 90% |
| `src/hooks/` | 80% |

Use `vitest --coverage`.

### 1.3 Test Categories (Original §23)

- [ ] Unit tests (backend Services).
- [ ] Feature tests (backend Controllers + DB).
- [ ] Frontend tests (Vitest + RTL).
- [ ] Authorization tests (every Policy method).
- [ ] Validation tests (every Form Request).
- [ ] Security review (see §2 below).
- [ ] Migration review (clean `migrate:fresh --seed` from scratch).
- [ ] Performance review (see §3 below).

---

## 2. Security Review

### 2.1 Authentication & Sessions

- [ ] Password hashing: bcrypt cost 12 (or Argon2 if configured).
- [ ] Password never serialized in any Resource or log.
- [ ] Login rate-limited: 5 attempts/min/IP.
- [ ] Logout invalidates Sanctum token.
- [ ] Session timeout configured (Sanctum expiration).
- [ ] CSRF token on cookie auth.
- [ ] Failed login response is generic ("Invalid credentials").

### 2.2 Authorization

- [ ] Every write endpoint has a Policy method.
- [ ] Every Controller calls `$this->authorize(...)` or uses `authorizeResource`.
- [ ] No `if (Auth::user()->role === 'admin')` inline checks (use Policies).
- [ ] Frontend permission checks are UX-only (verified backend enforces).

### 2.3 Input Validation

- [ ] Every endpoint has a Form Request.
- [ ] No `$request->validate()` inline.
- [ ] All IDs validated with `exists:`.
- [ ] All enums validated with `Rule::in(...)`.
- [ ] All file uploads sniff MIME (not extension).

### 2.4 Mass Assignment

- [ ] Every model has explicit `$fillable`.
- [ ] No `$guarded = []` anywhere.

### 2.5 SQL Injection

- [ ] No raw SQL with user input.
- [ ] All queries use Eloquent or query builder with parameterized bindings.
- [ ] Search uses `ILIKE` with bindings, never string concatenation.

### 2.6 XSS

- [ ] React components don't use `dangerouslySetInnerHTML` on user content.
- [ ] Rich-text content (if any) sanitized with DOMPurify before render.
- [ ] Announcement content stored as plain text or sanitized HTML.

### 2.7 CSRF

- [ ] Sanctum CSRF cookie endpoint exposed.
- [ ] Frontend axios client sends credentials.
- [ ] CORS allows only the frontend origin.

### 2.8 File Upload

- [ ] MIME sniffed via `finfo` or `UploadedFile::getMimeType()`.
- [ ] Size validated per media_type (Phase 4 table).
- [ ] Dimensions validated for images.
- [ ] Stored outside web root when possible; served via controller or signed URL.
- [ ] Filenames sanitized; user-supplied filenames never used as storage path.

### 2.9 Rate Limiting

- [ ] Login: `throttle:5,1` per IP.
- [ ] Media upload: `throttle:30,1` per user.
- [ ] All other API: `throttle:60,1` per user.

### 2.10 Secrets

- [ ] `.env` in `.gitignore`.
- [ ] No secrets in `config/*.php` defaults.
- [ ] Production secrets injected via environment (never committed).
- [ ] No API keys or DB passwords in frontend code.

### 2.11 Audit Log

- [ ] Every write action logs to `activity_log`.
- [ ] `activity_log` is append-only (no UPDATE/DELETE).
- [ ] No credentials or sensitive fields in `metadata`.

### 2.12 Dependencies

- [ ] `composer audit` clean.
- [ ] `npm audit` clean (or known low-severity only).
- [ ] No abandoned packages.

---

## 3. Performance Review

### 3.1 N+1 Query Audit

- [ ] Every list endpoint uses `with(...)` eager loading.
- [ ] `withCount(...)` for count-only fields.
- [ ] No `Model::all()->map(...)` patterns.
- [ ] Debugbar (dev only) shows no N+1 on critical paths.

### 3.2 Pagination

- [ ] Every collection endpoint paginates (default 15, max 100).
- [ ] No endpoint returns unbounded results.

### 3.3 Indexing

Verify indexes on:
- [ ] All FK columns.
- [ ] `users.email` (unique).
- [ ] `books.slug` (unique), `books.isbn` (unique partial), `books.status`, `books.language`.
- [ ] `contributors.slug` (unique), `contributors.is_archived`.
- [ ] `announcements.slug` (unique), `announcements.type`, `announcements.status`, `announcements.book_id`.
- [ ] `media.mime_type`, `media.is_archived`.
- [ ] `mediables(mediable_type, mediable_id)`, `mediables(media_id)`.
- [ ] `book_contributor(book_id, contributor_id, contributor_role_id)` (unique).
- [ ] `activity_log(actor_id)`, `activity_log(entity_type, entity_id)`.

### 3.4 Caching

- [ ] Permission list cached per user (cache key `user.{id}.permissions`, invalidated on role change).
- [ ] Media types cached (rarely changes).
- [ ] Contributor roles cached.
- [ ] Book categories cached.

### 3.5 Frontend Performance

- [ ] React.lazy + Suspense for route-level code splitting.
- [ ] Images served with proper Cache-Control headers.
- [ ] Thumbnails generated for image-heavy lists (if performance issue surfaces).
- [ ] Bundle size < 1 MB gzipped (warning threshold).

---

## 4. Migration Review

- [ ] `php artisan migrate:fresh --seed` runs clean.
- [ ] Every migration has `up()` and `down()`.
- [ ] No raw SQL in migrations (use Schema builder).
- [ ] FK behaviors documented (`cascade`, `restrict`, `set null`).
- [ ] Soft-delete columns only on entities per Phase 1 §2 table.
- [ ] Check constraints present (page_count >= 0, size > 0).
- [ ] Indexes created in migrations (not added later as separate "fix" migrations).

---

## 5. i18n / RTL Completion (Claude §7 Resolution)

### 5.1 Translation Files

`src/locales/fa.json` and `src/locales/en.json` must cover **every** user-visible string:

- Page titles, section headers, button labels, form labels, placeholders.
- Validation error messages (mapped from backend error codes).
- Empty state, loading state, error state messages.
- Toast/notification messages.
- Permission labels (for the role-permission editor UI).

### 5.2 RTL CSS Audit

- [ ] No `left`/`right` physical properties in component CSS.
- [ ] Use `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, etc.
- [ ] Icons that imply direction (arrows) flip correctly in RTL.
- [ ] Modal/dialog positioning respects direction.
- [ ] Table column order respects direction (first column on right in RTL).

### 5.3 Language Toggle

- [ ] Top bar has a language toggle (fa/en).
- [ ] Choice persisted in localStorage.
- [ ] Document `<html dir="...">` and `lang="..."` update on toggle.
- [ ] All date/number formatting respects locale.

### 5.4 Persian-Specific Considerations

- [ ] Persian digits option (configurable; default: Persian digits in fa locale).
- [ ] Persian date display (Jalali) — recommend `dayjs` + `jalaliday` plugin.
- [ ] Persian text input direction auto-detect (use `dir="auto"` on text inputs).

---

## 6. CI/CD Pipeline (Claude §9 Resolution)

### 6.1 Environments

| Env | Purpose | DB | Storage |
|-----|---------|-----|---------|
| `local` | Developer machine | PostgreSQL (Docker or local) | Local disk |
| `staging` | Pre-production testing | PostgreSQL (managed) | S3-compatible bucket |
| `production` | Live | PostgreSQL (managed, replicated) | S3-compatible bucket |

### 6.2 GitHub Actions Workflow

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main, staging]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: dar_al_ajneha_test
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: pdo_pgsql, mbstring, gd, fileinfo
          coverage: xdebug
      - working-directory: backend
        run: |
          composer install --no-interaction
          cp .env.testing .env
          php artisan key:generate
          php artisan migrate:fresh --seed --env=testing
          vendor/bin/pint --test
          php artisan test --coverage --min=80

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - working-directory: frontend
        run: |
          npm ci
          npm run lint
          npm run test -- --coverage
          npm run build
```

### 6.3 Deploy Workflow

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      # SSH deploy or webhook trigger to staging server
      # Run migrations: php artisan migrate --force
      # Restart PHP-FPM / Octane workers
      # Clear caches: php artisan optimize:clear && php artisan optimize
      # Frontend: build and rsync to web root

  deploy-production:
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment: production
    needs: deploy-staging
    steps:
      - uses: actions/checkout@v4
      # Similar to staging but with production secrets
```

### 6.4 Environment Secrets

Configure in GitHub repo settings → Environments:
- `staging`: `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `S3_BUCKET`, `S3_KEY`, `S3_SECRET`, `APP_KEY`.
- `production`: same set, production values.

### 6.5 Branch Protection

- `main`: require PR review (1 approval), require CI pass, no direct pushes.
- `staging`: require CI pass, allow force-push for re-deploys.

---

## 7. Pre-Deployment Checklist

- [ ] All Phase 6 deviations resolved or documented.
- [ ] Test coverage targets met (§1).
- [ ] Security review signed off (§2).
- [ ] Performance review signed off (§3).
- [ ] Migration review signed off (§4).
- [ ] i18n/RTL complete (§5).
- [ ] CI pipeline green on `main`.
- [ ] Staging deploy successful and smoke-tested.
- [ ] Production secrets configured.
- [ ] Backup strategy documented (DB + media storage).
- [ ] Rollback plan documented.
- [ ] Monitoring/alerting configured (at minimum: 500 error rate, DB connection, disk usage).
- [ ] Activity log retention policy set (default: 1 year).

---

## 8. Backup Strategy

- **Database:** nightly pg_dump to S3-compatible bucket, 30-day retention.
- **Media storage:** S3 bucket versioning enabled, 90-day retention for deleted objects.
- **Activity log:** archive to cold storage after 1 year.

---

## 9. Rollback Plan

1. **Code rollback:** revert the deploy commit, redeploy.
2. **DB rollback:** `php artisan migrate:rollback` (only for the last batch; for older rollbacks, restore from backup).
3. **Media rollback:** S3 versioning allows restoring previous file versions.
4. **Communication:** notify product owner; document in incident log.

---

## 10. Phase 7 Definition of Done

- [ ] Backend coverage ≥ 80% on Services and 90% on Policies.
- [ ] Frontend coverage ≥ 70% on pages and 90% on services.
- [ ] All 12 security review sections signed off.
- [ ] All 5 performance review sections signed off.
- [ ] Migration review signed off.
- [ ] `fa.json` and `en.json` complete; no hardcoded user-visible strings.
- [ ] RTL CSS audit complete; no physical left/right properties.
- [ ] Language toggle works end-to-end.
- [ ] Persian digits + Jalali date configured.
- [ ] CI workflow passes on every PR.
- [ ] Staging environment deployed and smoke-tested.
- [ ] Pre-deployment checklist all green.
- [ ] Backup strategy documented.
- [ ] Rollback plan documented.
- [ ] Monitoring configured.
- [ ] Phase 7 report written.

---

## 11. Post-Deployment Monitoring

After production deploy, monitor for 7 days:

- 500 error rate < 0.1% of requests.
- Average API response time < 300ms (p95).
- DB CPU < 60% sustained.
- Disk usage growth rate within expected bounds (media storage).
- No unexpected activity_log entries (audit for anomalies).

Report any anomalies to product owner within 24 hours.

---

## 12. Handoff to Operations

Document for the operations team:
- How to run migrations (`php artisan migrate --force`).
- How to clear and warm caches (`php artisan optimize:clear && php artisan optimize`).
- How to rotate APP_KEY without invalidating all sessions (documented procedure).
- How to add a new admin user via Tinker (emergency access).
- How to restore DB from backup.
- How to restore a single media file from S3 versioning.

This documentation lives in `docs/operations.md` in the repo.
