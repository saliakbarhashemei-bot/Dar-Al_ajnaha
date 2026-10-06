import { api } from './api';
import type { User } from '@/types/User';

// Sanctum stateful auth: a CSRF cookie must exist before any state-changing
// request. axios reads XSRF-TOKEN and echoes it back as X-XSRF-TOKEN.
// The route lives at the app root, not under the /api/v1 prefix.
export const ensureCsrfCookie = () => api.get('/sanctum/csrf-cookie', { baseURL: '/' });

export const authApi = {
  login: (email: string, password: string) =>
    ensureCsrfCookie()
      .then(() => api.post('/auth/login', { email, password }))
      .then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => api.get('/me').then((r) => r.data.data as User),
  updatePassword: (current: string, next: string) =>
    api.put('/me/password', { current_password: current, password: next }).then((r) => r.data),
};
