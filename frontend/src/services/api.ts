import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Accept': 'application/json' },
});

/**
 * Called when the API reports an expired or missing session. Kept as a hook
 * so the auth layer can clear its state without the HTTP client importing it.
 */
let onUnauthenticated: (() => void) | null = null;

export function setUnauthenticatedHandler(handler: (() => void) | null): void {
  onUnauthenticated = handler;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 422) {
      return Promise.reject({ type: 'validation', errors: err.response.data.errors });
    }
    if (err.response?.status === 401) {
      onUnauthenticated?.();
      return Promise.reject({ type: 'unauthenticated' });
    }
    if (err.response?.status === 403) return Promise.reject({ type: 'unauthorized' });
    if (err.response?.status === 404) return Promise.reject({ type: 'not_found' });
    return Promise.reject({ type: 'server_error', message: err.response?.data?.message ?? 'Server error' });
  },
);
