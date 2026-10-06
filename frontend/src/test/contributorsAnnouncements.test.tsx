import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { makeUser } from './fixtures';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import ContributorListPage from '@/pages/contributors/ContributorListPage';
import ContributorCreatePage from '@/pages/contributors/ContributorCreatePage';
import ContributorDetailPage from '@/pages/contributors/ContributorDetailPage';
import ContributorEditPage from '@/pages/contributors/ContributorEditPage';
import AnnouncementListPage from '@/pages/announcements/AnnouncementListPage';
import AnnouncementCreatePage from '@/pages/announcements/AnnouncementCreatePage';
import AnnouncementDetailPage from '@/pages/announcements/AnnouncementDetailPage';
import AnnouncementEditPage from '@/pages/announcements/AnnouncementEditPage';
import { contributorsApi } from '@/services/contributors';
import { announcementsApi } from '@/services/announcements';
import { booksApi } from '@/services/books';
import { mediaApi } from '@/services/media';
import { authApi } from '@/services/auth';
import type { Contributor } from '@/types/Contributor';
import type { Announcement } from '@/types/Announcement';
import { makeAnnouncement } from './fixtures';

vi.mock('@/services/contributors');
vi.mock('@/services/announcements');
vi.mock('@/services/books');
vi.mock('@/services/media');
vi.mock('@/services/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/auth')>();
  return { ...actual, authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn(), updatePassword: vi.fn() } };
});

const mockedContributors = vi.mocked(contributorsApi);
const mockedAnnouncements = vi.mocked(announcementsApi);
const mockedBooks = vi.mocked(booksApi);
const mockedMedia = vi.mocked(mediaApi);
const mockedAuth = vi.mocked(authApi);

const contributor: Contributor = {
  id: 4,
  name: 'Nima Yushij',
  slug: 'nima-yushij',
  biography: 'A poet',
  email: 'nima@example.com',
  phone: null,
  website: null,
  birth_date: null,
  nationality: 'Iranian',
  is_archived: false,
  books_count: 0,
  media: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
};

const announcement: Announcement = makeAnnouncement({
  id: 6,
  title: 'New Edition',
  slug: 'new-edition',
  type: 'New Edition',
  short_description: 'Coming soon',
  content: 'Details',
  book: { id: 2, title: 'The Persian Garden', slug: 'the-persian-garden' },
});

function renderAt(path: string, element: React.ReactNode, routePath: string) {
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
  mockedBooks.list.mockResolvedValue({ data: [{ id: 2, title: 'The Persian Garden' }] } as never);
  mockedMedia.list.mockResolvedValue({ data: [] } as never);
  mockedContributors.roles.mockResolvedValue([{ id: 1, name: 'Author', label: 'Author' }]);
  mockedAuth.me.mockResolvedValue(makeUser({ permissions: [
      'contributors.create',
      'contributors.edit',
      'contributors.archive',
      'contributors.delete',
      'announcements.create',
      'announcements.edit',
      'announcements.archive',
      'announcements.delete',
    ] }));
});

