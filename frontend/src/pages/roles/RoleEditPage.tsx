import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { rolesApi } from '@/services/roles';
import { permissionsApi } from '@/services/permissions';
import type { Role, Permission } from '@/types/User';
import { apiErrorMessage } from '@/utils/apiError';

export default function RoleEditPage() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<number[]>([]);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!id) return;
    rolesApi.get(Number(id))
      .then((role: Role) => {
        setName(role.name);
        setLabel(role.label);
        setSelectedPerms(role.permissions?.map((p) => p.id) ?? []);
      })
      .catch(() => setError(t('roles.notFound')));
    permissionsApi.list().then((res) => setAllPerms(res.data)).catch(() => {});
  }, [id, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    setLoading(true);
    try {
      await rolesApi.update(Number(id), { name, label });
      await rolesApi.updatePermissions(Number(id), selectedPerms);
      navigate(`/roles/${id}`);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'roles.updateError', t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>{t('roles.editTitle')}</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">{t('common.name')}</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="label">{t('roles.label')}</label>
          <input id="label" value={label} onChange={(e) => setLabel(e.target.value)} required />
        </div>
        <div>
          <label>{t('roles.permissions')}</label>
          {allPerms.map((perm) => (
            <label key={perm.id}>
              <input
                type="checkbox"
                checked={selectedPerms.includes(perm.id)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedPerms([...selectedPerms, perm.id]);
                  else setSelectedPerms(selectedPerms.filter((pid) => pid !== perm.id));
                }}
              />
              {perm.label}
            </label>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? t('common.saving') : t('common.save')}</button>
      </form>
    </div>
  );
}
