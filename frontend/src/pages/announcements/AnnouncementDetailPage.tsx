import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { announcementsApi } from '@/services/announcements';
import { mediaApi } from '@/services/media';
import { useAuth } from '@/hooks/useAuth';
import type { Announcement } from '@/types/Announcement';
import type { Media } from '@/types/Media';

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [library, setLibrary] = useState<Media[]>([]);
  const [selectedMedia, setSelectedMedia] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const { hasPermission } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const refresh = useCallback(async (announcementId: number) => {
    setAnnouncement(await announcementsApi.get(announcementId));
  }, []);

  useEffect(() => {
    if (!id) return;
    announcementsApi
      .get(Number(id))
      .then(setAnnouncement)
      .catch(() => setError(t('announcements.notFound')))
      .finally(() => setLoading(false));
    mediaApi.list().then((res) => setLibrary(res.data)).catch(() => {});
  }, [id, t]);

  const handleArchive = async () => {
    if (!announcement || !window.confirm(t('announcements.archiveConfirm', { title: announcement.title }))) return;
    setActionError('');
    try {
      setAnnouncement(await announcementsApi.archive(announcement.id));
    } catch {
      setActionError(t('announcements.archiveError'));
    }
  };

  const handleDelete = async () => {
    if (!announcement || !window.confirm(t('announcements.deleteConfirm', { title: announcement.title }))) return;
    setActionError('');
    try {
      await announcementsApi.delete(announcement.id);
      navigate('/announcements');
    } catch {
      setActionError(t('announcements.deleteError'));
    }
  };

  const handleAttachMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement || !selectedMedia) return;
    setActionError('');
    try {
      await mediaApi.attach('announcements', announcement.id, Number(selectedMedia), 'Announcement Image');
      setSelectedMedia('');
      await refresh(announcement.id);
    } catch {
      setActionError(t('announcements.attachImageError'));
    }
  };

  const handleDetachMedia = async (mediaId: number, mediaType: string) => {
    if (!announcement || !window.confirm(t('announcements.removeImageConfirm'))) return;
    setActionError('');
    try {
      await mediaApi.detach('announcements', announcement.id, mediaId, mediaType);
      await refresh(announcement.id);
    } catch {
      setActionError(t('announcements.removeImageError'));
    }
  };

  if (loading) return <div>{t('announcements.detailLoading')}</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!announcement) return <div>{t('announcements.notFound')}</div>;

  const canEdit = hasPermission('announcements.edit');
  const canArchive = hasPermission('announcements.archive') && !announcement.is_archived;
  const canDelete = hasPermission('announcements.delete') && announcement.is_archived;

  return (
    <div>
      <h1>{announcement.title}</h1>
      <p>{t('announcements.type')}: {announcement.type}</p>
      <p>{t('common.status')}: {announcement.status}</p>
      <p>{t('announcements.shortDescription')}: {announcement.short_description ?? '-'}</p>
      <p>{t('announcements.content')}: {announcement.content ?? '-'}</p>
      <p>
        {t('announcements.book')}:{' '}
        {announcement.book ? <Link to={`/books/${announcement.book.id}`}>{announcement.book.title}</Link> : '-'}
      </p>

      <h2>{t('announcements.imageTitle')}</h2>
      {(announcement.media ?? []).length === 0 ? (
        <div>{t('announcements.noImage')}</div>
      ) : (
        <ul>
          {(announcement.media ?? []).map((m) => (
            <li key={`${m.id}-${m.pivot_media_type}`}>
              {m.mime_type.startsWith('image/') ? (
                <img src={m.url} alt={m.alt_text ?? m.file_name} loading="lazy" decoding="async" style={{ maxWidth: 200 }} />
              ) : (
                m.file_name
              )}{' '}
              {canEdit && (
                <button type="button" onClick={() => handleDetachMedia(m.id, m.pivot_media_type)}>
                  {t('common.remove')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form onSubmit={handleAttachMedia}>
          <h3>{t('announcements.attachImage')}</h3>
          <select
            aria-label={t('announcements.libraryImage')}
            value={selectedMedia}
            onChange={(e) => setSelectedMedia(e.target.value)}
          >
            <option value="">{t('announcements.selectMedia')}</option>
            {library.map((m) => (
              <option key={m.id} value={m.id}>
                {m.file_name}
              </option>
            ))}
          </select>
          <button type="submit">{t('announcements.attachImageButton')}</button>
        </form>
      )}

      <div>
        <Link to={`/announcements/${announcement.id}/edit`}>{t('common.edit')}</Link>{' '}
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
