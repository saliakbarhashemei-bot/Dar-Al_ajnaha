import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mediaApi } from '@/services/media';
import { useAuth } from '@/hooks/useAuth';
import type { Media } from '@/types/Media';

interface Attachment {
  id: number;
  mediable_type: string;
  mediable_id: number;
  media_type: string;
  title: string | null;
  link: string | null;
}

export default function MediaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [media, setMedia] = useState<Media | null>(null);
  const [attached, setAttached] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const { hasPermission } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    mediaApi
      .get(Number(id))
      .then(setMedia)
      .catch(() => setError(t('media.notFound')))
      .finally(() => setLoading(false));
    mediaApi.attachments(Number(id)).then(setAttached).catch(() => {});
  }, [id, t]);

  const handleArchive = async () => {
    if (!media || !window.confirm(t('media.archiveConfirm', { name: media.file_name }))) return;
    setActionError('');
    try {
      setMedia(await mediaApi.archive(media.id));
    } catch {
      setActionError(t('media.archiveError'));
    }
  };

  const handleDelete = async () => {
    if (!media || !window.confirm(t('media.deleteConfirm', { name: media.file_name }))) return;
    setActionError('');
    try {
      await mediaApi.delete(media.id);
      navigate('/media');
    } catch {
      setActionError(t('media.deleteError'));
    }
  };

  if (loading) return <div>{t('media.detailLoading')}</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!media) return <div>{t('media.notFound')}</div>;

  const canArchive = hasPermission('media.archive') && !media.is_archived;
  const canDelete = hasPermission('media.delete') && media.is_archived;

  return (
    <div>
      <h1>{media.file_name}</h1>
      {media.mime_type.startsWith('image/') ? (
        <img src={media.url} alt={media.alt_text ?? media.file_name} decoding="async" style={{ maxWidth: 400 }} />
      ) : (
        <a href={media.url}>{t('media.download')}</a>
      )}
      <p>{t('media.mime')}: {media.mime_type}</p>
      <p>{t('media.size')}: {t('media.bytes', { count: media.size })}</p>
      {media.width && (
        <p>
          {t('media.dimensions')}: {media.width}x{media.height}px
        </p>
      )}
      <p>{t('media.altText')}: {media.alt_text ?? '-'}</p>
      <p>{t('media.caption')}: {media.caption ?? '-'}</p>
      <p>{t('media.fileDescription')}: {media.description ?? '-'}</p>
      <p>{t('common.status')}: {media.is_archived ? t('common.archive') : t('common.active')}</p>
      <h2>{t('media.attachedTitle')}</h2>
      {attached.length === 0 ? (
        <div>{t('media.notAttached')}</div>
      ) : (
        <ul>
          {attached.map((a) => (
            <li key={a.id}>
              {a.link ? (
                <Link to={a.link}>{a.title ?? `${a.mediable_type} #${a.mediable_id}`}</Link>
              ) : (
                (a.title ?? `${a.mediable_type} #${a.mediable_id}`)
              )}{' '}
              ({a.mediable_type} · {a.media_type})
            </li>
          ))}
        </ul>
      )}
      <div>
        {hasPermission('media.edit') && <Link to={`/media/${media.id}/edit`}>{t('media.editLink')}</Link>}{' '}
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
