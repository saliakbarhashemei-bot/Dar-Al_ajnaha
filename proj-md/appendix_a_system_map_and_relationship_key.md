# Appendix A — System Map & Relationship Key (Annotated Edition)

> **Source of truth.** This appendix preserves the original System Map and all 36 Relationship Key cards verbatim, with two additions per the amendments in `00_overview_conventions.md`:
>
> 1. Each relationship card is tagged with a **Technical Class**: `DB` / `RBAC` / `Business Logic` / `Media Link`.
> 2. Each card has an **Implementation Pointer** to the phase file where it is built.
>
> If any value in this appendix contradicts a phase file, **this appendix wins.**

---

# Part 1 — System Map (Verbatim)

## 1. System Overview

The system is organized into five primary Domains:

1. **USER & ACCESS**
2. **BOOKS**
3. **CONTRIBUTORS**
4. **MEDIA**
5. **ANNOUNCEMENTS**

The Relationship Map is organized by **Domain → Category → Subcategory** on both sides.

A relationship package groups multiple Subcategory-to-Subcategory relationships when they belong to the same **Category ↔ Category** relationship.

---

## 2. Domains

### 01. USER & ACCESS

#### Authentication
- Login
- Logout
- Session
- Password

#### Authorization
- Roles
- Permissions
- Access Rules

#### User Management
- Create User
- Edit User
- Disable User
- Delete / Archive User

---

### 02. BOOKS

#### Book Management
- Create Book
- View Book
- Edit Book
- Archive Book
- Delete Book

#### Book Information
- Title
- ISBN
- Description
- Page Count
- Language
- Publication Date

#### People & Relations
- Author
- Translator
- Editor
- Illustrator

#### Publishing
- Publisher
- Edition
- Publication Date
- Status
  - Draft
  - Review
  - Scheduled
  - Published
  - Archived

#### Classification
- Category
- Genre
- Tags

#### Media
- Cover
- Images
- Files

---

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

---

### 04. MEDIA

#### Media Management
- Upload Media
- View Media
- Edit Media
- Replace Media
- Archive Media
- Delete Media

#### Media Library
- All Media
- Images
- Documents
- Other Files

#### Media Types
- Book Cover
- Book Image
- Person Photo
- Announcement Image
- Publisher Logo
- Document

#### Media Information
- File Name
- File Type
- File Size
- Dimensions
- Alt Text
- Caption
- Description

#### Storage
- File Storage
- File Path / URL
- Storage Provider

#### Relations
- Books
- Contributors
- Announcements

---

### 05. ANNOUNCEMENTS

#### Announcement Management
- Create Announcement
- View Announcement
- Edit Announcement
- Archive Announcement
- Delete Announcement

#### Content
- Title
- Short Description
- Content

#### Type
- New Book
- Reprint
- New Edition
- News
- Event
- Discount
- Other

#### Status
- Draft
- Review
- Scheduled
- Published
- Archived

> **Relationship Key note:** the diagram contains an `Image / File ↔ Announcement Image` relationship under the ANNOUNCEMENTS ↔ MEDIA package. This relationship is preserved below exactly as represented in the Relationship Key. It is the **relationship-only exception** of Card 06 — see Appendix B §6.

---

# Part 2 — Relationship Key (All 36 Cards, Annotated)

## Package 01 — BOOKS ↔ CONTRIBUTORS

### People & Relations ↔ Roles

| Card | BOOKS | CONTRIBUTORS | Technical Class | Implementation |
|---:|---|---|---|---|
| 01 | Author | Author | DB | `book_contributor` pivot row with contributor_role_id=Author. Phase 3. |
| 02 | Translator | Translator | DB | Same pivot, role=Translator. Phase 3. |
| 03 | Editor | Editor | DB | Same pivot, role=Editor. Phase 3. |
| 04 | Illustrator | Illustrator | DB | Same pivot, role=Illustrator. Phase 3. |

Full paths:

