# Phase 1 — USER & ACCESS

> **Goal:** implement authentication, users, roles, permissions, and authorization. Verify authorization works before any other phase starts.
> **Relationship cards covered:** Package 12 (cards 34–36) — RBAC for User Management.
> **Exit gate:** a user can log in, log out, hit `/api/v1/me`, and a user without the `users.create` permission gets 403 on `POST /api/v1/users`.

---

## 1. Domain Reference

From `appendix_a_system_map_and_relationship_key.md`:

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

### Package 12 — USER & ACCESS ↔ USER & ACCESS (Cards 34–36)

| Card | Side A | Side B | Technical Class |
|------|--------|--------|-----------------|
| 34 | Permissions | Create User | RBAC |
| 35 | Permissions | Edit User | RBAC |
| 36 | Permissions | Disable User | RBAC |

Plus the implicit RBAC cards from other packages that depend on Phase 1 being done (referenced in later phases):
- Package 04 (cards 07–10): Permissions → Contributor CRUD
- Package 07 (cards 15–19): Permissions → Media CRUD
- Package 08 (cards 20–23): Permissions → Book CRUD
- Package 11 (cards 30–33): Permissions → Announcement CRUD

The **permission seeds** for all of these are created in Phase 1, even though the policies for those domains are implemented in their respective phases.

---

## 2. Database Schema

See `appendix_b_database_schema.md` for full DDL. Summary:

### `users` (soft-deletable)
| Column | Type | Notes |
|--------|------|-------|
| id | bigIncrements | PK |
| name | string | display name |
| email | string | unique, validated |
| email_verified_at | timestamp nullable | |
| password | string | bcrypt hash, never serialized |
| is_active | boolean default true | "Disable User" = set false |
| last_login_at | timestamp nullable | |
| remember_token | string nullable | |
| deleted_at | timestamp nullable | soft delete |
| created_at, updated_at | timestamps | |

### `roles` (not soft-deletable; hard-delete blocked if `role_user` rows exist)
| Column | Type | Notes |
|--------|------|-------|
| id | bigIncrements | PK |
| name | string unique | e.g. "admin", "editor" |
| label | string | display label |
| guard_name | string default 'sanctum' | |
| created_at, updated_at | timestamps | |

### `permissions` (not soft-deletable; hard-delete blocked if `permission_role` rows exist)
| Column | Type | Notes |
|--------|------|-------|
| id | bigIncrements | PK |
| name | string unique | e.g. "books.create" |
| label | string | display label |
| guard_name | string default 'sanctum' | |
| created_at, updated_at | timestamps | |

### `role_user` (pivot, many-to-many)
| Column | Type | Notes |
|--------|------|-------|
| role_id | bigIncrements FK | |
| user_id | bigIncrements FK | |

### `permission_role` (pivot, many-to-many)
| Column | Type | Notes |
|--------|------|-------|
| permission_id | bigIncrements FK | |
| role_id | bigIncrements FK | |

### `activity_log` (append-only, no soft delete)
| Column | Type | Notes |
|--------|------|-------|
| id | bigIncrements | PK |
| actor_id | bigint FK nullable | users.id, nullable for system actions |
| action | string | e.g. "user.login", "user.create" |
| entity_type | string | morph alias |
| entity_id | bigint nullable | |
| metadata | jsonb nullable | |
| created_at | timestamp | no updated_at |

---

## 3. Permission Seed List (All 22 RBAC cards)

The original spec implies 22 RBAC cards across packages 04, 07, 08, 11, 12. Each becomes one row in `permissions`:

