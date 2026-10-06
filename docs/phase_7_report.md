# Phase 7 Report — Hardening (Security §2, Performance §3, Coverage §1, i18n/RTL §5)

Scope of this pass: the backend security review, the backend performance review, the
coverage gates for both tiers, and i18n/RTL completion. CI/CD (§6) and deployment
(§7–§12) are configured but not executed here — they require a staging environment.

## 1. Test Suite

| Suite | Before | After |
|-------|--------|-------|
| Backend (Pest) | 134 | **229** (+95) |
| Frontend (Vitest) | 16 | **120** (+104) |
| Frontend line coverage | ~30% | **88.4%** |

New backend test files: `Auth/StatefulAuthTest`, `User/TokenRevocationTest`,
`Media/MediaFileServingTest`, `ActivityLogAppendOnlyTest`, and
`Performance/{NplusOneTest, PaginationLimitTest, IndexCoverageTest, CaseInsensitiveSearchTest}`.

New frontend test files: `services`, `usersPages`, `rolesPages`, `booksPages`,
`mediaPages`, `mediaUploader`, `contributorsAnnouncements`, `appShell`, plus
`fixtures.ts` and expanded `smoke`.

All green: `php artisan test` 229/229, `pint --test`, `npm run lint`, `npm run build`.

## 2. Security Review (§2) — findings and fixes

| § | Item | Before | After |
|---|------|--------|-------|
| 2.1 | Sanctum stateful auth enabled | **FAIL** — `statefulApi()` never called, so the SPA's session cookie could not authenticate; every authenticated endpoint 500'd (`Route [login] not defined`) | PASS — `bootstrap/app.php` calls `statefulApi()` and `redirectGuestsTo(fn () => null)`, so guests get 401 JSON |
| 2.1 | Session login/logout | **FAIL** — login only issued a token; the `web` guard was never logged in | PASS — `Auth::guard('web')->login()`, and logout logs out + invalidates the session, handling `TransientToken` (cookie) and `PersonalAccessToken` (bearer) |
| 2.1 | Token expiry | **FAIL** — `sanctum.expiration = null`, tokens valid forever | PASS — published `config/sanctum.php` with `expiration => 1440`, passed as `expiresAt` |
| 2.1 | Credential revocation | **FAIL** — password change / disable / role change left existing tokens working | PASS — `User::revokeAllTokens()` called from all three paths plus delete |
| 2.1 | CSRF cookie | **FAIL** — the SPA never requested it | PASS — `authApi.login` first calls `GET /sanctum/csrf-cookie`; the Vite dev proxy now forwards `/sanctum` |
| 2.3 | Every endpoint has a Form Request | **PARTIAL** — `BookContributorController::detach` read raw input | PASS — `DetachBookContributorRequest` with `exists:` + `Rule::in` |
| 2.3 | Enums via `Rule::in(...)` | **PARTIAL** — books used the `'in:a,b,c'` string form | PASS — `Rule::in(WorkflowStates::BOOK_STATUSES)`, a single source of truth alongside `MediaRules` |
| 2.5 | Search uses `ILIKE` | **FAIL** — `like` is case-sensitive on PostgreSQL, so search was functionally broken | PASS — `SearchesColumns` scope, bound parameters, `%`/`_` escaped with `ESCAPE '\'` |
| 2.8 | Media served by controller / signed URL | **FAIL** — every URL the API emitted was an unsigned `/storage/...` link that 403'd | PASS — authorized `GET /api/v1/media/{media}/file`; `Media::url()` returns that relative path |
| 2.8 | Filename/extension handling | **PARTIAL** — storage extension fell back to the client-supplied one | PASS — extension derived from the sniffed MIME only |
| 2.11 | Every write action logged | **FAIL** — tag create, book-category create/update, password change | PASS |
| 2.11 | `activity_log` append-only | **PARTIAL** — nothing enforced it | PASS at the model layer (`updating`/`deleting` throw). Eloquent mass deletes bypass model events; DB-level enforcement deliberately left out so the retention/archival job can remove rows |

Unchanged and verified as already compliant: bcrypt cost 12, password never serialized,
generic invalid-credentials response, login throttle 5/min, policies on every write
method with `$this->authorize`, no inline role checks, explicit `$fillable` everywhere and
no `$guarded = []`, no raw SQL with user input, no `dangerouslySetInnerHTML`, CORS
origins from env, MIME sniffed via `getMimeType()`, per-type size and dimension limits,
throttle 5/1 login, 30/1 upload, 60/1 API, `.env` gitignored, no secrets in config or
frontend, no credentials in `activity_log.metadata`, `composer audit` and `npm audit` clean.

Two defects were invisible to the old suite because every test used
`Sanctum::actingAs()`, which bypasses the middleware. `StatefulAuthTest` now asserts the
middleware registration and drives a real cookie round-trip.

## 3. Performance Review (§3) — findings and fixes

