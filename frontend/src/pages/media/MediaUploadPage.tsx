import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MediaUploader from '@/components/media/MediaUploader';

export default function MediaUploadPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('media.uploadTitle')}</h1>
      <MediaUploader onUploaded={() => navigate('/media')} />
    </div>
  );
}
