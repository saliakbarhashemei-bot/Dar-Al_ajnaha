import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { emptyCollections, loadCollections, rowsFor, sectionKeys } from './panelData';
import type { Collections, SectionKey, ViewRow } from './panelData';
import type { Book } from '@/types/Book';
import type { Announcement } from '@/types/Announcement';
import type { Media } from '@/types/Media';
import type { Contributor } from '@/types/Contributor';
import type { User } from '@/types/User';

type IconName = 'grid' | 'book' | 'media' | 'users' | 'pen' | 'news' | 'shield' | 'search' | 'bell' | 'plus' | 'arrow' | 'menu' | 'close' | 'moon' | 'sun' | 'chevron' | 'spark' | 'upload' | 'layers' | 'chart' | 'clock' | 'file' | 'refresh';
const iconPaths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10h6"/></>,
  media: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m4 17 5-5 3.5 3.5 2-2L20 19"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1H3ZM16 5.2a3 3 0 0 1 0 5.6M18 14a5 5 0 0 1 3 5v1h-3"/></>,
  pen: <><path d="M12 20h9M4 17.5 16.7 4.8a2 2 0 0 1 2.8 2.8L6.8 20.3 3 21l1-3.5Z"/></>,
  news: <><path d="M3 10v4h4l11 5V5L7 10H3ZM7 14l2 6h3M21 9v6"/></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>, arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>, close: <path d="M5 5 19 19M19 5 5 19"/>,
  moon: <path d="M20 16.2A8.5 8.5 0 0 1 7.8 4a8.5 8.5 0 1 0 12.4 12.2Z"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>, spark: <path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2L12 2Z"/>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/></>,
  chart: <><path d="M4 20V10M10 20V5M16 20v-7M22 20V8"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  file: <><path d="M6 2h9l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v5h5M8 12h8M8 16h8"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"/></>,
};
function Icon({ name, size = 19 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>;
}

const sections: Record<SectionKey, { title: string; singular: string; description: string; icon: IconName }> = {
  books: { title: 'کتاب‌ها', singular: 'کتاب', description: 'عنوان‌ها، وضعیت نشر و دسته‌بندی کتاب‌ها', icon: 'book' },
  media: { title: 'رسانه‌ها', singular: 'رسانه', description: 'تصاویر، اسناد و فایل‌های کتابخانه', icon: 'media' },
  users: { title: 'کاربران', singular: 'کاربر', description: 'اعضا و حساب‌های کاربری', icon: 'users' },
  contributors: { title: 'پدیدآورندگان', singular: 'پدیدآورنده', description: 'نویسندگان، مترجمان و همکاران نشر', icon: 'pen' },
  announcements: { title: 'اطلاعیه‌ها', singular: 'اطلاعیه', description: 'خبرها، رویدادها و پیام‌های نشر', icon: 'news' },
  roles: { title: 'نقش‌ها و دسترسی‌ها', singular: 'نقش', description: 'نقش‌های تعریف‌شده در سیستم', icon: 'shield' },
};
const primaryNav: { key: SectionKey | 'dashboard'; label: string; to: string; icon: IconName }[] = [
  { key: 'dashboard', label: 'داشبورد', to: '/', icon: 'grid' },
  { key: 'books', label: 'کتاب‌ها', to: '/books', icon: 'book' },
  { key: 'media', label: 'رسانه‌ها', to: '/media', icon: 'media' },
  { key: 'users', label: 'کاربران', to: '/users', icon: 'users' },
  { key: 'contributors', label: 'پدیدآورندگان', to: '/contributors', icon: 'pen' },
  { key: 'announcements', label: 'اطلاعیه‌ها', to: '/announcements', icon: 'news' },
];
const faNumber = (value: number) => new Intl.NumberFormat('fa-IR').format(value);
const accessibleCount = (collection: Collections[SectionKey]) => collection.loading ? '…' : collection.error || collection.total == null ? '—' : faNumber(collection.total);
const isSuccess = (value: string) => value === 'منتشر شده' || value === 'فعال';
function Badge({ value }: { value: string }) { return <span className={`ad-badge ${isSuccess(value) ? 'ad-badge--success' : value.includes('انتظار') || value.includes('زمان‌بندی') ? 'ad-badge--pending' : 'ad-badge--neutral'}`}><i/>{value}</span>; }

function Shell({ children, data, onRefresh }: { children: ReactNode; data: Collections; onRefresh: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('dar-admin-sidebar') === 'collapsed'; } catch { return false; }
  });
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem('dar-admin-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname.slice(1) as SectionKey;
  useEffect(() => { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'fa'; }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('dar-admin-theme', theme); } catch { /* local storage may be unavailable */ } }, [theme]);
  useEffect(() => { try { localStorage.setItem('dar-admin-sidebar', collapsed ? 'collapsed' : 'expanded'); } catch { /* local storage may be unavailable */ } }, [collapsed]);
  return <div className={`ad-app ${collapsed ? 'ad-app--collapsed' : ''}`}>
    {menuOpen && <button className="ad-scrim" aria-label="بستن فهرست" onClick={() => setMenuOpen(false)}/>}
    <aside className={`ad-sidebar ${menuOpen ? 'ad-sidebar--open' : ''}`}>
      <Link className="ad-brand" to="/" aria-label="دار الأجنحة؛ بازگشت به داشبورد" onClick={() => setMenuOpen(false)}><span className="ad-brand-logo"><Icon name="book" size={25}/></span><span><strong>دار الأجنحة</strong><small>سامانه مدیریت نشر</small></span></Link>
      <span className="ad-nav-caption">منوی اصلی</span>
      <nav className="ad-nav" aria-label="فهرست اصلی">{primaryNav.map(item => <NavLink key={item.to} to={item.to} title={item.label} end={item.to === '/'} onClick={() => setMenuOpen(false)} className={({ isActive }) => `ad-nav-link ${isActive ? 'ad-nav-link--active' : ''}`}><Icon name={item.icon}/><span>{item.label}</span></NavLink>)}</nav>
      <span className="ad-nav-caption ad-nav-caption--second">سیستم</span>
      <NavLink to="/roles" title="نقش‌ها و دسترسی‌ها" onClick={() => setMenuOpen(false)} className={({ isActive }) => `ad-nav-link ${isActive ? 'ad-nav-link--active' : ''}`}><Icon name="shield"/><span>نقش‌ها و دسترسی‌ها</span></NavLink>
      <div className="ad-sidebar-bottom"><button type="button" className="ad-sidebar-toggle" aria-label={collapsed ? 'باز کردن سایدبار' : 'جمع کردن سایدبار'} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}><Icon name="chevron" size={18}/><span>{collapsed ? 'باز کردن منو' : 'جمع کردن منو'}</span></button><div className="ad-sidebar-foot"><span className="ad-profile-mark"><Icon name="shield" size={18}/></span><span><strong>پنل مدیریت</strong><small>دار الأجنحة</small></span></div></div>
    </aside>
    <div className="ad-main"><header className="ad-topbar"><button className="ad-icon-button ad-menu-button" aria-label="باز کردن فهرست" onClick={() => setMenuOpen(true)}><Icon name="menu"/></button><form className="ad-top-search" onSubmit={event => { event.preventDefault(); navigate(`/books?q=${encodeURIComponent(search)}`); }}><Icon name="search" size={19}/><input aria-label="جست‌وجو در کتاب‌ها" placeholder="جست‌وجو در کتاب‌ها..." value={search} onChange={event => setSearch(event.target.value)}/><kbd>↵</kbd></form><div className="ad-top-actions"><button className="ad-icon-button" aria-label="بازخوانی داده‌ها" title="بازخوانی داده‌ها" onClick={onRefresh}><Icon name="refresh"/></button><button className="ad-icon-button" aria-label={theme === 'light' ? 'فعال کردن حالت تاریک' : 'فعال کردن حالت روشن'} title={theme === 'light' ? 'حالت تاریک' : 'حالت روشن'} onClick={() => setTheme(current => current === 'light' ? 'dark' : 'light')}><Icon name={theme === 'light' ? 'moon' : 'sun'}/></button><Link className="ad-icon-button" aria-label="اطلاعیه‌ها" to="/announcements"><Icon name="bell"/></Link><span className="ad-profile"><span className="ad-profile-mark"><Icon name="shield" size={18}/></span><span><strong>پنل مدیریت</strong><small>{sections[active]?.title ?? 'داشبورد'}</small></span></span></div></header><main className="ad-content">{children}</main></div>
    <span className="ad-sr-only">{sectionKeys.filter(key => data[key].error).length} بخش به داده‌ها دسترسی ندارد</span>
  </div>;
}