| Permission name | Label | Card | Phase Implemented |
|-----------------|-------|------|-------------------|
| `users.create` | Create User | 34 | Phase 1 |
| `users.edit` | Edit User | 35 | Phase 1 |
| `users.disable` | Disable User | 36 | Phase 1 |
| `users.delete` | Delete / Archive User | (implied) | Phase 1 |
| `contributors.create` | Create Person | 07 | Phase 2 |
| `contributors.edit` | Edit Person | 08 | Phase 2 |
| `contributors.archive` | Archive Person | 09 | Phase 2 |
| `contributors.delete` | Delete Person | 10 | Phase 2 |
| `books.create` | Create Book | 20 | Phase 3 |
| `books.edit` | Edit Book | 21 | Phase 3 |
| `books.archive` | Archive Book | 22 | Phase 3 |
| `books.delete` | Delete Book | 23 | Phase 3 |
| `media.upload` | Upload Media | 15 | Phase 4 |
| `media.edit` | Edit Media | 16 | Phase 4 |
| `media.replace` | Replace Media | 17 | Phase 4 |
| `media.archive` | Archive Media | 18 | Phase 4 |
| `media.delete` | Delete Media | 19 | Phase 4 |
| `announcements.create` | Create Announcement | 30 | Phase 5 |
| `announcements.edit` | Edit Announcement | 31 | Phase 5 |
| `announcements.archive` | Archive Announcement | 32 | Phase 5 |
| `announcements.delete` | Delete Announcement | 33 | Phase 5 |
| `media.link` | Attach Media to entity | (implied) | Phase 4 |

All 22 rows are seeded in Phase 1. The Policy methods for non-User permissions are stubbed in their phases.

### Default Roles

| Role | Permissions |
|------|-------------|
| `admin` | All 22 |
| `editor` | All except `users.*` |
| `media_manager` | `media.*`, `media.link` |
| `contributor_manager` | `contributors.*` |
| `announcer` | `announcements.*` |

These defaults are seeded. They can be edited later via the UI (Phase 1 includes role-permission editing).

---

## 4. Backend Implementation

### 4.1 Models

`app/Models/User.php`:
- `HasApiTokens` (Sanctum), `Notifiable`, `SoftDeletes`.
- `$fillable = ['name', 'email', 'password', 'is_active']`.
- `$hidden = ['password', 'remember_token']`.
- `casts`: `email_verified_at` → datetime, `password` → hashed, `is_active` → boolean, `deleted_at` → datetime.
- Relations: `roles()` (belongsToMany), `permissions()` (through roles, or direct via `permission_user` if you want user-level overrides — **default: through roles only**).
- Helper: `hasPermission(string $name): bool` — checks via cache.

`app/Models/Role.php`:
- `$fillable = ['name', 'label', 'guard_name']`.
- Relations: `users()`, `permissions()`.

`app/Models/Permission.php`:
- `$fillable = ['name', 'label', 'guard_name']`.
- Relations: `roles()`.

`app/Models/ActivityLog.php`:
- `$fillable = ['actor_id', 'action', 'entity_type', 'entity_id', 'metadata']`.
- No `$timestamps` updated_at (disable with `const UPDATED_AT = null`).

### 4.2 Auth Endpoints

`routes/api.php` additions:

```php
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::get('/sanctum/csrf-cookie', ...); // Laravel Sanctum default

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me/password', [ProfileController::class, 'updatePassword']);
});
```

`AuthController@login`:
- Validate `email`, `password`.
- Rate limit: 5 attempts per minute per IP.
- Find user by email; verify password; verify `is_active`.
- On success: create Sanctum token, log `user.login` activity, return user + token (if API tokens) or rely on cookie session (if SPA).
- On failure: 422 with generic "Invalid credentials" (do **not** reveal which of email/password was wrong).

`AuthController@me`:
- Return `Auth::user()` via `UserResource`.

`AuthController@logout`:
- Revoke current access token. Log `user.logout` activity.

