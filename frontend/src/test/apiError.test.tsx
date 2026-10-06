import { describe, it, expect } from 'vitest';
import i18n from '@/i18n';
import { apiErrorMessage, translateFieldError } from '@/utils/apiError';

const t = i18n.t.bind(i18n);

describe('translateFieldError', () => {
  it('translates a unique violation using the localized field label', () => {
    const result = translateFieldError('email', 'The email has already been taken.', t);
    expect(result).toBe('The Email has already been taken.');
  });

  it('translates a required violation', () => {
    expect(translateFieldError('title', 'The title field is required.', t)).toBe('The Title field is required.');
  });

  it('interpolates the numeric bound', () => {
    expect(translateFieldError('page_count', 'The page count must be at least 1.', t)).toBe(
      'The page_count must be at least 1.',
    );
  });

  it('keeps unknown backend messages verbatim', () => {
    expect(translateFieldError('slug', 'The slug is already taken by another book.', t)).toBe(
      'The slug is already taken by another book.',
    );
  });
});

describe('apiErrorMessage', () => {
  it('uses the first field error of a 422 response', () => {
    expect(apiErrorMessage({ type: 'validation', errors: { name: ['The name field is required.'] } }, 'common.failed', t)).toBe(
      'The Name field is required.',
    );
  });

  it('maps authorization status codes', () => {
    expect(apiErrorMessage({ type: 'unauthorized' }, 'common.failed', t)).toBe(
      'You do not have permission to perform this action.',
    );
    expect(apiErrorMessage({ type: 'unauthenticated' }, 'common.failed', t)).toBe(
      'Your session has expired. Please sign in again.',
    );
  });

  it('falls back to the page-level key for unknown failures', () => {
    expect(apiErrorMessage({}, 'books.createError', t)).toBe('Failed to create book');
  });

  it('prefers an explicit server message over the fallback', () => {
    expect(apiErrorMessage({ type: 'server_error', message: 'Disk full' }, 'common.failed', t)).toBe('Disk full');
  });
});
