# Phase 4 — MEDIA

> **Goal:** implement a media library with polymorphic attachment to Books, Contributors, and Announcements.
> **Relationship cards covered:**
> - Package 03 (card 06): relationship-only exception (Announcement Image via Content/Image-File).
> - Package 05 (cards 11–13): Book ↔ Media Types.
> - Package 06 (card 14): Contributor ↔ Media Types.
> - Package 07 (cards 15–19): RBAC for Media Management.
> - Package 10 (card 29): Announcement ↔ Media Types (endpoint defined here, used in Phase 5).
> **Exit gate:** media can be uploaded, viewed, edited, replaced, archived, deleted, and attached to Books and Contributors. Announcement attachment endpoint exists but is exercised in Phase 5.

---

## 1. Architecture: Polymorphic Media (GLM Fix B + D)

A normalized, fully relational approach using a **polymorphic `mediables` pivot**. Media is one entity (`media` table); attachments to Books / Contributors / Announcements go through `mediables` with a `media_type` discriminator.

**Why polymorphic?**
- One media record can be reused across entities (e.g., a publisher logo used on multiple books).
- One media record can have different roles on different entities (e.g., same image is "Book Cover" for Book A and "Book Image" for Book B).
- Avoids duplicating FK columns on `media` for each entity type.

**Why a `media_type` discriminator on the pivot (not on `media`)?**
- The same physical file (e.g., a portrait photo) might be "Person Photo" for a Contributor and "Announcement Image" if reused on an announcement.
- The role is contextual to the attachment, not the file itself.

---

## 2. Domain Reference

### 04. MEDIA

#### Media Management
- Upload, View, Edit, Replace, Archive, Delete

#### Media Library
- All Media, Images, Documents, Other Files

#### Media Types (controlled values — from `appendix_a`)
- Book Cover
- Book Image
- Person Photo
- Announcement Image
- Publisher Logo
- Document

#### Media Information
- File Name, File Type, File Size, Dimensions, Alt Text, Caption, Description

#### Storage
- File Storage, File Path / URL, Storage Provider

#### Relations
- Books, Contributors, Announcements

### Package 03 — ANNOUNCEMENTS ↔ MEDIA (Card 06)

| Card | Side A | Side B | Technical Class |
|------|--------|--------|-----------------|
| 06 | Content → Image / File | Media Types → Announcement Image | Relationship-only exception (Section 4) + Media Link |

Card 06 is the second intentional trap. `ANNOUNCEMENTS → Content → Image / File` is not in the ANNOUNCEMENTS Content tree. It is preserved as a relationship-only reference. **Implementation:** satisfied by the polymorphic `mediables` pivot when `mediable_type = 'Announcement'` and `media_type = 'Announcement Image'`. Do **not** create an `Image / File` model or table.

### Package 05 — BOOKS ↔ MEDIA (Cards 11–13)

| Card | Side A | Side B | Technical Class |
|------|--------|--------|-----------------|
| 11 | Media → Cover | Media Types → Book Cover | Media Link |
| 12 | Media → Images | Media Types → Book Image | Media Link |
| 13 | Media → Files | Media Types → Document | Media Link |

All three cards satisfied by `mediables` rows where `mediable_type = 'Book'` and `media_type` ∈ {Book Cover, Book Image, Document}.

### Package 06 — CONTRIBUTORS ↔ MEDIA (Card 14)

| Card | Side A | Side B | Technical Class |
|------|--------|--------|-----------------|
| 14 | Person Information → Photo | Media Types → Person Photo | Media Link |

Satisfied by `mediables` rows where `mediable_type = 'Contributor'` and `media_type = 'Person Photo'`.

### Package 07 — USER & ACCESS ↔ MEDIA (Cards 15–19)

| Card | Side A | Side B | Technical Class |
|------|--------|--------|-----------------|
| 15 | Permissions | Upload Media | RBAC |
| 16 | Permissions | Edit Media | RBAC |
| 17 | Permissions | Replace Media | RBAC |
| 18 | Permissions | Archive Media | RBAC |
| 19 | Permissions | Delete Media | RBAC |

