# Appendix B — Database Schema (Full Reference)

> **Single source of truth for the physical database.**
> Every table, column, FK, index, and enum is documented here. Phase files reference this appendix; they do not redefine schemas.
>
> **Migrations must match this appendix exactly.** Any deviation requires Change Control approval (README §8).

---

## 1. Conventions

- **Engine:** PostgreSQL 15+.
- **Primary keys:** `bigIncrements` (`bigserial`), named `id`.
- **Timestamps:** `created_at`, `updated_at` (`timestamptz`) on every table except `activity_log` (which has only `created_at`).
- **Soft deletes:** `deleted_at timestamptz nullable` only on tables marked soft-deletable in `00_overview_conventions.md` §2.
- **Foreign keys:** explicit `onDelete` behavior.
- **Strings:** `string` = `varchar(255)` unless specified otherwise.
- **JSON:** `jsonb` only for `activity_log.metadata` and `media_types.allowed_mime`.
- **No comma-separated relational IDs** (per original §7).
- **No JSON used as a replacement for ordinary relational modeling.**

---

## 2. Tables Overview

| # | Table | Phase | Soft-Delete | Purpose |
|---|------|-------|-------------|---------|
| 1 | `users` | 1 | Yes | Admin users |
| 2 | `roles` | 1 | No | RBAC roles |
| 3 | `permissions` | 1 | No | RBAC permissions |
| 4 | `role_user` | 1 | No (pivot) | User ↔ Role |
| 5 | `permission_role` | 1 | No (pivot) | Role ↔ Permission |
| 6 | `activity_log` | 1 | No (append-only) | Audit trail |
| 7 | `contributors` | 2 | Yes | Person entities |
| 8 | `contributor_roles` | 2 | No (lookup) | Author/Translator/Editor/Illustrator |
| 9 | `books` | 3 | Yes | Book entities |
| 10 | `book_categories` | 3 | No (lookup) | Book Classification Category |
| 11 | `tags` | 3 | No (lookup) | Book Classification Tags |
| 12 | `book_tag` | 3 | No (pivot) | Book ↔ Tag |
| 13 | `book_contributor` | 3 | No (pivot) | Book ↔ Contributor ↔ Role |
| 14 | `media` | 4 | Yes | File metadata |
| 15 | `media_types` | 4 | No (lookup) | 6 approved media types |
| 16 | `mediables` | 4 | No (pivot) | Polymorphic Media ↔ any entity |
| 17 | `announcements` | 5 | Yes | Announcement entities |

**17 tables total.**

---

## 3. Detailed Schema

### 3.1 `users`

```sql
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at TIMESTAMPTZ,
    password        VARCHAR(255) NOT NULL,  -- bcrypt hash
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    remember_token  VARCHAR(100),
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX users_deleted_at_index ON users (deleted_at);
```

- Soft-delete: yes (`deleted_at`).
- `email` unique includes soft-deleted rows — use partial unique index if email reuse after soft-delete is allowed. Default: **email cannot be reused**.
- Password never selected in queries — hidden in Eloquent `$hidden`.

### 3.2 `roles`, `permissions`, `role_user`, `permission_role`

```sql
CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    label       VARCHAR(255) NOT NULL,
    guard_name  VARCHAR(255) NOT NULL DEFAULT 'sanctum',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    label       VARCHAR(255) NOT NULL,
    guard_name  VARCHAR(255) NOT NULL DEFAULT 'sanctum',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_user (
    role_id     BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, user_id)
);

CREATE TABLE permission_role (
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    role_id       BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (permission_id, role_id)
);
```

- No soft delete on roles/permissions: hard delete is allowed, but blocked at application layer if `role_user` or `permission_role` rows reference them.

### 3.3 `activity_log`

```sql
CREATE TABLE activity_log (
    id           BIGSERIAL PRIMARY KEY,
    actor_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action       VARCHAR(255) NOT NULL,  -- e.g. 'user.login', 'book.create'
    entity_type  VARCHAR(255),            -- morph alias, e.g. 'book'
    entity_id    BIGINT,
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX activity_log_actor_id_index ON activity_log (actor_id);
CREATE INDEX activity_log_entity_index ON activity_log (entity_type, entity_id);
CREATE INDEX activity_log_action_index ON activity_log (action);
CREATE INDEX activity_log_created_at_index ON activity_log (created_at);
```

