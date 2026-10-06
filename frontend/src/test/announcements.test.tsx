import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import AnnouncementListPage from '@/pages/announcements/AnnouncementListPage';
import AnnouncementCreatePage from '@/pages/announcements/AnnouncementCreatePage';

test('AnnouncementListPage renders loading state', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <AnnouncementListPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText(/loading announcements/i)).toBeInTheDocument();
});

test('form requires book when type is New Book', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <AnnouncementCreatePage />
      </AuthProvider>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText(/type/i), { target: { value: 'New Book' } });
  expect(screen.getByText(/required: select a book/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/book/i)).toBeRequired();
});

test('form warns about Reprint book rules', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <AnnouncementCreatePage />
      </AuthProvider>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText(/type/i), { target: { value: 'Reprint' } });
  expect(screen.getByText(/must be published or scheduled/i)).toBeInTheDocument();
});
