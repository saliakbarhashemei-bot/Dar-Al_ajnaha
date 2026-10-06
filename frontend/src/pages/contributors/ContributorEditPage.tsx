import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { contributorsApi } from '@/services/contributors';
import { apiErrorMessage } from '@/utils/apiError';

export default function ContributorEditPage() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState('');
  const [biography, setBiography] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!id) return;
    contributorsApi
      .get(Number(id))
      .then((c) => {
        setName(c.name);
        setBiography(c.biography ?? '');
      })
      .catch(() => setError(t('contributors.notFound')));
  }, [id, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    setLoading(true);
    try {
      await contributorsApi.update(Number(id), { name, biography: biography || undefined });
      navigate(`/contributors/${id}`);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'contributors.updateError', t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>{t('contributors.editTitle')}</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">{t('common.name')}</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="biography">{t('contributors.biography')}</label>
          <textarea id="biography" value={biography} onChange={(e) => setBiography(e.target.value)} />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? t('common.saving') : t('common.save')}
        </button>
      </form>
    </div>
  );
}
