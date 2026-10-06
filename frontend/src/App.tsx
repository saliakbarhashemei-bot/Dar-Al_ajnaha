import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from '@/hooks/useAuth';
import { AdminLayout } from '@/layouts/AdminLayout';
import { RequirePermission } from '@/components/guards/RequirePermission';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const Home = lazy(() => import('@/pages/Home'));
const UserListPage = lazy(() => import('@/pages/users/UserListPage'));
const UserCreatePage = lazy(() => import('@/pages/users/UserCreatePage'));
const UserDetailPage = lazy(() => import('@/pages/users/UserDetailPage'));
const UserEditPage = lazy(() => import('@/pages/users/UserEditPage'));
const RoleListPage = lazy(() => import('@/pages/roles/RoleListPage'));
const RoleCreatePage = lazy(() => import('@/pages/roles/RoleCreatePage'));
const RoleDetailPage = lazy(() => import('@/pages/roles/RoleDetailPage'));
const RoleEditPage = lazy(() => import('@/pages/roles/RoleEditPage'));
const ContributorListPage = lazy(() => import('@/pages/contributors/ContributorListPage'));
const ContributorCreatePage = lazy(() => import('@/pages/contributors/ContributorCreatePage'));
const ContributorDetailPage = lazy(() => import('@/pages/contributors/ContributorDetailPage'));
const ContributorEditPage = lazy(() => import('@/pages/contributors/ContributorEditPage'));
const BookListPage = lazy(() => import('@/pages/books/BookListPage'));
const BookCreatePage = lazy(() => import('@/pages/books/BookCreatePage'));
const BookDetailPage = lazy(() => import('@/pages/books/BookDetailPage'));
const BookEditPage = lazy(() => import('@/pages/books/BookEditPage'));
const MediaLibraryPage = lazy(() => import('@/pages/media/MediaLibraryPage'));
const MediaUploadPage = lazy(() => import('@/pages/media/MediaUploadPage'));
const MediaDetailPage = lazy(() => import('@/pages/media/MediaDetailPage'));
const MediaEditPage = lazy(() => import('@/pages/media/MediaEditPage'));
const AnnouncementListPage = lazy(() => import('@/pages/announcements/AnnouncementListPage'));
const AnnouncementCreatePage = lazy(() => import('@/pages/announcements/AnnouncementCreatePage'));
const AnnouncementDetailPage = lazy(() => import('@/pages/announcements/AnnouncementDetailPage'));
const AnnouncementEditPage = lazy(() => import('@/pages/announcements/AnnouncementEditPage'));

function App() {
  const { t } = useTranslation();

  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div>{t('common.loading')}</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AdminLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/users" element={<UserListPage />} />
              <Route path="/users/new" element={<RequirePermission perm="users.create"><UserCreatePage /></RequirePermission>} />
              <Route path="/users/:id" element={<UserDetailPage />} />
              <Route path="/users/:id/edit" element={<RequirePermission perm="users.edit"><UserEditPage /></RequirePermission>} />
              <Route path="/roles" element={<RoleListPage />} />
              <Route path="/roles/new" element={<RequirePermission perm="users.edit"><RoleCreatePage /></RequirePermission>} />
              <Route path="/roles/:id" element={<RoleDetailPage />} />
              <Route path="/roles/:id/edit" element={<RequirePermission perm="users.edit"><RoleEditPage /></RequirePermission>} />
              <Route path="/contributors" element={<ContributorListPage />} />
              <Route path="/contributors/new" element={<RequirePermission perm="contributors.create"><ContributorCreatePage /></RequirePermission>} />
              <Route path="/contributors/:id" element={<ContributorDetailPage />} />
              <Route path="/contributors/:id/edit" element={<RequirePermission perm="contributors.edit"><ContributorEditPage /></RequirePermission>} />
              <Route path="/books" element={<BookListPage />} />
              <Route path="/books/new" element={<RequirePermission perm="books.create"><BookCreatePage /></RequirePermission>} />
              <Route path="/books/:id" element={<BookDetailPage />} />
              <Route path="/books/:id/edit" element={<RequirePermission perm="books.edit"><BookEditPage /></RequirePermission>} />
              <Route path="/media" element={<MediaLibraryPage />} />
              <Route path="/media/upload" element={<RequirePermission perm="media.upload"><MediaUploadPage /></RequirePermission>} />
              <Route path="/media/:id" element={<MediaDetailPage />} />
              <Route path="/media/:id/edit" element={<RequirePermission perm="media.edit"><MediaEditPage /></RequirePermission>} />
              <Route path="/announcements" element={<AnnouncementListPage />} />
              <Route path="/announcements/new" element={<RequirePermission perm="announcements.create"><AnnouncementCreatePage /></RequirePermission>} />
              <Route path="/announcements/:id" element={<AnnouncementDetailPage />} />
              <Route path="/announcements/:id/edit" element={<RequirePermission perm="announcements.edit"><AnnouncementEditPage /></RequirePermission>} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
