export function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    // fa-IR uses the Jalali calendar with Persian digits; en-US uses Gregorian.
    return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', { dateStyle: 'medium' }).format(date);
  } catch {
    return value;
  }
}
