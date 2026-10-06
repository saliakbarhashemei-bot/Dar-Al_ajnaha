import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mediaApi } from '@/services/media';

export default function MediaEditPage() {
  const { id } = useParams<{ id: string }>();
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!id) return;
    mediaApi
      .get(Number(id))
      .then((m) => {
        setAltText(m.alt_text ?? '');
        setCaption(m.caption ?? '');
        setDescription(m.description ?? '');
      })
      .catch(() => setError(t('media.notFound')));
  }, [id, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    setLoading(true);
    try {
      await mediaApi.update(Number(id), {
        alt_text: altText || undefined,
        caption: caption || undefined,
        description: description || undefined,
      });
      navigate(`/media/${id}`);
    } catch {
      setError(t('media.updateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>{t('media.editTitle')}</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="alt_text">{t('media.altText')}</label>
          <input id="alt_text" value={altText} onChange={(e) => setAltText(e.target.value)} />
        </div>
        <div>
          <label htmlFor="caption">{t('media.caption')}</label>
          <input id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <div>
          <label htmlFor="description">{t('media.fileDescription')}</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? t('common.saving') : t('common.save')}
        </button>
      </form>
    </div>
  );
}
