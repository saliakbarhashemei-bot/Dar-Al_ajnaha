# Phase 5 — ANNOUNCEMENTS

> **Goal:** implement Announcement management with type-driven Book links (Package 09 business rules).
> **Relationship cards covered:**
> - Package 09 (cards 24–28): Announcement Type ↔ Book fields — implemented as **business validation rules**, not DB tables.
> - Package 10 (card 29): Announcement ↔ Media — exercised here (endpoint from Phase 4).
> - Package 11 (cards 30–33): RBAC for Announcement Management.
> **Exit gate:** an Announcement of type "New Book" requires a linked Book; "Reprint" requires the linked Book to be Published/Scheduled with a publication_date; "New Edition" requires edition + publication_date. Announcement Image attachment works.

---

## 1. Package 09 Implementation (GLM Fix C + Claude §2)

The original spec listed 5 cards in Package 09 (ANNOUNCEMENTS ↔ BOOKS) without explaining how they translate to DB logic. **They are business validation rules, not database relationships.**

### Card-by-Card Implementation

| Card | Announcement Type | Triggers | Implementation |
|------|-------------------|----------|----------------|
| 24 | `New Book` | `book_id` **required** | Form Request rule: `book_id` required when type=New Book |
| 25 | `Reprint` | Linked Book must have non-null `publication_date` | Form Request rule: linked book's publication_date must not be null |
| 26 | `Reprint` | Linked Book's `status` must be `Published` or `Scheduled` | Form Request rule: linked book's status in [Published, Scheduled] |
| 27 | `New Edition` | Linked Book must have non-null `edition` | Form Request rule: linked book's edition must not be null |
| 28 | `New Edition` | Linked Book must have non-null `publication_date` | Form Request rule: linked book's publication_date must not be null |

### Schema Implication

`announcements.book_id` is a **nullable** FK to `books.id`. It is required conditionally based on `type`.

### Asymmetry (Claude §2) — Intentional, Do Not "Fix"

Notice:
- `Reprint` → checks `publication_date` AND `status` (cards 25, 26).
- `New Edition` → checks `edition` AND `publication_date` (cards 27, 28).
- `Reprint` does NOT check `edition`. `New Edition` does NOT check `status`.

This asymmetry is **per the approved System Map**. Do not "balance" it. If asked, surface **Q1 from README §11**.

### Other Announcement Types

For types `News`, `Event`, `Discount`, `Other`:
- `book_id` is optional (nullable).
- No business-rule validation on the linked book.

---

## 2. Domain Reference

### 05. ANNOUNCEMENTS

#### Announcement Management
- Create, View, Edit, Archive, Delete

#### Content
- Title, Short Description, Content

#### Type
- New Book, Reprint, New Edition, News, Event, Discount, Other

#### Status
- Draft, Review, Scheduled, Published, Archived

> **Relationship Key note:** `ANNOUNCEMENTS → Content → Image / File` is preserved as a relationship-only reference (Card 06). Implemented via the `mediables` polymorphic from Phase 4.

### Package 09 — ANNOUNCEMENTS ↔ BOOKS (Cards 24–28)

See §1 above. All 5 cards are Business Logic class.

### Package 10 — ANNOUNCEMENTS ↔ MEDIA (Card 29)

| Card | Side A | Side B | Technical Class |
|------|--------|--------|-----------------|
| 29 | Announcement Management → Create/Edit Announcement | Media Types → Announcement Image | Media Link |

Exercised in Phase 5: `POST /api/v1/announcements/{announcement}/media` (endpoint defined in Phase 4) attaches an Announcement Image. The `Announcement` model gains `media()` morphToMany.

### Package 11 — USER & ACCESS ↔ ANNOUNCEMENTS (Cards 30–33)