### Package 10 — ANNOUNCEMENTS ↔ MEDIA (Card 29)

| Card | Side A | Side B | Technical Class |
|------|--------|--------|-----------------|
| 29 | Announcement Management → Create/Edit Announcement | Media Types → Announcement Image | Media Link |

Endpoint `POST /api/v1/announcements/{announcement}/media` is created in Phase 4 (so the polymorphic infrastructure is complete), but it is **exercised** only after Phase 5 creates the `announcements` table. The migration that creates `announcements` must run before this endpoint can be hit. **Phase 4 may seed and unit-test the endpoint against a mock or skip integration test until Phase 5.**

---

## 3. Database Schema

See `appendix_b_database_schema.md` §3.4 for full DDL. Summary:

### `media` (soft-deletable)

| Column | Type | Notes |
|--------|------|-------|
| id | bigIncrements | PK |
| disk | string default 'local' | storage disk |
| path | string | relative path on disk |
| file_name | string | original uploaded name |
| mime_type | string | sniffed, never trusted from client |
| size | bigint | bytes |
| width | integer nullable | pixels (images only) |
| height | integer nullable | pixels (images only) |
| alt_text | string nullable | accessibility |
| caption | string nullable | |
| description | text nullable | |
| uploaded_by | FK → users.id | who uploaded |
| is_archived | boolean default false | archive flag |
| deleted_at | timestamp nullable | soft delete |
| created_at, updated_at | timestamps | |

**Check constraint:** `size > 0`.

### `mediables` (polymorphic pivot, not soft-deletable, detach only)

| Column | Type | Notes |
|--------|------|-------|
| id | bigIncrements | PK |
| media_id | FK → media.id | cascade on delete |
| mediable_type | string | morph alias: 'Book', 'Contributor', 'Announcement' |
| mediable_id | bigint | polymorphic FK (no DB-level FK; enforced in app) |
| media_type | string | controlled value: Book Cover, Book Image, Person Photo, Announcement Image, Publisher Logo, Document |
| created_at, updated_at | timestamps | |
| Unique | (media_id, mediable_type, mediable_id, media_type) | prevents duplicate attachment |

### `media_types` (lookup, not soft-deletable)

| Column | Type | Notes |
|--------|------|-------|
| id | bigIncrements | PK |
| name | string unique | "Book Cover", "Book Image", "Person Photo", "Announcement Image", "Publisher Logo", "Document" |
| label | string | display |
| allowed_mime | jsonb | whitelist for this type, e.g. `["image/jpeg","image/png","image/webp"]` for Book Cover |
| created_at, updated_at | timestamps | |

Seed exactly the 6 approved media types. Do not add more.

---

## 4. MIME Whitelist & Upload Limits (Claude §6 Resolution)

| Media Type | Allowed MIME | Max Size | Dimensions |
|------------|--------------|----------|------------|
| Book Cover | image/jpeg, image/png, image/webp | 5 MB | 400×600 to 2000×3000 px |
| Book Image | image/jpeg, image/png, image/webp | 5 MB | 200×200 to 4000×4000 px |
| Person Photo | image/jpeg, image/png, image/webp | 3 MB | 200×200 to 2000×2000 px |
| Announcement Image | image/jpeg, image/png, image/webp | 5 MB | 400×300 to 4000×4000 px |
| Publisher Logo | image/svg+xml, image/png | 1 MB | 64×64 to 1024×1024 px |
| Document | application/pdf | 20 MB | n/a |

**Enforcement:**
- Validate `mime_type` by reading the file's magic bytes via `finfo` or Laravel's `UploadedFile::getMimeType()` — **never** trust the client-supplied MIME.
- Validate size and (for images) dimensions.
- Reject if MIME is not in the whitelist for the requested `media_type`.

---

## 5. Backend Implementation

### 5.1 Models

