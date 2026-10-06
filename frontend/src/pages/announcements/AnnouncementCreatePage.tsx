import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AnnouncementForm from './AnnouncementForm';
import { announcementsApi } from '@/services/announcements';
import type { AnnouncementInput } from '@/types/Announcement';

export default function AnnouncementCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (data: AnnouncementInput) => {
    const created = await announcementsApi.create(data);
    navigate(`/announcements/${created.id}`);
  };

  return (
    <div>
      <h1>{t('announcements.createTitle')}</h1>
      <AnnouncementForm onSubmit={handleSubmit} submitLabel={t('common.create')} />
    </div>
  );
}
