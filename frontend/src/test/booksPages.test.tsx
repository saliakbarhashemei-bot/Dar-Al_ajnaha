import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import BookEditPage from '@/pages/books/BookEditPage';
import BookCreatePage from '@/pages/books/BookCreatePage';
import BookListPage from '@/pages/books/BookListPage';
import BookDetailPage from '@/pages/books/BookDetailPage';
import { booksApi, bookCategoriesApi, tagsApi } from '@/services/books';
import { contributorsApi } from '@/services/contributors';
import { mediaApi } from '@/services/media';
import type { Book } from '@/types/Book';
import { makeUser } from './fixtures';

vi.mock('@/services/books');
vi.mock('@/services/contributors');
vi.mock('@/services/media');
vi.mock('@/services/auth', () => ({
  authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn(), updatePassword: vi.fn() },
  ensureCsrfCookie: vi.fn(),
}));

const mockedBooks = vi.mocked(booksApi);
const mockedCategories = vi.mocked(bookCategoriesApi);
const mockedTags = vi.mocked(tagsApi);
const mockedContributors = vi.mocked(contributorsApi);
const mockedMedia = vi.mocked(mediaApi);
const { authApi } = await import('@/services/auth');

const book: Book = {
  id: 2,
  title: 'The Persian Garden',
  slug: 'the-persian-garden',
  isbn: '978-3-16-148410-0',
  description: 'A description',
  page_count: 220,
  language: 'fa',
  publication_date: '2026-05-01',
  publisher: 'Dar Al-Ajneha',
  edition: '2nd',
  status: 'Published',
  is_archived: false,
  category: { id: 1, name: 'poetry', label: 'Poetry' },
  genre: null,
  tags: [{ id: 1, name: 'garden', label: 'Garden' }],
  contributors: [
    {
      role_id: 1,
      role_name: 'Author',
      role_label: 'Author',
      people: [{ id: 3, name: 'Forough Farrokhzad', slug: 'forough' }],
    },
  ],
  contributors_count: 1,
  media: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

function renderAt(path: string, element: React.ReactNode, routePath = '/books/:id') {
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
  mockedCategories.list.mockResolvedValue([{ id: 1, name: 'poetry', label: 'Poetry' }]);
  mockedTags.list.mockResolvedValue([{ id: 1, name: 'garden', label: 'Garden' }]);
  mockedContributors.list.mockResolvedValue({ data: [] } as never);
  mockedContributors.roles.mockResolvedValue([{ id: 1, name: 'Author', label: 'Author' }]);
  mockedMedia.list.mockResolvedValue({ data: [] } as never);
  vi.mocked(authApi.me).mockResolvedValue(
    makeUser({ permissions: ['books.create', 'books.edit', 'books.archive', 'books.delete'] }),
  );
});

test('BookEditPage loads the book and saves the form', async () => {
  mockedBooks.get.mockResolvedValue(book);
  mockedBooks.update.mockResolvedValue({ ...book, title: 'Renamed' });

  renderAt('/books/2/edit', <BookEditPage />, '/books/:id/edit');

  const title = (await screen.findByLabelText(/^title/i)) as HTMLInputElement;
  await waitFor(() => expect(title.value).toBe('The Persian Garden'));

  expect((screen.getByLabelText(/^isbn/i) as HTMLInputElement).value).toBe('978-3-16-148410-0');
  expect((screen.getByLabelText(/^category/i) as HTMLSelectElement).value).toBe('1');
  expect((screen.getByLabelText('Garden') as HTMLInputElement).checked).toBe(true);

  fireEvent.change(screen.getByLabelText(/^title/i), { target: { value: 'Renamed' } });
  fireEvent.click(screen.getByRole('button', { name: /save/i }));

  await waitFor(() =>
    expect(mockedBooks.update).toHaveBeenCalledWith(2, expect.objectContaining({ title: 'Renamed', status: 'Published' })),
  );
});

test('BookEditPage unselects a tag and saves', async () => {
  mockedBooks.get.mockResolvedValue(book);
  mockedBooks.update.mockResolvedValue(book);

  renderAt('/books/2/edit', <BookEditPage />, '/books/:id/edit');

  await screen.findByLabelText(/^title/i);

  fireEvent.click(screen.getByLabelText('Garden'));
  fireEvent.click(screen.getByRole('button', { name: /save/i }));

  await waitFor(() => expect(mockedBooks.update).toHaveBeenCalledWith(2, expect.objectContaining({ tag_ids: [] })));
});

test('BookEditPage reports a missing book', async () => {
  mockedBooks.get.mockRejectedValue(new Error('404'));

  renderAt('/books/99/edit', <BookEditPage />, '/books/:id/edit');

  expect(await screen.findByRole('alert')).toHaveTextContent(/book not found/i);
});

test('BookCreatePage submits a new book with category and tags', async () => {
  mockedBooks.create.mockResolvedValue({ id: 5 } as Book);

  render(
    <MemoryRouter>
      <AuthProvider>
        <BookCreatePage />
      </AuthProvider>
    </MemoryRouter>,
  );

  fireEvent.change(await screen.findByLabelText(/^title/i), { target: { value: 'New Book' } });
  fireEvent.change(screen.getByLabelText(/^isbn/i), { target: { value: '978-3-16-148410-0' } });
  fireEvent.change(screen.getByLabelText(/^category/i), { target: { value: '1' } });
  fireEvent.click(screen.getByLabelText('Garden'));
  fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

  await waitFor(() => expect(mockedBooks.create).toHaveBeenCalled());
  expect(mockedBooks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'New Book',
      status: 'Draft',
      book_category_id: 1,
      tag_ids: [1],
    }),
  );
});

