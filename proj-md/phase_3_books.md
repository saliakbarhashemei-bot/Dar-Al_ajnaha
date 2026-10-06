# Phase 3 — BOOKS

> **Goal:** implement Book management, classification, publishing fields, AND the `book_contributor` pivot table (which was deferred from Phase 2).
> **Relationship cards covered:**
> - Package 01 (cards 01–04): Book ↔ Contributor roles (DB pivot).
> - Package 02 (card 05): relationship-only exception (no new table).
> - Package 08 (cards 20–23): RBAC for Book Management.
> **Exit gate:** a Book can be created with multiple Contributors (Author, Translator, Editor, Illustrator) and viewed with eager-loaded relations.

---

## 1. Why the Pivot Lives in Phase 3 (GLM Fix A)

Phase 2 deferred the `book_contributor` pivot because the `books` table didn't exist. Now that Phase 3 creates `books`, the pivot is created here as a sibling migration.

**Migration order:**
1. `create_books_table`
2. `create_book_categories_table`
3. `create_tags_table`
4. `create_book_tag_table`
5. `create_book_contributor_table`  ← the pivot, with FKs to `books`, `contributors`, `contributor_roles`

---

## 2. Domain Reference

From `appendix_a_system_map_and_relationship_key.md`:

### 02. BOOKS

#### Book Management
- Create Book / View Book / Edit Book / Archive Book / Delete Book

#### Book Information
- Title, ISBN, Description, Page Count, Language, Publication Date

#### People & Relations
- Author, Translator, Editor, Illustrator  ← via pivot with role

#### Publishing
- Publisher, Edition, Publication Date, Status (Draft, Review, Scheduled, Published, Archived)

#### Classification
- Category, Genre, Tags

#### Media
- Cover, Images, Files  ← implemented in Phase 4 (polymorphic)

### Package 01 — BOOKS ↔ CONTRIBUTORS (Cards 01–04)

| Card | Side A (BOOKS) | Side B (CONTRIBUTORS) | Technical Class |
|------|----------------|----------------------|-----------------|
| 01 | People & Relations → Author | Roles → Author | DB (pivot) |
| 02 | People & Relations → Translator | Roles → Translator | DB (pivot) |
| 03 | People & Relations → Editor | Roles → Editor | DB (pivot) |
| 04 | People & Relations → Illustrator | Roles → Illustrator | DB (pivot) |

All four cards are implemented by a **single** `book_contributor` pivot table with a `contributor_role_id` FK. The 4 cards represent the 4 seedable values of that role, not 4 separate tables.

### Package 02 — BOOKS ↔ CONTRIBUTORS (Card 05)

| Card | Side A (BOOKS) | Side B (CONTRIBUTORS) | Technical Class |
|------|----------------|----------------------|-----------------|
| 05 | Book Management → View Book | Contributions → Books | Relationship-only exception (Section 4) |

Do **not** create a `contributions` table. Card 05 is satisfied by the inverse relation `Contributor::books()` defined through the `book_contributor` pivot.

### Package 08 — USER & ACCESS ↔ BOOKS (Cards 20–23)

| Card | Side A | Side B | Technical Class |
|------|--------|--------|-----------------|
| 20 | Permissions | Create Book | RBAC |
| 21 | Permissions | Edit Book | RBAC |
| 22 | Permissions | Archive Book | RBAC |
| 23 | Permissions | Delete Book | RBAC |

### Package 05 — BOOKS ↔ MEDIA (Cards 11–13)

| Card | Side A (BOOKS) | Side B (MEDIA) | Technical Class |
|------|----------------|----------------|-----------------|
| 11 | Media → Cover | Media Types → Book Cover | Media Link (Phase 4) |
| 12 | Media → Images | Media Types → Book Image | Media Link (Phase 4) |
| 13 | Media → Files | Media Types → Document | Media Link (Phase 4) |

Book model gains `media()` morphToMany in Phase 4. The `BookResource` may include a `media` key only when Phase 4 is complete.

### Package 09 — ANNOUNCEMENTS ↔ BOOKS (Cards 24–28)

Implemented as business logic in Phase 5. Phase 3 only adds the `announcements.book_id` FK migration when Phase 5 runs. **Do not pre-create the announcements table here.**

---

## 3. Database Schema

See `appendix_b_database_schema.md` §3.3 for full DDL. Summary:

### `books` (soft-deletable)