test('ContributorListPage renders contributors and searches', async () => {
  mockedContributors.list.mockResolvedValue({ data: [contributor] } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <ContributorListPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText('Nima Yushij')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Search by name'), { target: { value: 'nima' } });
  fireEvent.click(screen.getByRole('button', { name: /search/i }));

  await waitFor(() => expect(mockedContributors.list).toHaveBeenCalledWith({ q: 'nima' }));
});

test('ContributorListPage shows an empty state', async () => {
  mockedContributors.list.mockResolvedValue({ data: [] } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <ContributorListPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText(/no contributors yet/i)).toBeInTheDocument();
});

test('ContributorCreatePage submits a contributor', async () => {
  mockedContributors.create.mockResolvedValue({ id: 9 } as Contributor);

  render(
    <MemoryRouter>
      <AuthProvider>
        <ContributorCreatePage />
      </AuthProvider>
    </MemoryRouter>,
  );

  fireEvent.change(await screen.findByLabelText(/^name/i), { target: { value: 'Someone New' } });
  fireEvent.change(screen.getByLabelText(/biography/i), { target: { value: 'Bio' } });
  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'new@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

  await waitFor(() =>
    expect(mockedContributors.create).toHaveBeenCalledWith({
      name: 'Someone New',
      biography: 'Bio',
      email: 'new@example.com',
    }),
  );
});

test('ContributorEditPage loads and saves', async () => {
  mockedContributors.get.mockResolvedValue(contributor);
  mockedContributors.update.mockResolvedValue(contributor);

  renderAt('/contributors/4/edit', <ContributorEditPage />, '/contributors/:id/edit');

  const name = (await screen.findByLabelText(/^name/i)) as HTMLInputElement;
  await waitFor(() => expect(name.value).toBe('Nima Yushij'));

  fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Renamed' } });
  fireEvent.click(screen.getByRole('button', { name: /save/i }));

  await waitFor(() =>
    expect(mockedContributors.update).toHaveBeenCalledWith(4, { name: 'Renamed', biography: 'A poet' }),
  );
});

test('ContributorDetailPage renders the profile and archives', async () => {
  mockedContributors.get.mockResolvedValue(contributor);
  mockedContributors.archive.mockResolvedValue({ ...contributor, is_archived: true });
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

  renderAt('/contributors/4', <ContributorDetailPage />, '/contributors/:id');

  expect(await screen.findByRole('heading', { name: 'Nima Yushij' })).toBeInTheDocument();
  expect(screen.getByText(/A poet/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /^archive$/i }));
  await waitFor(() => expect(mockedContributors.archive).toHaveBeenCalledWith(4));

  confirmSpy.mockRestore();
});

test('ContributorDetailPage offers delete only once archived', async () => {
  mockedContributors.get.mockResolvedValue({ ...contributor, is_archived: true });
  mockedContributors.delete.mockResolvedValue({ data: null });
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

  renderAt('/contributors/4', <ContributorDetailPage />, '/contributors/:id');

  const remove = await screen.findByRole('button', { name: /^delete$/i });
  fireEvent.click(remove);

  await waitFor(() => expect(mockedContributors.delete).toHaveBeenCalledWith(4));
  confirmSpy.mockRestore();
});

test('ContributorDetailPage reports a missing contributor', async () => {
  mockedContributors.get.mockRejectedValue(new Error('404'));

  renderAt('/contributors/99', <ContributorDetailPage />, '/contributors/:id');

  expect(await screen.findByRole('alert')).toHaveTextContent(/contributor not found/i);
});

test('ContributorDetailPage attaches and detaches a photo', async () => {
  mockedContributors.get.mockResolvedValue(contributor);
  mockedMedia.attach.mockResolvedValue({});
  mockedMedia.detach.mockResolvedValue({});
  mockedMedia.list.mockResolvedValue({
    data: [{ id: 8, file_name: 'portrait.jpg', mime_type: 'image/jpeg', size: 1, width: 1, height: 1, url: '/x', alt_text: null, caption: null, description: null, is_archived: false, uploaded_by: null, created_at: '', updated_at: '' }],
  } as never);
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

  renderAt('/contributors/4', <ContributorDetailPage />, '/contributors/:id');

  await screen.findByRole('heading', { name: 'Nima Yushij' });
  expect(screen.getByText(/no photo attached/i)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Select media'), { target: { value: '8' } });
  fireEvent.click(screen.getByRole('button', { name: /attach as person photo/i }));

  await waitFor(() => expect(mockedMedia.attach).toHaveBeenCalledWith('contributors', 4, 8, 'Person Photo'));

  confirmSpy.mockRestore();
});

test('AnnouncementListPage renders announcements and searches', async () => {
  mockedAnnouncements.list.mockResolvedValue({ data: [announcement] } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <AnnouncementListPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  const viewLink = await screen.findByRole('link', { name: 'View' });
  expect(viewLink).toHaveAttribute('href', '/announcements/6');
  expect(screen.getAllByRole('cell', { name: 'New Edition' }).length).toBeGreaterThan(0);
  expect(screen.getByRole('cell', { name: 'Draft' })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Announcements'), { target: { value: 'edition' } });
  fireEvent.click(screen.getByRole('button', { name: /search/i }));

  await waitFor(() => expect(mockedAnnouncements.list).toHaveBeenCalledWith({ q: 'edition' }));
});

test('AnnouncementListPage shows an empty state', async () => {
  mockedAnnouncements.list.mockResolvedValue({ data: [] } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <AnnouncementListPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText(/no announcements yet/i)).toBeInTheDocument();
});

test('AnnouncementCreatePage submits an announcement', async () => {
  mockedAnnouncements.create.mockResolvedValue({ id: 7 } as Announcement);

  render(
    <MemoryRouter>
      <AuthProvider>
        <AnnouncementCreatePage />
      </AuthProvider>
    </MemoryRouter>,
  );

  fireEvent.change(await screen.findByLabelText(/^name/i), { target: { value: 'Launch' } });
  fireEvent.change(screen.getByLabelText(/short description/i), { target: { value: 'Short' } });
  fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

  await waitFor(() =>
    expect(mockedAnnouncements.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Launch', short_description: 'Short', type: 'News', status: 'Draft' }),
    ),
  );
});

test('AnnouncementCreatePage requires a book for the New Book type', async () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <AnnouncementCreatePage />
      </AuthProvider>
    </MemoryRouter>,
  );

  fireEvent.change(await screen.findByLabelText(/^type/i), { target: { value: 'New Book' } });

  expect(screen.getByLabelText(/^book/i)).toBeRequired();
  expect(screen.getByText(/required: select a book/i)).toBeInTheDocument();
});

test('AnnouncementCreatePage explains the rules for Reprint and New Edition', async () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <AnnouncementCreatePage />
      </AuthProvider>
    </MemoryRouter>,
  );

  fireEvent.change(await screen.findByLabelText(/^type/i), { target: { value: 'Reprint' } });
  expect(screen.getByText(/must be Published or Scheduled/i)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/^type/i), { target: { value: 'New Edition' } });
  expect(screen.getByText(/must have an edition and a publication date/i)).toBeInTheDocument();
});

