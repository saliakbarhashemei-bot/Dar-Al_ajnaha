import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { rolesApi } from '@/services/roles';
import { apiErrorMessage } from '@/utils/apiError';

export default function RoleCreatePage() {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await rolesApi.create({ name, label });
      navigate('/roles');
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'roles.createError', t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>{t('roles.createTitle')}</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">{t('common.name')}</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="label">{t('roles.label')}</label>
          <input id="label" value={label} onChange={(e) => setLabel(e.target.value)} required />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? t('common.creating') : t('common.create')}</button>
      </form>
    </div>
  );
}
