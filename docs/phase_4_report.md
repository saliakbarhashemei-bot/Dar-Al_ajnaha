# Phase 4 Report

## Scope
- Polymorphic media library (`media` + `mediables` + `media_types`). Attachments for Books and Contributors live; Announcement attachment routes registered but return 501 until Phase 5 creates the table. No `book_media`-style side tables, no Publisher Logo auto-link, no version history.

## Migrations (fresh DB clean)
- `media_types` (name/label/`allowed_mime` jsonb), `media` (soft-deletable, `size > 0` CHECK, uploader FK), `mediables` (unique 4-tuple, media cascade, polymorphic mediable with no DB FK).

## Backend
- `MediaRules` support class: single source for the 6 types' MIME whitelist + max size + dimensions; `MediaTypeSeeder` mirrors `allowed_mime` from it (no divergence).
- Models: `Media` (SoftDeletes, `uploader/books/contributors/announcements` relations, `url()`), `Mediable`, `MediaType`; `Book::media()/cover()`, `Contributor::media()/photo()`; morph map (`Book/Contributor/Announcement`) in `AppServiceProvider`.
- Requests: upload/replace validate sniffed MIME (`getMimeType`, never client claim), per-type size, image dimensions (SVG exempt); attach validates media not archived + MIME-vs-type.
- Resources: `MediaResource` (URL only, never disk path); Book/Contributor resources embed media with `pivot_media_type`.
- Policies: `MediaPolicy` (5 RBAC cards, permission-only; archive/delete ordering in controller); attach/detach authorized via parent policies (`books.edit`/`contributors.edit`) in-controller, not `can:` middleware (the spec's `can:books.edit,book` has no matching gate).
- Controllers: `MediaController` (CRUD + replace/archive, filters q/mime_type/media_type/mediable_type/is_archived); `MediaAttachmentController` (attach/index/detach per entity, duplicate → 422, multi-type disambiguation via `?media_type=`); `MediaTypeController` (index).
- Activity log: upload/update/replace/archive/delete/attach/detach.
- Deletes detach `mediables` explicitly (soft-delete bypasses DB cascade): Media, Book, Contributor destroys all detach.

## Tests (backend 84/84 PASS: 64 prior + 20 new)
- `MediaUploadTest` (8): valid image 201, wrong MIME 422, oversize 422, bad dims 422, valid PDF 201, no-perm 403, replace 200, archive→delete ordering.
- `MediaAttachmentTest` (9): book attach, duplicate 422, MIME mismatch 422, contributor photo + list, detach, book/contributor/media delete cascades, book show embeds media with pivot type.
- `MediaLibraryTest` (3): 6 types, mime/search/archived filters, media_type + mediable_type filters.
- Fixed during phase: `Media $media` vs `{media}` binding bug, `media`→`medium` resource-parameter singularization (forced `parameters(['media' => 'media'])`), nested `UserResource::make(whenLoaded)` requiring eager uploader, media-type seeds in test helper.

## Frontend (12/12 PASS, lint + build clean)
- Types `Media.ts`, service `media.ts` (incl. attach/detach with optional type).
- Pages: Library (grid, filters, bulk archive), Detail (archive/delete gating), Upload (drag-drop `MediaUploader` with client-side MIME/size pre-check), Edit (metadata).
- Book detail: Cover/Images/Files sections + attach-from-library + remove; Contributor detail: Photo section + attach/remove.
- Tests `media.test.tsx` (3: library loading, uploader client-side MIME rejection, book detail loading).

## Verification
- `php artisan test`: 84/84 PASS; `npm run test`: 6 files / 12 tests PASS; `lint` PASS; `build` PASS; `migrate:fresh --seed` PASS; `pint` PASS.

## Deviations / Open questions (for README §11)
- Replace = overwrite in place (no version history); old file deleted.
- Soft-deleted media keeps its file on disk (restorable); pivots are detached on delete.
- Announcement media routes exist but return 501 until Phase 5.
- Upload limits hardcoded in `MediaRules` (runtime-configurable only if product owner asks).

## Next Phase
Ready for Phase 5 — ANNOUNCEMENTS (table, `book_id` business rules, announcement media endpoints go live).
