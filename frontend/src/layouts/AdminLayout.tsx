import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export function AdminLayout() {
  const { user, logout, hasPermission } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: t('nav.dashboard'), perm: null, end: true },
    { to: '/books', label: t('nav.books'), perm: 'books.create' },
    { to: '/contributors', label: t('nav.contributors'), perm: 'contributors.create' },
    { to: '/media', label: t('nav.media'), perm: 'media.upload' },
    { to: '/announcements', label: t('nav.announcements'), perm: 'announcements.create' },
    { to: '/users', label: t('nav.users'), perm: 'users.create' },
    { to: '/roles', label: t('nav.roles'), perm: 'users.edit' },
  ].filter((item) => item.perm === null || hasPermission(item.perm));

  const linkClass = ({ isActive }: { isActive: boolean }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`;

  return (
    <div className={`app-shell${navOpen ? ' app-shell--nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar__brand">{t('common.appName')}</div>

        <nav className="sidebar__nav" aria-label={t('nav.primary')}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={() => setNavOpen(false)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-body">
        <header className="topbar">
          <button
            type="button"
            className="topbar__nav-toggle"
            aria-expanded={navOpen}
            aria-label={t('nav.toggle')}
            onClick={() => setNavOpen((open) => !open)}
          >
            <span aria-hidden="true">☰</span>
          </button>

          <div className="topbar__actions">
            <div className="lang-switch" role="group" aria-label={t('common.language')}>
              <button
                type="button"
                onClick={() => void i18n.changeLanguage('fa')}
                disabled={i18n.language === 'fa'}
                aria-pressed={i18n.language === 'fa'}
              >
                فارسی
              </button>
              <button
                type="button"
                onClick={() => void i18n.changeLanguage('en')}
                disabled={i18n.language === 'en'}
                aria-pressed={i18n.language === 'en'}
              >
                EN
              </button>
            </div>

            {user && <span className="topbar__user">{user.name}</span>}

            <button type="button" onClick={handleLogout}>
              {t('common.logout')}
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
