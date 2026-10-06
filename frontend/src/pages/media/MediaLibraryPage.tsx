import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mediaApi } from '@/services/media';
import { useAuth } from '@/hooks/useAuth';
import type { Media } from '@/types/Media';

export default function MediaLibraryPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [mimeFilter, setMimeFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const { hasPermission } = useAuth();
  const { t } = useTranslation();

  const load = () => {
    mediaApi
      .list({
        q: query || undefined,
        mime_type: mimeFilter || undefined,
        is_archived: showArchived ? true : undefined,
      })
      .then((res) => setItems(res.data))
      .catch(() => setError(t('media.loadError')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleBulkArchive = async () => {
    for (const id of selected) {
      try {
        await mediaApi.archive(id);
      } catch {
        // ignore per-item failures in bulk action
      }
    }
    setSelected([]);
    load();
  };

  if (loading) return <div>{t('media.listLoading')}</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <div>
      <h1>{t('media.title')}</h1>
      <div>
        <input
          aria-label={t('media.title')}
          placeholder={t('media.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input
          aria-label={t('media.mimeFilter')}
          placeholder={t('media.mimeFilter')}
          value={mimeFilter}
          onChange={(e) => setMimeFilter(e.target.value)}
        />
        <label>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          {t('media.showArchived')}
        </label>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load();
          }}
        >
          {t('common.filter')}
        </button>
      </div>
      {hasPermission('media.upload') && <Link to="/media/upload">{t('media.uploadLink')}</Link>}
      {selected.length > 0 && hasPermission('media.archive') && (
        <button type="button" onClick={handleBulkArchive}>
          {t('media.archiveSelected', { count: selected.length })}
        </button>
      )}
      {items.length === 0 ? (
        <div>{t('media.empty')}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {items.map((m) => (
            <div key={m.id} style={{ border: '1px solid #ccc', padding: 8 }}>
              <label>
                <input
                  type="checkbox"
                  checked={selected.includes(m.id)}
                  onChange={() => toggleSelect(m.id)}
                  aria-label={t('media.selectFile', { name: m.file_name })}
                />
              </label>
              {m.mime_type.startsWith('image/') ? (
                <img src={m.url} alt={m.alt_text ?? m.file_name} loading="lazy" decoding="async" style={{ maxWidth: '100%', height: 100, objectFit: 'cover' }} />
              ) : (
                <div>{t('media.documentIcon')}</div>
              )}
              <div>
                <Link to={`/media/${m.id}`}>{m.file_name}</Link>
              </div>
              <div>{m.mime_type}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