| Column | Type | Notes |
|--------|------|-------|
| id | bigIncrements | PK |
| title | string | required, max 255 |
| slug | string unique | auto from title |
| isbn | string nullable | unique when not null, validated ISBN-10 or ISBN-13 |
| description | text nullable | |
| page_count | integer nullable | check >= 0 |
| language | string nullable | ISO 639-1 code (e.g. "fa", "en") |
| publication_date | date nullable | |
| publisher | string nullable | free text (publisher is not a separate entity in v1) |
| edition | string nullable | e.g. "1st", "2nd" |
| status | string default 'Draft' | enum: Draft, Review, Scheduled, Published, Archived |
| book_category_id | FK nullable | → book_categories.id |
| genre | string nullable | free text |
| is_archived | boolean default false | archive flag distinct from soft delete |
| deleted_at | timestamp nullable | soft delete |
| created_at, updated_at | timestamps | |

**Check constraint:** `page_count >= 0`.

### `book_categories` (not soft-deletable; delete blocked if referenced)

| Column | Type | Notes |
|--------|------|-------|
| id | bigIncrements | PK |
| name | string unique | e.g. "Fiction", "Non-fiction", "Children" |
| label | string | display |
| created_at, updated_at | timestamps | |

**Note:** This is the *business* Category from Book Classification. Do not confuse with the System Map's structural "Map Category" — see `00_overview_conventions.md` §4.

### `tags` (not soft-deletable; delete blocked if referenced)

| Column | Type | Notes |
|--------|------|-------|
| id | bigIncrements | PK |
| name | string unique | |
| label | string | |
| created_at, updated_at | timestamps | |

### `book_tag` (pivot)

| Column | Type | Notes |
|--------|------|-------|
| book_id | FK → books.id | cascade on delete |
| tag_id | FK → tags.id | cascade on delete |
| PK | composite (book_id, tag_id) | |

### `book_contributor` (pivot — the heart of Package 01)

| Column | Type | Notes |
|--------|------|-------|
| id | bigIncrements | PK (allows same book-contributor pair to have multiple roles) |
| book_id | FK → books.id | cascade on delete |
| contributor_id | FK → contributors.id | restrict on delete (cannot delete contributor with books — must archive first) |
| contributor_role_id | FK → contributor_roles.id | restrict on delete |
| created_at, updated_at | timestamps | |
| Unique | (book_id, contributor_id, contributor_role_id) | prevents duplicate role assignment |

**Why a surrogate `id` instead of composite PK on (book_id, contributor_id)?** Because the same person can be both Author AND Editor of the same book (two pivot rows). The unique constraint is on the triple.

---

## 4. Backend Implementation

### 4.1 Models

`app/Models/Book.php`:
- `SoftDeletes`.
- `$fillable = ['title', 'slug', 'isbn', 'description', 'page_count', 'language', 'publication_date', 'publisher', 'edition', 'status', 'book_category_id', 'genre', 'is_archived']`.
- `casts`: `publication_date` → date, `page_count` → integer, `is_archived` → boolean, `deleted_at` → datetime.
- Relations:
  - `category()` → belongsTo `BookCategory` (book_category_id).
  - `tags()` → belongsToMany `Tag` via `book_tag`.
  - `contributors()` → belongsToMany `Contributor` via `book_contributor` withPivot `contributor_role_id`.
  - `media()` → morphToMany `Media` via `mediables` (added in Phase 4).
- Sluggable on `title`.

`app/Models/BookCategory.php`:
- `$fillable = ['name', 'label']`.
- `books()` relation.

`app/Models/Tag.php`:
- `$fillable = ['name', 'label']`.
- `books()` relation.

