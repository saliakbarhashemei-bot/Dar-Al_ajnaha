import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { announcementsApi } from '@/services/announcements';
import { useAuth } from '@/hooks/useAuth';
import type { Announcement } from '@/types/Announcement';

export default function AnnouncementListPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const { hasPermission } = useAuth();
  const { t, i18n } = useTranslation();

  const load = useCallback(
    (q?: string) => {
      announcementsApi
        .list(q ? { q } : undefined)
        .then((res) => setItems(res.data))
        .catch(() => setError(i18n.t('announcements.loadError')))
        .finally(() => setLoading(false));
    },
    [i18n],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div>{t('announcements.listLoading')}</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <div>
      <h1>{t('announcements.title')}</h1>
      <div>
        <input
          aria-label={t('announcements.title')}
          placeholder={t('announcements.searchPlaceholder')}
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
      {hasPermission('announcements.create') && <Link to="/announcements/new">{t('announcements.createLink')}</Link>}
      {items.length === 0 ? (
        <div>{t('announcements.empty')}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('announcements.type')}</th>
              <th>{t('common.status')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td>{a.type}</td>
                <td>{a.status}</td>
                <td>
                  <Link to={`/announcements/${a.id}`}>{t('common.view')}</Link>{' '}
                  <Link to={`/announcements/${a.id}/edit`}>{t('common.edit')}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
