import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usersApi } from '@/services/users';
import { rolesApi } from '@/services/roles';
import type { Role } from '@/types/User';
import { apiErrorMessage } from '@/utils/apiError';

export default function UserCreatePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    rolesApi.list().then((res) => setRoles(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await usersApi.create({ name, email, password, password_confirmation: passwordConfirmation, role_ids: roleIds });
      navigate('/users');
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'users.createError', t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>{t('users.createTitle')}</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">{t('common.name')}</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="email">{t('common.email')}</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="password">{t('users.password')}</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="password_confirmation">{t('users.confirmPassword')}</label>
          <input id="password_confirmation" type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} required />
        </div>
        <div>
          <label>{t('users.roles')}</label>
          {roles.map((role) => (
            <label key={role.id}>
              <input
                type="checkbox"
                checked={roleIds.includes(role.id)}
                onChange={(e) => {
                  if (e.target.checked) setRoleIds([...roleIds, role.id]);
                  else setRoleIds(roleIds.filter((id) => id !== role.id));
                }}
              />
              {role.label}
            </label>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? t('common.creating') : t('common.create')}</button>
      </form>
    </div>
  );
}
