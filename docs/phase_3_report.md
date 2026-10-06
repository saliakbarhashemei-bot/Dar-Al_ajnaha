# Phase 3 Report

## Scope
- Books + classification + `book_contributor` pivot (deferred from Phase 2). No announcements table, no `mediables`, no Publisher entity, no status state machine.

## Migrations (fresh DB clean)
- `book_categories`, `tags`, `books` (with `page_count >= 0` CHECK + `book_category_id` FK nullOnDelete), `book_tag` (composite PK, cascades), `book_contributor` (surrogate id, unique triple, book cascade / contributor+role restrict).
- Order note: categories/tags migrate before books (FK dependency), pivot last.

## Backend
- Models: `Book` (SoftDeletes, sluggable, `category/tags/contributors` relations), `BookCategory`, `Tag`; `Contributor::books()` inverse added (satisfies Card 05, no `contributions` table).
- Requests: `StoreBookRequest`/`UpdateBookRequest` (ISBN stored as-is, `page_count min:0`, status enum, nested `contributors[].contributor_id + contributor_role_id|role`), attach/update contributor requests accepting **both** `contributor_role_id` and `role` name (reconciles overview §7.5 string role with Phase 3 FK).
- Resources: `BookResource` groups contributors by role (`role_id/name/label` + people); `BookCategoryResource`, `TagResource`.
- Policies: `BookPolicy` (permission-only checks; archive/delete ordering in controller → 422), `BookCategoryPolicy`/`TagPolicy` (writes need `books.edit`).
- Controllers: `BookController` (CRUD + archive + full filters: q/status/language/category/tag/contributor/role/is_archived, eager loads), `BookContributorController` (attach/index/update/detach; duplicate → 422; multi-role disambiguation via `current_role_id`), `BookCategoryController`, `TagController`.
- Activity log: `book.create/update/archive/delete`, `book.contributor.attach/update/detach`, `book.category.delete`, `book.tag.delete`.
- Contributor delete now blocked (422) when linked books exist (FK restrict guard).

## Tests (backend 64/64 PASS: 39 prior + 25 new)
- `BookCrudTest` (13): CRUD perms, archive ordering, ISBN unique, page_count min, search + status filter.
- `BookContributorPivotTest` (8): attach, role-name attach, dual roles, duplicate 422, role update, selective detach, book-delete detaches pivots (explicit detach — soft-delete bypasses DB cascade), contributor-with-books delete 422.
- `BookCategoryTagTest` (4): perms, referenced-category delete 422, tag delete rules.

## Frontend (9/9 tests PASS, lint + build clean)
- Types `Book.ts`, service `books.ts` (+ categories/tags), pages List/Detail/Create/Edit; detail groups contributors by role with attach/detach (books.edit), archive vs delete gating; create form has repeatable contributor+role group, category select, tag multi-select.
- Contributor detail Related Books now links to Books page.
- Tests `books.test.tsx` (3).

## Verification
- `php artisan test`: 64/64 PASS
- `npm run test`: 5 files / 9 tests PASS; `lint` PASS; `build` PASS
- `migrate:fresh --seed`: PASS; `pint`: PASS

## Decisions / Notes
- ISBN stored as-is (hyphens preserved); validation is a permissive ISBN-10/13 shape check.
- Book soft-delete explicitly detaches `book_contributor` rows (DB cascade only fires on hard delete).
- Tags normalized (`tags` + `book_tag`); no category/tag seeds (created via UI/API).

## Next Phase
Ready for Phase 4 — MEDIA (polymorphic `mediables`, `media()` on Book/Contributor/Announcement).