`app/Models/Media.php`:
- `SoftDeletes`.
- `$fillable = ['disk', 'path', 'file_name', 'mime_type', 'size', 'width', 'height', 'alt_text', 'caption', 'description', 'uploaded_by', 'is_archived']`.
- `casts`: `size` → integer, `width/height` → integer, `is_archived` → boolean, `deleted_at` → datetime.
- Relations:
  - `uploader()` → belongsTo User.
  - `books()` → morphedByMany Book via `mediables` (with `media_type` pivot).
  - `contributors()` → morphedByMany Contributor.
  - `announcements()` → morphedByMany Announcement (Phase 5).
- Helper: `url()` → returns `Storage::disk($this->disk)->url($this->path)`.

`app/Models/Mediable.php` (the pivot model):
- `$fillable = ['media_id', 'mediable_type', 'mediable_id', 'media_type']`.

`app/Models/MediaLibrary/Book.php` (trait or base class) — add `media()` morphToMany on Book, Contributor, Announcement models:

```php
public function media(): MorphToMany {
    return $this->morphToMany(Media::class, 'mediable')
        ->withPivot('media_type')
        ->withTimestamps();
}

// Helper for a specific media type
public function cover(): MorphToMany {
    return $this->media()->wherePivot('media_type', 'Book Cover');
}
```

