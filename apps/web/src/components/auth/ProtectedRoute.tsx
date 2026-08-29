import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Loading } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main className="route-loading"><Loading label="Verificando sua sessão" /></main>;
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  return children;
}