| Card | Side A | Side B | Technical Class |
|------|--------|--------|-----------------|
| 30 | Permissions | Create Announcement | RBAC |
| 31 | Permissions | Edit Announcement | RBAC |
| 32 | Permissions | Archive Announcement | RBAC |
| 33 | Permissions | Delete Announcement | RBAC |

---

## 3. Database Schema

See `appendix_b_database_schema.md` §3.5 for full DDL. Summary:

### `announcements` (soft-deletable)

| Column | Type | Notes |
|--------|------|-------|
| id | bigIncrements | PK |
| title | string | required, max 255 |
| slug | string unique | auto from title |
| short_description | string nullable | max 500 |
| content | text nullable | full body |
| type | string | enum: New Book, Reprint, New Edition, News, Event, Discount, Other |
| status | string default 'Draft' | enum: Draft, Review, Scheduled, Published, Archived |
| book_id | FK nullable | → books.id, restrict on delete |
| scheduled_at | timestamp nullable | when status=Scheduled, the publish time |
| published_at | timestamp nullable | when status=Published |
| is_archived | boolean default false | |
| deleted_at | timestamp nullable | soft delete |
| created_at, updated_at | timestamps | |

**FK behavior:** `book_id` is `restrict on delete` — you cannot delete a Book that has linked Announcements. Archive the Book instead. (This honors original §20: "Do not blindly cascade-delete important business data.")

---

## 4. Backend Implementation

### 4.1 Model

`app/Models/Announcement.php`:
- `SoftDeletes`.
- `$fillable = ['title', 'slug', 'short_description', 'content', 'type', 'status', 'book_id', 'scheduled_at', 'published_at', 'is_archived']`.
- `casts`: `scheduled_at` → datetime, `published_at` → datetime, `is_archived` → boolean, `deleted_at` → datetime.
- Relations:
  - `book()` → belongsTo Book.
  - `media()` → morphToMany Media via `mediables` with `media_type` pivot.
  - `creator()` → belongsTo User (if you want to track who created; add `created_by` column).
- Sluggable on `title`.

### 4.2 Endpoints

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('announcements', AnnouncementController::class);
    Route::post('announcements/{announcement}/archive', [AnnouncementController::class, 'archive']);
    // Media attach/detach endpoints defined in Phase 4 — they become functional now.
});
```

### 4.3 Form Requests

`StoreAnnouncementRequest`:
- `title` required string max 255.
- `slug` nullable string unique:announcements,slug.
- `short_description` nullable string max 500.
- `content` nullable string max 50000.
- `type` required string in:New Book,Reprint,New Edition,News,Event,Discount,Other.
- `status` required string in:Draft,Review,Scheduled,Published,Archived.
- `book_id` nullable exists:books,id.
- `scheduled_at` nullable date (required if status=Scheduled).
- `published_at` nullable date (auto-set if status=Published).

**Conditional rules (Package 09):**

```php
use Illuminate\Validation\Rule;

