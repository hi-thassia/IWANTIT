import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  return children;
}