function Header({ kicker, title, description, action, onAction }: { kicker?: string; title: string; description?: string; action?: string; onAction?: () => void }) {
  return <div className="ad-page-header"><div>{kicker && <span className="ad-kicker">{kicker}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <button className="ad-primary" onClick={onAction}><Icon name="plus" size={17}/>{action}</button>}</div>;
}
const emptyCopy: Record<SectionKey | 'recent', { icon: IconName; title: string; hint: string }> = {
  books: { icon: 'book', title: 'هنوز کتابی ثبت نشده', hint: 'کتاب‌های مجموعه پس از ثبت در این فهرست دیده می‌شوند.' },
  media: { icon: 'media', title: 'کتابخانهٔ رسانه خالی است', hint: 'تصاویر و فایل‌های بارگذاری‌شده اینجا نمایش داده می‌شوند.' },
  users: { icon: 'users', title: 'کاربری برای نمایش نیست', hint: 'حساب‌های کاربری سامانه در این بخش قرار می‌گیرند.' },
  contributors: { icon: 'pen', title: 'پدیدآورنده‌ای ثبت نشده', hint: 'نویسندگان و دیگر همکاران نشر اینجا نمایش داده می‌شوند.' },
  announcements: { icon: 'news', title: 'اطلاعیه‌ای ثبت نشده', hint: 'خبرها و رویدادهای مجموعه در این بخش قرار می‌گیرند.' },
  roles: { icon: 'shield', title: 'نقشی برای نمایش نیست', hint: 'نقش‌ها و دسترسی‌های تعریف‌شده اینجا دیده می‌شوند.' },
  recent: { icon: 'clock', title: 'فعالیتی برای نمایش نیست', hint: 'تغییرات تازهٔ کتاب‌ها و اطلاعیه‌ها در این فهرست قرار می‌گیرند.' },
};
function EmptyPanel({ kind, loading, error, filtered = false }: { kind: SectionKey | 'recent'; loading: boolean; error: boolean; filtered?: boolean }) {
  const copy = emptyCopy[kind];
  return <div className="ad-empty"><span className="ad-empty-icon"><Icon name={filtered ? 'search' : copy.icon} size={23}/></span><strong>{loading ? 'در حال بارگذاری…' : error ? `${sections[kind as SectionKey]?.title ?? 'فعالیت‌های اخیر'} در دسترس نیست` : filtered ? 'نتیجه‌ای پیدا نشد' : copy.title}</strong><p>{loading ? 'اطلاعات این بخش در حال دریافت است.' : error ? 'اتصال داده برقرار نیست؛ ساختار این بخش برای نمایش اطلاعات آماده است.' : filtered ? 'عبارت جست‌وجو یا فیلتر را تغییر دهید.' : copy.hint}</p></div>;
}
function SectionHeading({ title, subtitle, to }: { title: string; subtitle?: string; to?: string }) {
  return <div className="ad-panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{to && <Link to={to}>مشاهده همه <Icon name="arrow" size={16}/></Link>}</div>;
}
function RecordAvatar({ icon, image, title, className = '' }: { icon: IconName; image?: string; title: string; className?: string }) {
  return <span className={`ad-record-avatar ${className}`}>{image ? <img src={image} alt="" loading="lazy"/> : <Icon name={icon} size={19}/>}<span className="ad-sr-only">{title}</span></span>;
}
function DistributionCard({ data }: { data: Collections }) {
  const keys: SectionKey[] = ['books', 'media', 'contributors', 'users'];
  const ready = keys.every(key => !data[key].loading && !data[key].error);
  const counts = [
    (data.books.items as Book[]).filter(item => item.status === 'Published').length,
    (data.media.items as Media[]).filter(item => !item.is_archived).length,
    (data.contributors.items as Contributor[]).filter(item => !item.is_archived).length,
    (data.users.items as User[]).filter(item => item.is_active).length,
  ];
  const total = counts.reduce((sum, count) => sum + count, 0);
  const available = ready && total > 0;
  const labels = ['کتاب‌ها', 'رسانه‌ها', 'پدیدآورندگان', 'کاربران'];
  const colorKeys = ['books', 'media', 'contributors', 'users'];
  const circumference = 2 * Math.PI * 48;
  let position = 0;
  const segments = counts.map((count, index) => {
    const start = position;
    const length = available ? count / total * circumference : 0;
    position += length;
    return { key: colorKeys[index], start, length };
  });
  const limited = keys.some(key => (data[key].total ?? 0) > data[key].items.length);
  const note = !ready ? 'برای محاسبهٔ سهم، دادهٔ هر چهار بخش لازم است.' : !available ? 'پس از ثبت یا انتشار موارد، سهم هر بخش نمایش داده می‌شود.' : limited ? 'درصدها بر اساس موارد دریافت‌شده محاسبه شده‌اند.' : 'درصدها از کتاب‌های منتشرشده و موارد فعال محاسبه شده‌اند.';
  return <section className="ad-panel ad-progress">
    <SectionHeading title="سهم بخش‌های فعال" subtitle="کتاب‌های منتشرشده و موارد فعال سامانه"/>
    <div className="ad-distribution">
      <div className="ad-distribution-chart" role="img" aria-label={available ? `ترکیب ${faNumber(total)} مورد از چهار بخش سامانه` : 'هنوز دادهٔ کافی برای نمودار وجود ندارد'}>
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="ad-distribution-track" cx="60" cy="60" r="48"/>{available && segments.filter(segment => segment.length > 0).map(segment => <circle key={segment.key} className={`ad-distribution-segment ad-distribution-segment--${segment.key}`} cx="60" cy="60" r="48" strokeDasharray={`${Math.max(0, segment.length - 2)} ${circumference}`} strokeDashoffset={-segment.start}/>)}</svg>
        <span className="ad-distribution-center"><strong>{available ? faNumber(total) : '—'}</strong><small>{available ? 'مورد فعال' : 'بدون داده'}</small></span>
      </div>
      <div className="ad-distribution-legend">{labels.map((label, index) => <div key={label} className="ad-distribution-item"><i className={`ad-distribution-dot ad-distribution-dot--${colorKeys[index]}`}/><span>{label}</span><strong>{available ? `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format((counts[index] ?? 0) / total * 100)}٪` : '—'}</strong></div>)}</div>
    </div>
    <p className="ad-distribution-note">{note}</p>
  </section>;
}
function Dashboard({ data }: { data: Collections }) {
  const navigate = useNavigate();
  const bookItems = data.books.items as Book[];
  const announcementItems = data.announcements.items as Announcement[];
  const bookRows = rowsFor('books', bookItems);
  const contributorRows = rowsFor('contributors', data.contributors.items);
  const recentRows = [
    ...bookRows.map(row => ({ ...row, section: 'books' as const, icon: 'book' as const })),
    ...rowsFor('announcements', announcementItems).map(row => ({ ...row, section: 'announcements' as const, icon: 'news' as const })),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4);
  const reviewBooks = bookItems.filter(book => book.status === 'Review' || book.status === 'Scheduled');
  const reviewAnnouncements = announcementItems.filter(item => item.status === 'Review' || item.status === 'Scheduled');
  const statusBars = [
    { key: 'Draft', label: 'پیش‌نویس' }, { key: 'Review', label: 'بررسی' },
    { key: 'Scheduled', label: 'زمان‌بندی' }, { key: 'Published', label: 'منتشر' },
    { key: 'Archived', label: 'بایگانی' },
  ].map(item => ({ ...item, count: bookItems.filter(book => book.status === item.key).length }));
  const maxBar = Math.max(1, ...statusBars.map(item => item.count));
  const chartAvailable = !data.books.error && !data.books.loading && bookItems.length > 0;
  const pendingKnown = !data.books.error && !data.announcements.error && !data.books.loading && !data.announcements.loading;
  const stats: { to: string; icon: IconName; label: string; value: string; note: string }[] = [
    { to: '/books', icon: 'book', label: 'کتاب‌ها', value: accessibleCount(data.books), note: 'عنوان ثبت‌شده' },
    { to: '/media', icon: 'media', label: 'رسانه‌ها', value: accessibleCount(data.media), note: 'فایل در کتابخانه' },
    { to: '/contributors', icon: 'pen', label: 'پدیدآورندگان', value: accessibleCount(data.contributors), note: 'همکار نشر' },
    { to: '/users', icon: 'users', label: 'کاربران', value: accessibleCount(data.users), note: 'حساب کاربری' },
  ];
  return <>
    <div className="ad-dashboard-heading"><header className="ad-dashboard-intro"><p>پنل مدیریت دار الاجنحه</p></header><button className="ad-primary" onClick={() => navigate('/books?new=1')}><Icon name="plus" size={17}/>افزودن کتاب</button></div>
    <div className="ad-stat-grid">{stats.map((stat, index) => <Link to={stat.to} className={`ad-stat ${index === 0 ? 'ad-stat--primary' : ''}`} key={stat.to}><div className="ad-stat-top"><span className="ad-stat-icon"><Icon name={stat.icon} size={20}/></span><span className="ad-stat-arrow"><Icon name="arrow" size={17}/></span></div><span className="ad-stat-label">{stat.label}</span><strong>{stat.value}</strong><small>{stat.value === '—' ? 'داده در دسترس نیست' : stat.value === '…' ? 'در حال دریافت داده' : stat.note}</small></Link>)}</div>
    <div className="ad-bento">
      <section className="ad-panel ad-analytics"><SectionHeading title="وضعیت نشر کتاب‌ها" subtitle="پراکندگی کتاب‌ها بر اساس مراحل نشر" to="/books"/>{chartAvailable ? <div className="ad-chart" role="img" aria-label="تعداد کتاب‌ها بر اساس وضعیت نشر"><div className="ad-chart-grid"><i/><i/><i/></div>{statusBars.map((bar, index) => <div className="ad-chart-column" key={bar.key}><strong>{faNumber(bar.count)}</strong><div className={`ad-chart-bar ad-chart-bar--${index}`} style={{ height: `${Math.max(4, bar.count / maxBar * 100)}%` }}/><span>{bar.label}</span></div>)}</div> : <div className="ad-chart-empty"><Icon name="chart" size={22}/><span>{data.books.loading ? 'نمودار در حال آماده‌سازی است' : data.books.error ? 'برای نمایش نمودار، دادهٔ کتاب لازم است' : 'هنوز کتابی برای تحلیل وجود ندارد'}</span></div>}<p className="ad-chart-note">{chartAvailable && data.books.total && data.books.total > bookItems.length ? `بر اساس ${faNumber(bookItems.length)} کتاب نخست` : 'وضعیت‌های نشر از ساختار کتاب‌های پروژه گرفته شده‌اند.'}</p></section>
      <section className="ad-panel ad-review"><SectionHeading title="در انتظار پیگیری" subtitle="کتاب‌ها و اطلاعیه‌های نیازمند بررسی"/><div className="ad-review-number">{pendingKnown ? faNumber(reviewBooks.length + reviewAnnouncements.length) : '—'}<span>مورد</span></div>{pendingKnown && reviewBooks.length + reviewAnnouncements.length ? <div className="ad-review-list">{[...reviewBooks.map(book => ({ title: book.title, type: 'کتاب', to: '/books' })), ...reviewAnnouncements.map(item => ({ title: item.title, type: 'اطلاعیه', to: '/announcements' }))].slice(0, 3).map((item, index) => <Link to={item.to} key={`${item.title}-${index}`}><span>{item.title}</span><small>{item.type}</small></Link>)}</div> : <p className="ad-review-note">{pendingKnown ? 'موردی برای پیگیری وجود ندارد.' : 'پس از اتصال داده‌ها، موارد اینجا نمایش داده می‌شوند.'}</p>}<Link className="ad-soft-button" to="/announcements">مرور اطلاعیه‌ها <Icon name="arrow" size={16}/></Link></section>
      <section className="ad-panel ad-latest"><SectionHeading title="آخرین کتاب‌ها" subtitle="تازه‌ترین عنوان‌های مجموعه" to="/books"/>{bookRows.length ? <div className="ad-mini-list">{bookRows.slice(0, 5).map(row => <Link to="/books" key={row.id}><RecordAvatar icon="book" image={row.image} title={row.title}/><span><strong>{row.title}</strong><small>{row.detail}</small></span><Badge value={row.status}/></Link>)}</div> : <EmptyPanel kind="books" loading={data.books.loading} error={data.books.error}/>}</section>
      <section className="ad-panel ad-people"><SectionHeading title="پدیدآورندگان" subtitle="اعضای ثبت‌شده در مجموعه" to="/contributors"/>{contributorRows.length ? <div className="ad-people-list">{contributorRows.slice(0, 4).map(row => <Link to="/contributors" key={row.id}><RecordAvatar icon="pen" image={row.image} title={row.title}/><span><strong>{row.title}</strong><small>{row.detail}</small></span><Icon name="chevron" size={16}/></Link>)}</div> : <EmptyPanel kind="contributors" loading={data.contributors.loading} error={data.contributors.error}/>}</section>
      <DistributionCard data={data}/>
      <section className="ad-panel ad-quick"><SectionHeading title="اقدام سریع" subtitle="کارهای پرکاربرد مدیریت"/><div className="ad-quick-actions"><Link to="/books?new=1"><Icon name="book" size={17}/><span>افزودن کتاب</span><Icon name="arrow" size={15}/></Link><Link to="/media?new=1"><Icon name="upload" size={17}/><span>افزودن رسانه</span><Icon name="arrow" size={15}/></Link><Link to="/announcements?new=1"><Icon name="news" size={17}/><span>اطلاعیه جدید</span><Icon name="arrow" size={15}/></Link></div></section>
    </div>
    <section className="ad-panel ad-activity"><SectionHeading title="فعالیت‌های اخیر" subtitle="آخرین تغییرات کتاب‌ها و اطلاعیه‌ها" to="/books"/>{recentRows.length ? <div className="ad-activity-list">{recentRows.map(row => <Link to={`/${row.section}`} key={`${row.section}-${row.id}`}><RecordAvatar icon={row.icon} image={row.image} title={row.title}/><span><strong>{row.title}</strong><small>{row.section === 'books' ? 'کتاب' : 'اطلاعیه'} · {row.date}</small></span><Badge value={row.status}/></Link>)}</div> : <EmptyPanel kind="recent" loading={data.books.loading || data.announcements.loading} error={data.books.error && data.announcements.error}/>}</section>
  </>;
}

