import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import ContributorListPage from '@/pages/contributors/ContributorListPage';
import ContributorCreatePage from '@/pages/contributors/ContributorCreatePage';
import ContributorDetailPage from '@/pages/contributors/ContributorDetailPage';

test('ContributorListPage renders loading skeleton', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <ContributorListPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText(/loading contributors/i)).toBeInTheDocument();
});

test('ContributorCreatePage renders name field', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <ContributorCreatePage />
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
});

test('ContributorDetailPage renders loading state', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <ContributorDetailPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText(/loading contributor/i)).toBeInTheDocument();
});
