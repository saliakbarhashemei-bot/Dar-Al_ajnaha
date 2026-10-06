import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { booksApi } from '@/services/books';
import { contributorsApi } from '@/services/contributors';
import { mediaApi } from '@/services/media';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/format';
import type { Book } from '@/types/Book';
import type { Media } from '@/types/Media';
import type { Contributor, ContributorRole } from '@/types/Contributor';

const MEDIA_SECTIONS = ['Book Cover', 'Book Image', 'Document'] as const;
const MEDIA_TYPES = ['Book Cover', 'Book Image', 'Document'];

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [people, setPeople] = useState<Contributor[]>([]);
  const [roles, setRoles] = useState<ContributorRole[]>([]);
  const [selectedContributor, setSelectedContributor] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [library, setLibrary] = useState<Media[]>([]);
  const [selectedMedia, setSelectedMedia] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState('Book Cover');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const { hasPermission } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const refresh = useCallback(async (bookId: number) => {
    setBook(await booksApi.get(bookId));
  }, []);

  useEffect(() => {
    if (!id) return;
    booksApi
      .get(Number(id))
      .then(setBook)
      .catch(() => setError(t('books.notFound')))
      .finally(() => setLoading(false));
    contributorsApi.list().then((res) => setPeople(res.data)).catch(() => {});
    contributorsApi.roles().then(setRoles).catch(() => {});
    mediaApi.list().then((res) => setLibrary(res.data)).catch(() => {});
  }, [id, t]);

  const handleArchive = async () => {
    if (!book || !window.confirm(t('books.archiveConfirm', { title: book.title }))) return;
    setActionError('');
    try {
      setBook(await booksApi.archive(book.id));
    } catch {
      setActionError(t('books.archiveError'));
    }
  };

  const handleDelete = async () => {
    if (!book || !window.confirm(t('books.deleteConfirm', { title: book.title }))) return;
    setActionError('');
    try {
      await booksApi.delete(book.id);
      navigate('/books');
    } catch {
      setActionError(t('books.deleteError'));
    }
  };

  const handleAttach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!book || !selectedContributor || !selectedRole) return;
    setActionError('');
    try {
      await booksApi.attachContributor(book.id, Number(selectedContributor), Number(selectedRole));
      setSelectedContributor('');
      setSelectedRole('');
      await refresh(book.id);
    } catch {
      setActionError(t('books.attachContributorError'));
    }
  };

  const handleDetach = async (contributorId: number, roleId: number) => {
    if (!book || !window.confirm(t('books.removeContributorConfirm'))) return;
    setActionError('');
    try {
      await booksApi.detachContributor(book.id, contributorId, roleId);
      await refresh(book.id);
    } catch {
      setActionError(t('books.removeContributorError'));
    }
  };

  const handleAttachMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!book || !selectedMedia) return;
    setActionError('');
    try {
      await mediaApi.attach('books', book.id, Number(selectedMedia), selectedMediaType);
      setSelectedMedia('');
      await refresh(book.id);
    } catch {
      setActionError(t('books.attachMediaError'));
    }
  };

  const handleDetachMedia = async (mediaId: number, mediaType: string) => {
    if (!book || !window.confirm(t('books.removeMediaConfirm'))) return;
    setActionError('');
    try {
      await mediaApi.detach('books', book.id, mediaId, mediaType);
      await refresh(book.id);
    } catch {
      setActionError(t('books.removeMediaError'));
    }
  };

  if (loading) return <div>{t('books.detailLoading')}</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!book) return <div>{t('books.notFound')}</div>;

  const canEdit = hasPermission('books.edit');
  const canArchive = hasPermission('books.archive') && !book.is_archived;
  const canDelete = hasPermission('books.delete') && book.is_archived;

  const sectionTitle: Record<(typeof MEDIA_SECTIONS)[number], string> = {
    'Book Cover': t('books.cover'),
    'Book Image': t('books.images'),
    Document: t('books.files'),
  };
  const sectionEmpty: Record<(typeof MEDIA_SECTIONS)[number], string> = {
    'Book Cover': t('books.noCover'),
    'Book Image': t('books.noImages'),
    Document: t('books.noFiles'),
  };

  return (
    <div>
      <h1>{book.title}</h1>
      <p>{t('books.isbn')}: {book.isbn ?? '-'}</p>
      <p>{t('books.description')}: {book.description ?? '-'}</p>
      <p>{t('books.pages')}: {book.page_count ?? '-'}</p>
      <p>{t('books.language')}: {book.language ?? '-'}</p>
      <p>{t('books.publicationDate')}: {formatDate(book.publication_date, i18n.language)}</p>
      <p>{t('books.publisher')}: {book.publisher ?? '-'}</p>
      <p>{t('books.edition')}: {book.edition ?? '-'}</p>
      <p>{t('common.status')}: {book.status}</p>
      <p>{t('books.category')}: {book.category?.label ?? t('books.noCategory')}</p>
      <p>{t('books.genre')}: {book.genre ?? '-'}</p>
      <p>{t('books.tags')}: {book.tags?.map((tag) => tag.label).join('، ') || '-'}</p>

      <h2>{t('books.peopleTitle')}</h2>
      {(book.contributors?.length ?? 0) === 0 ? (
        <div>{t('books.noContributors')}</div>
      ) : (
        book.contributors?.map((group) => (
          <div key={group.role_id}>
            <h3>
              {group.role_label} ({group.people.length})
            </h3>
            <ul>
              {group.people.map((p) => (
                <li key={p.id}>
                  <Link to={`/contributors/${p.id}`}>{p.name}</Link>{' '}
                  {canEdit && (
                    <button type="button" onClick={() => handleDetach(p.id, group.role_id)}>
                      {t('common.remove')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      {canEdit && (
        <form onSubmit={handleAttach}>
          <h3>{t('books.attachContributor')}</h3>
          <select
            aria-label={t('books.selectContributor')}
            value={selectedContributor}
            onChange={(e) => setSelectedContributor(e.target.value)}
          >
            <option value="">{t('books.selectContributor')}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select aria-label={t('books.selectRole')} value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
            <option value="">{t('books.selectRole')}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <button type="submit">{t('common.attach')}</button>
        </form>
      )}

      <h2>{t('books.mediaTitle')}</h2>
      {MEDIA_SECTIONS.map((section) => {
        const items = (book.media ?? []).filter((m) => m.pivot_media_type === section);
        return (
          <div key={section}>
            <h3>
              {sectionTitle[section]} ({items.length})
            </h3>
            {items.length === 0 ? (
              <div>{sectionEmpty[section]}</div>
            ) : (
              <ul>
                {items.map((m) => (
                  <li key={`${m.id}-${m.pivot_media_type}`}>
                    {m.mime_type.startsWith('image/') && (
                      <img src={m.url} alt={m.alt_text ?? m.file_name} loading="lazy" decoding="async" style={{ maxWidth: 120 }} />
                    )}
                    {m.file_name}{' '}
                    {canEdit && (
                      <button type="button" onClick={() => handleDetachMedia(m.id, m.pivot_media_type)}>
                        {t('common.remove')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {canEdit && (
        <form onSubmit={handleAttachMedia}>
          <h3>{t('books.attachMedia')}</h3>
          <select aria-label={t('books.libraryMedia')} value={selectedMedia} onChange={(e) => setSelectedMedia(e.target.value)}>
            <option value="">{t('books.libraryMedia')}</option>
            {library.map((m) => (
              <option key={m.id} value={m.id}>
                {m.file_name}
              </option>
            ))}
          </select>
          <select
            aria-label={t('books.mediaType')}
            value={selectedMediaType}
            onChange={(e) => setSelectedMediaType(e.target.value)}
          >
            {MEDIA_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button type="submit">{t('common.attach')}</button>
        </form>
      )}

      <div>
        <Link to={`/books/${book.id}/edit`}>{t('common.edit')}</Link>{' '}
        <button type="button" onClick={handleArchive} disabled={!canArchive}>
          {t('common.archive')}
        </button>{' '}
        {canDelete && (
          <button type="button" onClick={handleDelete}>
            {t('common.delete')}
          </button>
        )}
      </div>
      {actionError && <p role="alert">{actionError}</p>}
    </div>
  );
}
