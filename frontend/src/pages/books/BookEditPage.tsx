import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { booksApi, bookCategoriesApi, tagsApi } from '@/services/books';
import type { BookCategory, BookStatus, Tag } from '@/types/Book';
import { apiErrorMessage } from '@/utils/apiError';

const STATUSES: BookStatus[] = ['Draft', 'Review', 'Scheduled', 'Published', 'Archived'];

export default function BookEditPage() {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [isbn, setIsbn] = useState('');
  const [status, setStatus] = useState<BookStatus>('Draft');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    bookCategoriesApi.list().then(setCategories).catch(() => {});
    tagsApi.list().then(setAllTags).catch(() => {});
    if (!id) return;
    booksApi
      .get(Number(id))
      .then((b) => {
        setTitle(b.title);
        setIsbn(b.isbn ?? '');
        setStatus(b.status);
        setCategoryId(b.category ? String(b.category.id) : '');
        setTagIds(b.tags?.map((tag) => tag.id) ?? []);
      })
      .catch(() => setError(t('books.notFound')));
  }, [id, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    setLoading(true);
    try {
      await booksApi.update(Number(id), {
        title,
        isbn: isbn || undefined,
        status,
        book_category_id: categoryId ? Number(categoryId) : undefined,
        tag_ids: tagIds,
      });
      navigate(`/books/${id}`);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'books.updateError', t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>{t('books.editTitle')}</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">{t('books.bookTitle')}</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="isbn">{t('books.isbn')}</label>
          <input id="isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder={t('books.isbnPlaceholder')} />
        </div>
        <div>
          <label htmlFor="status">{t('common.status')}</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value as BookStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="category">{t('books.category')}</label>
          <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t('books.noCategory')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>{t('books.tags')}</label>
          {allTags.map((tag) => (
            <label key={tag.id}>
              <input
                type="checkbox"
                checked={tagIds.includes(tag.id)}
                onChange={(e) => {
                  if (e.target.checked) setTagIds([...tagIds, tag.id]);
                  else setTagIds(tagIds.filter((tid) => tid !== tag.id));
                }}
              />
              {tag.label}
            </label>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? t('common.saving') : t('common.save')}
        </button>
      </form>
    </div>
  );
}
