import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import BookListPage from '@/pages/books/BookListPage';
import BookCreatePage from '@/pages/books/BookCreatePage';
import BookDetailPage from '@/pages/books/BookDetailPage';

test('BookListPage renders loading state', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <BookListPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText(/loading books/i)).toBeInTheDocument();
});

test('BookCreatePage renders title field', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <BookCreatePage />
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByLabelText(/^title/i)).toBeInTheDocument();
});

test('BookDetailPage renders loading state', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <BookDetailPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText(/loading book/i)).toBeInTheDocument();
});
