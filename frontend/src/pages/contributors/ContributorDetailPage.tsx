import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { contributorsApi } from '@/services/contributors';
import { mediaApi } from '@/services/media';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/format';
import type { Contributor } from '@/types/Contributor';
import type { Media } from '@/types/Media';

export default function ContributorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [contributor, setContributor] = useState<Contributor | null>(null);
  const [library, setLibrary] = useState<Media[]>([]);
  const [selectedMedia, setSelectedMedia] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const { hasPermission } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const refresh = useCallback(async (contributorId: number) => {
    setContributor(await contributorsApi.get(contributorId));
  }, []);

  useEffect(() => {
    if (!id) return;
    contributorsApi
      .get(Number(id))
      .then(setContributor)
      .catch(() => setError(t('contributors.notFound')))
      .finally(() => setLoading(false));
    mediaApi.list().then((res) => setLibrary(res.data)).catch(() => {});
  }, [id, t]);

  const handleArchive = async () => {
    if (!contributor || !window.confirm(t('contributors.archiveConfirm', { name: contributor.name }))) return;
    setActionError('');
    try {
      const updated = await contributorsApi.archive(contributor.id);
      setContributor(updated);
    } catch {
      setActionError(t('contributors.archiveError'));
    }
  };

  const handleDelete = async () => {
    if (!contributor || !window.confirm(t('contributors.deleteConfirm', { name: contributor.name }))) return;
    setActionError('');
    try {
      await contributorsApi.delete(contributor.id);
      navigate('/contributors');
    } catch {
      setActionError(t('contributors.deleteError'));
    }
  };

  const handleAttachPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributor || !selectedMedia) return;
    setActionError('');
    try {
      await mediaApi.attach('contributors', contributor.id, Number(selectedMedia), 'Person Photo');
      await refresh(contributor.id);
    } catch {
      setActionError(t('contributors.attachPhotoError'));
    }
  };

  const handleDetachPhoto = async (mediaId: number, mediaType: string) => {
    if (!contributor || !window.confirm(t('contributors.removePhotoConfirm'))) return;
    try {
      await mediaApi.detach('contributors', contributor.id, mediaId, mediaType);
      await refresh(contributor.id);
    } catch {
      setActionError(t('contributors.removePhotoError'));
    }
  };

  if (loading) return <div>{t('contributors.detailLoading')}</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!contributor) return <div>{t('contributors.notFound')}</div>;

  const canArchive = hasPermission('contributors.archive') && !contributor.is_archived;
  const canDelete = hasPermission('contributors.delete') && contributor.is_archived;

  return (
    <div>
      <h1>{contributor.name}</h1>
      <p>{t('contributors.biography')}: {contributor.biography ?? '-'}</p>
      <p>{t('common.email')}: {contributor.email ?? '-'}</p>
      <p>{t('contributors.phone')}: {contributor.phone ?? '-'}</p>
      <p>{t('contributors.website')}: {contributor.website ?? '-'}</p>
      <p>{t('contributors.nationality')}: {contributor.nationality ?? '-'}</p>
      <p>{t('contributors.birthDate')}: {formatDate(contributor.birth_date, i18n.language)}</p>
      <p>{t('common.status')}: {contributor.is_archived ? t('contributors.archived') : t('common.active')}</p>

      <h2>{t('contributors.rolesTitle')}</h2>
      <div>{t('contributors.noBooks')} — <Link to="/books">{t('contributors.linkViaBooks')}</Link></div>

      <h2>{t('contributors.booksTitle')}</h2>
      <div>
        {t('contributors.noBooks')} — <Link to="/books">{t('contributors.linkViaBooks')}</Link>
      </div>

      <h2>{t('contributors.photoTitle')}</h2>
      {(contributor.media ?? []).length === 0 ? (
        <div>{t('contributors.noPhoto')}</div>
      ) : (
        <ul>
          {(contributor.media ?? []).map((m) => (
            <li key={`${m.id}-${m.pivot_media_type}`}>
              {m.mime_type.startsWith('image/') ? (
                <img src={m.url} alt={m.alt_text ?? m.file_name} loading="lazy" decoding="async" style={{ maxWidth: 160 }} />
              ) : (
                m.file_name
              )}{' '}
              {hasPermission('contributors.edit') && (
                <button type="button" onClick={() => handleDetachPhoto(m.id, m.pivot_media_type)}>
                  {t('common.remove')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasPermission('contributors.edit') && (
        <form onSubmit={handleAttachPhoto}>
          <h3>{t('contributors.attachPhoto')}</h3>
          <select aria-label={t('contributors.selectMedia')} value={selectedMedia} onChange={(e) => setSelectedMedia(e.target.value)}>
            <option value="">{t('contributors.selectMedia')}</option>
            {library.map((m) => (
              <option key={m.id} value={m.id}>
                {m.file_name}
              </option>
            ))}
          </select>
          <button type="submit">{t('contributors.attachPhotoButton')}</button>
        </form>
      )}

      <div>
        <Link to={`/contributors/${contributor.id}/edit`}>{t('common.edit')}</Link>{' '}
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
