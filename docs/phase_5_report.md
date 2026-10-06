# Phase 5 Report

## Scope
- Announcements with type-driven book links (Package 09 as business rules, not tables), announcement media live, RBAC wired. No multi-book links, no rich text, no notifications.

## Migrations (fresh DB clean)
- `announcements` (soft-deletable, nullable `book_id` FK `restrictOnDelete`, type/status enums, scheduled/published timestamps, archive flag).

## Backend
- Model `Announcement` (SoftDeletes, sluggable, `book()` + `media()` relations); `Book::announcements()` inverse added.
- Requests share `ValidatesAnnouncementBook`: Card 24 (New Book → book required, input-or-stored aware so partial updates don't false-fail), Cards 25–26 (Reprint → date + Published/Scheduled), Cards 27–28 (New Edition → edition + date). Reprint/New Edition asymmetry preserved intentionally.
- Resource embeds `book` + `media` (with `pivot_media_type`); auto-sets `published_at` on Publish.
- Policy: 4 RBAC cards, permission-only; archive/delete ordering in controller.
- Controller: CRUD + archive, filters q/type/status/book_id/is_archived, activity log for 5 actions; destroy detaches media.
- Book delete now guarded (422) when linked announcements exist (FK restrict surfaced cleanly).
- Phase 4 announcement media stubs activated (real `Announcement` binding + `announcements.edit` auth); `announcements:publish-scheduled` command implemented + scheduled every minute.

## Tests (backend 107/107 PASS: 84 prior + 23 new)
- `AnnouncementCrudTest` (9): CRUD perms, archive/delete ordering, search/type filter, published auto-timestamp.
- `Package09BusinessRulesTest` (11): all exit-gate cases incl. Scheduled-Reprint accept, News→New Book upgrade 422, book-with-announcements delete 422.
- `AnnouncementMediaAttachmentTest` (3): image attach, PDF-as-image 422, show embeds media.

## Frontend (15/15 PASS, lint + build clean)
- Types/service; List/Detail/Create/Edit pages; shared `AnnouncementForm` with conditional book field (required for New Book, rule hints per type, 500-char counter), book search select, scheduled-at note.
- Detail: linked-book link, Announcement Image attach/remove, archive/delete gating.
- Tests `announcements.test.tsx` (3: loading, New Book required field, Reprint warning).

## Verification
- `php artisan test`: 107/107 PASS; `npm run test`: 7 files / 15 tests PASS; `lint` PASS; `build` PASS; `migrate:fresh --seed` PASS; `pint` PASS.

## Open questions (README §11)
- Q1 Package 09 asymmetry kept as specified.
- Scheduled publish implemented but optional in practice (manual publish works; cron/scheduler needed in deploy).
- One book per announcement; plain-text content; no notifications (all per spec).

## Next Phase
Ready for Phase 6 — INTEGRATION (cross-domain polish), then Phase 7 — HARDENING (coverage, CI/CD).
