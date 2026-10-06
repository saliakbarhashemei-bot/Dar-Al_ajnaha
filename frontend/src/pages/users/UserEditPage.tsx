import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usersApi } from '@/services/users';
import type { User } from '@/types/User';
import { apiErrorMessage } from '@/utils/apiError';

export default function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!id) return;
    usersApi.get(Number(id))
      .then((user: User) => {
        setName(user.name);
        setEmail(user.email);
      })
      .catch(() => setError(t('users.notFound')));
  }, [id, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    setLoading(true);
    try {
      const data: Partial<{ name: string; email: string; password: string; password_confirmation: string }> = { name, email };
      if (password) {
        data.password = password;
        data.password_confirmation = passwordConfirmation;
      }
      await usersApi.update(Number(id), data);
      navigate(`/users/${id}`);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'users.updateError', t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>{t('users.editTitle')}</h1>
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
          <label htmlFor="password">{t('users.newPassword')}</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password_confirmation">{t('users.confirmNewPassword')}</label>
          <input id="password_confirmation" type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? t('common.saving') : t('common.save')}</button>
      </form>
    </div>
  );
}
