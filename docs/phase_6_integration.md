# Phase 6 — Integration

> **Goal:** verify all 36 Relationship Key cards and all authorization mappings end-to-end. No new features in this phase — only verification, audit, and gap-fixing.
> **Exit gate:** every card in `appendix_a_system_map_and_relationship_key.md` has a passing test and a verified implementation trace.

---

## 1. Phase 6 Mindset

Phase 6 is **not** a build phase. It is a verification gate. If any card is missing or broken, Phase 6 fixes it — but does **not** add features beyond what earlier phases specified.

**Stop and report** if Phase 6 discovers that an earlier phase missed a card. Do not silently implement missing features.

---

## 2. Card-by-Card Audit

Use the table below. For each card, run the listed test or check. If the check fails, fix in the corresponding phase file's area (or document as a known deviation).

### Package 01 — BOOKS ↔ CONTRIBUTORS (Cards 01–04) — DB Pivot

| Card | Side A | Side B | Test |
|------|--------|--------|------|
| 01 | Author | Author | Attach Contributor with role=Author to a Book; pivot row exists with contributor_role_id=Author. |
| 02 | Translator | Translator | Same with role=Translator. |
| 03 | Editor | Editor | Same with role=Editor. |
| 04 | Illustrator | Illustrator | Same with role=Illustrator. |

**Verify:**
- `book_contributor` migration has unique constraint on (book_id, contributor_id, contributor_role_id).
- `ContributorPolicy@attachContributor` requires `books.edit`.
- Book detail resource serializes contributors grouped by role.

### Package 02 — BOOKS ↔ CONTRIBUTORS (Card 05) — Relationship-Only Exception

| Card | Side A | Side B | Implementation |
|------|--------|--------|----------------|
| 05 | View Book | Books (Contributions) | Satisfied by `Contributor::books()` inverse relation through `book_contributor`. |

**Verify:**
- No `contributions` table exists.
- No `Contributions` model exists.
- `ContributorResource` includes `books_count` when requested.
- Contributor detail page shows "Related Books" section.

### Package 03 — ANNOUNCEMENTS ↔ MEDIA (Card 06) — Relationship-Only Exception + Media Link

| Card | Side A | Side B | Implementation |
|------|--------|--------|----------------|
| 06 | Image / File | Announcement Image | Satisfied by `mediables` rows where mediable_type=Announcement and media_type=Announcement Image. |

**Verify:**
- No `image_files` table or model exists.
- Announcement Image can be attached to an Announcement via `POST /api/v1/announcements/{id}/media`.
- Announcement detail resource includes `media` when loaded.

### Package 04 — USER & ACCESS ↔ CONTRIBUTORS (Cards 07–10) — RBAC

| Card | Permission | Action | Test |
|------|------------|--------|------|
| 07 | contributors.create | Create Person | User without permission → 403 on POST /contributors. |
| 08 | contributors.edit | Edit Person | User without permission → 403 on PUT /contributors/{id}. |
| 09 | contributors.archive | Archive Person | User without permission → 403 on POST /contributors/{id}/archive. |
| 10 | contributors.delete | Delete Person | User without permission → 403 on DELETE /contributors/{id}. |

**Verify:**
- `ContributorPolicy` methods exist and call `$user->hasPermission(...)`.
- Controller uses `$this->authorize(...)`.
- Permissions are seeded (Phase 1).

### Package 05 — BOOKS ↔ MEDIA (Cards 11–13) — Media Link

| Card | Side A | Side B | Test |
|------|--------|--------|------|
| 11 | Cover | Book Cover | Attach Media with media_type=Book Cover to a Book. |
| 12 | Images | Book Image | Attach Media with media_type=Book Image to a Book. |
| 13 | Files | Document | Attach Media with media_type=Document to a Book. |

**Verify:**
- `mediables` rows exist with correct mediable_type=Book.
- MIME validation: only image MIMEs allowed for Book Cover / Book Image; only PDF for Document.
- Book detail shows Cover, Images, Files sections.

