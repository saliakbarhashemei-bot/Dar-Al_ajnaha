import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import RoleListPage from '@/pages/roles/RoleListPage';
import RoleCreatePage from '@/pages/roles/RoleCreatePage';
import RoleDetailPage from '@/pages/roles/RoleDetailPage';
import RoleEditPage from '@/pages/roles/RoleEditPage';
import { rolesApi } from '@/services/roles';
import { permissionsApi } from '@/services/permissions';
import type { Role } from '@/types/User';
import { makePermission, makeRole } from './fixtures';

vi.mock('@/services/roles');
vi.mock('@/services/permissions');

const mockedRoles = vi.mocked(rolesApi);
const mockedPermissions = vi.mocked(permissionsApi);

const role: Role = makeRole({ id: 2, name: 'editor', label: 'Editor', permissions: [makePermission()] });

function renderAt(path: string, element: React.ReactNode, routePath = '/roles/:id') {
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
  mockedPermissions.list.mockResolvedValue({ data: [] } as never);
});

test('RoleListPage renders the roles table', async () => {
  mockedRoles.list.mockResolvedValue({ data: [role] } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <RoleListPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: 'Roles' })).toBeInTheDocument();
  expect(screen.getByText('editor')).toBeInTheDocument();
  expect(screen.getByText('Editor')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', '/roles/2');
});

test('RoleListPage shows an empty state', async () => {
  mockedRoles.list.mockResolvedValue({ data: [] } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <RoleListPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText(/no roles yet/i)).toBeInTheDocument();
});

test('RoleListPage reports a load failure', async () => {
  mockedRoles.list.mockRejectedValue(new Error('boom'));

  render(
    <MemoryRouter>
      <AuthProvider>
        <RoleListPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load roles/i);
});

test('RoleCreatePage submits a new role', async () => {
  mockedRoles.create.mockResolvedValue({ id: 3 } as Role);

  render(
    <MemoryRouter>
      <AuthProvider>
        <RoleCreatePage />
      </AuthProvider>
    </MemoryRouter>,
  );

  fireEvent.change(await screen.findByLabelText(/^name/i), { target: { value: 'editor' } });
  fireEvent.change(screen.getByLabelText(/^label/i), { target: { value: 'Editor' } });
  fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

  await waitFor(() => expect(mockedRoles.create).toHaveBeenCalledWith({ name: 'editor', label: 'Editor' }));
});

test('RoleCreatePage surfaces the API error message', async () => {
  mockedRoles.create.mockRejectedValue({ type: 'validation', errors: { name: ['The name has already been taken.'] } });

  render(
    <MemoryRouter>
      <AuthProvider>
        <RoleCreatePage />
      </AuthProvider>
    </MemoryRouter>,
  );

  fireEvent.change(await screen.findByLabelText(/^name/i), { target: { value: 'editor' } });
  fireEvent.change(screen.getByLabelText(/^label/i), { target: { value: 'Editor' } });
  fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/already been taken/i);
});

test('RoleDetailPage renders the role and its permissions', async () => {
  mockedRoles.get.mockResolvedValue(role);

  renderAt('/roles/2', <RoleDetailPage />);

  expect(await screen.findByRole('heading', { name: 'Editor' })).toBeInTheDocument();
  expect(screen.getByText('Create Book')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /edit/i })).toHaveAttribute('href', '/roles/2/edit');
});

test('RoleDetailPage reports a missing role', async () => {
  mockedRoles.get.mockRejectedValue(new Error('404'));

  renderAt('/roles/99', <RoleDetailPage />);

  expect(await screen.findByRole('alert')).toHaveTextContent(/role not found/i);
});

test('RoleEditPage saves the role and its permission set', async () => {
  mockedRoles.get.mockResolvedValue(role);
  mockedRoles.update.mockResolvedValue(role);
  mockedRoles.updatePermissions.mockResolvedValue(role);
  mockedPermissions.list.mockResolvedValue({
    data: [
      { id: 1, name: 'books.create', label: 'Create Book' },
      { id: 2, name: 'books.edit', label: 'Edit Book' },
    ],
  } as never);

  renderAt('/roles/2/edit', <RoleEditPage />, '/roles/:id/edit');

  const editBook = await screen.findByLabelText('Edit Book');

  fireEvent.click(editBook);
  fireEvent.click(screen.getByRole('button', { name: /save/i }));

  await waitFor(() => expect(mockedRoles.update).toHaveBeenCalledWith(2, { name: 'editor', label: 'Editor' }));
  expect(mockedRoles.updatePermissions).toHaveBeenCalledWith(2, [1, 2]);
});

test('RoleEditPage unchecks a permission', async () => {
  mockedRoles.get.mockResolvedValue(role);
  mockedRoles.update.mockResolvedValue(role);
  mockedRoles.updatePermissions.mockResolvedValue(role);
  mockedPermissions.list.mockResolvedValue({
    data: [{ id: 1, name: 'books.create', label: 'Create Book' }],
  } as never);

  renderAt('/roles/2/edit', <RoleEditPage />, '/roles/:id/edit');

  fireEvent.click(await screen.findByLabelText('Create Book'));
  fireEvent.click(screen.getByRole('button', { name: /save/i }));

  await waitFor(() => expect(mockedRoles.updatePermissions).toHaveBeenCalledWith(2, []));
});
