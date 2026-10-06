# 00 — Overview & Project-Wide Conventions

> **Read this file completely before starting Phase 0.**
> It defines vocabulary, technical decisions, and conventions that every phase inherits.

---

## 1. Product Scope (Unchanged from Original)

Dar Al-Ajneha is a professional web-based administration panel for a publishing company. The system manages Users & Access, Books, Contributors, Media, Announcements, and the cross-domain relationships between them. There is **no mobile-app requirement**.

The system is a **modular monolith**. Do not split v1 into microservices.

---

## 2. Final Stack Decisions (Resolves Claude Review §6)

The original spec listed the stack but left several technical decisions open. The following decisions are now **fixed** for v1:

| Decision Point | Choice | Rationale |
|----------------|--------|-----------|
| API auth mechanism | **Laravel Sanctum** (SPA cookie-based tokens) | Standard Laravel SPA pattern; simpler than Passport; sufficient for first-party admin panel. |
| Soft-delete strategy | **Per-entity decision** — see table below | "Prefer soft-delete" was too vague (Claude §6). |
| Tags implementation | **Normalized `tags` + `book_tag` pivot** | Honors "no comma-separated relational IDs" rule. |
| Backend test framework | **Pest PHP** (or PHPUnit if Pest not installable) | Modern, readable, Laravel-native. |
| Frontend test framework | **Vitest** + React Testing Library | Vite-native, fast, Jest-compatible API. |
| Media upload limits | **MIME whitelist + size cap + dimension cap** — see Phase 4 | Original spec said "validate MIME/size" without numbers. |
| Pagination default | **15 items per page**, configurable per-endpoint (max 100) | Required because original spec said "pagination" without a number. |
| API versioning | **`/api/v1` prefix, version header optional** | Matches original §10. |
| Frontend i18n | **i18next + react-i18next**, Persian RTL primary, English LTR secondary | Resolves Claude §7. |
| Environments | **local / staging / production** with `.env` separation | Resolves Claude §9. |
| CI/CD | **GitHub Actions**: lint → test → build → deploy | Resolves Claude §9. See Phase 7. |

### Per-Entity Soft-Delete Strategy

| Entity | Soft-Delete? | Reason |
|--------|--------------|--------|
| `users` | ✅ Yes | Audit history; cannot lose actor identity. |
| `roles` | ❌ No (hard delete blocked if assigned) | RBAC integrity; delete blocked when `role_user` rows exist. |
| `permissions` | ❌ No (hard delete blocked if assigned) | Same as roles. |
| `contributors` (people) | ✅ Yes | A person may be referenced by historical books. |
| `books` | ✅ Yes | Archive is a published business state. |
| `book_contributor` (pivot) | ❌ No (detach only) | Pivot rows are not business records. |
| `media` | ✅ Yes | File may be referenced by archived books/announcements. |
| `mediables` (polymorphic) | ❌ No (detach only) | Pivot rows. |
| `announcements` | ✅ Yes | Archive is a published business state. |
| `tags` | ❌ No (hard delete blocked if referenced) | Tag integrity. |
| `categories` (book classification) | ❌ No (hard delete blocked if referenced) | Classification integrity. |
| `activity_log` | ❌ No (immutable append-only) | Audit trail. |

---

## 3. Vocabulary Standardization (Resolves GLM §E)

The original spec uses "Person" in UI/Domain text and "Contributor" in DB/API. This caused naming ambiguity. The standard is now:

| Context | Term | Example |
|---------|------|---------|
| Database table | `contributors` | `SELECT * FROM contributors` |
| Eloquent model | `Contributor` | `app/Models/Contributor.php` |
| API resource/endpoint | `contributors` | `GET /api/v1/contributors` |
| API JSON resource class | `ContributorResource` | `app/Http/Resources/ContributorResource.php` |
| Form Request class | `ContributorRequest` (Store/Update) | `app/Http/Requests/Contributor/…` |
| Policy class | `ContributorPolicy` | `app/Policies/ContributorPolicy.php` |
| UI label (visible to user) | "Person" or "Contributor" (i18n key) | i18n key: `contributors.title` |
| Frontend type | `Contributor` | `src/types/Contributor.ts` |
| Frontend page route | `/contributors` | `src/pages/contributors/` |

**Rule:** code-level entity is strictly `Contributor`. UI label may be localized. No `Person` model, no `people` table.

---

## 4. Structural Naming Clarification (Resolves Claude §4)

