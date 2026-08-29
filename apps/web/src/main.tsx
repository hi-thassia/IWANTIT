import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { router } from './router';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider><AuthProvider><RouterProvider router={router} /></AuthProvider></ThemeProvider>
  </StrictMode>,
);
