import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { booksApi } from '@/services/books';
import type { AnnouncementInput, AnnouncementStatus, AnnouncementType } from '@/types/Announcement';
import type { Book } from '@/types/Book';
import { apiErrorMessage } from '@/utils/apiError';

const TYPES: AnnouncementType[] = ['New Book', 'Reprint', 'New Edition', 'News', 'Event', 'Discount', 'Other'];
const STATUSES: AnnouncementStatus[] = ['Draft', 'Review', 'Scheduled', 'Published', 'Archived'];

export default function AnnouncementForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Partial<AnnouncementInput> & { book_id?: number };
  onSubmit: (data: AnnouncementInput) => Promise<void>;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [shortDescription, setShortDescription] = useState(initial?.short_description ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [type, setType] = useState<AnnouncementType>(initial?.type ?? 'News');
  const [status, setStatus] = useState<AnnouncementStatus>(initial?.status ?? 'Draft');
  const [bookId, setBookId] = useState(initial?.book_id ? String(initial.book_id) : '');
  const [books, setBooks] = useState<Pick<Book, 'id' | 'title'>[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    booksApi.list().then((res) => setBooks(res.data)).catch(() => {});
  }, []);

  const bookHint: Record<string, string> = {
    'New Book': t('announcements.bookRequiredHint'),
    Reprint: t('announcements.bookReprintHint'),
    'New Edition': t('announcements.bookEditionHint'),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        title,
        short_description: shortDescription || undefined,
        content: content || undefined,
        type,
        status,
        book_id: bookId ? Number(bookId) : undefined,
      });
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'announcements.saveError', t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="ann-title">{t('common.name')}</label>
        <input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="ann-short">
          {t('announcements.shortDescription')} ({shortDescription.length}/500)
        </label>
        <input
          id="ann-short"
          value={shortDescription}
          maxLength={500}
          onChange={(e) => setShortDescription(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="ann-content">{t('announcements.content')}</label>
        <textarea id="ann-content" value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      <div>
        <label htmlFor="ann-type">{t('announcements.type')}</label>
        <select id="ann-type" value={type} onChange={(e) => setType(e.target.value as AnnouncementType)}>
          {TYPES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="ann-book">{t('announcements.book')}</label>
        <select
          id="ann-book"
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          required={type === 'New Book'}
          aria-describedby="ann-book-hint"
        >
          <option value="">{t('announcements.noBook')}</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
        <p id="ann-book-hint">{bookHint[type] ?? t('announcements.bookOptionalHint')}</p>
      </div>
      <div>
        <label htmlFor="ann-status">{t('common.status')}</label>
        <select id="ann-status" value={status} onChange={(e) => setStatus(e.target.value as AnnouncementStatus)}>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? t('common.saving') : submitLabel}
      </button>
    </form>
  );
}
