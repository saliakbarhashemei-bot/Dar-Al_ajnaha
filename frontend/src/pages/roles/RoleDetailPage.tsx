import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { rolesApi } from '@/services/roles';
import type { Role } from '@/types/User';

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    if (!id) return;
    rolesApi.get(Number(id))
      .then(setRole)
      .catch(() => setError(t('roles.notFound')))
      .finally(() => setLoading(false));
  }, [id, t]);

  if (loading) return <div>{t('common.loading')}</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!role) return <div>{t('roles.notFound')}</div>;

  return (
    <div>
      <h1>{role.label}</h1>
      <p>{t('common.name')}: {role.name}</p>
      <h2>{t('roles.permissions')}</h2>
      <ul>
        {role.permissions?.map((perm) => (
          <li key={perm.id}>{perm.label}</li>
        ))}
      </ul>
      <Link to={`/roles/${role.id}/edit`}>{t('common.edit')}</Link>
    </div>
  );
}