function CategoryPage({ data }: { data: Collections }) {
  const { section } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const key = section as SectionKey;
  const config = sections[key];
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('q') ?? '');
  const [filter, setFilter] = useState('همه');
  const [grid, setGrid] = useState(false);
  const [selected, setSelected] = useState<ViewRow | null>(null);
  if (!config) return <Navigate to="/" replace/>;
  const collection = data[key];
  const rows = rowsFor(key, collection.items);
  const filters = ['همه', ...new Set(rows.map(row => row.status))];
  const shown = rows.filter(row => (filter === 'همه' || row.status === filter) && `${row.title} ${row.detail} ${row.category}`.toLocaleLowerCase('fa').includes(query.toLocaleLowerCase('fa')));
  const creating = new URLSearchParams(location.search).has('new');
  return <>
    <Header kicker={`داشبورد / ${config.title}`} title={config.title} description={config.description} action={`افزودن ${config.singular}`} onAction={() => navigate(`/${key}?new=1`)}/>
    <div className="ad-category-summary"><span className="ad-summary-icon"><Icon name={config.icon} size={23}/></span><span><strong>{accessibleCount(collection)} مورد</strong><small>در بخش {config.title}</small></span><span className="ad-summary-note">{collection.error ? 'اتصال به داده‌ها برقرار نیست' : collection.loading ? 'در حال دریافت داده‌ها' : collection.total != null && collection.total > collection.items.length ? `نمایش ${faNumber(collection.items.length)} مورد نخست` : 'داده‌های ثبت‌شده در سامانه'}</span></div>
    <section className="ad-panel ad-category-panel"><div className="ad-category-toolbar"><div className="ad-tabs">{filters.map(value => <button key={value} className={filter === value ? 'ad-tab--active' : ''} onClick={() => setFilter(value)}>{value}</button>)}</div><div className="ad-list-actions"><label className="ad-list-search"><Icon name="search" size={17}/><input aria-label={`جست‌وجو در ${config.title}`} placeholder="جست‌وجو..." value={query} onChange={event => setQuery(event.target.value)}/></label>{key === 'media' && <div className="ad-view-toggle"><button aria-label="نمای فهرست" className={!grid ? 'is-active' : ''} onClick={() => setGrid(false)}><Icon name="menu" size={16}/></button><button aria-label="نمای شبکه" className={grid ? 'is-active' : ''} onClick={() => setGrid(true)}><Icon name="grid" size={16}/></button></div>}</div></div>
      {shown.length === 0 ? <EmptyPanel kind={key} loading={collection.loading} error={collection.error} filtered={rows.length > 0}/> : grid && key === 'media' ? <div className="ad-media-grid">{shown.map(row => <button key={row.id} className="ad-media-tile" onClick={() => setSelected(row)}><span>{row.image ? <img src={row.image} alt="" loading="lazy"/> : <Icon name="file" size={32}/>}</span><strong>{row.title}</strong><small>{row.category}</small></button>)}</div> : <div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>نام / عنوان</th><th>دسته‌بندی</th><th>وضعیت</th><th>آخرین تغییر</th><th><span className="ad-sr-only">جزئیات</span></th></tr></thead><tbody>{shown.map(row => <tr key={row.id}><td><button className="ad-row-main" onClick={() => setSelected(row)}><RecordAvatar icon={config.icon} image={row.image} title={row.title}/><span><strong>{row.title}</strong><small>{row.detail}</small></span></button></td><td><span className="ad-type-pill">{row.category}</span></td><td><Badge value={row.status}/></td><td>{row.date}</td><td><button className="ad-row-open" aria-label={`نمایش ${row.title}`} onClick={() => setSelected(row)}><Icon name="arrow" size={17}/></button></td></tr>)}</tbody></table></div>}
      <div className="ad-table-footer"><span>نمایش {faNumber(shown.length)} مورد</span><span>{collection.total != null ? `مجموع ${faNumber(collection.total)} مورد` : 'مجموع نامشخص'}</span></div></section>
    {creating && <div className="ad-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) navigate(`/${key}`); }}><div className="ad-modal" role="dialog" aria-modal="true" aria-labelledby="new-title"><button className="ad-modal-close" aria-label="بستن" onClick={() => navigate(`/${key}`)}><Icon name="close"/></button><span className="ad-modal-icon"><Icon name={config.icon} size={24}/></span><h2 id="new-title">افزودن {config.singular}</h2><p>نمای اولیهٔ فرم {config.singular} آماده است. فیلدها و ذخیره‌سازی این بخش در مرحلهٔ مدیریت تکمیل می‌شوند.</p><label htmlFor="draft-title">عنوان {config.singular}</label><input id="draft-title" placeholder={`عنوان ${config.singular}`} autoFocus/><div className="ad-modal-actions"><button className="ad-secondary" onClick={() => navigate(`/${key}`)}>بستن</button><button className="ad-primary" disabled>ذخیره در مرحلهٔ بعد</button></div></div></div>}
    {selected && <div className="ad-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}><div className="ad-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><button className="ad-modal-close" aria-label="بستن" onClick={() => setSelected(null)}><Icon name="close"/></button><span className="ad-modal-icon"><Icon name={config.icon} size={24}/></span><h2 id="detail-title">{selected.title}</h2><p>{selected.detail}</p><div className="ad-detail-list"><div><span>دسته‌بندی</span><strong>{selected.category}</strong></div><div><span>وضعیت</span><Badge value={selected.status}/></div><div><span>آخرین تغییر</span><strong>{selected.date}</strong></div></div><button className="ad-secondary" onClick={() => setSelected(null)}>بستن</button></div></div>}
  </>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<Collections>(emptyCollections);
  const [revision, setRevision] = useState(0);
  useEffect(() => { let cancelled = false; loadCollections().then(result => { if (!cancelled) setData(result); }); return () => { cancelled = true; }; }, [revision]);
  const refresh = () => { setData(emptyCollections()); setRevision(value => value + 1); };
  return <BrowserRouter><Shell data={data} onRefresh={refresh}><Routes><Route path="/" element={<Dashboard data={data}/>}/><Route path="/:section" element={<CategoryRoute data={data}/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Shell></BrowserRouter>;
}

function CategoryRoute({ data }: { data: Collections }) {
  const { section } = useParams();
  const location = useLocation();
  const query = new URLSearchParams(location.search).get('q') ?? '';
  return <CategoryPage key={`${section}:${query}`} data={data}/>;
}