public function rules(): array {
    $rules = [
        'title' => ['required', 'string', 'max:255'],
        'type' => ['required', Rule::in(['New Book','Reprint','New Edition','News','Event','Discount','Other'])],
        'status' => ['required', Rule::in(['Draft','Review','Scheduled','Published','Archived'])],
        'book_id' => ['nullable', 'exists:books,id'],
        // ...
    ];

    // Card 24: New Book → book_id required
    if ($this->input('type') === 'New Book') {
        $rules['book_id'] = ['required', 'exists:books,id'];
    }

    // Cards 25–26: Reprint → linked book must have publication_date AND status in [Published, Scheduled]
    if ($this->input('type') === 'Reprint' && $this->filled('book_id')) {
        $rules['book_id'][] = function ($attr, $value, $fail) {
            $book = Book::find($value);
            if (!$book) return;
            if ($book->publication_date === null) $fail('Linked book must have a publication date.');
            if (!in_array($book->status, ['Published','Scheduled'])) $fail('Linked book must be Published or Scheduled.');
        };
    }

    // Cards 27–28: New Edition → linked book must have edition AND publication_date
    if ($this->input('type') === 'New Edition' && $this->filled('book_id')) {
        $rules['book_id'][] = function ($attr, $value, $fail) {
            $book = Book::find($value);
            if (!$book) return;
            if ($book->edition === null) $fail('Linked book must have an edition.');
            if ($book->publication_date === null) $fail('Linked book must have a publication date.');
        };
    }

    return $rules;
}
```

`UpdateAnnouncementRequest`: same as Store, unique rules ignoring self. Also re-runs Package 09 validation.

### 4.4 Policy

`AnnouncementPolicy`:
- `viewAny`, `view`: true.
- `create`: `announcements.create`.
- `update`: `announcements.edit`.
- `archive`: `announcements.archive` AND not already archived.
- `delete`: `announcements.delete` AND archived.

### 4.5 Resource

`AnnouncementResource`:
```php
return [
    'id' => $this->id,
    'title' => $this->title,
    'slug' => $this->slug,
    'short_description' => $this->short_description,
    'content' => $this->content,
    'type' => $this->type,
    'status' => $this->status,
    'book' => BookResource::make($this->whenLoaded('book')),
    'scheduled_at' => $this->scheduled_at?->toISOString(),
    'published_at' => $this->published_at?->toISOString(),
    'is_archived' => $this->is_archived,
    'media' => MediaResource::collection($this->whenLoaded('media')),
    'created_at' => $this->created_at,
    'updated_at' => $this->updated_at,
];
```

### 4.6 Activity Log

`announcement.create`, `announcement.update`, `announcement.archive`, `announcement.restore`, `announcement.delete`.

### 4.7 Search & Filtering

`GET /api/v1/announcements?`:
- `q` — title, short_description, content (ILIKE).
- `type` — exact.
- `status` — exact.
- `book_id` — exact (announcements linked to a book).
- `is_archived` — default false.
- `page`, `per_page`.

### 4.8 Scheduled Publish (Optional for v1)

If status=Scheduled and `scheduled_at` is set, a scheduled command can flip the status to Published at that time.

```bash
php artisan make:command PublishScheduledAnnouncements
```

Schedule in `routes/console.php` or `app/Console/Kernel.php`:
```php
Schedule::command('announcements:publish-scheduled')->everyMinute();
```

The command:
```php
Announcement::where('status', 'Scheduled')
    ->where('scheduled_at', '<=', now())
    ->update(['status' => 'Published', 'published_at' => now()]);