- **Append-only.** No `updated_at`. No UPDATE/DELETE allowed (enforce via DB grants: INSERT + SELECT only).
- `actor_id` nullable for system actions (e.g., scheduled job).
- `metadata` may include `before`, `after`, `ip`, `user_agent` — never credentials or tokens.

### 3.4 `contributors`

```sql
CREATE TABLE contributors (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    slug         VARCHAR(255) NOT NULL UNIQUE,
    biography    TEXT,
    email        VARCHAR(255),
    phone        VARCHAR(32),
    website      VARCHAR(255),
    birth_date   DATE,
    nationality  VARCHAR(64),
    is_archived  BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX contributors_slug_index ON contributors (slug);
CREATE INDEX contributors_is_archived_index ON contributors (is_archived);
CREATE INDEX contributors_deleted_at_index ON contributors (deleted_at);
CREATE INDEX contributors_name_trgm_index ON contributors USING gin (name gin_trgm_ops);  -- for ILIKE search
```

- Soft-delete: yes.
- `is_archived` distinct from `deleted_at` (archive = business state, soft-delete = accidental removal).
- `slug` auto-generated from `name`, unique.

### 3.5 `contributor_roles`

```sql
CREATE TABLE contributor_roles (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,  -- 'Author', 'Translator', 'Editor', 'Illustrator'
    label       VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- Seeded with exactly 4 rows. Do not add more without Change Control approval.
- Hard-delete blocked at app layer if `book_contributor` rows reference.

### 3.6 `books`

```sql
CREATE TABLE books (
    id                BIGSERIAL PRIMARY KEY,
    title             VARCHAR(255) NOT NULL,
    slug              VARCHAR(255) NOT NULL UNIQUE,
    isbn              VARCHAR(32),  -- validated ISBN-10 or ISBN-13
    description       TEXT,
    page_count        INTEGER CHECK (page_count >= 0),
    language          VARCHAR(2),   -- ISO 639-1
    publication_date  DATE,
    publisher         VARCHAR(255),
    edition           VARCHAR(64),
    status            VARCHAR(32) NOT NULL DEFAULT 'Draft'
                      CHECK (status IN ('Draft','Review','Scheduled','Published','Archived')),
    book_category_id  BIGINT REFERENCES book_categories(id) ON DELETE SET NULL,
    genre             VARCHAR(128),
    is_archived       BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX books_slug_index ON books (slug);
CREATE UNIQUE INDEX books_isbn_index ON books (isbn) WHERE isbn IS NOT NULL;
CREATE INDEX books_status_index ON books (status);
CREATE INDEX books_language_index ON books (language);
CREATE INDEX books_book_category_id_index ON books (book_category_id);
CREATE INDEX books_is_archived_index ON books (is_archived);
CREATE INDEX books_deleted_at_index ON books (deleted_at);
CREATE INDEX books_title_trgm_index ON books USING gin (title gin_trgm_ops);
```

- Soft-delete: yes.
- `isbn` partial unique index (only when not null).
- `page_count` check constraint >= 0.
- `status` check constraint enforces the 5 approved values.

### 3.7 `book_categories`

```sql
CREATE TABLE book_categories (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    label       VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- Not the same as System Map structural "Category" — see `00_overview_conventions.md` §4.
- Hard-delete blocked at app layer if `books.book_category_id` references.

### 3.8 `tags`

```sql
CREATE TABLE tags (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    label       VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- Resolves Claude §6 (Tags as normalized M2M, not free text).

### 3.9 `book_tag`

```sql
CREATE TABLE book_tag (
    book_id   BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    tag_id    BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, tag_id)
);

CREATE INDEX book_tag_tag_id_index ON book_tag (tag_id);
```

### 3.10 `book_contributor` (The Heart of Package 01)

```sql
CREATE TABLE book_contributor (
    id                  BIGSERIAL PRIMARY KEY,
    book_id             BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    contributor_id      BIGINT NOT NULL REFERENCES contributors(id) ON DELETE RESTRICT,
    contributor_role_id BIGINT NOT NULL REFERENCES contributor_roles(id) ON DELETE RESTRICT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (book_id, contributor_id, contributor_role_id)
);

CREATE INDEX book_contributor_book_id_index ON book_contributor (book_id);
CREATE INDEX book_contributor_contributor_id_index ON book_contributor (contributor_id);
CREATE INDEX book_contributor_contributor_role_id_index ON book_contributor (contributor_role_id);
```

- **Why surrogate `id`?** Same person can have multiple roles on same book (Author AND Editor) → multiple pivot rows.
- **Unique constraint** on (book_id, contributor_id, contributor_role_id) prevents duplicate role assignment.
- `ON DELETE RESTRICT` on contributor_id: cannot delete a Contributor who has books — must archive first.
- `ON DELETE RESTRICT` on contributor_role_id: cannot delete a role that's in use.
- `ON DELETE CASCADE` on book_id: deleting a Book removes all its pivot rows.

### 3.11 `media`

```sql
CREATE TABLE media (
    id           BIGSERIAL PRIMARY KEY,
    disk         VARCHAR(64) NOT NULL DEFAULT 'local',
    path         VARCHAR(500) NOT NULL,  -- relative path on disk
    file_name    VARCHAR(255) NOT NULL,  -- original uploaded name
    mime_type    VARCHAR(128) NOT NULL,  -- sniffed, never trusted from client
    size         BIGINT NOT NULL CHECK (size > 0),
    width        INTEGER,
    height       INTEGER,
    alt_text     VARCHAR(255),
    caption      VARCHAR(255),
    description  TEXT,
    uploaded_by  BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_archived  BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX media_mime_type_index ON media (mime_type);
CREATE INDEX media_is_archived_index ON media (is_archived);
CREATE INDEX media_uploaded_by_index ON media (uploaded_by);
CREATE INDEX media_deleted_at_index ON media (deleted_at);
CREATE INDEX media_file_name_trgm_index ON media USING gin (file_name gin_trgm_ops);
```

- Soft-delete: yes.
- `size` check > 0.
- `path` is internal — never returned to client. Return `url()` only.
- `mime_type` sniffed via `finfo`, never trusted from client.
- `uploaded_by` RESTRICT: cannot delete a User who uploaded media — must reassign or soft-delete user.

### 3.12 `media_types`

```sql
CREATE TABLE media_types (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(64) NOT NULL UNIQUE,
    label          VARCHAR(255) NOT NULL,
    allowed_mime   JSONB NOT NULL,  -- array of allowed MIMEs, e.g. ["image/jpeg","image/png","image/webp"]
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Seed exactly these 6 rows (per `appendix_a`):

| name | label | allowed_mime |
|------|-------|--------------|
| Book Cover | Book Cover | `["image/jpeg","image/png","image/webp"]` |
| Book Image | Book Image | `["image/jpeg","image/png","image/webp"]` |
| Person Photo | Person Photo | `["image/jpeg","image/png","image/webp"]` |
| Announcement Image | Announcement Image | `["image/jpeg","image/png","image/webp"]` |
| Publisher Logo | Publisher Logo | `["image/svg+xml","image/png"]` |
| Document | Document | `["application/pdf"]` |

### 3.13 `mediables` (Polymorphic Pivot)

```sql
CREATE TABLE mediables (
    id            BIGSERIAL PRIMARY KEY,
    media_id      BIGINT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    mediable_type VARCHAR(255) NOT NULL,  -- morph alias: 'Book', 'Contributor', 'Announcement'
    mediable_id   BIGINT NOT NULL,
    media_type    VARCHAR(64) NOT NULL REFERENCES media_types(name) ON DELETE RESTRICT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (media_id, mediable_type, mediable_id, media_type)
);

CREATE INDEX mediables_media_id_index ON mediables (media_id);
CREATE INDEX mediables_mediable_index ON mediables (mediable_type, mediable_id);
CREATE INDEX mediables_media_type_index ON mediables (media_type);
```

- **No DB-level FK on (mediable_type, mediable_id)** — polymorphic, enforced at app layer via Eloquent morphMap.
- Unique constraint prevents duplicate attachment of same media with same type to same entity.
- `media_type` FK to `media_types.name` ensures only the 6 approved types are used.
- `ON DELETE CASCADE` on `media_id`: deleting media cleans up all attachments.
- Detaching (delete mediables row) does not delete the media record.

### 3.14 `announcements`

```sql
CREATE TABLE announcements (
    id                BIGSERIAL PRIMARY KEY,
    title             VARCHAR(255) NOT NULL,
    slug              VARCHAR(255) NOT NULL UNIQUE,
    short_description VARCHAR(500),
    content           TEXT,
    type              VARCHAR(32) NOT NULL
                      CHECK (type IN ('New Book','Reprint','New Edition','News','Event','Discount','Other')),
    status            VARCHAR(32) NOT NULL DEFAULT 'Draft'
                      CHECK (status IN ('Draft','Review','Scheduled','Published','Archived')),
    book_id           BIGINT REFERENCES books(id) ON DELETE RESTRICT,
    scheduled_at      TIMESTAMPTZ,
    published_at      TIMESTAMPTZ,
    is_archived       BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX announcements_slug_index ON announcements (slug);
CREATE INDEX announcements_type_index ON announcements (type);
CREATE INDEX announcements_status_index ON announcements (status);
CREATE INDEX announcements_book_id_index ON announcements (book_id);
CREATE INDEX announcements_is_archived_index ON announcements (is_archived);
CREATE INDEX announcements_deleted_at_index ON announcements (deleted_at);
```

- Soft-delete: yes.
- `book_id` nullable, FK with `ON DELETE RESTRICT` — cannot delete a Book linked to an Announcement (must archive Book instead).
- `type` and `status` check constraints enforce the approved values.
- `book_id` is **required when type=New Book** — enforced in Form Request (not at DB level, because conditional).

---

## 4. Enums Reference

All "enums" in the system are stored as `VARCHAR` with a `CHECK` constraint, not as PostgreSQL enum types. This makes adding/removing values easier (migration-only, no type recreation).

### 4.1 Book Status
- Draft
- Review
- Scheduled
- Published
- Archived

### 4.2 Announcement Status
- Draft
- Review
- Scheduled
- Published
- Archived

### 4.3 Announcement Type
- New Book
- Reprint
- New Edition
- News
- Event
- Discount
- Other

### 4.4 Contributor Role
- Author
- Translator
- Editor
- Illustrator

### 4.5 Media Type
- Book Cover
- Book Image
- Person Photo
- Announcement Image
- Publisher Logo
- Document

### 4.6 Permission Names (22 total)

| Domain | Permissions |
|--------|-------------|
| users | `users.create`, `users.edit`, `users.disable`, `users.delete` |
| contributors | `contributors.create`, `contributors.edit`, `contributors.archive`, `contributors.delete` |
| books | `books.create`, `books.edit`, `books.archive`, `books.delete` |
| media | `media.upload`, `media.edit`, `media.replace`, `media.archive`, `media.delete`, `media.link` |
| announcements | `announcements.create`, `announcements.edit`, `announcements.archive`, `announcements.delete` |

---

## 5. Seed Data Reference

The seeders must produce:

### 5.1 Permissions (22 rows)
All permission names from §4.6.

### 5.2 Default Roles (5 rows)

| Role | Permissions |
|------|-------------|
| admin | All 22 |
| editor | All except `users.*` (so: contributors.*, books.*, media.*, announcements.*) |
| media_manager | `media.*` (upload, edit, replace, archive, delete, link) |
| contributor_manager | `contributors.*` |
| announcer | `announcements.*` |

### 5.3 Contributor Roles (4 rows)
Author, Translator, Editor, Illustrator.

### 5.4 Media Types (6 rows)
See §3.12 table.

### 5.5 Demo Admin User

```
email: admin@daralajneha.local
password: <documented in README of repo, not in spec>
```

Created only in non-production seeders. Production deploy uses a one-time setup command to create the first admin.

### 5.6 Optional Demo Data

Optional seeders (run via `php artisan db:seed --class=DemoDataSeeder`):
- 3 demo users (one per non-admin role).
- 5 demo contributors with mixed roles.
- 5 demo books with contributor attachments.
- 10 demo media (mix of types).
- 3 demo announcements (one of each type that needs a book link).

Demo data must NOT run in production.

---

## 6. Relationship-Only Exceptions — Implementation

Per original §4 and Claude §1/D, the two relationship-only exceptions are implemented as follows:

### 6.1 Card 05: `CONTRIBUTORS → Contributions → Books`

**Not a table.** Implemented as the inverse Eloquent relation:

```php
// app/Models/Contributor.php
public function books(): BelongsToMany {
    return $this->belongsToMany(Book::class, 'book_contributor')
        ->withPivot('contributor_role_id')
        ->withTimestamps();
}
```

No `contributions` table. No `Contribution` model. The `book_contributor` pivot from Package 01 satisfies this card.

### 6.2 Card 06: `ANNOUNCEMENTS → Content → Image / File`

**Not a table.** Implemented as a polymorphic media attachment:

```php
// app/Models/Announcement.php
public function media(): MorphToMany {
    return $this->morphToMany(Media::class, 'mediable')
        ->withPivot('media_type')
        ->withTimestamps();
}

// Helper for the specific Announcement Image media_type
public function images(): MorphToMany {
    return $this->media()->wherePivot('media_type', 'Announcement Image');
}
```

No `image_files` table. No `ImageFile` model. The `mediables` polymorphic pivot from Phase 4 satisfies this card.

---

## 7. Migration Order

Migrations must be created and run in dependency order. Use timestamp prefixes (`YYYY_MM_DD_HHMMSS_`) so Laravel runs them in filename order.

Recommended order (timestamps increasing):

1. `create_users_table`
2. `create_roles_table`
3. `create_permissions_table`
4. `create_role_user_table`
5. `create_permission_role_table`
6. `create_activity_log_table`
7. `create_contributors_table`
8. `create_contributor_roles_table`
9. `create_book_categories_table`
10. `create_books_table`
11. `create_tags_table`
12. `create_book_tag_table`
13. `create_book_contributor_table`
14. `create_media_types_table`
15. `create_media_table`
16. `create_mediables_table`
17. `create_announcements_table`

**Critical:** `book_contributor` (step 13) MUST come after `books` (step 10), `contributors` (step 7), and `contributor_roles` (step 8) — it FKs to all three. This resolves GLM §A.

**Critical:** `mediables` (step 16) MUST come after `media` (step 15) and `media_types` (step 14). The Announcement model (step 17) is the last because `mediables` is polymorphic — the morph alias 'Announcement' is registered in a service provider, not a migration.

---

## 8. Soft-Delete Strategy Summary

Repeating `00_overview_conventions.md` §2 for reference:

| Table | Soft-Delete? | Reason |
|-------|--------------|--------|
| users | ✅ | Audit history |
| roles | ❌ (block if used) | RBAC integrity |
| permissions | ❌ (block if used) | RBAC integrity |
| role_user, permission_role | ❌ (pivot) | — |
| activity_log | ❌ (append-only) | Audit trail |
| contributors | ✅ | Historical book references |
| contributor_roles | ❌ (block if used) | Lookup integrity |
| books | ✅ | Archive is a business state |
| book_categories | ❌ (block if used) | Lookup integrity |
| tags | ❌ (block if used) | Lookup integrity |
| book_tag | ❌ (pivot) | — |
| book_contributor | ❌ (pivot) | — |
| media | ✅ | May be referenced by archived entities |
| media_types | ❌ (block if used) | Lookup integrity |
| mediables | ❌ (pivot) | — |
| announcements | ✅ | Archive is a business state |

---

## 9. Index Strategy

All foreign keys have an index. All frequently-filtered columns have an index. Trigram indexes (`gin_trgm_ops`) on free-text search columns require the `pg_trgm` extension:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

This must be in the first migration that uses a trigram index. Wrap in a `CREATE EXTENSION IF NOT EXISTS` migration.

---

## 10. Schema Diagram (ASCII)

```
                          ┌─────────────┐
                          │    users    │
                          └─────┬───────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
          ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼────────┐
          │ role_user │   │ activity_ │   │    media     │
          └─────┬─────┘   │   log     │   └──────┬───────┘
                │         └───────────┘          │
          ┌─────▼─────┐                    ┌─────▼─────┐
          │   roles   │                    │ mediables │ (polymorphic)
          └─────┬─────┘                    └─────┬─────┘
                │                                │
          ┌─────▼──────────┐                     │
          │ permission_role│              ┌──────┼──────┬──────────┐
          └─────┬──────────┘              │      │      │          │
                │                         │      │      │          │
          ┌─────▼─────────┐         ┌─────▼──┐ ┌─▼────┐ │    ┌─────▼──────┐
          │  permissions  │         │ books  │ │contrib.│ │  │announcements│
          └───────────────┘         └───┬────┘ └───┬──┘ │    └─────┬──────┘
                                       │          │    │          │
                              ┌────────┼────────┐ │    │          │
                              │        │        │ │    │          │
                        ┌─────▼──┐ ┌───▼────┐ ┌─▼─┐  │          │
                        │book_tag│ │book_   │ │tags│ │          │
                        └────────┘ │contrib.│ └────┘ │          │
                                   └───┬────┘        │          │
                                       │             │          │
                              ┌────────▼─────┐       │          │
                              │contributor_  │       │          │
                              │   roles      │       │          │
                              └──────────────┘       │          │
                                                     │          │
                                              ┌──────▼──────┐   │
                                              │book_categories│  │
                                              └─────────────┘   │
                                                                │
                                              ┌─────────────────┘
                                              │
                                              ▼
                                       (media_types
                                        lookup)
```

This diagram is illustrative; for the precise schema, see the SQL in §3.
