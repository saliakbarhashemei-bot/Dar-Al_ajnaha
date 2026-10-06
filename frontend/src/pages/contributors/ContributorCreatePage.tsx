import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { contributorsApi } from '@/services/contributors';
import { apiErrorMessage } from '@/utils/apiError';

export default function ContributorCreatePage() {
  const [name, setName] = useState('');
  const [biography, setBiography] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const created = await contributorsApi.create({ name, biography: biography || undefined, email: email || undefined });
      navigate(`/contributors/${created.id}`);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'contributors.createError', t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>{t('contributors.createTitle')}</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">{t('common.name')}</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="biography">{t('contributors.biography')}</label>
          <textarea id="biography" value={biography} onChange={(e) => setBiography(e.target.value)} />
        </div>
        <div>
          <label htmlFor="email">{t('common.email')}</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? t('common.creating') : t('common.create')}
        </button>
      </form>
    </div>
  );
}
