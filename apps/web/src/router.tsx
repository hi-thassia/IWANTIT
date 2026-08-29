import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SecurityPage } from '@/pages/SecurityPage';
import { WishesPage } from '@/pages/WishesPage';
import { AlertsPage } from '@/pages/AlertsPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/entrar" replace /> },
  { path: '/entrar', element: <LoginPage /> },
  { path: '/criar-conta', element: <RegisterPage /> },
  { path: '/esqueci-a-senha', element: <ForgotPasswordPage /> },
  { path: '/redefinir-senha', element: <ResetPasswordPage /> },
  { path: '/onboarding', element: <ProtectedRoute><OnboardingPage /></ProtectedRoute> },
  { path: '/app', element: <ProtectedRoute><OnboardingGate><HomePage /></OnboardingGate></ProtectedRoute> },
  { path: '/perfil', element: <ProtectedRoute><OnboardingGate><ProfilePage /></OnboardingGate></ProtectedRoute> },
  { path: '/desejos', element: <ProtectedRoute><OnboardingGate><WishesPage /></OnboardingGate></ProtectedRoute> },
  { path: '/desejos/novo', element: <ProtectedRoute><OnboardingGate><WishesPage /></OnboardingGate></ProtectedRoute> },
  { path: '/desejos/:id', element: <ProtectedRoute><OnboardingGate><WishesPage /></OnboardingGate></ProtectedRoute> },
  { path: '/alertas', element: <ProtectedRoute><OnboardingGate><AlertsPage /></OnboardingGate></ProtectedRoute> },
  { path: '/seguranca', element: <ProtectedRoute><OnboardingGate><SecurityPage /></OnboardingGate></ProtectedRoute> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
