import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { booksApi } from '@/services/books';
import { contributorsApi } from '@/services/contributors';
import { mediaApi } from '@/services/media';
import { announcementsApi } from '@/services/announcements';

type Health = 'loading' | 'ok' | 'error';

interface Counts {
  books: number | null;
  contributors: number | null;
  media: number | null;
  announcements: number | null;
}

const initialCounts: Counts = { books: null, contributors: null, media: null, announcements: null };

export default function Home() {
  const [health, setHealth] = useState<Health>('loading');
  const [counts, setCounts] = useState<Counts>(initialCounts);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    api.get('/health')
      .then((res) => setHealth(res.data.status === 'ok' ? 'ok' : 'error'))
      .catch(() => setHealth('error'));
  }, []);

  useEffect(() => {
    // Ask for a single row per collection and read the total from the
    // pagination metadata, so the dashboard does not pull whole tables.
    const perPage = { per_page: 1 };

    const readTotal = (result: unknown) =>
      (result as { meta?: { total?: number } })?.meta?.total ?? null;

    booksApi
      .list(perPage)
      .then((res) => setCounts((c) => ({ ...c, books: readTotal(res) })))
      .catch(() => {});
    contributorsApi
      .list(perPage)
      .then((res) => setCounts((c) => ({ ...c, contributors: readTotal(res) })))
      .catch(() => {});
    mediaApi
      .list(perPage)
      .then((res) => setCounts((c) => ({ ...c, media: readTotal(res) })))
      .catch(() => {});
    announcementsApi
      .list(perPage)
      .then((res) => setCounts((c) => ({ ...c, announcements: readTotal(res) })))
      .catch(() => {});
  }, []);

  const cards = [
    { to: '/books', label: t('nav.books'), value: counts.books },
    { to: '/contributors', label: t('nav.contributors'), value: counts.contributors },
    { to: '/media', label: t('nav.media'), value: counts.media },
    { to: '/announcements', label: t('nav.announcements'), value: counts.announcements },
  ];

  return (
    <div>
      <h1>{t('nav.dashboard')}</h1>

      <p className="status-line">
        <span className={`status-dot status-dot--${health}`} aria-hidden="true" />
        {t('home.apiStatus', { status: t(`home.status.${health}`) })}
      </p>

      <div className="stat-grid">
        {cards.map((card) => (
          <Link key={card.to} to={card.to} className="stat-card">
            <span className="stat-card__label">{card.label}</span>
            <div className="stat-card__value">
              {card.value === null ? '—' : new Intl.NumberFormat(i18n.language === 'fa' ? 'fa-IR' : 'en-US').format(card.value)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