### 4.3 User Management Endpoints

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('users', UserController::class);
    Route::post('users/{user}/disable', [UserController::class, 'disable']);
    Route::put('users/{user}/roles', [UserRoleController::class, 'update']);
    Route::apiResource('roles', RoleController::class);
    Route::put('roles/{role}/permissions', [RolePermissionController::class, 'update']);
    Route::apiResource('permissions', PermissionController::class)->only(['index', 'show']);
});
```

### 4.4 Form Requests

- `StoreUserRequest`: `name` required string max 255, `email` required email unique:users,email,NULL,id,deleted_at,NULL, `password` required string min 8 confirmed, `role_ids` required array, `role_ids.*` exists:roles,id.
- `UpdateUserRequest`: same as Store but `password` nullable, `email` unique ignoring self.
- `DisableUserRequest`: none (route param only).
- `UpdateUserRolesRequest`: `role_ids` required array, `role_ids.*` exists:roles,id.
- `UpdateRolePermissionsRequest`: `permission_ids` required array, `permission_ids.*` exists:permissions,id.
- `StoreRoleRequest`: `name` required string unique:roles,name, `label` required string.
- `UpdateRoleRequest`: same as Store ignoring self.

### 4.5 Policies

`UserPolicy`:
- `viewAny($user)`: true (any authenticated user can list — frontend filters by relevance).
- `view($user, $target)`: true.
- `create($user)`: `$user->hasPermission('users.create')`.
- `update($user, $target)`: `$user->hasPermission('users.edit')` OR `$user->id === $target->id` (self-edit, but cannot change own roles without `users.edit`).
- `disable($user, $target)`: `$user->hasPermission('users.disable')` AND `$user->id !== $target->id` (cannot disable self).
- `delete($user, $target)`: `$user->hasPermission('users.delete')` AND `$user->id !== $target->id`.
- `updateRoles($user, $target)`: `$user->hasPermission('users.edit')`.

`RolePolicy`:
- `viewAny`, `view`: true.
- `create`, `update`, `delete`: `$user->hasPermission('users.edit')`.

### 4.6 Resources

`UserResource`:
```php
public function toArray($req): array {
    return [
        'id' => $this->id,
        'name' => $this->name,
        'email' => $this->email,
        'is_active' => $this->is_active,
        'email_verified_at' => $this->email_verified_at,
        'last_login_at' => $this->last_login_at,
        'roles' => RoleResource::collection($this->whenLoaded('roles')),
        'permissions' => $this->whenLoaded('roles.permissions', fn () => /* flattened list */),
        'created_at' => $this->created_at,
        'updated_at' => $this->updated_at,
    ];
}
```
**Never** include `password`, `remember_token`, or `deleted_at`.

`RoleResource`, `PermissionResource`: id, name, label, and (for roles) loaded permissions.

### 4.7 Activity Log Observer

Create `app/Observers/ActivityLogObserver.php` or a service. Log:
- `user.login`, `user.logout`
- `user.create`, `user.update`, `user.disable`, `user.delete`
- `user.roles.update`
- `role.create`, `role.update`, `role.delete`
- `role.permissions.update`

Never log password fields, even hashed.

---

## 5. Frontend Implementation

### 5.1 Pages

```
src/pages/auth/
├── LoginPage.tsx
└── LogoutPage.tsx

src/pages/users/
├── UserListPage.tsx
├── UserDetailPage.tsx
├── UserCreatePage.tsx
└── UserEditPage.tsx

