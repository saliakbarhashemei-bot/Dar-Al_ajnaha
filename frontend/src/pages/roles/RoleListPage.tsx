import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { rolesApi } from '@/services/roles';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types/User';

export default function RoleListPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { hasPermission } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    rolesApi.list()
      .then((res) => setRoles(res.data))
      .catch(() => setError(t('roles.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <div>{t('roles.listLoading')}</div>;
  if (error) return <div role="alert">{error}</div>;
  if (roles.length === 0) return <div>{t('roles.empty')}</div>;

  return (
    <div>
      <h1>{t('roles.title')}</h1>
      {hasPermission('users.edit') && <Link to="/roles/new">{t('roles.createLink')}</Link>}
      <table>
        <thead>
          <tr>
            <th>{t('common.name')}</th>
            <th>{t('roles.label')}</th>
            <th>{t('roles.permissionCount')}</th>
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id}>
              <td>{role.name}</td>
              <td>{role.label}</td>
              <td>{role.permissions?.length ?? 0}</td>
              <td>
                <Link to={`/roles/${role.id}`}>{t('common.view')}</Link>
                <Link to={`/roles/${role.id}/edit`}>{t('common.edit')}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