`BOOKS → People & Relations → Author ↔ CONTRIBUTORS → Roles → Author`
`BOOKS → People & Relations → Translator ↔ CONTRIBUTORS → Roles → Translator`
`BOOKS → People & Relations → Editor ↔ CONTRIBUTORS → Roles → Editor`
`BOOKS → People & Relations → Illustrator ↔ CONTRIBUTORS → Roles → Illustrator`

**Implementation note:** All 4 cards share one pivot table (`book_contributor`) with a `contributor_role_id` discriminator. The 4 cards are the 4 seedable values of that discriminator — not 4 separate tables.

---

## Package 02 — BOOKS ↔ CONTRIBUTORS

### Book Management ↔ Contributions

| Card | BOOKS | CONTRIBUTORS | Technical Class | Implementation |
|---:|---|---|---|---|
| 05 | View Book | Books (Contributions) | Relationship-only exception | Satisfied by inverse `Contributor::books()` relation through `book_contributor`. Phase 3. **No `contributions` table.** |

Full path:

`BOOKS → Book Management → View Book ↔ CONTRIBUTORS → Contributions → Books`

**Implementation note:** Card 05 is the intentional trap (Section 4 exception). `Contributions` is not in the CONTRIBUTORS Domain tree. The inverse Eloquent relation satisfies the relationship without a standalone model.

---

## Package 03 — ANNOUNCEMENTS ↔ MEDIA

### Content ↔ Media Types

| Card | ANNOUNCEMENTS | MEDIA | Technical Class | Implementation |
|---:|---|---|---|---|
| 06 | Image / File | Announcement Image | Relationship-only exception + Media Link | `mediables` polymorphic row with mediable_type=Announcement, media_type=Announcement Image. Phase 4. **No `image_files` table.** |

Full path:

`ANNOUNCEMENTS → Content → Image / File ↔ MEDIA → Media Types → Announcement Image`

**Implementation note:** Card 06 is the second intentional trap. `Image / File` is not in the ANNOUNCEMENTS Content tree. The polymorphic `mediables` pivot satisfies it.

---

## Package 04 — USER & ACCESS ↔ CONTRIBUTORS

### Authorization ↔ Person Management

| Card | USER & ACCESS | CONTRIBUTORS | Technical Class | Implementation |
|---:|---|---|---|---|
| 07 | Permissions | Create Person | RBAC | Permission `contributors.create` → `ContributorPolicy@create`. Phase 2. |
| 08 | Permissions | Edit Person | RBAC | Permission `contributors.edit` → `ContributorPolicy@update`. Phase 2. |
| 09 | Permissions | Archive Person | RBAC | Permission `contributors.archive` → `ContributorPolicy@archive`. Phase 2. |
| 10 | Permissions | Delete Person | RBAC | Permission `contributors.delete` → `ContributorPolicy@delete`. Phase 2. |

Full paths:

`USER & ACCESS → Authorization → Permissions → CONTRIBUTORS → Person Management → Create Person`
`USER & ACCESS → Authorization → Permissions → CONTRIBUTORS → Person Management → Edit Person`
`USER & ACCESS → Authorization → Permissions → CONTRIBUTORS → Person Management → Archive Person`
`USER & ACCESS → Authorization → Permissions → CONTRIBUTORS → Person Management → Delete Person`

---

## Package 05 — BOOKS ↔ MEDIA

### Media ↔ Media Types

| Card | BOOKS | MEDIA | Technical Class | Implementation |
|---:|---|---|---|---|
| 11 | Cover | Book Cover | Media Link | `mediables` polymorphic row, mediable_type=Book, media_type=Book Cover. Phase 4. |
| 12 | Images | Book Image | Media Link | Same, media_type=Book Image. Phase 4. |
| 13 | Files | Document | Media Link | Same, media_type=Document. Phase 4. |

Full paths:

`BOOKS → Media → Cover ↔ MEDIA → Media Types → Book Cover`
`BOOKS → Media → Images ↔ MEDIA → Media Types → Book Image`
`BOOKS → Media → Files ↔ MEDIA → Media Types → Document`

---

## Package 06 — CONTRIBUTORS ↔ MEDIA

### Person Information ↔ Media Types

