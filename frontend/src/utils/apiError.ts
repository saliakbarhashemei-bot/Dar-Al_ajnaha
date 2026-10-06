import type { TFunction } from 'i18next';

export interface ApiErrorShape {
  type?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

const STATUS_KEYS: Record<string, string> = {
  unauthenticated: 'errors.unauthenticated',
  unauthorized: 'errors.unauthorized',
  not_found: 'errors.notFound',
  server_error: 'errors.serverError',
};

const FIELD_LABEL_KEYS: Record<string, string> = {
  email: 'auth.email',
  password: 'auth.password',
  password_confirmation: 'users.confirmPassword',
  name: 'common.name',
  title: 'books.bookTitle',
  isbn: 'books.isbn',
};

const MESSAGE_PATTERNS: Array<{ pattern: RegExp; key: string; args?: (m: RegExpMatchArray) => Record<string, string | number> }> = [
  { pattern: /has already been taken/i, key: 'validation.unique' },
  { pattern: /does not match/i, key: 'validation.confirmed' },
  { pattern: /must be accepted/i, key: 'validation.accepted' },
  { pattern: /is not a valid email address/i, key: 'validation.email' },
  { pattern: /is not a valid url/i, key: 'validation.url' },
  { pattern: /must be a valid integer/i, key: 'validation.integer' },
  { pattern: /must be at least (\d+)/i, key: 'validation.min', args: (m) => ({ min: m[1] ?? '' }) },
  { pattern: /must not be greater than (\d+)/i, key: 'validation.max', args: (m) => ({ max: m[1] ?? '' }) },
  { pattern: /must be a file of type/i, key: 'validation.mimes' },
  { pattern: /must be an image/i, key: 'validation.image' },
  { pattern: /must not be greater than (\d+) kilobytes/i, key: 'validation.maxSize', args: (m) => ({ max: m[1] ?? '' }) },
  { pattern: /is required|field is required|is required when/i, key: 'validation.required' },
];

export function translateFieldError(field: string, message: string, t: TFunction): string {
  const labelKey = FIELD_LABEL_KEYS[field];
  for (const { pattern, key, args } of MESSAGE_PATTERNS) {
    const match = message.match(pattern);
    if (match) return t(key, { field: labelKey ? t(labelKey) : field, ...(args ? args(match) : {}) });
  }
  return message;
}

export function apiErrorMessage(err: unknown, fallbackKey: string, t: TFunction): string {
  const apiErr = (err ?? {}) as ApiErrorShape;

  if (apiErr.errors) {
    const first = Object.values(apiErr.errors)[0];
    const field = Object.keys(apiErr.errors)[0];
    const message = first?.[0];
    if (field && message) return translateFieldError(field, message, t);
  }

  const statusKey = apiErr.type ? STATUS_KEYS[apiErr.type] : undefined;
  if (statusKey) return statusKey === 'errors.serverError' && apiErr.message ? apiErr.message : t(statusKey);
  if (apiErr.message) return apiErr.message;
  return t(fallbackKey);
}
