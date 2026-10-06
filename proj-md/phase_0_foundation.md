# Phase 0 — Foundation

> **Goal:** a clean, runnable, tested scaffold. No business features in this phase.
> **Do not implement:** Users, Books, Contributors, Media, Announcements, or any relationship.
> **Exit gate:** `php artisan test` passes, `npm run build` succeeds, `npm run lint` passes, DB connection works, migrations run on a fresh DB.

---

## 1. Inspect the Existing Repository

Before any change:

1. List the repo root. Identify what already exists (Laravel skeleton? React skeleton? Both? Empty?).
2. If a `composer.json` exists, read it and record:
   - PHP version constraint
   - Laravel version constraint
   - Installed packages
3. If a `package.json` exists, read it and record:
   - Node version constraint
   - React version
   - Build tool (Vite preferred; CRA acceptable if already present)
   - Installed packages
4. If a `.git` directory exists, record the current branch and any uncommitted changes. **Do not delete uncommitted work** — surface it in the Phase 0 report.
5. If existing migrations exist, list them in the report. Do **not** modify them in this phase.

**Stop and report** if:
- The repository already contains business code from a previous attempt that conflicts with this spec.
- The PHP or Node version installed locally does not satisfy the constraints below.

---

## 2. Required Versions

| Component | Version | Notes |
|-----------|---------|-------|
| PHP | 8.2+ | 8.3 preferred. |
| Laravel | 11.x | 12.x acceptable if already in `composer.json`. |
| PostgreSQL | 15+ | 14 acceptable. |
| Node | 20 LTS+ | 22 LTS preferred. |
| React | 18.x | 19.x acceptable if already in `package.json`. |
| TypeScript | 5.x | Strict mode required. |
| Vite | 5.x+ | Default build tool. |
| Pest | 2.x+ | Or PHPUnit 10+ if Pest not installable. |

If the installed versions are lower, **upgrade before proceeding**. Surface any upgrade blockers in the Phase 0 report.

---

## 3. Backend Scaffold (Laravel)

### 3.1 Install (if not present)

```bash
composer create-project laravel/laravel backend
cd backend
composer require laravel/sanctum
composer require pestphp/pest --dev --with-all-dependencies
composer require pestphp/pest-plugin-laravel --dev
composer require laravel/pint --dev  # PSR-12 formatter
```

If a Laravel project already exists, only `require` what's missing. Do **not** reinstall.

### 3.2 Environment

- Copy `.env.example` to `.env`.
- Set:
  ```
  APP_ENV=local
  APP_DEBUG=true
  APP_URL=http://localhost:8000

  DB_CONNECTION=pgsql
  DB_HOST=127.0.0.1
  DB_PORT=5432
  DB_DATABASE=dar_al_ajneha
  DB_USERNAME=<your_pg_user>
  DB_PASSWORD=<your_pg_password>

  SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:3000
  SESSION_DOMAIN=localhost
  CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

  FILESYSTEM_DISK=local  # public or s3 in staging/prod
  ```

- Run `php artisan key:generate`.
- Verify DB connection: `php artisan db:show` must succeed without error.

### 3.3 Configuration Files

- `config/cors.php`: allowed origins = `env('CORS_ALLOWED_ORIGINS')`, allowed paths `['api/*', 'sanctum/csrf-cookie']`, supports credentials `true`.
- `config/sanctum.php`: default (Laravel 11+ ships sensible defaults).
- `config/auth.php`: default guard `sanctum`, provider `users` (Eloquent, model `App\Models\User`).

### 3.4 Directory Layout

Apply the structure from `00_overview_conventions.md` §9.1. Create empty directories:

```
app/Http/Controllers/
app/Http/Requests/
app/Http/Resources/
app/Policies/
app/Services/
app/Support/
database/migrations/
database/seeders/
database/factories/
tests/Feature/
tests/Unit/
```

### 3.5 Routes

`routes/api.php` should contain only:

```php
<?php

use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));
```

Register `api.php` with the `api` middleware group and `/api/v1` prefix in `bootstrap/app.php` (Laravel 11+) or `RouteServiceProvider` (Laravel 10).

### 3.6 Lint & Format

- Run `vendor/bin/pint` to format.
- Add a Git pre-commit hook (optional but recommended) running Pint.

### 3.7 Test Baseline

- Run `php artisan pest:install` (or `php artisan test:install` for PHPUnit).
- Write one smoke test: `tests/Feature/HealthTest.php`:
  ```php
  test('health endpoint returns ok', function () {
      $this->get('/api/v1/health')->assertOk()->assertJson(['status' => 'ok']);
  });
  ```
- Run `php artisan test`. It must pass.

---

## 4. Frontend Scaffold (React + TypeScript + Vite)

### 4.1 Install (if not present)

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install axios react-router-dom @tanstack/react-query i18next react-i18next
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/node
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks
```

### 4.2 TypeScript Strict Mode

`tsconfig.json` must have:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "jsx": "react-jsx",
    "paths": { "@/*": ["src/*"] }
  }
}
```

### 4.3 Vite Config

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

### 4.4 Directory Layout

Apply the structure from `00_overview_conventions.md` §8.1. Create empty directories:

```
src/app/
src/components/
src/layouts/
src/pages/{auth,books,contributors,media,announcements,users}/
src/features/{books,contributors,media,announcements,users}/
src/services/
src/hooks/
src/types/
src/utils/
src/locales/
src/routes/
```

### 4.5 API Client

`src/services/api.ts`:

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Accept': 'application/json' },
});

// Response interceptor: unwrap envelope, normalize errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 422) {
      return Promise.reject({ type: 'validation', errors: err.response.data.errors });
    }
    if (err.response?.status === 401) return Promise.reject({ type: 'unauthenticated' });
    if (err.response?.status === 403) return Promise.reject({ type: 'unauthorized' });
    if (err.response?.status === 404) return Promise.reject({ type: 'not_found' });
    return Promise.reject({ type: 'server_error', message: err.response?.data?.message ?? 'Server error' });
  },
);
```

### 4.6 Smoke Page

`src/pages/Home.tsx` — a trivial page that hits `/api/v1/health` and shows the response. Wire it into `App.tsx` with `react-router-dom`.

### 4.7 Lint

`npm run lint` must pass.

### 4.8 Build

`npm run build` must succeed.

### 4.9 Test Baseline

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom';
```

`src/test/smoke.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import Home from '@/pages/Home';

test('Home renders', () => {
  render(<Home />);
  expect(screen.getByText(/health/i)).toBeInTheDocument();
});
```

`npm run test` must pass.

---

## 5. Repository Layout (Monorepo)

The final repo shape:

```
dar-al-ajneha/
├── backend/          # Laravel
│   ├── app/
│   ├── database/
│   ├── routes/
│   ├── tests/
│   ├── .env
│   └── composer.json
├── frontend/         # React + TS + Vite
│   ├── src/
│   ├── public/
│   ├── .env
│   └── package.json
├── docs/             # These MD spec files (copy them here)
│   ├── README.md
│   ├── 00_overview_conventions.md
│   ├── phase_0_foundation.md
│   ├── ...
│   └── appendices/
├── .github/
│   └── workflows/
│       └── ci.yml    # Created in Phase 7
├── .gitignore
└── README.md
```

`.gitignore` must include:
- `backend/.env`
- `frontend/.env`
- `backend/vendor/`
- `frontend/node_modules/`
- `frontend/dist/`
- `*.log`

---

## 6. Documentation

Copy all MD spec files (this phased edition) into `docs/` at the repo root. They are the implementation contract.

---

## 7. Phase 0 Definition of Done

- [ ] Repo inspected; existing state documented in Phase 0 report.
- [ ] PHP 8.2+, Laravel 11.x, PostgreSQL 15+, Node 20+, React 18+, TS 5.x installed and recorded.
- [ ] Laravel backend scaffolded (or already present), Sanctum + Pest installed.
- [ ] `.env` configured with real PostgreSQL connection; `php artisan db:show` succeeds.
- [ ] `config/cors.php` and `config/sanctum.php` configured per §3.3.
- [ ] Directory structure per §3.4 created (empty folders OK).
- [ ] `routes/api.php` has `/health` endpoint under `/api/v1` prefix.
- [ ] `vendor/bin/pint` runs clean.
- [ ] `php artisan test` passes (HealthTest green).
- [ ] React + TS + Vite frontend scaffolded (or already present).
- [ ] `tsconfig.json` strict mode enabled.
- [ ] `vite.config.ts` configured with proxy + alias + test env.
- [ ] Directory structure per §4.4 created.
- [ ] `src/services/api.ts` written with envelope-aware interceptor.
- [ ] `Home.tsx` smoke page wired to router.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.
- [ ] `npm run test` passes (smoke test green).
- [ ] Monorepo layout per §5 with `.gitignore`.
- [ ] All MD spec files copied to `docs/`.
- [ ] Phase 0 report written (see template below).

---

## 8. Phase 0 Report Template

```markdown
# Phase 0 Report

## Repo State at Inspection
- Pre-existing Laravel: yes/no, version ___
- Pre-existing React: yes/no, version ___
- Uncommitted changes: yes/no (describe)

## Versions Installed
- PHP: ___
- Laravel: ___
- PostgreSQL: ___
- Node: ___
- React: ___
- TypeScript: ___
- Pest/PHPUnit: ___
- Vitest: ___

## Smoke Test Results
- `php artisan test`: PASS / FAIL
- `npm run test`: PASS / FAIL
- `npm run build`: PASS / FAIL
- `npm run lint`: PASS / FAIL
- `php artisan db:show`: PASS / FAIL

## Files Created
- (list)

## Known Limitations / Deviations
- (list, or "none")

## Items Requiring Approval
- (list, or "none")

## Next Phase
Ready to start Phase 1 — USER & ACCESS.
```

---

## 9. What Not To Do in Phase 0

- ❌ Do not create `users`, `roles`, `permissions` migrations.
- ❌ Do not create any Domain model (`Book`, `Contributor`, `Media`, `Announcement`).
- ❌ Do not create any controller other than a trivial health controller.
- ❌ Do not install UI component libraries yet (MUI, Ant, shadcn — decided per phase).
- ❌ Do not configure CI/CD (that's Phase 7).
- ❌ Do not deploy.
