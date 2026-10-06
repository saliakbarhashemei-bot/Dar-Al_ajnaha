import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import MediaLibraryPage from '@/pages/media/MediaLibraryPage';
import MediaUploadPage from '@/pages/media/MediaUploadPage';
import BookDetailPage from '@/pages/books/BookDetailPage';

test('MediaLibraryPage renders loading state', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <MediaLibraryPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText(/loading media/i)).toBeInTheDocument();
});

test('MediaUploader rejects wrong MIME client-side', async () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <MediaUploadPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  const fileInput = screen.getByLabelText(/choose files/i) as HTMLInputElement;
  const badFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
  fireEvent.change(fileInput, { target: { files: [badFile] } });
  fireEvent.click(screen.getByRole('button', { name: /upload/i }));
  expect(await screen.findByText(/not allowed for Book Cover/i)).toBeInTheDocument();
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

test('MediaDetailPage renders loading state', async () => {
  const MediaDetailPage = (await import('@/pages/media/MediaDetailPage')).default;
  render(
    <MemoryRouter>
      <AuthProvider>
        <MediaDetailPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText(/loading media/i)).toBeInTheDocument();
});