| Card | CONTRIBUTORS | MEDIA | Technical Class | Implementation |
|---:|---|---|---|---|
| 14 | Photo | Person Photo | Media Link | `mediables` polymorphic row, mediable_type=Contributor, media_type=Person Photo. Phase 4. |

Full path:

`CONTRIBUTORS → Person Information → Photo ↔ MEDIA → Media Types → Person Photo`

---

## Package 07 — USER & ACCESS ↔ MEDIA

### Authorization ↔ Media Management

| Card | USER & ACCESS | MEDIA | Technical Class | Implementation |
|---:|---|---|---|---|
| 15 | Permissions | Upload Media | RBAC | Permission `media.upload` → `MediaPolicy@create`. Phase 4. |
| 16 | Permissions | Edit Media | RBAC | Permission `media.edit` → `MediaPolicy@update`. Phase 4. |
| 17 | Permissions | Replace Media | RBAC | Permission `media.replace` → `MediaPolicy@replace`. Phase 4. |
| 18 | Permissions | Archive Media | RBAC | Permission `media.archive` → `MediaPolicy@archive`. Phase 4. |
| 19 | Permissions | Delete Media | RBAC | Permission `media.delete` → `MediaPolicy@delete`. Phase 4. |

Full paths:

`USER & ACCESS → Authorization → Permissions → MEDIA → Media Management → Upload Media`
`USER & ACCESS → Authorization → Permissions → MEDIA → Media Management → Edit Media`
`USER & ACCESS → Authorization → Permissions → MEDIA → Media Management → Replace Media`
`USER & ACCESS → Authorization → Permissions → MEDIA → Media Management → Archive Media`
`USER & ACCESS → Authorization → Permissions → MEDIA → Media Management → Delete Media`

---

## Package 08 — USER & ACCESS ↔ BOOKS

### Authorization ↔ Book Management

| Card | USER & ACCESS | BOOKS | Technical Class | Implementation |
|---:|---|---|---|---|
| 20 | Permissions | Create Book | RBAC | Permission `books.create` → `BookPolicy@create`. Phase 3. |
| 21 | Permissions | Edit Book | RBAC | Permission `books.edit` → `BookPolicy@update`. Phase 3. |
| 22 | Permissions | Archive Book | RBAC | Permission `books.archive` → `BookPolicy@archive`. Phase 3. |
| 23 | Permissions | Delete Book | RBAC | Permission `books.delete` → `BookPolicy@delete`. Phase 3. |

Full paths:

`USER & ACCESS → Authorization → Permissions → BOOKS → Book Management → Create Book`
`USER & ACCESS → Authorization → Permissions → BOOKS → Book Management → Edit Book`
`USER & ACCESS → Authorization → Permissions → BOOKS → Book Management → Archive Book`
`USER & ACCESS → Authorization → Permissions → BOOKS → Book Management → Delete Book`

---

## Package 09 — ANNOUNCEMENTS ↔ BOOKS

### Type ↔ Book Management / Publishing

| Card | ANNOUNCEMENTS | BOOKS | Technical Class | Implementation |
|---:|---|---|---|---|
| 24 | New Book | Create Book | Business Logic | `announcements.book_id` required when type=New Book. Phase 5. |
| 25 | Reprint | Publication Date | Business Logic | Linked book must have non-null `publication_date`. Phase 5. |
| 26 | Reprint | Status | Business Logic | Linked book's status must be Published or Scheduled. Phase 5. |
| 27 | New Edition | Edition | Business Logic | Linked book must have non-null `edition`. Phase 5. |
| 28 | New Edition | Publication Date | Business Logic | Linked book must have non-null `publication_date`. Phase 5. |

Full paths:

`ANNOUNCEMENTS → Type → New Book ↔ BOOKS → Book Management → Create Book`
`ANNOUNCEMENTS → Type → Reprint ↔ BOOKS → Publishing → Publication Date`
`ANNOUNCEMENTS → Type → Reprint ↔ BOOKS → Publishing → Status`
`ANNOUNCEMENTS → Type → New Edition ↔ BOOKS → Publishing → Edition`
`ANNOUNCEMENTS → Type → New Edition ↔ BOOKS → Publishing → Publication Date`

