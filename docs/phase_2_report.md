# Phase 2 Report

## Scope
- Contributors only. No `book_contributor` pivot, no `Contributions` model, no `media()` relation (per spec §8).

## Backend
- Migrations: `contributors` (soft-deletable + `is_archived`), `contributor_roles` lookup.
- Seeder: `ContributorRoleSeeder` with exactly Author, Translator, Editor, Illustrator.
- Models: `Contributor` (SoftDeletes, auto-slug on create), `ContributorRole`.
- Requests: `StoreContributorRequest`, `UpdateContributorRequest` per spec §4.3.
- Resource: `ContributorResource` (+ `ContributorRoleResource`).
- Policy: `ContributorPolicy` — permission checks only (`contributors.create/edit/archive/delete`); business rules (already-archived → 422, delete-requires-archive → 422) enforced in controller.
- Controllers: `ContributorController` (index/show/store/update/archive/destroy), `ContributorRoleController` (index).
- Routes: `apiResource('contributors')`, `POST contributors/{contributor}/archive`, `GET contributor-roles`.
- Activity log: `contributor.create/update/archive/delete` written in controller.

## Tests (backend: 39/39 PASS)
- `ContributorCrudTest`: index/store/show/update/archive/delete, archive-twice → 422, delete-non-archived → 422, delete without permission → 403, soft-delete excluded from index, search by name.
- `ContributorRoleTest`: `/contributor-roles` returns exactly 4 (authenticated).
- Fixed during phase: `ActivityLog` table name (`activity_log`), Sanctum `personal_access_tokens` migration, `AuthorizesRequests` on base Controller, test DB seeding via `seedRolesAndPermissions()`, list tests reading `json('data')` not `json('data.data')`, search using `$request->input('q')`.

## Frontend
- Types: `src/types/Contributor.ts` (`Contributor`, `ContributorInput`, `ContributorRole`).
- Service: `src/services/contributors.ts` (list/get/create/update/archive/delete/roles).
- Pages: `ContributorListPage` (search + loading/empty/error), `ContributorDetailPage` (person info, empty Roles/Books sections, archive vs delete gating), `ContributorCreatePage`, `ContributorEditPage`.
- Routes wired in `App.tsx` with `RequirePermission` guards.
- Tests: `src/test/contributors.test.tsx` (3 tests). Full suite: 4 files, 6 tests PASS.
- `npm run lint`: PASS. `npm run build`: PASS.

## Verification
- `php artisan test`: PASS (39/39)
- `npm run test`: PASS (6/6)
- `npm run build`: PASS
- `npm run lint`: PASS
- `php artisan migrate:fresh --seed`: PASS (Phase 1 + Phase 2)

## Known Limitations / Deviations
- `role=Author` filter on contributor list deferred (requires Phase 3 pivot) — returns unfiltered, documented in UI empty states.
- Photo section deferred to Phase 4 (`mediables`).

## Next Phase
Ready to start Phase 3 — BOOKS (+ `book_contributor` pivot).
