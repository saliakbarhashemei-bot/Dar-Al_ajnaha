# Phase 6 Integration Report

Phase 6 complete. Ready for Phase 7 — Hardening.

## 1. Card Audit (all 36 cards)

| Card | Package | Check | Result |
|------|---------|-------|--------|
| 01 | 01 | Attach Author to Book; pivot row with Author role | PASS (`BookContributorPivotTest`) |
| 02 | 01 | Attach Translator | PASS |
| 03 | 01 | Attach Editor | PASS |
| 04 | 01 | Attach Illustrator | PASS |
| 05 | 02 | No `contributions` table/model; `Contributor::books()` inverse; books_count; Related Books section | PASS (verified: no table, no model) |
| 06 | 03 | No `image_files`; Announcement Image via `mediables`; media in resource | PASS |
| 07 | 04 | `contributors.create` → 403 | PASS |
| 08 | 04 | `contributors.edit` → 403 | PASS |
| 09 | 04 | `contributors.archive` → 403 | PASS |
| 10 | 04 | `contributors.delete` → 403 | PASS |
| 11 | 05 | Book Cover attach; image-only MIME | PASS |
| 12 | 05 | Book Image attach; image-only MIME | PASS |
| 13 | 05 | Document attach; PDF-only MIME | PASS |
| 14 | 06 | Person Photo attach; Photo section; image-only MIME | PASS |
| 15 | 07 | `media.upload` → 403 | PASS |
| 16 | 07 | `media.edit` → 403 | PASS (new `RbacCoverageTest`) |
| 17 | 07 | `media.replace` → 403 | PASS (new) |
| 18 | 07 | `media.archive` → 403 | PASS (new) |
| 19 | 07 | `media.delete` → 403 | PASS (new) |
| 20 | 08 | `books.create` → 403 | PASS |
| 21 | 08 | `books.edit` → 403 | PASS |
| 22 | 08 | `books.archive` → 403 | PASS |
| 23 | 08 | `books.delete` → 403 | PASS (new) |
| 24 | 09 | New Book without book → 422 | PASS |
| 25 | 09 | Reprint needs publication_date | PASS |
| 26 | 09 | Reprint needs Published/Scheduled | PASS |
| 27 | 09 | New Edition needs edition | PASS |
| 28 | 09 | New Edition needs publication_date | PASS |
| 29 | 10 | Announcement Image attach works; MIME-vs-type enforced | PASS (see note 5) |
| 30 | 11 | `announcements.create` → 403 | PASS |
| 31 | 11 | `announcements.edit` → 403 | PASS |
| 32 | 11 | `announcements.archive` → 403 | PASS (new) |
| 33 | 11 | `announcements.delete` → 403 | PASS (new) |
| 34 | 12 | `users.create` → 403 | PASS |
| 35 | 12 | `users.edit` → 403 (other user; self-edit allowed) | PASS (new other-user test) |
| 36 | 12 | `users.disable` → 403 + cannot disable self | PASS |

Unique constraint on `(book_id, contributor_id, contributor_role_id)` verified by duplicate-attach 422 test. Book detail groups contributors by role. Seeds verified: 22 permissions, 5 roles, 4 contributor roles, 6 media types, 7 announcement types / 5 statuses (validation + UI constants).

## 2. Test Runs
- Backend: 126/126 PASS (was 107; +10 integration, +8 RBAC coverage, +1 media-attachments).
- Frontend: 7 files / 16 tests PASS; `lint` PASS; `build` PASS.
- `migrate:fresh --seed` PASS; `pint` PASS.

## 3. API Route Audit
`route:list --path=api/v1` matches the §4 expected list exactly, plus one justified addition: `GET /api/v1/media/{media}/attachments` (serves §5.2 media→entity navigation). `book-categories`/`tags` expose `index/store/update/destroy` and `index/store/destroy` respectively per the authoritative Phase 3 §4.2 (Phase 6 §4 wording is loose). No other extras, nothing missing.

## 4. Frontend Audit
- Side nav covers all 6 areas with permission gating; all pages render loading/empty/error states with inline 422 errors.
- Cross-domain links now complete: Book→Contributor, Contributor→Books page, Announcement→Book, Media→attached entities (new section).

## 5. Deviations & Justifications
1. `GET /media/{media}/attachments` added (see §3).
2. Attach/detach authorized in-controller via parent update policy (`books.edit`/`contributors.edit`/`announcements.edit`); the spec's `can:books.edit,book` middleware has no matching gate definition.
3. Soft-delete preserves pivot rows (§3.3 authoritative over §3.1 step-11 parenthetical); two older tests realigned to the spec.
4. `ContributorResource` always includes `books_count` (via `whenCounted` default) instead of only when counted.
5. Card 29: attachment enforces MIME-vs-type (Phase 4 §5.2), not entity-vs-type pairing — consistent with cards 11–14 audit language and the §1 reuse rationale (one file, different roles per entity).
6. Package 01 audit text names `ContributorPolicy@attachContributor`; implemented as `BookPolicy::attachContributor/detachContributor/updateContributor` (same `books.edit` mapping).

## 6. Bugs Found & Fixed During Audit
- `substr('except:users.', 6)` off-by-one in matrix test (`:users.` never matches) → `strlen('except:')`.
- `Media $medium` vs `{media}` route-param mismatch (empty-model binding); `media`→`medium` resource singularization (forced parameter name).
- Array-rule branch of matrix test; `books_count` eager-load on contributor show; soft-delete pivot expectations.
