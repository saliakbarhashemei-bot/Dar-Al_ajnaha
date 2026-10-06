import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { booksApi, bookCategoriesApi, tagsApi } from '@/services/books';
import { contributorsApi } from '@/services/contributors';
import type { BookCategory, BookStatus, Tag } from '@/types/Book';
import type { Contributor, ContributorRole } from '@/types/Contributor';
import { apiErrorMessage } from '@/utils/apiError';

const STATUSES: BookStatus[] = ['Draft', 'Review', 'Scheduled', 'Published', 'Archived'];

export default function BookCreatePage() {
  const [title, setTitle] = useState('');
  const [isbn, setIsbn] = useState('');
  const [status, setStatus] = useState<BookStatus>('Draft');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [people, setPeople] = useState<Contributor[]>([]);
  const [roles, setRoles] = useState<ContributorRole[]>([]);
  const [links, setLinks] = useState<Array<{ contributor_id: string; contributor_role_id: string }>>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    bookCategoriesApi.list().then(setCategories).catch(() => {});
    tagsApi.list().then(setAllTags).catch(() => {});
    contributorsApi.list().then((res) => setPeople(res.data)).catch(() => {});
    contributorsApi.roles().then(setRoles).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const created = await booksApi.create({
        title,
        isbn: isbn || undefined,
        status,
        book_category_id: categoryId ? Number(categoryId) : undefined,
        tag_ids: tagIds.length ? tagIds : undefined,
        contributors: links
          .filter((l) => l.contributor_id && l.contributor_role_id)
          .map((l) => ({ contributor_id: Number(l.contributor_id), contributor_role_id: Number(l.contributor_role_id) })),
      });
      navigate(`/books/${created.id}`);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'books.createError', t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>{t('books.createTitle')}</h1>
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
        <div>
          <label>{t('nav.contributors')}</label>
          {links.map((link, i) => (
            <div key={i}>
              <select
                aria-label={`${t('books.selectContributor')} ${i + 1}`}
                value={link.contributor_id}
                onChange={(e) => {
                  const next = [...links];
                  const current = next[i] ?? { contributor_id: '', contributor_role_id: '' };
                  next[i] = { contributor_id: e.target.value, contributor_role_id: current.contributor_role_id };
                  setLinks(next);
                }}
              >
                <option value="">{t('books.selectContributor')}</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                aria-label={`${t('books.selectRole')} ${i + 1}`}
                value={link.contributor_role_id}
                onChange={(e) => {
                  const next = [...links];
                  const current = next[i] ?? { contributor_id: '', contributor_role_id: '' };
                  next[i] = { contributor_id: current.contributor_id, contributor_role_id: e.target.value };
                  setLinks(next);
                }}
              >
                <option value="">{t('books.selectRole')}</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setLinks(links.filter((_, index) => index !== i))}
              >
                {t('common.remove')}
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setLinks([...links, { contributor_id: '', contributor_role_id: '' }])}>
            {t('books.addContributor')}
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? t('common.creating') : t('common.create')}
        </button>
      </form>
    </div>
  );
}