```

This is **optional** for v1 — surface as an open question if product owner wants manual publish only.

---

## 5. Frontend Implementation

### 5.1 Pages

```
src/pages/announcements/
├── AnnouncementListPage.tsx
├── AnnouncementDetailPage.tsx
├── AnnouncementCreatePage.tsx
└── AnnouncementEditPage.tsx
```

### 5.2 Form

- Title (required)
- Short Description (max 500, with counter)
- Content (rich text editor — recommend TipTap or similar; if not added, plain textarea)
- Type (select, 7 options)
- Status (select, 5 options)
- Book (searchable select; conditional)
- Scheduled At (datetime picker; shown when status=Scheduled)
- Media: Announcement Image attachment (uses Phase 4 UI)

### 5.3 Conditional Book Field Behavior

When Type changes:
- **New Book** → Book field becomes required; UI shows "Required: select a book".
- **Reprint** → Book field optional but recommended; helper text: "Linked book must be Published or Scheduled with a publication date."
- **New Edition** → Book field optional but recommended; helper text: "Linked book must have an edition and publication date."
- **News / Event / Discount / Other** → Book field optional; helper text: "Optional: link to a related book."

The frontend performs a **soft pre-check** of the Package 09 rules and shows a warning, but the **backend is authoritative**. Even if the frontend allows submit, the backend may return 422 with field-level errors.

### 5.4 Status Workflow

Same UX pattern as Book:
- Draft → Review → Scheduled → Published → Archived
- No enforced transitions in v1 (status is freely editable with `announcements.edit`).

### 5.5 Services

`src/services/announcements.ts`:
```ts
export const announcementsApi = {
  list: (params) => api.get('/announcements', { params }).then(r => r.data),
  get: (id) => api.get(`/announcements/${id}`).then(r => r.data.data),
  create: (data) => api.post('/announcements', data).then(r => r.data.data),
  update: (id, data) => api.put(`/announcements/${id}`, data).then(r => r.data.data),
  archive: (id) => api.post(`/announcements/${id}/archive`).then(r => r.data.data),
  delete: (id) => api.delete(`/announcements/${id}`),
};
```

---

## 6. Tests

### 6.1 Backend (Pest)

`tests/Feature/AnnouncementCrudTest.php`:
- standard CRUD with permissions.
- archive / delete ordering.
- search and filter.

`tests/Feature/Package09BusinessRulesTest.php`:
- type=New Book without book_id → 422.
- type=New Book with book_id → 201.
- type=Reprint with book missing publication_date → 422.
- type=Reprint with book status=Draft → 422.
- type=Reprint with book status=Published and publication_date set → 201.
- type=New Edition with book missing edition → 422.
- type=New Edition with book missing publication_date → 422.
- type=News without book_id → 201 (optional).
- update from News to New Book without book_id → 422.
- delete Book linked to Announcement → 422 (FK restrict).

`tests/Feature/AnnouncementMediaAttachmentTest.php`:
- attach Announcement Image → pivot row.
- attach wrong media_type (e.g., Book Cover) to Announcement → 422.

### 6.2 Frontend (Vitest)

`src/test/announcements.test.tsx`:
- form shows required book field when type=New Book.
- form shows warning when type=Reprint and selected book doesn't meet rules.
- standard 7 UI states.

---

## 7. Phase 5 Definition of Done

- [ ] Migration for `announcements` created and run on fresh DB.
- [ ] `book_id` FK with `restrict on delete`.
- [ ] Model `Announcement` with relations (book, media).
- [ ] Sluggable on title.
- [ ] CRUD endpoints + archive.
- [ ] Form Requests enforce all 5 Package 09 business rules.
- [ ] `AnnouncementPolicy` enforces all 4 RBAC cards.
- [ ] `AnnouncementResource` includes book, media (whenLoaded).
- [ ] Activity log writes for all 5 actions.
- [ ] Media attachment endpoint works (defined in Phase 4, exercised here).
- [ ] Frontend: List, Detail, Create, Edit pages with conditional book field behavior.
- [ ] Frontend shows Package 09 rule warnings.
- [ ] Backend + frontend tests green, including Package 09 business rule tests.
- [ ] `php artisan migrate:fresh --seed` runs clean (all 5 phases).
- [ ] (Optional) scheduled publish command registered.
- [ ] Phase 5 report written.

---

## 8. What Not To Do in Phase 5

- ❌ Do not create a separate `announcement_book` pivot table — `announcements.book_id` is a nullable FK.
- ❌ Do not "fix" the asymmetry between Reprint and New Edition cards (Claude §2 — intentional).
- ❌ Do not invent announcement types beyond the 7 approved.
- ❌ Do not invent announcement statuses beyond the 5 approved.
- ❌ Do not implement rich-text editor unless product owner approves (default: plain textarea or simple markdown).
- ❌ Do not implement email notifications for new announcements (out of scope for v1 admin panel).

---

## 9. Stop and Report If

- **Q1 (README §11):** Why is Package 09 asymmetric? Surface to product owner if any clarification needed.
- Product owner wants announcement → multiple books (current: one book per announcement).
- Product owner wants scheduled publish to be a hard requirement (current: optional).
- Product owner wants announcements to support rich-text or HTML content (current: plain text).
- Product owner wants email/notification dispatch when announcement status → Published.
