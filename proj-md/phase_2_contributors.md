# Phase 2 — CONTRIBUTORS

> **Goal:** implement reusable Person (Contributor) management.
> **Critical GLM fix:** do **NOT** create the `book_contributor` pivot table in this phase. The Books entity does not exist yet. The pivot is created in Phase 3.
> **Relationship cards covered:** Package 04 (cards 07–10) — RBAC for Person Management.
> **Exit gate:** a Contributor can be created, viewed, edited, archived, and deleted. A user without `contributors.create` gets 403.

---

## 1. Why Phase 2 Comes Before Phase 3 (GLM Fix A)

The original spec said "Phase 2 — CONTRIBUTORS: build the book/contributor relationship foundation." But Books doesn't exist until Phase 3. Trying to create a `book_contributor` pivot with a `book_id` FK in Phase 2 would cause a migration failure because the `books` table doesn't exist yet.

**Resolution (applied here):**

- **Phase 2 = Contributors only.** Person management, roles enum, person information. No pivot.
- **Phase 3 = Books + pivot.** When the `books` table exists, the `book_contributor` pivot is created alongside it.

If the OpenCode agent encounters an old instruction to create the pivot in Phase 2, **ignore it**. This file is authoritative.

---

## 2. Domain Reference

From `appendix_a_system_map_and_relationship_key.md`:

### 03. CONTRIBUTORS

#### Person Management
- Create Person
- View Person
- Edit Person
- Archive Person
- Delete Person

#### Roles
- Author
- Translator
- Editor
- Illustrator

#### Person Information
- Name
- Biography
- Photo
- Contact Information

### Package 04 — USER & ACCESS ↔ CONTRIBUTORS (Cards 07–10)

| Card | Side A | Side B | Technical Class |
|------|--------|--------|-----------------|
| 07 | Permissions | Create Person | RBAC |
| 08 | Permissions | Edit Person | RBAC |
| 09 | Permissions | Archive Person | RBAC |
| 10 | Permissions | Delete Person | RBAC |

Permissions `contributors.create`, `contributors.edit`, `contributors.archive`, `contributors.delete` were seeded in Phase 1. They are wired into `ContributorPolicy` here.

### Package 02 — BOOKS ↔ CONTRIBUTORS (Card 05)

| Card | Side A | Side B | Technical Class |
|------|--------|--------|-----------------|
| 05 | View Book | Books (Contributions) | **Relationship-only exception** (Section 4) |

Card 05 is the intentional trap. `CONTRIBUTORS → Contributions → Books` is not in the CONTRIBUTORS Domain tree. It is preserved as a relationship-only reference and is implemented in Phase 3 via the `book_contributor` pivot. Do **not** create a `contributions` table here. Do **not** add a `Contributions` model. See `appendix_b_database_schema.md` §6.

### Package 06 — CONTRIBUTORS ↔ MEDIA (Card 14)

| Card | Side A | Side B | Technical Class |
|------|--------|--------|-----------------|
| 14 | Photo | Person Photo | Media Link |

Card 14 is implemented in Phase 4 (Media) via the polymorphic `mediables` table. **Do not implement it in Phase 2.** The `Contributor` model will gain a `media()` morphToMany relation in Phase 4.

---

## 3. Database Schema

See `appendix_b_database_schema.md` §3.2 for full DDL. Summary:

### `contributors` (soft-deletable, single Person entity)

| Column | Type | Notes |
|--------|------|-------|
| id | bigIncrements | PK |
| name | string | required, full name |
| slug | string unique | URL-safe, auto-generated from name |
| biography | text nullable | |
| email | string nullable | contact |
| phone | string nullable | contact |
| website | string nullable | contact |
| birth_date | date nullable | |
| nationality | string nullable | |
| is_archived | boolean default false | archive flag (in addition to soft delete) |
| deleted_at | timestamp nullable | soft delete |
| created_at, updated_at | timestamps | |

**Why both `is_archived` and `deleted_at`?** Archive is a business state (the person is no longer active but historical books reference them). Soft delete is for accidental removal. They are distinct.

### `contributor_roles` (enum-like lookup, not soft-deletable)

The original spec lists 4 contributor roles (Author, Translator, Editor, Illustrator). They are stored as a **lookup table**, not a PHP enum, so they can be referenced by FK:

| Column | Type | Notes |
|--------|------|-------|
| id | bigIncrements | PK |
| name | string unique | "Author", "Translator", "Editor", "Illustrator" |
| label | string | display label |
| created_at, updated_at | timestamps | |

