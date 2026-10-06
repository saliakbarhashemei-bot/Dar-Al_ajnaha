import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import UserCreatePage from '@/pages/users/UserCreatePage';
import UserDetailPage from '@/pages/users/UserDetailPage';
import UserEditPage from '@/pages/users/UserEditPage';
import { usersApi } from '@/services/users';
import { rolesApi } from '@/services/roles';
import { makeRole, makeUser, paginated } from './fixtures';
import type { User } from '@/types/User';

vi.mock('@/services/users');
vi.mock('@/services/roles');

const mockedUsers = vi.mocked(usersApi);
const mockedRoles = vi.mocked(rolesApi);

const user: User = makeUser({
  id: 7,
  name: 'Simin Behbahani',
  email: 'simin@example.com',
  last_login_at: '2026-03-04T10:00:00Z',
  roles: [makeRole({ id: 1, name: 'admin', label: 'Administrator' })],
  permissions: ['users.create'],
});

function renderAt(path: string, element: React.ReactNode, routePath = '/users/:id') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path={routePath} element={element} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedRoles.list.mockResolvedValue(paginated([makeRole()]));
});

test('UserCreatePage lists roles and creates a user', async () => {
  mockedUsers.create.mockResolvedValue({ id: 9 } as User);

  render(
    <MemoryRouter>
      <AuthProvider>
        <UserCreatePage />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByLabelText('Administrator')).toBeInTheDocument();

  const { fireEvent } = await import('@testing-library/react');
  fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'New Person' } });
  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
  fireEvent.change(screen.getByLabelText(/^confirm password/i), { target: { value: 'password123' } });
  fireEvent.click(screen.getByLabelText('Administrator'));
  fireEvent.click(screen.getByRole('button', { name: /create/i }));

  await waitFor(() => expect(mockedUsers.create).toHaveBeenCalled());
  expect(mockedUsers.create).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'New Person',
      email: 'new@example.com',
      role_ids: [1],
    }),
  );
});

test('UserCreatePage shows a translated validation error', async () => {
  mockedUsers.create.mockRejectedValue({ type: 'validation', errors: { email: ['The email has already been taken.'] } });

  render(
    <MemoryRouter>
      <AuthProvider>
        <UserCreatePage />
      </AuthProvider>
    </MemoryRouter>,
  );

  const { fireEvent } = await import('@testing-library/react');
  fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'X' } });
  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'taken@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
  fireEvent.change(screen.getByLabelText(/^confirm password/i), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: /create/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/already been taken/i);
});

test('UserDetailPage renders the profile and roles', async () => {
  mockedUsers.get.mockResolvedValue(user);

  renderAt('/users/7', <UserDetailPage />);

  expect(await screen.findByRole('heading', { name: 'Simin Behbahani' })).toBeInTheDocument();
  expect(screen.getByText(/simin@example\.com/)).toBeInTheDocument();
  expect(screen.getByText('Administrator')).toBeInTheDocument();
  expect(mockedUsers.get).toHaveBeenCalledWith(7);
});

test('UserDetailPage reports a missing user', async () => {
  mockedUsers.get.mockRejectedValue(new Error('404'));

  renderAt('/users/999', <UserDetailPage />);

  expect(await screen.findByRole('alert')).toHaveTextContent(/user not found/i);
});

test('UserEditPage loads the user and saves changes', async () => {
  mockedUsers.get.mockResolvedValue(user);
  mockedUsers.update.mockResolvedValue(user);

  renderAt('/users/7/edit', <UserEditPage />, '/users/:id/edit');

  const nameInput = (await screen.findByLabelText(/^name/i)) as HTMLInputElement;
  await waitFor(() => expect(nameInput.value).toBe('Simin Behbahani'));

  const { fireEvent } = await import('@testing-library/react');
  fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Renamed' } });
  fireEvent.click(screen.getByRole('button', { name: /save/i }));

  await waitFor(() => expect(mockedUsers.update).toHaveBeenCalledWith(7, expect.objectContaining({ name: 'Renamed' })));
});

test('UserEditPage omits the password when it is left blank', async () => {
  mockedUsers.get.mockResolvedValue(user);
  mockedUsers.update.mockResolvedValue(user);

  renderAt('/users/7/edit', <UserEditPage />, '/users/:id/edit');

  await screen.findByLabelText(/^name/i);

  const { fireEvent } = await import('@testing-library/react');
  fireEvent.click(screen.getByRole('button', { name: /save/i }));

  await waitFor(() => expect(mockedUsers.update).toHaveBeenCalled());
  const payload = mockedUsers.update.mock.calls[0]?.[1] as Record<string, unknown>;
  expect(payload).not.toHaveProperty('password');
});