### 5.2 Endpoints

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('media', MediaController::class);
    Route::post('media/{media}/replace', [MediaController::class, 'replace']);
    Route::post('media/{media}/archive', [MediaController::class, 'archive']);

    // Polymorphic attachments
    Route::post('books/{book}/media', [MediaAttachmentController::class, 'attach'])
        ->middleware('can:books.edit,book');
    Route::get('books/{book}/media', [MediaAttachmentController::class, 'index']);
    Route::delete('books/{book}/media/{media}', [MediaAttachmentController::class, 'detach'])
        ->middleware('can:books.edit,book');

    Route::post('contributors/{contributor}/media', [MediaAttachmentController::class, 'attach'])
        ->middleware('can:contributors.edit,contributor');
    Route::get('contributors/{contributor}/media', [MediaAttachmentController::class, 'index']);
    Route::delete('contributors/{contributor}/media/{media}', [MediaAttachmentController::class, 'detach'])
        ->middleware('can:contributors.edit,contributor');

    // Announcement attachment — registered here, requires Phase 5 announcements table
    Route::post('announcements/{announcement}/media', [MediaAttachmentController::class, 'attach'])
        ->middleware('can:announcements.edit,announcement');
    Route::get('announcements/{announcement}/media', [MediaAttachmentController::class, 'index']);
    Route::delete('announcements/{announcement}/media/{media}', [MediaAttachmentController::class, 'detach'])
        ->middleware('can:announcements.edit,announcement');

    Route::get('media-types', [MediaTypeController::class, 'index']);
});
```

`MediaAttachmentController@attach` accepts:
```json
{ "media_id": 123, "media_type": "Book Cover" }
```

Validates:
- `media_id` exists and is not archived.
- `media_type` is one of the 6 approved.
- The MIME of the media matches the allowed_mime for the requested media_type.
- The (media_id, mediable_type, mediable_id, media_type) combination is unique.

### 5.3 File Upload Flow

1. Client `POST /api/v1/media` with `multipart/form-data`: `file`, `media_type`, `alt_text`, `caption`, `description`.
2. Server validates via `StoreMediaRequest`:
   - `file` required, file, max size per media_type.
   - `media_type` required, in approved list.
   - MIME sniffed from file content; must be in `media_types.allowed_mime` for the requested type.
   - For images, dimensions validated.
3. Server stores file via `Storage::disk(<configured>)->putFileAs('media/{yyyy}/{mm}', $file, $uniqueName)`.
4. Server creates `media` record with disk/path/sniffed mime/size/dimensions/uploaded_by.
5. Server returns `MediaResource`.

**Replace flow:**
1. `POST /api/v1/media/{media}/replace` with new file.
2. Validates same as upload.
3. Stores new file, updates `media` record (path, mime, size, dimensions).
4. **Old file is kept on disk until no `mediables` rows reference the old version** — actually, since `media` is updated in place, all attachments automatically point to the new file. If the product owner wants version history, surface as open question. For v1, replace = overwrite.
5. Original file on disk is deleted after successful update (configurable).

### 5.4 Form Requests

`StoreMediaRequest`:
- `file` required file.
- `media_type` required in:approved list.
- `alt_text` nullable string max 255.
- `caption` nullable string max 255.
- `description` nullable string max 2000.

`UpdateMediaRequest` (metadata only, not file):
- `alt_text`, `caption`, `description` — nullable strings.

`ReplaceMediaRequest`: same as Store but `file` required.

`AttachMediaRequest`:
- `media_id` required exists:media,id.
- `media_type` required in:approved list.
- Custom rule: mime of media must be allowed for media_type.

### 5.5 Policy

`MediaPolicy`:
- `viewAny`, `view`: true.
- `create` (upload): `media.upload`.
- `update` (metadata): `media.edit`.
- `replace`: `media.replace`.
- `archive`: `media.archive` AND not already archived.
- `delete`: `media.delete` AND archived.
- `attach`/`detach`: depends on the parent entity — see middleware above (`books.edit`, `contributors.edit`, `announcements.edit`).

### 5.6 Resource

`MediaResource`:
```php
return [
    'id' => $this->id,
    'file_name' => $this->file_name,
    'mime_type' => $this->mime_type,
    'size' => $this->size,
    'width' => $this->width,
    'height' => $this->height,
    'url' => $this->url(),
    'alt_text' => $this->alt_text,
    'caption' => $this->caption,
    'description' => $this->description,
    'is_archived' => $this->is_archived,
    'uploaded_by' => UserResource::make($this->whenLoaded('uploader')),
    'created_at' => $this->created_at,
    'updated_at' => $this->updated_at,
];
```

### 5.7 Activity Log

`media.upload`, `media.update`, `media.replace`, `media.archive`, `media.delete`, `media.attach` (with metadata: mediable_type, mediable_id, media_type), `media.detach`.

### 5.8 Search & Filtering

`GET /api/v1/media?`:
- `q` — file_name, alt_text, caption, description (ILIKE).
- `media_type` — exact.
- `mime_type` — exact (e.g., `image/jpeg`).
- `is_archived` — default false.
- `mediable_type` — filter media attached to a given entity type.
- `page`, `per_page`.

---

## 6. Frontend Implementation

### 6.1 Pages

```
src/pages/media/
├── MediaLibraryPage.tsx       # grid view with filters
├── MediaDetailPage.tsx        # full info + attached entities
├── MediaUploadPage.tsx        # single/batch upload with drag-drop
└── MediaEditPage.tsx          # metadata edit
```

### 6.2 Media Library

- Grid of thumbnails (for images) or icons (for documents).
- Filters: media_type, mime_type, archived toggle, search.
- Bulk select for archive/delete.
- Click → detail page.

### 6.3 Attachment UI on Book / Contributor / Announcement

On the Book detail page (Phase 3 detail updated in Phase 4):
- "Media" section with sub-sections: Cover, Images, Files.
- Each shows current attachments with "Replace" and "Remove" buttons.
- "Attach from Library" button opens a modal to search and pick existing media.
- "Upload New" button opens upload modal.

Same pattern for Contributor (Photo only) and Announcement (Announcement Image only).

### 6.4 Upload Component

`src/components/media/MediaUploader.tsx`:
- Drag-drop zone.
- Shows validation errors per file (wrong MIME, too large, wrong dimensions).
- Calls `POST /api/v1/media` per file.
- On success, refreshes the calling list.

### 6.5 Services

`src/services/media.ts`:
```ts
export const mediaApi = {
  list: (params) => api.get('/media', { params }).then(r => r.data),
  get: (id) => api.get(`/media/${id}`).then(r => r.data.data),
  upload: (formData: FormData) => api.post('/media', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data),
  update: (id, data) => api.put(`/media/${id}`, data).then(r => r.data.data),
  replace: (id, formData) => api.post(`/media/${id}/replace`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data),
  archive: (id) => api.post(`/media/${id}/archive`).then(r => r.data.data),
  delete: (id) => api.delete(`/media/${id}`),
  attach: (entity: string, entityId: number, mediaId: number, mediaType: string) =>
    api.post(`/${entity}/${entityId}/media`, { media_id: mediaId, media_type: mediaType }),
  detach: (entity: string, entityId: number, mediaId: number) =>
    api.delete(`/${entity}/${entityId}/media/${mediaId}`),
};
```

---

## 7. Tests

### 7.1 Backend (Pest)

`tests/Feature/MediaUploadTest.php`:
- upload valid image → 201.
- upload wrong MIME for media_type → 422.
- upload too large → 422.
- upload wrong dimensions → 422.
- upload without `media.upload` → 403.
- replace existing media → 200.
- archive then delete → 204.

`tests/Feature/MediaAttachmentTest.php`:
- attach media to Book with Book Cover → pivot row.
- attach same media with same type twice → 422.
- attach media with wrong MIME for type → 422.
- detach → row removed.
- delete Book cascades pivot.
- delete Contributor cascades pivot.
- delete Media cascades pivot.

`tests/Feature/MediaLibraryTest.php`:
- filter by media_type, mime_type, search.
- archived media not in default list.

### 7.2 Frontend (Vitest)

`src/test/media.test.tsx`:
- MediaLibraryPage renders all 7 states.
- MediaUploader rejects wrong MIME client-side.
- Attachment modal flow.

---

## 8. Phase 4 Definition of Done

- [ ] Migrations for `media`, `mediables`, `media_types` created and run on fresh DB.
- [ ] `media_types` seeded with exactly 6 approved types and their `allowed_mime` whitelists.
- [ ] Models `Media`, `Mediable`, `MediaType` with relations.
- [ ] Book, Contributor models updated with `media()` morphToMany and `cover()`, `photo()` helpers.
- [ ] Announcement model gains `media()` relation in Phase 5 (or now if Phase 5 ships together).
- [ ] Upload endpoint validates MIME by sniffing (not by client claim), size, dimensions.
- [ ] Replace endpoint overwrites file and updates record.
- [ ] Archive + Delete ordering enforced (archive first).
- [ ] Attach/detach endpoints for Book, Contributor, Announcement.
- [ ] `MediaPolicy` enforces all 5 RBAC cards + parent-entity policies for attach.
- [ ] Form Requests with documented rules.
- [ ] `MediaResource` never leaks disk path (only URL).
- [ ] Activity log writes for all 7 actions.
- [ ] Frontend: MediaLibrary, MediaDetail, MediaUpload, MediaEdit pages with all 7 states.
- [ ] Attachment UI integrated into Book detail and Contributor detail.
- [ ] Backend + frontend tests green.
- [ ] `php artisan migrate:fresh --seed` runs clean.
- [ ] Phase 4 report written.

---

## 9. What Not To Do in Phase 4

- ❌ Do not invent media types beyond the 6 approved.
- ❌ Do not trust client-supplied MIME — always sniff.
- ❌ Do not return disk paths or internal storage paths to the client.
- ❌ Do not implement a separate `book_media`, `contributor_media`, `announcement_media` table — polymorphic `mediables` is the only pivot.
- ❌ Do not auto-link "Publisher Logo" to anything (Claude §3 — surface Q2 in README §11).
- ❌ Do not implement file version history unless product owner approves.

---

## 10. Stop and Report If

- Product owner wants per-media-type upload size to be configurable at runtime (not hardcoded).
- Product owner wants file versioning (keep old file on replace).
- Product owner wants to restrict media uploads to specific users per media_type (e.g., only designers upload Publisher Logos).
- Product owner wants to use S3 in development (default is local disk).
