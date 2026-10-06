import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { contributorsApi } from '@/services/contributors';
import { useAuth } from '@/hooks/useAuth';
import type { Contributor } from '@/types/Contributor';

export default function ContributorListPage() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const { hasPermission } = useAuth();
  const { t, i18n } = useTranslation();

  const load = useCallback(
    (q?: string) => {
      contributorsApi
        .list(q ? { q } : undefined)
        .then((res) => setContributors(res.data))
        .catch(() => setError(i18n.t('contributors.loadError')))
        .finally(() => setLoading(false));
    },
    [i18n],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div>{t('contributors.listLoading')}</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <div>
      <h1>{t('contributors.title')}</h1>
      <div>
        <input
          aria-label={t('contributors.searchPlaceholder')}
          placeholder={t('contributors.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load(query);
          }}
        >
          {t('common.search')}
        </button>
      </div>
      {hasPermission('contributors.create') && <Link to="/contributors/new">{t('contributors.createLink')}</Link>}
      {contributors.length === 0 ? (
        <div>{t('contributors.empty')}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('contributors.archived')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {contributors.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.is_archived ? '✓' : '—'}</td>
                <td>
                  <Link to={`/contributors/${c.id}`}>{t('common.view')}</Link>{' '}
                  <Link to={`/contributors/${c.id}/edit`}>{t('common.edit')}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
