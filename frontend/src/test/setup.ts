import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Tests assert English copy: pick the language before the i18n module initializes.
vi.hoisted(() => {
  localStorage.setItem('dar-lang', 'en');
});

// Initialize the shared i18next instance so components render real strings, not keys.
import '@/i18n';