### 4.2 Endpoints

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('books', BookController::class);
    Route::post('books/{book}/archive', [BookController::class, 'archive']);
    Route::post('books/{book}/contributors', [BookContributorController::class, 'attach']);
    Route::get('books/{book}/contributors', [BookContributorController::class, 'index']);
    Route::put('books/{book}/contributors/{contributor}', [BookContributorController::class, 'update']);
    Route::delete('books/{book}/contributors/{contributor}', [BookContributorController::class, 'detach']);
    Route::apiResource('book-categories', BookCategoryController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('tags', TagController::class)->only(['index', 'store', 'destroy']);
});
```

### 4.3 Form Requests

`StoreBookRequest`:
- `title` required string max 255.
- `slug` nullable string unique:books,slug.
- `isbn` nullable string regex for ISBN-10 or ISBN-13, unique:books,isbn.
- `description` nullable string max 10000.
- `page_count` nullable integer min:0.
- `language` nullable string size:2 (ISO 639-1).
- `publication_date` nullable date.
- `publisher` nullable string max 255.
- `edition` nullable string max 64.
- `status` required string in:`Draft,Review,Scheduled,Published,Archived`.
- `book_category_id` nullable exists:book_categories,id.
- `genre` nullable string max 128.
- `tag_ids` nullable array, `tag_ids.*` exists:tags,id.
- `contributors` nullable array of `{ contributor_id, role_id }`, validated nested.

`UpdateBookRequest`: same as Store, unique rules ignoring self.

`AttachBookContributorRequest`:
- `contributor_id` required exists:contributors,id.
- `contributor_role_id` required exists:contributor_roles,id.

`UpdateBookContributorRequest`:
- `contributor_role_id` required exists:contributor_roles,id.

### 4.4 Policy

`BookPolicy`:
- `viewAny`, `view`: true.
- `create`: `books.create`.
- `update`: `books.edit`.
- `archive`: `books.archive` AND book not already archived.
- `delete`: `books.delete` AND book is archived.
- `attachContributor`, `detachContributor`, `updateContributor`: `books.edit`.

`BookCategoryPolicy`, `TagPolicy`:
- All write actions require `books.edit` (categories and tags are book management).
- Read is open to any authenticated user.

### 4.5 Resources

`BookResource`:
```php
return [
    'id' => $this->id,
    'title' => $this->title,
    'slug' => $this->slug,
    'isbn' => $this->isbn,
    'description' => $this->description,
    'page_count' => $this->page_count,
    'language' => $this->language,
    'publication_date' => $this->publication_date?->toDateString(),
    'publisher' => $this->publisher,
    'edition' => $this->edition,
    'status' => $this->status,
    'is_archived' => $this->is_archived,
    'category' => BookCategoryResource::make($this->whenLoaded('category')),
    'genre' => $this->genre,
    'tags' => TagResource::collection($this->whenLoaded('tags')),
    'contributors' => $this->whenLoaded('contributors', fn () => $this->contributors->groupBy(fn ($c) => $c->pivot->contributor_role_id)->map(...)),
    'media' => MediaResource::collection($this->whenLoaded('media')),  // Phase 4
    'created_at' => $this->created_at,
    'updated_at' => $this->updated_at,
];
```

**Contributor grouping:** when serializing contributors on a Book, group them by role so the frontend can render "Authors: [...], Translators: [...], Editors: [...], Illustrators: [...]".

### 4.6 Activity Log

`book.create`, `book.update`, `book.archive`, `book.restore`, `book.delete`, `book.contributor.attach`, `book.contributor.detach`, `book.contributor.update`.

### 4.7 Search & Filtering

`GET /api/v1/books?`:
- `q` — title, slug, isbn, description (ILIKE).
- `status` — exact match.
- `language` — exact.
- `book_category_id` — exact.
- `tag_id` — exact (books with this tag).
- `contributor_id` — exact (books with this contributor).
- `contributor_role_id` — exact (books with a contributor in this role).
- `is_archived` — default false.
- `page`, `per_page`.

Eager load: `category`, `tags`, `contributors` (with pivot). Use `withCount('contributors')` for list view.

---

## 5. Frontend Implementation

### 5.1 Pages

```
src/pages/books/
├── BookListPage.tsx
├── BookDetailPage.tsx
├── BookCreatePage.tsx
└── BookEditPage.tsx
```

### 5.2 Detail Page Sections

Per original spec §14, Book detail exposes:
- Book Information (title, ISBN, description, page count, language, publication date)
- People & Relations (contributors grouped by role, with attach/detach UI if `books.edit`)
- Publishing (publisher, edition, publication date, status)
- Classification (category, genre, tags)
- Media (cover, images, files — populated in Phase 4)

### 5.3 Book Form

The create/edit form has:
- Title (required)
- ISBN (with format hint)
- Description (textarea)
- Page Count (number, min 0)
- Language (select: fa, en, ar, ...)
- Publication Date (date picker)
- Publisher (text)
- Edition (text)
- Status (select with 5 options)
- Category (select, searchable)
- Genre (text)
- Tags (multi-select with create-on-type)
- Contributors (repeatable group: select Contributor + select Role; can add many)

### 5.4 Status Workflow

Status transitions (UX hint; not enforced as state machine unless explicitly requested):
- Draft → Review → Scheduled → Published → Archived
- Any → Archived (cancel)
- Archived → Draft (restore)

For v1, no enforced transition rules — the status field is freely editable with `books.edit`. If product owner wants enforced transitions, surface as open question.

### 5.5 Services

`src/services/books.ts`:
```ts
export const booksApi = {
  list: (params) => api.get('/books', { params }).then(r => r.data),
  get: (id: number) => api.get(`/books/${id}`).then(r => r.data.data),
  create: (data: BookInput) => api.post('/books', data).then(r => r.data.data),
  update: (id: number, data: BookInput) => api.put(`/books/${id}`, data).then(r => r.data.data),
  archive: (id: number) => api.post(`/books/${id}/archive`).then(r => r.data.data),
  delete: (id: number) => api.delete(`/books/${id}`),
  attachContributor: (bookId: number, contributorId: number, roleId: number) =>
    api.post(`/books/${bookId}/contributors`, { contributor_id: contributorId, contributor_role_id: roleId }),
  detachContributor: (bookId: number, contributorId: number, roleId: number) =>
    api.delete(`/books/${bookId}/contributors/${contributorId}`, { data: { contributor_role_id: roleId } }),
};
```

### 5.6 Types

`src/types/Book.ts` — full Book interface including status enum, category, tags, contributors (grouped by role).

---

## 6. Tests

### 6.1 Backend (Pest)

`tests/Feature/BookCrudTest.php`:
- standard CRUD with permissions.
- archive / delete ordering enforced.
- ISBN uniqueness when present.
- page_count >= 0 enforced.
- search by title works.
- filter by status, language, category, tag, contributor, role.

`tests/Feature/BookContributorPivotTest.php`:
- attach contributor with role → pivot row exists.
- attach same contributor with different role → both rows exist.
- attach same (contributor, role) twice → 422 unique violation.
- detach by (contributor, role) removes only that row.
- delete book cascades pivot rows.
- delete contributor with books → 422 "Archive first" (FK restrict).

`tests/Feature/BookCategoryTagTest.php`:
- category CRUD with permission.
- tag CRUD.
- cannot delete category referenced by book → 422.

### 6.2 Frontend (Vitest)

`src/test/books.test.tsx`:
- BookListPage renders all 7 states.
- BookCreatePage submit calls API.
- BookDetailPage renders contributors grouped by role.
- Attach contributor calls API and refreshes.

---

## 7. Phase 3 Definition of Done

- [ ] Migrations for `books`, `book_categories`, `tags`, `book_tag`, `book_contributor` created and run on fresh DB.
- [ ] `book_contributor` pivot has unique constraint on (book_id, contributor_id, contributor_role_id).
- [ ] FK behaviors: book delete cascades pivot; contributor delete restricts (archive first).
- [ ] Models `Book`, `BookCategory`, `Tag` with `$fillable`, casts, relations.
- [ ] Sluggable on Book.
- [ ] Book CRUD endpoints + archive + contributor attach/detach/update endpoints.
- [ ] BookCategory + Tag endpoints.
- [ ] `BookPolicy` enforces all 4 RBAC cards + pivot edit permissions.
- [ ] Form Requests with documented rules (including ISBN regex, page_count min).
- [ ] `BookResource` groups contributors by role.
- [ ] Activity log writes for all 8 actions.
- [ ] Search and filtering work for all documented params.
- [ ] Frontend: List, Detail, Create, Edit pages with all 7 UI states.
- [ ] Book form includes contributors repeatable group.
- [ ] Archive vs Delete distinction enforced.
- [ ] Backend + frontend tests green.
- [ ] `php artisan migrate:fresh --seed` runs clean (Phase 1+2+3 migrations).
- [ ] Phase 3 report written.

---

## 8. What Not To Do in Phase 3

- ❌ Do not create the `announcements` table or `announcements.book_id` FK (Phase 5).
- ❌ Do not create the `mediables` polymorphic table (Phase 4).
- ❌ Do not invent book statuses beyond the 5 approved.
- ❌ Do not implement Publisher as a separate entity (it's a free-text field per original §8).
- ❌ Do not enforce a status state machine (Draft→Review→...) unless product owner approves.
- ❌ Do not merge `is_archived` and `deleted_at` (they are distinct, see Phase 2 §3).

---

## 9. Stop and Report If

- Q4 from README §11 must be answered: are Tags free-text or normalized? Default is normalized `tags` + `book_tag` pivot. If product owner wants free-text, change the implementation.
- The product owner wants Publisher to be a normalized entity (not free text) — would require a new `publishers` table and contradict original §8.
- ISBN-13 with hyphens should be normalized or stored as-is — pick one and document.
