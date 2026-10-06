import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AnnouncementForm from './AnnouncementForm';
import { announcementsApi } from '@/services/announcements';
import type { Announcement, AnnouncementInput } from '@/types/Announcement';

export default function AnnouncementEditPage() {
  const { id } = useParams<{ id: string }>();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!id) return;
    announcementsApi
      .get(Number(id))
      .then(setAnnouncement)
      .catch(() => setError(t('announcements.notFound')))
      .finally(() => setLoading(false));
  }, [id, t]);

  const handleSubmit = async (data: AnnouncementInput) => {
    if (!id) return;
    await announcementsApi.update(Number(id), data);
    navigate(`/announcements/${id}`);
  };

  if (loading) return <div>{t('announcements.detailLoading')}</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!announcement) return <div>{t('announcements.notFound')}</div>;

  return (
    <div>
      <h1>{t('announcements.editTitle')}</h1>
      <AnnouncementForm
        initial={{
          title: announcement.title,
          short_description: announcement.short_description ?? undefined,
          content: announcement.content ?? undefined,
          type: announcement.type,
          status: announcement.status,
          book_id: announcement.book?.id,
        }}
        onSubmit={handleSubmit}
        submitLabel={t('common.save')}
      />
    </div>
  );
}
