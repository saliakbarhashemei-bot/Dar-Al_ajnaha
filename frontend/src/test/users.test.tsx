import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import UserListPage from '@/pages/users/UserListPage';

test('UserListPage renders loading state', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <UserListPage />
      </AuthProvider>
    </MemoryRouter>
  );
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