test('BookCreatePage adds and removes contributor rows', async () => {
  mockedBooks.create.mockResolvedValue({ id: 5 } as Book);
  mockedContributors.list.mockResolvedValue({ data: [{ id: 3, name: 'Forough', slug: 'forough' }] } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <BookCreatePage />
      </AuthProvider>
    </MemoryRouter>,
  );

  fireEvent.click(await screen.findByRole('button', { name: /add contributor/i }));
  fireEvent.change(screen.getByLabelText('Select contributor 1'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Select role 1'), { target: { value: '1' } });

  fireEvent.click(screen.getByRole('button', { name: /remove/i }));
  expect(screen.queryByLabelText('Select contributor 1')).not.toBeInTheDocument();
});

test('BookListPage renders rows and a search term is applied', async () => {
  mockedBooks.list.mockResolvedValue({ data: [book] } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <BookListPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: 'Books' })).toBeInTheDocument();
  expect(screen.getByText('The Persian Garden')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Search by title, ISBN'), { target: { value: 'garden' } });
  fireEvent.click(screen.getByRole('button', { name: /search/i }));

  await waitFor(() => expect(mockedBooks.list).toHaveBeenCalledWith({ q: 'garden' }));
});

test('BookListPage shows an empty state', async () => {
  mockedBooks.list.mockResolvedValue({ data: [] } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <BookListPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText(/no books yet/i)).toBeInTheDocument();
});

test('BookDetailPage renders the book with grouped contributors', async () => {
  mockedBooks.get.mockResolvedValue(book);

  renderAt('/books/2', <BookDetailPage />);

  expect(await screen.findByRole('heading', { name: 'The Persian Garden' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Forough Farrokhzad' })).toHaveAttribute('href', '/contributors/3');
  expect(screen.getByText('Author (1)')).toBeInTheDocument();
  expect(screen.getByText(/Poetry/)).toBeInTheDocument();
  expect(screen.getByText(/Tags:.*Garden/)).toBeInTheDocument();
});

test('BookDetailPage attaches a contributor', async () => {
  mockedBooks.get.mockResolvedValue(book);
  mockedBooks.attachContributor.mockResolvedValue({});
  mockedContributors.list.mockResolvedValue({ data: [{ id: 3, name: 'Forough', slug: 'forough' }] } as never);

  renderAt('/books/2', <BookDetailPage />);

  await screen.findByRole('heading', { name: 'The Persian Garden' });

  fireEvent.change(screen.getByLabelText('Select contributor'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Select role'), { target: { value: '1' } });
  fireEvent.click(screen.getAllByRole('button', { name: /^attach$/i })[0]!);

  await waitFor(() => expect(mockedBooks.attachContributor).toHaveBeenCalledWith(2, 3, 1));
});

test('BookDetailPage detaches a contributor after confirmation', async () => {
  mockedBooks.get.mockResolvedValue(book);
  mockedBooks.detachContributor.mockResolvedValue({});
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

  renderAt('/books/2', <BookDetailPage />);

  await screen.findByRole('heading', { name: 'The Persian Garden' });
  fireEvent.click(screen.getAllByRole('button', { name: /^remove$/i })[0]!);

  await waitFor(() => expect(mockedBooks.detachContributor).toHaveBeenCalledWith(2, 3, 1));
  confirmSpy.mockRestore();
});

test('BookDetailPage attaches and detaches media', async () => {
  mockedBooks.get.mockResolvedValue(book);
  mockedMedia.attach.mockResolvedValue({});
  mockedMedia.detach.mockResolvedValue({});
  mockedMedia.list.mockResolvedValue({
    data: [{ id: 8, file_name: 'cover.jpg', mime_type: 'image/jpeg', size: 1, width: 1, height: 1, url: '/x', alt_text: null, caption: null, description: null, is_archived: false, uploaded_by: null, created_at: '', updated_at: '' }],
  } as never);
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

  renderAt('/books/2', <BookDetailPage />);

  await screen.findByRole('heading', { name: 'The Persian Garden' });

  fireEvent.change(screen.getByLabelText('Library media'), { target: { value: '8' } });
  fireEvent.change(screen.getByLabelText('Media type'), { target: { value: 'Document' } });
  fireEvent.click(screen.getAllByRole('button', { name: /^attach$/i })[1]!);

  await waitFor(() => expect(mockedMedia.attach).toHaveBeenCalledWith('books', 2, 8, 'Document'));
  confirmSpy.mockRestore();
});

test('BookDetailPage shows the no-contributors state', async () => {
  mockedBooks.get.mockResolvedValue({ ...book, contributors: [], media: [] });

  renderAt('/books/2', <BookDetailPage />);

  expect(await screen.findByText(/no contributors linked yet/i)).toBeInTheDocument();
  expect(screen.getByText(/no book cover attached/i)).toBeInTheDocument();
  expect(screen.getByText(/no document attached/i)).toBeInTheDocument();
});

test('BookDetailPage archives and reports a failure', async () => {
  mockedBooks.get.mockResolvedValue(book);
  mockedBooks.archive.mockRejectedValue(new Error('500'));
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

  renderAt('/books/2', <BookDetailPage />);

  await screen.findByRole('heading', { name: 'The Persian Garden' });
  fireEvent.click(screen.getByRole('button', { name: /^archive$/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/failed to archive book/i);
  confirmSpy.mockRestore();
});
