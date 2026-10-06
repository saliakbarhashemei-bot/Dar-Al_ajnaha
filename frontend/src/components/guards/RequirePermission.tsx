import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import type { ReactNode } from 'react';

export function RequirePermission({ perm, children }: { perm: string; children: ReactNode }) {
  const { hasPermission, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) return <div>{t('common.loading')}</div>;
  if (!hasPermission(perm)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}
