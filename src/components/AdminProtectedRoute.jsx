// ============================================================
// AdminProtectedRoute.jsx — Proteção de rotas administrativas
// ============================================================
// Verifica autenticação admin via backend /server (JWT).
// Não depende do Base44.
// ============================================================

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function AdminProtectedRoute() {
  const { isAuthenticated, user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.type !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}