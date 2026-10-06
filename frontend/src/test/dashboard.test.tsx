import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { AdminLayout } from '@/layouts/AdminLayout';
import Home from '@/pages/Home';
import { authApi } from '@/services/auth';
import { api } from '@/services/api';
import { booksApi } from '@/services/books';
import { contributorsApi } from '@/services/contributors';
import { mediaApi } from '@/services/media';
import { announcementsApi } from '@/services/announcements';
import { makeUser, paginated } from './fixtures';

vi.mock('@/services/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/auth')>();
  return { ...actual, authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn(), updatePassword: vi.fn() } };
});

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

vi.mock('@/services/books');
vi.mock('@/services/contributors');
vi.mock('@/services/media');
vi.mock('@/services/announcements');

const mockedApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: { status: 'ok' } } as never);
  vi.mocked(authApi.me).mockResolvedValue(
    makeUser({ permissions: ['books.create', 'contributors.create', 'media.upload', 'announcements.create'] }),
  );
  vi.mocked(booksApi.list).mockResolvedValue(paginated([]));
  vi.mocked(contributorsApi.list).mockResolvedValue(paginated([]));
  vi.mocked(mediaApi.list).mockResolvedValue(paginated([]));
  vi.mocked(announcementsApi.list).mockResolvedValue(paginated([]));
});

function renderShell(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/books" element={<div>Books page</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test('the sidebar renders the navigation for permitted areas', async () => {
  renderShell();

  const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
  expect(nav).toBeInTheDocument();

  expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Books' })).toHaveAttribute('href', '/books');
  expect(screen.getByRole('link', { name: 'Contributors' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
});

test('the sidebar marks the current route as active', async () => {
  renderShell('/books');

  const active = await screen.findByRole('link', { name: 'Books' });
  expect(active.className).toContain('sidebar__link--active');

  expect(screen.getByRole('link', { name: 'Dashboard' }).className).not.toContain('sidebar__link--active');
});

test('the brand is shown in the sidebar', async () => {
  renderShell();

  expect(await screen.findByText('Dar Al-Ajneha')).toBeInTheDocument();
});

test('the mobile toggle reports and updates its expanded state', async () => {
  renderShell();

  const toggle = await screen.findByRole('button', { name: 'Toggle navigation' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');

  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('the dashboard shows a card per collection with its total', async () => {
  vi.mocked(booksApi.list).mockResolvedValue(paginated([]));
  vi.mocked(contributorsApi.list).mockResolvedValue(paginated([]));
  vi.mocked(mediaApi.list).mockResolvedValue(paginated([]));
  vi.mocked(announcementsApi.list).mockResolvedValue(paginated([]));

  // Totals come from pagination metadata, not the returned page.
  vi.mocked(booksApi.list).mockResolvedValue({ data: [], meta: { page: 1, per_page: 1, total: 42, last_page: 42 } });
  vi.mocked(contributorsApi.list).mockResolvedValue({ data: [], meta: { page: 1, per_page: 1, total: 7, last_page: 7 } });

  renderShell();

  expect(await screen.findByText('42')).toBeInTheDocument();
  expect(screen.getByText('7')).toBeInTheDocument();

  // A single row is requested per collection, not the whole table.
  expect(booksApi.list).toHaveBeenCalledWith({ per_page: 1 });
  expect(contributorsApi.list).toHaveBeenCalledWith({ per_page: 1 });
  expect(mediaApi.list).toHaveBeenCalledWith({ per_page: 1 });
  expect(announcementsApi.list).toHaveBeenCalledWith({ per_page: 1 });
});

test('each dashboard card links to its section', async () => {
  renderShell();

  const card = await screen.findByRole('link', { name: /books/i });
  expect(card).toHaveAttribute('href', '/books');
});

test('a failed count leaves the card blank instead of breaking the dashboard', async () => {
  vi.mocked(booksApi.list).mockRejectedValue(new Error('500'));

  renderShell();

  // The health line still renders and the other cards still load.
  expect(await screen.findByText(/api status: online/i)).toBeInTheDocument();
  await waitFor(() => expect(contributorsApi.list).toHaveBeenCalled());
});

test('the dashboard reports an unreachable API', async () => {
  mockedApi.get.mockRejectedValue(new Error('down'));

  renderShell();

  expect(await screen.findByText(/api status: unreachable/i)).toBeInTheDocument();
});