**Implementation note:** These 5 cards are **not** database tables. They are conditional validation rules enforced in `StoreAnnouncementRequest` / `UpdateAnnouncementRequest`. The asymmetry (Reprint checks status, New Edition does not; New Edition checks edition, Reprint does not) is **intentional per the approved System Map** — see Q1 in `README.md §11`.

---

## Package 10 — ANNOUNCEMENTS ↔ MEDIA

### Announcement Management ↔ Media Types

| Card | ANNOUNCEMENTS | MEDIA | Technical Class | Implementation |
|---:|---|---|---|---|
| 29 | Create / Edit Announcement | Announcement Image | Media Link | `mediables` polymorphic row, mediable_type=Announcement, media_type=Announcement Image. Phase 4 endpoint, Phase 5 exercise. |

Full path:

`ANNOUNCEMENTS → Announcement Management → Create / Edit Announcement ↔ MEDIA → Media Types → Announcement Image`

---

## Package 11 — USER & ACCESS ↔ ANNOUNCEMENTS

### Authorization ↔ Announcement Management

| Card | USER & ACCESS | ANNOUNCEMENTS | Technical Class | Implementation |
|---:|---|---|---|---|
| 30 | Permissions | Create Announcement | RBAC | Permission `announcements.create` → `AnnouncementPolicy@create`. Phase 5. |
| 31 | Permissions | Edit Announcement | RBAC | Permission `announcements.edit` → `AnnouncementPolicy@update`. Phase 5. |
| 32 | Permissions | Archive Announcement | RBAC | Permission `announcements.archive` → `AnnouncementPolicy@archive`. Phase 5. |
| 33 | Permissions | Delete Announcement | RBAC | Permission `announcements.delete` → `AnnouncementPolicy@delete`. Phase 5. |

Full paths:

`USER & ACCESS → Authorization → Permissions → ANNOUNCEMENTS → Announcement Management → Create Announcement`
`USER & ACCESS → Authorization → Permissions → ANNOUNCEMENTS → Announcement Management → Edit Announcement`
`USER & ACCESS → Authorization → Permissions → ANNOUNCEMENTS → Announcement Management → Archive Announcement`
`USER & ACCESS → Authorization → Permissions → ANNOUNCEMENTS → Announcement Management → Delete Announcement`

---

## Package 12 — USER & ACCESS ↔ USER & ACCESS

### Authorization ↔ User Management

| Card | USER & ACCESS | USER & ACCESS | Technical Class | Implementation |
|---:|---|---|---|---|
| 34 | Permissions | Create User | RBAC | Permission `users.create` → `UserPolicy@create`. Phase 1. |
| 35 | Permissions | Edit User | RBAC | Permission `users.edit` → `UserPolicy@update`. Phase 1. |
| 36 | Permissions | Disable User | RBAC | Permission `users.disable` → `UserPolicy@disable`. Phase 1. |

Full paths:

`USER & ACCESS → Authorization → Permissions ↔ USER & ACCESS → User Management → Create User`
`USER & ACCESS → Authorization → Permissions ↔ USER & ACCESS → User Management → Edit User`
`USER & ACCESS → Authorization → Permissions ↔ USER & ACCESS → User Management → Disable User`

---

# Part 3 — Card Audit Summary