src/pages/roles/
├── RoleListPage.tsx
├── RoleDetailPage.tsx
├── RoleCreatePage.tsx
└── RoleEditPage.tsx
```

### 5.2 Services

`src/services/auth.ts`:
```ts
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/me').then(r => r.data.data),
  updatePassword: (current: string, next: string) => api.put('/me/password', { current_password: current, password: next }),
};
```

`src/services/users.ts`, `src/services/roles.ts`, `src/services/permissions.ts`: standard CRUD.

### 5.3 Auth Hook

`src/hooks/useAuth.ts`:
- Holds current user (from `/me`).
- `login(email, password)` → calls authApi, fetches `/me`, stores user.
- `logout()` → calls authApi, clears user.
- `hasPermission(name: string): boolean` — checks cached permission list.
- `hasRole(name: string): boolean`.

### 5.4 Route Guards

`src/components/guards/RequirePermission.tsx`:
```tsx
export function RequirePermission({ perm, children }: { perm: string; children: ReactNode }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(perm)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}
```

Wrap protected routes:
```tsx
<Route path="/users/new" element={
  <RequirePermission perm="users.create"><UserCreatePage /></RequirePermission>
} />
```

### 5.5 UI States

Each page must handle:
- **loading**: skeleton/spinner.
- **empty**: "No users yet" with create CTA if permitted.
- **success**: data rendered.
- **validation error**: inline field errors from 422 response.
- **unauthorized**: 403 page.
- **server error**: 500 page.
- **not found**: 404 page.

### 5.6 Layout

`src/layouts/AdminLayout.tsx`:
- Top bar: app name, language toggle, user menu (profile, change password, logout).
- Side nav: links to Books, Contributors, Media, Announcements, Users, Roles. Each link is conditionally rendered based on permissions (UX only — backend still enforces).
- Main content area with `<Outlet />`.

---

## 6. Tests

### 6.1 Backend (Pest)

`tests/Feature/Auth/LoginTest.php`:
- valid credentials → 200, returns user.
- invalid email → 422.
- wrong password → 422, generic message.
- inactive user → 422, "Account disabled".
- 5 failed attempts in 1 min → 429.

`tests/Feature/Auth/LogoutTest.php`:
- logged in → POST /logout → 204.
- after logout, /me → 401.

`tests/Feature/UserCrudTest.php`:
- index: any auth user → 200.
- store: without `users.create` → 403; with → 201.
- update: self without `users.edit` → 200 (limited fields); with `users.edit` → 200 (full).
- disable: self → 403; with `users.disable` on other → 200.
- delete: self → 403; with `users.delete` on other → 204; soft-deleted user missing from list.

`tests/Feature/RolePermissionTest.php`:
- assign permission to role, user with role gains permission.
- revoke permission, user loses it.
- cannot delete role with users assigned → 422.

`tests/Feature/ActivityLogTest.php`:
- login writes `user.login` row.
- create user writes `user.create` row with actor_id.

### 6.2 Frontend (Vitest)

`src/test/auth.test.tsx`:
- `useAuth().hasPermission('users.create')` returns true when role has permission.
- LoginPage renders email/password inputs and submit button.
- LoginPage shows validation error on 422.

`src/test/users.test.tsx`:
- UserListPage renders loading skeleton while fetching.
- UserListPage renders empty state when no users.
- UserCreatePage submit calls `usersApi.create` and navigates on success.

---

## 7. Phase 1 Definition of Done

- [ ] Migrations for `users`, `roles`, `permissions`, `role_user`, `permission_role`, `activity_log` created and run on fresh DB.
- [ ] Models `User`, `Role`, `Permission`, `ActivityLog` with correct relations, `$fillable`, `$hidden`, casts.
- [ ] Sanctum configured; CSRF cookie endpoint works.
- [ ] `/auth/login`, `/auth/logout`, `/me`, `/me/password` endpoints implemented and tested.
- [ ] User CRUD + disable + role assignment endpoints implemented.
- [ ] Role CRUD + permission assignment endpoints implemented.
- [ ] Permission index/show endpoints implemented.
- [ ] All 22 permissions seeded; 5 default roles seeded.
- [ ] Policies: `UserPolicy`, `RolePolicy` enforce all rules; controller uses `$this->authorize`.
- [ ] Form Requests for every endpoint.
- [ ] API Resources for User, Role, Permission — never serialize password.
- [ ] Activity Log observer writes for every auth/user/role action.
- [ ] Frontend: Login, Logout, UserList, UserDetail, UserCreate, UserEdit, RoleList, RoleDetail, RoleCreate, RoleEdit pages.
- [ ] `useAuth` hook with `hasPermission`/`hasRole`.
- [ ] `RequirePermission` guard wrapping protected routes.
- [ ] AdminLayout with permission-filtered nav.
- [ ] All 7 UI states implemented on each page.
- [ ] Backend tests: login, logout, user CRUD, role/permission, activity log — all green.
- [ ] Frontend tests: auth, users list/create — all green.
- [ ] `php artisan migrate:fresh --seed` runs clean.
- [ ] Phase 1 report written.

---

## 8. What Not To Do in Phase 1

- ❌ Do not create `books`, `contributors`, `media`, `announcements` migrations/models.
- ❌ Do not implement Book/Contributor/Media/Announcement policies (stubbed later).
- ❌ Do not invent permissions beyond the 22 listed in §3.
- ❌ Do not implement role inheritance (parent/child roles) — not in spec.
- ❌ Do not implement OAuth/SAML/SSO — Sanctum only for v1.

---

## 9. Stop and Report If

- You discover a permission is needed that isn't in the §3 list.
- You need to merge `role_user` and `permission_role` into a single table.
- You need a permission to apply only to a subset of entities (e.g., "can edit own books") — that's not in the spec; surface as an open question.
- Sanctum cookie auth doesn't work with the frontend origin configuration.