### Package 06 — CONTRIBUTORS ↔ MEDIA (Card 14) — Media Link

| Card | Side A | Side B | Test |
|------|--------|--------|------|
| 14 | Photo | Person Photo | Attach Media with media_type=Person Photo to a Contributor. |

**Verify:**
- `mediables` row with mediable_type=Contributor, media_type=Person Photo.
- Contributor detail shows Photo section.
- MIME validation: only image MIMEs.

### Package 07 — USER & ACCESS ↔ MEDIA (Cards 15–19) — RBAC

| Card | Permission | Action | Test |
|------|------------|--------|------|
| 15 | media.upload | Upload Media | 403 without permission. |
| 16 | media.edit | Edit Media | 403 without permission. |
| 17 | media.replace | Replace Media | 403 without permission. |
| 18 | media.archive | Archive Media | 403 without permission. |
| 19 | media.delete | Delete Media | 403 without permission. |

### Package 08 — USER & ACCESS ↔ BOOKS (Cards 20–23) — RBAC

| Card | Permission | Action | Test |
|------|------------|--------|------|
| 20 | books.create | Create Book | 403 without permission. |
| 21 | books.edit | Edit Book | 403 without permission. |
| 22 | books.archive | Archive Book | 403 without permission. |
| 23 | books.delete | Delete Book | 403 without permission. |

### Package 09 — ANNOUNCEMENTS ↔ BOOKS (Cards 24–28) — Business Logic

| Card | Type | Rule | Test |
|------|------|------|------|
| 24 | New Book | book_id required | POST announcement type=New Book without book_id → 422. |
| 25 | Reprint | Linked book has publication_date | POST with book missing publication_date → 422. |
| 26 | Reprint | Linked book status in [Published, Scheduled] | POST with book status=Draft → 422. |
| 27 | New Edition | Linked book has edition | POST with book missing edition → 422. |
| 28 | New Edition | Linked book has publication_date | POST with book missing publication_date → 422. |

**Verify:**
- All 5 rules enforced in `StoreAnnouncementRequest` and `UpdateAnnouncementRequest`.
- Tests exist for each card.

### Package 10 — ANNOUNCEMENTS ↔ MEDIA (Card 29) — Media Link

| Card | Side A | Side B | Test |
|------|--------|--------|------|
| 29 | Create/Edit Announcement | Announcement Image | Attach Announcement Image to an Announcement. |

**Verify:**
- `POST /api/v1/announcements/{id}/media` works.
- Only media_type=Announcement Image accepted (other types → 422).

### Package 11 — USER & ACCESS ↔ ANNOUNCEMENTS (Cards 30–33) — RBAC

| Card | Permission | Action | Test |
|------|------------|--------|------|
| 30 | announcements.create | Create Announcement | 403 without permission. |
| 31 | announcements.edit | Edit Announcement | 403 without permission. |
| 32 | announcements.archive | Archive Announcement | 403 without permission. |
| 33 | announcements.delete | Delete Announcement | 403 without permission. |

### Package 12 — USER & ACCESS ↔ USER & ACCESS (Cards 34–36) — RBAC

| Card | Permission | Action | Test |
|------|------------|--------|------|
| 34 | users.create | Create User | 403 without permission. |
| 35 | users.edit | Edit User | 403 without permission. |
| 36 | users.disable | Disable User | 403 without permission. Also: cannot disable self. |

---

## 3. Cross-Domain Integration Tests

### 3.1 Full Lifecycle Walk

A single Pest test `tests/Feature/Integration/FullLifecycleTest.php` walks the entire system:

1. Admin user logs in.
2. Creates a Contributor (Author).
3. Creates a Book with the Author attached.
4. Uploads a Book Cover image and attaches to the Book.
5. Creates an Announcement of type "New Book" linked to the Book.
6. Attaches an Announcement Image to the Announcement.
7. Verifies all relations load correctly via the API.
8. Archives the Book (Announcement FK restricts — should still work because archive != delete).
9. Attempts to delete the Book — fails with 422 "Announcement linked".
10. Archives the Announcement, then deletes it.
11. Now deletes the Book (cascade-cleans pivot, but not the Contributor).

This test exercises all 12 packages end-to-end.

### 3.2 Permission Matrix Test

`tests/Feature/Integration/PermissionMatrixTest.php`:

For each of the 5 default roles (`admin`, `editor`, `media_manager`, `contributor_manager`, `announcer`):
- Iterate all 22 permissions.
- Assert the role has the expected permissions (per Phase 1 §3 table).
- For each permission the role has, hit the corresponding endpoint → 200/201.
- For each permission the role lacks, hit the endpoint → 403.

### 3.3 Soft-Delete and Archive Cascade Test

`tests/Feature/Integration/CascadeBehaviorTest.php`:

- Archive a Book with Contributor + Media + Announcement → all relations intact, Book is_archived=true.
- Soft-delete a Book → relations intact (pivot rows survive), Book missing from default list.
- Restore a soft-deleted Book → reappears.
- Attempt to hard-delete a Book with Announcement linked → 422.
- Hard-delete a Contributor with books → 422 (FK restrict).
- Hard-delete a Media attached to a Book → cascade removes pivot row only.

---

## 4. API Surface Audit

Run `php artisan route:list --path=api/v1` and verify every route matches the documented endpoints across all phase files. Any route not in the spec is a deviation — either remove it or surface as an open question.

**Expected routes (summary):**

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/me
PUT    /api/v1/me/password

CRUD   /api/v1/users
POST   /api/v1/users/{user}/disable
PUT    /api/v1/users/{user}/roles

CRUD   /api/v1/roles
PUT    /api/v1/roles/{role}/permissions

GET    /api/v1/permissions
GET    /api/v1/permissions/{permission}

CRUD   /api/v1/contributors
POST   /api/v1/contributors/{contributor}/archive
GET    /api/v1/contributor-roles

CRUD   /api/v1/books
POST   /api/v1/books/{book}/archive
POST   /api/v1/books/{book}/contributors
GET    /api/v1/books/{book}/contributors
PUT    /api/v1/books/{book}/contributors/{contributor}
DELETE /api/v1/books/{book}/contributors/{contributor}

CRUD   /api/v1/book-categories
CRUD   /api/v1/tags

CRUD   /api/v1/media
POST   /api/v1/media/{media}/replace
POST   /api/v1/media/{media}/archive
GET    /api/v1/media-types

POST   /api/v1/books/{book}/media
GET    /api/v1/books/{book}/media
DELETE /api/v1/books/{book}/media/{media}

POST   /api/v1/contributors/{contributor}/media
GET    /api/v1/contributors/{contributor}/media
DELETE /api/v1/contributors/{contributor}/media/{media}

CRUD   /api/v1/announcements
POST   /api/v1/announcements/{announcement}/archive

POST   /api/v1/announcements/{announcement}/media
GET    /api/v1/announcements/{announcement}/media
DELETE /api/v1/announcements/{announcement}/media/{media}