| § | Item | Before | After |
|---|------|--------|-------|
| 3.1 | N+1 on the books index | **FAIL** — 20 queries for 15 books (`ContributorRole::all()` inside `BookResource::toArray`) | PASS — reuses the cached role list |
| 3.1 | N+1 on the contributors index | **FAIL** — 17 queries for 15 contributors (`whenCounted('books', fn () => $this->books()->count())`) | PASS — bare `whenCounted` |
| 3.1 | N+1 on media attachments | **FAIL** — 21 queries for 20 attachments | PASS — one batched query per entity type |
| 3.2 | `per_page` ceiling | **FAIL** — `per_page=100000` returned 100000 rows | PASS — `PaginatesRequests::perPage()` clamps to 1–100 across all 9 collection endpoints |
| 3.3 | Indexes | **PARTIAL** — 6 filtered/joined FK columns unindexed | PASS — migration `2026_01_01_000019_add_foreign_key_indexes` |
| 3.4 | Permission caching | PASS | PASS, now also invalidated on disable/delete |
| 3.4 | Book category caching | FAIL | **Not implemented, deliberately** — see §5.2 |
| 3.5 | Route code splitting | FAIL | PASS — `React.lazy` + `Suspense`; entry chunk 87 kB gzip |
| 3.5 | Media cache headers | **FAIL** — `Cache-Control: no-store` on immutable UUID paths | PASS — `private, max-age=31536000, immutable` |
| 3.5 | Image loading | **PARTIAL** — full-size originals in a 100px grid, no lazy loading | PASS — `loading="lazy"` + `decoding="async"` on all list images |

Index gaps closed: `announcements.book_id` (explicitly required by §3.3 and actively
filtered), `books.book_category_id`, `role_user.user_id`, `permission_role.role_id`,
`media.uploaded_by`, `book_tag.tag_id`. PostgreSQL does not auto-index FK columns and
Laravel's `constrained()` only adds the constraint.

`NplusOneTest` and `IndexCoverageTest` assert query counts and real index columns, so
these regressions fail CI rather than silently returning.

## 4. Coverage Gates (§1)

Measured coverage needs a driver, and neither Xdebug nor PCOV is available on this
machine, so the numbers below come from CI, not from this workstation.

- **Backend**: `backend/scripts/check-coverage.php` parses the Clover report and fails on
  the §1.1 per-area targets — Services 80, Policies 90, Controllers 70, Models 60.
  Wired as `composer test:coverage` and into the CI backend job (replacing the single
  global `--min=80`). The script was verified against synthetic Clover reports for both
  the pass and fail paths, and confirmed to exclude `Http/Requests`.
- **Frontend**: `@vitest/coverage-v8` installed; `vite.config.ts` declares the §1.2
  line-coverage thresholds (services 90, hooks 80, components 80, pages 70). All four
  pass locally: services 95.1, hooks 86.2, components 95.6, pages 76.5.

## 5. Deviations and Judgement Calls

1. **`GET /api/v1/media/{media}/file` added.** Phase 6 audited the route list exactly;
   this is a second addition, but the alternative was leaving every media URL in the API
   broken (they 403'd). The `local` disk is private, so the framework `/storage` route
   only accepts signed URLs, which do not work for `<img>` sources.
2. **Book category caching not implemented.** An initial cached `index()` broke the
   collection-endpoint contract (default 15 / max 100) and had no hot-path consumer, so
   it was reverted to paginated. The §3.4 checkbox stays open by choice, not oversight.
3. **Activity log append-only stops at the model layer.** Eloquent mass operations do
   not fire model events, and a database trigger would block the retention/archival job
   in §8 of the spec.
4. **Coverage thresholds are line coverage only**, matching the spec's wording and the
   backend script. Branch coverage is reported but not gated.
5. **Frontend test count includes a `smoke` suite that renders `App`**, so the lazy
   route wiring is exercised; previously only `Home` was rendered.
6. **Laravel version.** `composer.json` pins `laravel/framework: ^13.17`; the spec
   documents 12. Left as-is — the audits were performed against the installed version.
7. **`MediaPolicy::view` is intentionally open to any authenticated user**, so the new
   file route is authorization-checked but not permission-gated. A 403 test was written,
   observed to be wrong, and removed rather than left asserting a false expectation.

## 6. Still Open

- §1.1 backend coverage: measured and gated, but the actual percentages are only
  produced in CI. Run `composer test:coverage` on a machine with Xdebug or PCOV to
  record the numbers in this report.
- §3.5 thumbnails: not implemented. The spec marks it conditional ("if performance
  issue surfaces"); lazy loading and immutable caching were done instead, and a
  100px grid of full-size images is the case that would justify a `thumbnail_path`
  column and a resize step.
- §3.1 Debugbar is not installed, so that checkbox cannot be verified locally.
- §2.11 duplicate logging: `UserController` and `UserObserver` both write
  `user.create`/`user.update`/`user.delete`. Pre-existing and harmless (duplicate
  entries, not missing ones), left alone to avoid churning the audit trail format.
- §6 CI/CD, §7 deployment, §8–§12 backup/rollback/monitoring: not exercised.