test('AnnouncementEditPage loads the announcement and saves it', async () => {
  mockedAnnouncements.get.mockResolvedValue(announcement);
  mockedAnnouncements.update.mockResolvedValue(announcement);

  renderAt('/announcements/6/edit', <AnnouncementEditPage />, '/announcements/:id/edit');

  const title = (await screen.findByLabelText(/^name/i)) as HTMLInputElement;
  await waitFor(() => expect(title.value).toBe('New Edition'));

  fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Renamed' } });
  fireEvent.click(screen.getByRole('button', { name: /save/i }));

  await waitFor(() =>
    expect(mockedAnnouncements.update).toHaveBeenCalledWith(6, expect.objectContaining({ title: 'Renamed' })),
  );
});

test('AnnouncementDetailPage renders the announcement and links the book', async () => {
  mockedAnnouncements.get.mockResolvedValue(announcement);
  mockedMedia.attach.mockResolvedValue({});

  renderAt('/announcements/6', <AnnouncementDetailPage />, '/announcements/:id');

  expect(await screen.findByRole('heading', { name: 'New Edition' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'The Persian Garden' })).toHaveAttribute('href', '/books/2');
  expect(screen.getByText(/no announcement image attached/i)).toBeInTheDocument();
});

test('AnnouncementDetailPage attaches an image', async () => {
  mockedAnnouncements.get.mockResolvedValue(announcement);
  mockedMedia.attach.mockResolvedValue({});
  mockedMedia.list.mockResolvedValue({
    data: [{ id: 9, file_name: 'news.jpg', mime_type: 'image/jpeg', size: 1, width: 1, height: 1, url: '/y', alt_text: null, caption: null, description: null, is_archived: false, uploaded_by: null, created_at: '', updated_at: '' }],
  } as never);

  renderAt('/announcements/6', <AnnouncementDetailPage />, '/announcements/:id');

  await screen.findByRole('heading', { name: 'New Edition' });

  fireEvent.change(screen.getByLabelText('Library image'), { target: { value: '9' } });
  fireEvent.click(screen.getByRole('button', { name: /attach as announcement image/i }));

  await waitFor(() => expect(mockedMedia.attach).toHaveBeenCalledWith('announcements', 6, 9, 'Announcement Image'));
});

test('AnnouncementDetailPage reports a missing announcement', async () => {
  mockedAnnouncements.get.mockRejectedValue(new Error('404'));

  renderAt('/announcements/99', <AnnouncementDetailPage />, '/announcements/:id');

  expect(await screen.findByRole('alert')).toHaveTextContent(/announcement not found/i);
});