| Package | Domain Pair | Category Pair | Cards | Class Breakdown |
|---:|---|---|---|---|
| 01 | BOOKS ↔ CONTRIBUTORS | People & Relations ↔ Roles | 01–04 | 4 DB |
| 02 | BOOKS ↔ CONTRIBUTORS | Book Management ↔ Contributions | 05 | 1 Exception (inverse relation) |
| 03 | ANNOUNCEMENTS ↔ MEDIA | Content ↔ Media Types | 06 | 1 Exception + Media Link |
| 04 | USER & ACCESS ↔ CONTRIBUTORS | Authorization ↔ Person Management | 07–10 | 4 RBAC |
| 05 | BOOKS ↔ MEDIA | Media ↔ Media Types | 11–13 | 3 Media Link |
| 06 | CONTRIBUTORS ↔ MEDIA | Person Information ↔ Media Types | 14 | 1 Media Link |
| 07 | USER & ACCESS ↔ MEDIA | Authorization ↔ Media Management | 15–19 | 5 RBAC |
| 08 | USER & ACCESS ↔ BOOKS | Authorization ↔ Book Management | 20–23 | 4 RBAC |
| 09 | ANNOUNCEMENTS ↔ BOOKS | Type ↔ Book Management / Publishing | 24–28 | 5 Business Logic |
| 10 | ANNOUNCEMENTS ↔ MEDIA | Announcement Management ↔ Media Types | 29 | 1 Media Link |
| 11 | USER & ACCESS ↔ ANNOUNCEMENTS | Authorization ↔ Announcement Management | 30–33 | 4 RBAC |
| 12 | USER & ACCESS ↔ USER & ACCESS | Authorization ↔ User Management | 34–36 | 3 RBAC |

**Total relationship cards: 36**

### Class Distribution

| Class | Cards | Count |
|-------|-------|-------|
| DB (real database relationship) | 01–04 | 4 |
| Relationship-only exception (inverse relation, no table) | 05 | 1 |
| Relationship-only exception + Media Link (polymorphic) | 06 | 1 |
| RBAC (Permission ↔ CRUD) | 07–10, 15–19, 20–23, 30–33, 34–36 | 20 |
| Business Logic (validation rules, not tables) | 24–28 | 5 |
| Media Link (polymorphic) | 11–14, 29 | 5 |
| **Total** | | **36** |

This breakdown resolves the ambiguity flagged in Claude §1: the 36 cards are not all the same kind of artifact. Only 4 are "real" DB pivots; 20 are RBAC; 5 are business rules; 6 are media polymorphic; 1 is an inverse-relation exception.

---

# Part 4 — High-Level Domain Connectivity

```text
                    ┌──────────────────────┐
                    │   USER & ACCESS      │
                    └──────────────────────┘
                       ↕      ↕      ↕
                      BOOKS  CONTRIBUTORS ANNOUNCEMENTS
                        ↕       ↕          ↕
                        └────── MEDIA ─────┘
```

The actual Relationship Key is more granular than this overview. Every mapped connection must be interpreted at:

`Domain → Category → Subcategory`

rather than only at Domain level.

---

# Part 5 — Core Structural Rule

The System Map uses this hierarchy:

```text
DOMAIN
└── CATEGORY
    └── SUBCATEGORY
```

A relationship is therefore represented as:

```text
DOMAIN
→ CATEGORY
  → SUBCATEGORY
↔
DOMAIN
→ CATEGORY
  → SUBCATEGORY
```

When several Subcategories belong to the same Category pair, they remain inside one **Relationship Package**.

Example:

```text
BOOKS
→ People & Relations
    → Author
    → Translator
    → Editor
    → Illustrator

↔

CONTRIBUTORS
  Roles
    → Author
    → Translator
    → Editor
    → Illustrator
```

This grouping rule prevents unrelated Subcategories from being artificially connected and keeps the Relationship Map readable and traceable.

---

# Part 6 — Source-Map Exceptions (Section 4 of Original Spec)

The Relationship Key contains two references that are **not present as normal items in their Domain tree**:

- `CONTRIBUTORS → Contributions → Books` (Card 05)
- `ANNOUNCEMENTS → Content → Image / File` (Card 06)

Rules (per original §4):
- Do not silently add `Contributions` to the CONTRIBUTORS Domain tree.
- Do not silently add `Image / File` to the ANNOUNCEMENTS Content tree.
- Do not invent fields or workflows for either.
- Treat them as relationship-only references until explicitly revised.
- **Implementation treatment (this appendix adds):** Card 05 is satisfied by the inverse `Contributor::books()` Eloquent relation through the `book_contributor` pivot (no standalone model). Card 06 is satisfied by the `mediables` polymorphic pivot (no standalone model).

This is intentional change-control behavior.
