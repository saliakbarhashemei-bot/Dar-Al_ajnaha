import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import MediaLibraryPage from '@/pages/media/MediaLibraryPage';
import MediaUploadPage from '@/pages/media/MediaUploadPage';
import MediaDetailPage from '@/pages/media/MediaDetailPage';
import MediaEditPage from '@/pages/media/MediaEditPage';
import { mediaApi } from '@/services/media';
import type { Media } from '@/types/Media';
import { makeUser } from './fixtures';

vi.mock('@/services/media');
vi.mock('@/services/auth', () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    updatePassword: vi.fn(),
  },
  ensureCsrfCookie: vi.fn(),
}));

const mockedMedia = vi.mocked(mediaApi);
const { authApi } = await import('@/services/auth');

const image: Media = {
  id: 3,
  file_name: 'cover.jpg',
  mime_type: 'image/jpeg',
  size: 2048,
  width: 800,
  height: 1200,
  url: '/api/v1/media/3/file',
  alt_text: 'A cover',
  caption: null,
  description: null,
  is_archived: false,
  uploaded_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const document: Media = {
  ...image,
  id: 4,
  file_name: 'manuscript.pdf',
  mime_type: 'application/pdf',
  width: null,
  height: null,
  url: '/api/v1/media/4/file',
};

function renderAt(path: string, element: React.ReactNode, routePath = '/media/:id') {
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
  mockedMedia.attachments.mockResolvedValue([]);
  // An admin session so the permission-gated actions are enabled.
  vi.mocked(authApi.me).mockResolvedValue(
    makeUser({
      permissions: ['media.upload', 'media.edit', 'media.replace', 'media.archive', 'media.delete'],
    }),
  );
});

test('MediaLibraryPage renders a grid with images and documents', async () => {
  mockedMedia.list.mockResolvedValue({ data: [image, document] } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <MediaLibraryPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: 'Media Library' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'A cover' })).toBeInTheDocument();
  expect(screen.getByText('Document icon')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'cover.jpg' })).toHaveAttribute('href', '/media/3');
});

test('MediaLibraryPage filters by the search term', async () => {
  mockedMedia.list.mockResolvedValue({ data: [] } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <MediaLibraryPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  await screen.findByRole('heading', { name: 'Media Library' });

  fireEvent.change(screen.getByLabelText('Media Library'), { target: { value: 'cover' } });
  fireEvent.click(screen.getByRole('button', { name: /filter/i }));

  await waitFor(() => expect(mockedMedia.list).toHaveBeenCalledWith(expect.objectContaining({ q: 'cover' })));
});

test('MediaLibraryPage shows an empty state', async () => {
  mockedMedia.list.mockResolvedValue({ data: [] } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <MediaLibraryPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText(/no media yet/i)).toBeInTheDocument();
});

test('MediaLibraryPage reports a load failure', async () => {
  mockedMedia.list.mockRejectedValue(new Error('boom'));

  render(
    <MemoryRouter>
      <AuthProvider>
        <MediaLibraryPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load media/i);
});

test('MediaUploadPage renders the uploader', async () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <MediaUploadPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: 'Upload Media' })).toBeInTheDocument();
  expect(screen.getByLabelText('Choose files')).toBeInTheDocument();
  expect(screen.getByLabelText('Media type')).toBeInTheDocument();
});

test('MediaDetailPage renders metadata and the download link for documents', async () => {
  mockedMedia.get.mockResolvedValue(document);

  renderAt('/media/4', <MediaDetailPage />);

  expect(await screen.findByRole('heading', { name: 'manuscript.pdf' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Download file' })).toHaveAttribute('href', '/api/v1/media/4/file');
  expect(screen.getByText(/application\/pdf/)).toBeInTheDocument();
});

test('MediaDetailPage shows the dimensions for images', async () => {
  mockedMedia.get.mockResolvedValue(image);

  renderAt('/media/3', <MediaDetailPage />);

  expect(await screen.findByText(/800x1200px/)).toBeInTheDocument();
});

test('MediaDetailPage lists attachments', async () => {
  mockedMedia.get.mockResolvedValue(image);
  mockedMedia.attachments.mockResolvedValue([
    { id: 1, mediable_type: 'Book', mediable_id: 5, media_type: 'Book Cover', title: 'A Book', link: '/books/5' },
  ] as never);

  renderAt('/media/3', <MediaDetailPage />);

  expect(await screen.findByRole('link', { name: 'A Book' })).toHaveAttribute('href', '/books/5');
  expect(mockedMedia.attachments).toHaveBeenCalledWith(3);
});

test('MediaDetailPage reports a missing file', async () => {
  mockedMedia.get.mockRejectedValue(new Error('404'));

  renderAt('/media/99', <MediaDetailPage />);

  expect(await screen.findByRole('alert')).toHaveTextContent(/media not found/i);
});

test('MediaDetailPage archives on confirmation', async () => {
  mockedMedia.get.mockResolvedValue(image);
  mockedMedia.archive.mockResolvedValue({ ...image, is_archived: true });
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

  renderAt('/media/3', <MediaDetailPage />);

  fireEvent.click(await screen.findByRole('button', { name: /^archive$/i }));

  await waitFor(() => expect(mockedMedia.archive).toHaveBeenCalledWith(3));
  confirmSpy.mockRestore();
});

test('MediaDetailPage does not archive when the confirmation is declined', async () => {
  mockedMedia.get.mockResolvedValue(image);
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

  renderAt('/media/3', <MediaDetailPage />);

  fireEvent.click(await screen.findByRole('button', { name: /^archive$/i }));

  expect(mockedMedia.archive).not.toHaveBeenCalled();
  confirmSpy.mockRestore();
});

test('MediaEditPage saves metadata', async () => {
  mockedMedia.get.mockResolvedValue(image);
  mockedMedia.update.mockResolvedValue({ ...image, alt_text: 'New alt' });

  renderAt('/media/3/edit', <MediaEditPage />, '/media/:id/edit');

  const alt = (await screen.findByLabelText(/alt text/i)) as HTMLInputElement;
  await waitFor(() => expect(alt.value).toBe('A cover'));

  fireEvent.change(screen.getByLabelText(/alt text/i), { target: { value: 'New alt' } });
  fireEvent.click(screen.getByRole('button', { name: /save/i }));

  await waitFor(() => expect(mockedMedia.update).toHaveBeenCalledWith(3, expect.objectContaining({ alt_text: 'New alt' })));
});

test('MediaEditPage reports a load failure', async () => {
  mockedMedia.get.mockRejectedValue(new Error('404'));

  renderAt('/media/99/edit', <MediaEditPage />, '/media/:id/edit');

  expect(await screen.findByRole('alert')).toHaveTextContent(/media not found/i);
});
