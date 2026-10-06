import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { makeRole, makeUser } from './fixtures';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import LoginPage from '@/pages/auth/LoginPage';
import Home from '@/pages/Home';
import { AdminLayout } from '@/layouts/AdminLayout';
import { RequirePermission } from '@/components/guards/RequirePermission';
import { formatDate } from '@/utils/format';
import { authApi } from '@/services/auth';
import { api } from '@/services/api';

vi.mock('@/services/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/auth')>();
  return { ...actual, authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn(), updatePassword: vi.fn() } };
});

const mockedAuth = vi.mocked(authApi);

beforeEach(() => {
  vi.clearAllMocks();
  mockedAuth.me.mockRejectedValue(new Error('401'));
});

// i18next is a global singleton: reset it so a language-switch test cannot
// leak Persian labels into the rest of the file.
afterEach(async () => {
  const { default: i18n } = await import('@/i18n');
  await i18n.changeLanguage('en');
});

test('LoginPage shows a translated error for a rejected login', async () => {
  mockedAuth.login.mockRejectedValue({ type: 'validation', errors: { email: ['Invalid credentials'] } });

  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'a@b.c' } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'wrong' } });
  fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

  expect(await screen.findByRole('alert')).toBeInTheDocument();
});

test('LoginPage falls back to a generic message for a server error', async () => {
  mockedAuth.login.mockRejectedValue({ type: 'server_error' });

  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'a@b.c' } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'x' } });
  fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/server encountered an error/i);
});

test('Home reports a healthy backend', async () => {
  const spy = vi.spyOn(api, 'get').mockResolvedValue({ data: { status: 'ok' } } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <Home />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText(/api status: online/i)).toBeInTheDocument();
  expect(spy).toHaveBeenCalledWith('/health');
  spy.mockRestore();
});

test('Home reports a failed health check', async () => {
  const spy = vi.spyOn(api, 'get').mockRejectedValue(new Error('down'));

  render(
    <MemoryRouter>
      <AuthProvider>
        <Home />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText(/api status: unreachable/i)).toBeInTheDocument();
  spy.mockRestore();
});

test('AdminLayout hides navigation the user cannot use', async () => {
  mockedAuth.me.mockResolvedValue(makeUser({ permissions: ['books.create'] }));

  render(
    <MemoryRouter>
      <AuthProvider>
        <AdminLayout />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText('Admin')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Books' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Media' })).not.toBeInTheDocument();
});

test('AdminLayout switches the interface language', async () => {
  mockedAuth.me.mockResolvedValue(makeUser({ permissions: ['books.create'] }));

  render(
    <MemoryRouter>
      <AuthProvider>
        <AdminLayout />
      </AuthProvider>
    </MemoryRouter>,
  );

  const englishButton = await screen.findByRole('button', { name: 'EN' });
  const persianButton = screen.getByRole('button', { name: 'فارسی' });

  await waitFor(() => expect(englishButton).toBeDisabled());
  expect(persianButton).toBeEnabled();

  fireEvent.click(persianButton);

  await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));
  expect(screen.getByText('کتاب‌ها')).toBeInTheDocument();

  // Restore English for the other tests in this file.
  fireEvent.click(screen.getByRole('button', { name: 'EN' }));
  await waitFor(() => expect(document.documentElement.dir).toBe('ltr'));
});

test('AdminLayout logs the user out', async () => {
  mockedAuth.me.mockResolvedValue(makeUser({ permissions: ['books.create'] }));
  mockedAuth.logout.mockResolvedValue({ data: null });

  render(
    <MemoryRouter>
      <AuthProvider>
        <AdminLayout />
      </AuthProvider>
    </MemoryRouter>,
  );

  fireEvent.click(await screen.findByRole('button', { name: /logout/i }));

  await waitFor(() => expect(mockedAuth.logout).toHaveBeenCalled());
});

test('RequirePermission blocks a user without the permission', async () => {
  mockedAuth.me.mockResolvedValue(makeUser({ permissions: [] }));

  render(
    <MemoryRouter initialEntries={['/secret']}>
      <AuthProvider>
        <Routes>
          <Route
            path="/secret"
            element={
              <RequirePermission perm="users.create">
                <div>Secret content</div>
              </RequirePermission>
            }
          />
          <Route path="/403" element={<div>Forbidden</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText('Forbidden')).toBeInTheDocument();
  expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
});

test('RequirePermission allows a user with the permission', async () => {
  mockedAuth.me.mockResolvedValue(makeUser({ permissions: ['users.create'] }));

  render(
    <MemoryRouter initialEntries={['/secret']}>
      <AuthProvider>
        <Routes>
          <Route
            path="/secret"
            element={
              <RequirePermission perm="users.create">
                <div>Secret content</div>
              </RequirePermission>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText('Secret content')).toBeInTheDocument();
});

test('useAuth exposes permission and role helpers', async () => {
  mockedAuth.me.mockResolvedValue(
    makeUser({
      roles: [makeRole({ id: 1, name: 'admin', label: 'Administrator' })],
      permissions: ['books.create'],
    }),
  );

  function Inner() {
    const { hasPermission, hasRole } = useAuth();

    return (
      <>
        <div>books.create: {String(hasPermission('books.create'))}</div>
        <div>admin: {String(hasRole('admin'))}</div>
        <div>users.delete: {String(hasPermission('users.delete'))}</div>
      </>
    );
  }

  function Probe() {
    return (
      <AuthProvider>
        <Inner />
      </AuthProvider>
    );
  }

  render(
    <MemoryRouter>
      <Probe />
    </MemoryRouter>,
  );

  expect(await screen.findByText('books.create: true')).toBeInTheDocument();
  expect(screen.getByText('admin: true')).toBeInTheDocument();
  expect(screen.getByText('users.delete: false')).toBeInTheDocument();
});

test('formatDate formats per locale and handles invalid input', () => {
  expect(formatDate('2026-05-01', 'en')).toMatch(/2026/);
  // fa-IR renders the Jalali calendar, so the Gregorian year must not appear.
  expect(formatDate('2026-05-01', 'fa')).not.toMatch(/2026/);
  expect(formatDate(null, 'en')).toBe('-');
  expect(formatDate('not-a-date', 'en')).toBe('not-a-date');
  expect(formatDate('2026-05-01', 'en')).not.toBe('-');
});