The word "Category" is overloaded. It means both:
1. **Structural level** in `Domain → Category → Subcategory` (System Map hierarchy).
2. **Business field** in Book Classification (`Category`, `Genre`, `Tags`).

Resolution:

- In documentation, the structural level is always written as **"Map Category"** or qualified by context.
- In code, the book classification fields use prefixed names:
  - `book_category_id` → FK to `book_categories` table (the business Category)
  - `genre` → string field
  - Tags → normalized `tags` + `book_tag` pivot (see §2 above)
- The `book_categories` table is **not** the same concept as the System Map's structural Categories.

---

## 5. Relationship Card Technical Classification (Resolves Claude §1)

The 36 Relationship Key cards are not all the same kind of artifact. Each card is now tagged with one of four **technical classes**:

| Class | Meaning | Implementation |
|-------|---------|----------------|
| **DB** | A real database relationship. | Pivot table or polymorphic relationship. |
| **RBAC** | A Permission ↔ CRUD Action mapping. | A row in the `permissions` table + a Policy method. **Not a database relationship between business entities.** |
| **Business Logic** | A validation/workflow rule, not a table. | Form Request rule + Service-layer check. |
| **Media Link** | A polymorphic media attachment. | `mediables` polymorphic table with `media_type` discriminator. |

The full classification of all 36 cards is in `appendix_a_system_map_and_relationship_key.md`. OpenCode must implement each card according to its class — do **not** create database tables for RBAC or Business Logic cards.

---

## 6. Source-of-Truth Deduplication (Resolves Claude §5)

The original spec listed controlled values (statuses, roles, types) in **both** Section 9 and Appendix A. To eliminate divergence risk:

- **The single source of truth for controlled values is `appendix_a_system_map_and_relationship_key.md`.**
- Phase files reference that appendix by name; they do **not** re-declare the values.
- If a value appears in a phase file, it is for **convenience only** and must match the appendix exactly. If a discrepancy is found, the appendix wins.

---

## 7. API Conventions

### 7.1 Base URL

```
/api/v1
```

### 7.2 Response Envelope

All API responses use a consistent envelope:

```json
{
  "data": { ... } | [ ... ] | null,
  "meta": {
    "page": 1,
    "per_page": 15,
    "total": 100,
    "last_page": 7
  },
  "errors": null | [ { "field": "...", "message": "..." } ]
}
```

- `data` is always present (null on failure with errors).
- `meta` is present on paginated collection responses only.
- `errors` is `null` on success, an array of field-level errors on validation failure.

### 7.3 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PUT) |
| 201 | Created (POST) |
| 204 | No content (DELETE) |
| 400 | Bad request (malformed payload) |
| 401 | Unauthenticated |
| 403 | Unauthorized (authenticated but not permitted) |
| 404 | Not found |
| 422 | Validation error (errors array populated) |
| 429 | Rate limited |
| 500 | Server error (no SQL/stack leakage) |

### 7.4 Pagination

- Default: `?page=1&per_page=15`
- Max: `per_page=100` (server-clamped)
- Validation: `per_page` must be integer 1–100.

### 7.5 Relationship Endpoints (Resolves GLM §B)

The original spec only listed CRUD endpoints. To prevent the agent from inventing attachment patterns, relationship endpoints are now standardized:

```
# Book ↔ Contributor (Package 01, cards 01–04)
POST   /api/v1/books/{book}/contributors        { "contributor_id": 1, "role": "Author" }
GET    /api/v1/books/{book}/contributors
PUT    /api/v1/books/{book}/contributors/{contributor}   { "role": "Translator" }
DELETE /api/v1/books/{book}/contributors/{contributor}

# Book ↔ Media (Package 05, cards 11–13)
POST   /api/v1/books/{book}/media               { "media_id": 1, "media_type": "Book Cover" }
GET    /api/v1/books/{book}/media
DELETE /api/v1/books/{book}/media/{media}

# Contributor ↔ Media (Package 06, card 14)
POST   /api/v1/contributors/{contributor}/media { "media_id": 1, "media_type": "Person Photo" }
GET    /api/v1/contributors/{contributor}/media
DELETE /api/v1/contributors/{contributor}/media/{media}

# Announcement ↔ Media (Package 03 + 10, cards 06 + 29)
POST   /api/v1/announcements/{announcement}/media { "media_id": 1, "media_type": "Announcement Image" }
GET    /api/v1/announcements/{announcement}/media
DELETE /api/v1/announcements/{announcement}/media/{media}
```