Seed exactly these 4 rows. Do not add more.

> **Note:** The `book_contributor` pivot (Phase 3) will FK to this table. Do not create that pivot here.

---

## 4. Backend Implementation

### 4.1 Models

`app/Models/Contributor.php`:
- `SoftDeletes`.
- `$fillable = ['name', 'slug', 'biography', 'email', 'phone', 'website', 'birth_date', 'nationality', 'is_archived']`.
- `casts`: `birth_date` → date, `is_archived` → boolean, `deleted_at` → datetime.
- Sluggable: on create, auto-generate `slug` from `name` if not provided. Ensure uniqueness.
- Relations (to be wired in later phases):
  - `books()` → belongsToMany `Book` via `book_contributor` (Phase 3).
  - `media()` → morphToMany `Media` via `mediables` (Phase 4).

`app/Models/ContributorRole.php`:
- `$fillable = ['name', 'label']`.

### 4.2 Endpoints

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('contributors', ContributorController::class);
    Route::post('contributors/{contributor}/archive', [ContributorController::class, 'archive']);
    Route::get('contributor-roles', [ContributorRoleController::class, 'index']);
});
```

### 4.3 Form Requests

`StoreContributorRequest`:
- `name` required string max 255.
- `slug` nullable string unique:contributors,slug.
- `biography` nullable string max 5000.
- `email` nullable email.
- `phone` nullable string max 32.
- `website` nullable url.
- `birth_date` nullable date.
- `nationality` nullable string max 64.

`UpdateContributorRequest`: same as Store, `slug` unique ignoring self.

### 4.4 Policy

`ContributorPolicy`:
- `viewAny($user)`: true.
- `view($user, $c)`: true.
- `create($user)`: `$user->hasPermission('contributors.create')`.
- `update($user, $c)`: `$user->hasPermission('contributors.edit')`.
- `archive($user, $c)`: `$user->hasPermission('contributors.archive')` AND `!$c->is_archived`.
- `delete($user, $c)`: `$user->hasPermission('contributors.delete')` AND `$c->is_archived` (must archive before delete — safe cascade prevention).
- Restore (un-archive): `contributors.edit`.

### 4.5 Resource

`ContributorResource`:
```php
return [
    'id' => $this->id,
    'name' => $this->name,
    'slug' => $this->slug,
    'biography' => $this->biography,
    'email' => $this->email,
    'phone' => $this->phone,
    'website' => $this->website,
    'birth_date' => $this->birth_date?->toDateString(),
    'nationality' => $this->nationality,
    'is_archived' => $this->is_archived,
    // books count loaded only when called from list endpoint:
    'books_count' => $this->whenCounted('books'),
    'photo' => MediaResource::make($this->whenLoaded('primaryPhoto')),  // Phase 4
    'created_at' => $this->created_at,
    'updated_at' => $this->updated_at,
    'deleted_at' => $this->deleted_at,
];
```

### 4.6 Activity Log

Log: `contributor.create`, `contributor.update`, `contributor.archive`, `contributor.restore`, `contributor.delete`.

### 4.7 Search & Filtering

`GET /api/v1/contributors?`:
- `q=name:like` — full-text on name and slug.
- `role=Author` — filter by contributors who have a book with role Author. **(Requires Phase 3 `book_contributor` table — return 400 if Books not yet built.)** For Phase 2, this filter is documented but returns empty until Phase 3 ships.
- `is_archived=true|false` — default false (only active contributors).
- `page`, `per_page` — standard pagination.

---

## 5. Frontend Implementation

### 5.1 Pages

```
src/pages/contributors/
├── ContributorListPage.tsx
├── ContributorDetailPage.tsx
├── ContributorCreatePage.tsx
└── ContributorEditPage.tsx
```

### 5.2 Detail Page Sections

Per original spec §15, Contributor detail exposes:
- Person Information (name, biography, contact info, birth date, nationality)
- Roles (list of roles the person has across books — populated in Phase 3)
- Related Books (list — populated in Phase 3, links to Book detail)
- Media / Photo (populated in Phase 4)

For Phase 2, the Roles and Related Books sections render an **empty state** ("No books linked yet — link via Books page once available").

### 5.3 Archive vs Delete

- Archive button visible with `contributors.archive` permission.
- Delete button visible with `contributors.delete` permission AND only when `is_archived === true`.
- Confirmation modal explains: "Archived contributors remain referenced by historical books. Deleting a contributor is permanent and only available after archiving."

### 5.4 Services

`src/services/contributors.ts`:
```ts
export const contributorsApi = {
  list: (params?: { q?: string; is_archived?: boolean; page?: number; per_page?: number }) =>
    api.get('/contributors', { params }).then(r => r.data),
  get: (id: number) => api.get(`/contributors/${id}`).then(r => r.data.data),
  create: (data: ContributorInput) => api.post('/contributors', data).then(r => r.data.data),
  update: (id: number, data: ContributorInput) => api.put(`/contributors/${id}`, data).then(r => r.data.data),
  archive: (id: number) => api.post(`/contributors/${id}/archive`).then(r => r.data.data),
  delete: (id: number) => api.delete(`/contributors/${id}`),
};
```

### 5.5 Types

`src/types/Contributor.ts`:
```ts
export interface Contributor {
  id: number;
  name: string;
  slug: string;
  biography: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  birth_date: string | null;
  nationality: string | null;
  is_archived: boolean;
  books_count?: number;
  photo?: Media | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ContributorInput {
  name: string;
  slug?: string;
  biography?: string;
  email?: string;
  phone?: string;
  website?: string;
  birth_date?: string;
  nationality?: string;
}
```

---

## 6. Tests

### 6.1 Backend (Pest)

`tests/Feature/ContributorCrudTest.php`:
- index: any auth user → 200.
- store: without `contributors.create` → 403; with → 201.
- show: 200.
- update: without `contributors.edit` → 403; with → 200.
- archive: without `contributors.archive` → 403; with → 200; archived contributor cannot be archived again → 422.
- delete: non-archived contributor → 422 "Archive first"; archived contributor without `contributors.delete` → 403; with → 204.
- soft-deleted contributor missing from index.
- search by name works.

`tests/Feature/ContributorRoleTest.php`:
- `/contributor-roles` returns exactly 4 roles.

### 6.2 Frontend (Vitest)

`src/test/contributors.test.tsx`:
- ContributorListPage renders loading skeleton.
- ContributorListPage renders empty state.
- ContributorCreatePage submit calls `contributorsApi.create` and navigates.
- Archive button disabled if already archived.
- Delete button hidden unless archived.

---

## 7. Phase 2 Definition of Done

- [ ] Migrations for `contributors` and `contributor_roles` created and run on fresh DB.
- [ ] `contributor_roles` seeded with exactly Author, Translator, Editor, Illustrator.
- [ ] Models `Contributor`, `ContributorRole` with `$fillable`, casts, SoftDeletes on Contributor.
- [ ] Sluggable behavior on Contributor.
- [ ] Endpoints: index, show, store, update, archive, destroy + `/contributor-roles` index.
- [ ] `ContributorPolicy` enforces all rules; controller uses `$this->authorize`.
- [ ] Form Requests for store/update with documented rules.
- [ ] `ContributorResource` excludes nothing sensitive; supports `books_count`, `whenLoaded`.
- [ ] Activity log writes for all 5 actions.
- [ ] Search and filtering work (role filter documented as deferred to Phase 3).
- [ ] Frontend: List, Detail, Create, Edit pages with all 7 UI states.
- [ ] Archive vs Delete distinction enforced in UI.
- [ ] `contributors.*` permissions enforced end-to-end.
- [ ] Backend + frontend tests green.
- [ ] `php artisan migrate:fresh --seed` runs clean (Phase 1 + Phase 2 migrations).
- [ ] Phase 2 report written.

---

## 8. What Not To Do in Phase 2

- ❌ Do **not** create the `book_contributor` pivot table (Phase 3).
- ❌ Do not create a `Contributions` model or `contributions` table (Card 05 trap).
- ❌ Do not implement `media()` relation on Contributor yet (Phase 4 polymorphic).
- ❌ Do not add a `Contributions` Category to the CONTRIBUTORS Domain tree.
- ❌ Do not invent new contributor roles beyond the 4 approved.
- ❌ Do not add nationality dropdown with hardcoded list — free-text for v1.

---

## 9. Stop and Report If

- You need to store additional contact fields (e.g., social media handles) beyond email/phone/website — surface as an open question.
- You need to merge Person and User (admin users who are also contributors) — not in spec; surface it.
- The role filter on `/contributors` endpoint requires the `book_contributor` table to exist before Phase 3 — confirm with product owner whether to defer or stub.
