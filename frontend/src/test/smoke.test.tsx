/// <reference types="@testing-library/jest-dom" />
import { render, screen, waitFor } from '@testing-library/react';
import App from '@/App';
import { authApi } from '@/services/auth';
import { api } from '@/services/api';

vi.mock('@/services/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/auth')>();
  return { ...actual, authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn(), updatePassword: vi.fn() } };
});

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

const mockedApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authApi.me).mockRejectedValue(new Error('401'));
  mockedApi.get.mockResolvedValue({ data: { status: 'ok' } } as never);
});

test('the home route renders the shell and the dashboard', async () => {
  window.history.pushState({}, '', '/');

  render(<App />);

  expect(await screen.findByText(/api status: online/i)).toBeInTheDocument();
  expect(mockedApi.get).toHaveBeenCalledWith('/health');
});

test('an unknown route renders nothing rather than crashing', async () => {
  window.history.pushState({}, '', '/definitely-not-a-route');

  render(<App />);

  await waitFor(() => expect(screen.queryByText(/api status/i)).not.toBeInTheDocument());
});
