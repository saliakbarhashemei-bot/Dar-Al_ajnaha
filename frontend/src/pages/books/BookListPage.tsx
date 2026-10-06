import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { booksApi } from '@/services/books';
import { useAuth } from '@/hooks/useAuth';
import type { Book } from '@/types/Book';

export default function BookListPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const { hasPermission } = useAuth();
  const { t, i18n } = useTranslation();

  const load = useCallback(
    (q?: string) => {
      booksApi
        .list(q ? { q } : undefined)
        .then((res) => setBooks(res.data))
        .catch(() => setError(i18n.t('books.loadError')))
        .finally(() => setLoading(false));
    },
    [i18n],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div>{t('books.listLoading')}</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <div>
      <h1>{t('books.title')}</h1>
      <div>
        <input
          aria-label={t('books.searchPlaceholder')}
          placeholder={t('books.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load(query);
          }}
        >
          {t('common.search')}
        </button>
      </div>
      {hasPermission('books.create') && <Link to="/books/new">{t('books.createLink')}</Link>}
      {books.length === 0 ? (
        <div>{t('books.empty')}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t('books.bookTitle')}</th>
              <th>{t('common.status')}</th>
              <th>{t('books.contributorsCount')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {books.map((b) => (
              <tr key={b.id}>
                <td>{b.title}</td>
                <td>{b.status}</td>
                <td>{b.contributors_count ?? b.contributors?.length ?? 0}</td>
                <td>
                  <Link to={`/books/${b.id}`}>{t('common.view')}</Link>{' '}
                  <Link to={`/books/${b.id}/edit`}>{t('common.edit')}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
