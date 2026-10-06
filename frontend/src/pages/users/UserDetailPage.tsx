import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usersApi } from '@/services/users';
import { formatDate } from '@/utils/format';
import type { User } from '@/types/User';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (!id) return;
    usersApi.get(Number(id))
      .then(setUser)
      .catch(() => setError(t('users.notFound')))
      .finally(() => setLoading(false));
  }, [id, t]);

  if (loading) return <div>{t('common.loading')}</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!user) return <div>{t('users.notFound')}</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{t('common.email')}: {user.email}</p>
      <p>{t('common.status')}: {user.is_active ? t('common.active') : t('common.disabled')}</p>
      <p>{t('users.lastLogin')}: {user.last_login_at ? formatDate(user.last_login_at, i18n.language) : t('users.never')}</p>
      <h2>{t('users.roles')}</h2>
      <ul>
        {user.roles.map((role) => (
          <li key={role.id}>{role.label}</li>
        ))}
      </ul>
      <Link to={`/users/${user.id}/edit`}>{t('common.edit')}</Link>
    </div>
  );
}
