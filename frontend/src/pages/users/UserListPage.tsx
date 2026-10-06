import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usersApi } from '@/services/users';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types/User';

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { hasPermission } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    usersApi.list()
      .then((res) => setUsers(res.data))
      .catch(() => setError(t('users.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <div>{t('users.listLoading')}</div>;
  if (error) return <div role="alert">{error}</div>;
  if (users.length === 0) return <div>{t('users.empty')}</div>;

  return (
    <div>
      <h1>{t('users.title')}</h1>
      {hasPermission('users.create') && <Link to="/users/new">{t('users.createLink')}</Link>}
      <table>
        <thead>
          <tr>
            <th>{t('common.name')}</th>
            <th>{t('common.email')}</th>
            <th>{t('common.status')}</th>
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.is_active ? t('common.active') : t('common.disabled')}</td>
              <td>
                <Link to={`/users/${user.id}`}>{t('common.view')}</Link>
                <Link to={`/users/${user.id}/edit`}>{t('common.edit')}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