These are the **only** relationship endpoints. Do not invent others.

### 7.6 Package 09 Business Logic (Resolves GLM §C + Claude §2)

Package 09 (ANNOUNCEMENTS ↔ BOOKS) cards 24–28 are **not** database tables. They are enforced as business rules on the `announcements` table:

| Card | Announcement Type | Triggers |
|------|-------------------|----------|
| 24 | `New Book` | `book_id` is **required** (FK to a non-archived book). |
| 25 | `Reprint` | Linked book must have a non-null `publication_date`. |
| 26 | `Reprint` | Linked book's `status` must be `Published` or `Scheduled`. |
| 27 | `New Edition` | Linked book must have a non-null `edition`. |
| 28 | `New Edition` | Linked book must have a non-null `publication_date`. |

Schema implication: `announcements.book_id` is a **nullable** FK, validated conditionally in `StoreAnnouncementRequest` / `UpdateAnnouncementRequest`.

The asymmetry between Reprint and New Edition (Claude §2) is **intentional per the approved System Map**. Do not "fix" the symmetry. If asked, surface Q1 from `README.md §11`.

---

## 8. Frontend Conventions

### 8.1 Directory Structure (from original §13, unchanged)

```
src/
├── app/
├── components/
├── layouts/
├── pages/
│   ├── auth/
│   ├── books/
│   ├── contributors/
│   ├── media/
│   ├── announcements/
│   └── users/
├── features/
│   ├── books/
│   ├── contributors/
│   ├── media/
│   ├── announcements/
│   └── users/
├── services/        # API client layer (one file per resource)
├── hooks/
├── types/
├── utils/
├── locales/         # i18n: fa.json, en.json
└── routes/
```

### 8.2 Required UI States

Every list/detail/form page must implement all of:

- loading
- empty
- success
- validation error
- unauthorized
- server error
- not found

### 8.3 Destructive Actions

- Archive and Delete are **two distinct UI actions**. Do not collapse them.
- Both require a confirmation modal.
- Delete modals must show the entity name and a typed-confirm input for high-value entities (Book, Contributor, Announcement).

### 8.4 i18n / RTL

- Default locale: `fa` (Persian), direction `rtl`.
- Secondary locale: `en`, direction `ltr`.
- All user-visible strings go through `t()` / `useTranslation()`.
- CSS uses logical properties (`margin-inline-start`, `padding-inline-end`) — **no** physical `left`/`right` in component CSS.
- A language toggle lives in the top bar.

---

## 9. Backend Conventions

### 9.1 Directory Structure (from original §6, unchanged)

```
app/
├── Models/
├── Http/
│   ├── Controllers/
│   ├── Requests/
│   └── Resources/
├── Policies/
├── Services/
└── Support/

database/
├── migrations/
├── seeders/
└── factories/

routes/
└── api.php

tests/
├── Feature/
└── Unit/
```

### 9.2 Validation

- All backend validation uses **Form Requests**, not inline `$request->validate()`.
- One Form Request per controller action (Store + Update may share via a base class if rules are identical).

### 9.3 Authorization

- All authorization uses **Policies + Gates**, not inline `if (Auth::user()->can(...))`.
- Every controller action calls `$this->authorize(...)` or uses `authorizeResource` in the constructor.
- Frontend permission checks are **UX only**, never security.

### 9.4 Eloquent

- Use eager loading (`with(...)`) to prevent N+1 on list endpoints.
- Use `select(...)` to limit columns on list endpoints.
- Use API Resources for **all** JSON responses — never return Eloquent models directly.

### 9.5 Migrations

- Every migration has `up()` and `down()`.
- Every table has:
  - BigIncrements `id` primary key (or UUID if explicitly required — not default).
  - `created_at`, `updated_at` timestamps.
  - `deleted_at` nullable timestamp **only** for soft-deletable entities (see §2 table).
  - Foreign keys with explicit `onDelete` behavior.
  - Indexes on all foreign keys and frequently-filtered columns.

---

## 10. Testing Conventions

### 10.1 Backend (Pest or PHPUnit)

- **Feature tests** per resource: index, show, store, update, archive, delete, authorization (403), validation (422), not-found (404), unauthenticated (401).
- **Unit tests** for Services and standalone logic.
- **Database**: use `RefreshDatabase` trait. Tests must run on PostgreSQL (same engine as production), not SQLite.