GET    /api/v1/health
```

Any extra route = deviation. Investigate.

---

## 5. Frontend Integration Audit

### 5.1 Navigation Audit

Walk every page in the side nav. For each:
- Renders without crash.
- Implements all 7 UI states.
- Backend calls match the documented API.
- Permission-gated UI elements hide when user lacks permission.

### 5.2 Cross-Domain Navigation

- Book detail → click Contributor → lands on Contributor detail.
- Contributor detail → click Book → lands on Book detail.
- Announcement detail → click Book → lands on Book detail.
- Book detail → click Media → opens Media detail in modal or new page.
- Media detail → lists all attached entities (Books, Contributors, Announcements) with links.

### 5.3 Form Validation Sync

Frontend validation messages must match backend validation messages (or be more conservative). If frontend allows submit but backend rejects, the inline error from 422 response must display correctly.

---

## 6. Final Verification Checklist (Original Spec §28)

Run through each item:

- [ ] 5 Domains exist (User&Access, Books, Contributors, Media, Announcements).
- [ ] All approved Categories exist (see Appendix A).
- [ ] All approved Subcategories exist (see Appendix A).
- [ ] All 36 Relationship Key cards are accounted for (see §2 of this file).
- [ ] No undocumented relationship was invented.
- [ ] Relationship-only references (Card 05, Card 06) remain traceable but no standalone tables created.
- [ ] Authentication works (login, logout, /me).
- [ ] Authorization works (all 22 permissions enforced).
- [ ] Users work (CRUD + disable + roles).
- [ ] Roles work (CRUD + permissions).
- [ ] Permissions work (index/show, assigned via roles).
- [ ] Books work (CRUD + archive).
- [ ] Contributors work (CRUD + archive).
- [ ] Contributor roles work (4 roles seeded, pivot uses them).
- [ ] Book/Contributor relationships work (pivot + unique constraint).
- [ ] Media works (upload, replace, archive, delete).
- [ ] Media types work (6 types seeded, MIME validation per type).
- [ ] File storage works (local + S3-compatible abstraction).
- [ ] Announcements work (CRUD + archive).
- [ ] Announcement types work (7 types).
- [ ] Announcement statuses work (5 statuses).
- [ ] Book/Announcement business mappings work (Package 09 rules).
- [ ] Permission mappings work (Phase 1 seeds + per-phase policies).
- [ ] Backend validation works (Form Requests on every endpoint).
- [ ] Frontend validation feedback works (inline 422 errors).
- [ ] Loading states work.
- [ ] Empty states work.
- [ ] Error states work (server error, not found, unauthorized).
- [ ] Archive behavior works (distinct from delete).
- [ ] Delete behavior is safe (FK restricts, soft-delete where specified).
- [ ] API responses are consistent (envelope from §7.2).
- [ ] Clean migrations work (`migrate:fresh --seed`).
- [ ] Seeders work (users, roles, permissions, contributor_roles, media_types).
- [ ] Tests pass (backend Pest + frontend Vitest).
- [ ] No secrets are committed (`.env` in `.gitignore`).
- [ ] No mobile app has been introduced.
- [ ] No unnecessary microservices have been introduced.

---

## 7. Phase 6 Definition of Done

- [ ] All 36 card audits complete (§2 of this file).
- [ ] Full Lifecycle Test passes.
- [ ] Permission Matrix Test passes.
- [ ] Cascade Behavior Test passes.
- [ ] API route list matches expected (no extra, no missing).
- [ ] Frontend navigation audit complete.
- [ ] Cross-domain navigation works.
- [ ] Form validation sync verified.
- [ ] Original §28 checklist all green.
- [ ] No deviations remain (or all deviations documented and approved by product owner).
- [ ] Phase 6 report written, listing any deviations and their justifications.

---

## 8. What To Do If a Card Fails Audit

1. **Do not silently fix.** Open a deviation report.
2. Identify which phase should have implemented the card.
3. Re-read that phase file's section for the card.
4. If the phase file is correct and the implementation is wrong, fix the implementation and re-run the test.
5. If the phase file is ambiguous or missing the card, **stop and report** — the spec needs an amendment (go through Change Control per README §8).

---

## 9. Phase 6 Output

A single document: `Phase 6 Integration Report.md` (saved to `docs/` in the repo). It contains:

1. Card audit table (all 36 rows, each with PASS/FAIL/DEVIATION).
2. Test run output (backend + frontend).
3. API route list comparison.
4. Frontend navigation audit notes.
5. Any deviations and their justifications.
6. Sign-off: "Phase 6 complete. Ready for Phase 7 — Hardening."