### 10.2 Frontend (Vitest + React Testing Library)

- Component tests for shared components (form fields, modals, tables, empty/error/loading states).
- Page smoke tests: renders without crash in each UI state.
- Mock API at the service layer; do not hit real backend.

### 10.3 Coverage Target

- Phase 7 hardening target: **80% line coverage** on backend Services and Policies; **70%** on frontend pages.

---

## 11. Security Baseline (from original §18, expanded)

- Secure password hashing (Laravel default: bcrypt, cost 12).
- Authorization policies on every write action.
- Input validation on every endpoint (Form Requests).
- Mass-assignment protection (`$fillable` on every model).
- Safe file uploads (MIME sniffing, not extension trust — see Phase 4).
- Parameterized queries (Eloquent only; no raw SQL with user input).
- XSS-safe rendering (React escapes by default; no `dangerouslySetInnerHTML` on user content).
- Rate limiting: login endpoint `5/min/IP`, media upload `30/min/user`, all other API `60/min/user`.
- Environment secrets via `.env`, never committed.
- CORS configured for the frontend origin only.
- CSRF protection on Sanctum cookie auth.

---

## 12. Auditability (from original §21)

The system records important administrative activity. Schema:

```
activity_log
  id
  actor_id        -> users.id (nullable, for system actions)
  action          -> string (e.g. "book.create", "user.disable")
  entity_type     -> string (morph alias, e.g. "book")
  entity_id       -> bigint nullable
  metadata        -> jsonb nullable (before/after diff, request IP, user agent)
  created_at
```

- Append-only. No UPDATE, no DELETE.
- Never log credentials, tokens, or full request bodies of auth endpoints.
- Cross-cutting: implemented via an Eloquent observer or middleware, **not** as a new business Domain.

---

## 13. Applied Improvements Summary (Full Traceability)

For each review issue, the table below shows where it is resolved. Full detail in `appendix_c_improvements_log.md`.

### GLM Review

| Issue | Resolution Location |
|-------|---------------------|
| A. Phase 2/3 build order conflict | `phase_2_contributors.md` §1 (no pivot yet) + `phase_3_books.md` §1 (pivot here) |
| B. Missing relationship endpoints | This file §7.5 + each relevant phase file |
| C. Package 09 ambiguity | This file §7.6 + `phase_5_announcements.md` §3 |
| D. Relationship-only exceptions implementation | `appendix_b_database_schema.md` §6 (polymorphic, not standalone tables) |
| E. Person vs Contributor vocabulary | This file §3 |

### Claude Review

| Issue | Resolution Location |
|-------|---------------------|
| 1. 36-card ambiguity | This file §5 + `appendix_a_system_map_and_relationship_key.md` (each card tagged) |
| 2. Package 09 asymmetry | This file §7.6 + README §11 Q1 (surfaced as open question) |
| 3. Publisher Logo gap | README §11 Q2 + `phase_4_media.md` §6 |
| 4. Category name clash | This file §4 |
| 5. Source-of-truth duplication | This file §6 |
| 6. Missing tech decisions | This file §2 |
| 7. i18n / RTL gap | This file §8.4 + `phase_7_hardening.md` §5 |
| 8. Defensive tone | Replaced with positive imperatives throughout phased files |
| 9. CI/CD gap | This file §2 + `phase_7_hardening.md` §6 |

### NotebookLM Review

| Theme | Resolution Location |
|-------|---------------------|
| Anti-rogue-engineering philosophy | README §5 (Non-Negotiable Agent Rules) + every phase's "Stop and Report" callouts |
| Modular monolith choice | This file §1 |
| Single Person Entity | This file §3 + `phase_2_contributors.md` |
| Intentional traps (Section 4 exceptions) | README §10 + `appendix_b_database_schema.md` §6 |
| Backend authority | This file §11 + every phase's Policy requirements |
| Phased development | README §4 (file index) |
| Strict Definition of Done | README §6 |
| Soft-delete over cascade-delete | This file §2 (per-entity table) |

---

## 14. What To Do Next

OpenCode: proceed to `phase_0_foundation.md`.

**Stop and report** (do not silently decide) if:
- Any controlled value in a phase file contradicts `appendix_a_system_map_and_relationship_key.md`.
- Any phase requires a Domain/Category/Subcategory not in Appendix A.
- Any open question from README §11 must be answered to proceed.
