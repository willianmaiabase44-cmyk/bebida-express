import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import { CartProvider } from '@/context/CartContext';

// Public pages
import Store from '@/pages/Store';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Admin pages
import AdminLayout from '@/components/admin/AdminLayout';
import Dashboard from '@/pages/admin/Dashboard';
import Products from '@/pages/admin/Products';
import StockManagement from '@/pages/admin/StockManagement';
import Promotions from '@/pages/admin/Promotions';
import Reports from '@/pages/admin/Reports';
import QuickUpdate from '@/pages/admin/QuickUpdate';
import POS from '@/pages/admin/POS';
import Motoboys from '@/pages/admin/Motoboys';
import Deliveries from '@/pages/admin/Deliveries';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public Store - No login required */}
      <Route path="/" element={<Store />} />

      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Admin routes - protected */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/products" element={<Products />} />
          <Route path="/admin/stock" element={<StockManagement />} />
          <Route path="/admin/promotions" element={<Promotions />} />
          <Route path="/admin/pos" element={<POS />} />
          <Route path="/admin/motoboys" element={<Motoboys />} />
          <Route path="/admin/deliveries" element={<Deliveries />} />
          <Route path="/admin/quick-update" element={<QuickUpdate />} />
          <Route path="/admin/reports" element={<Reports />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CartProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <SonnerToaster position="top-center" theme="dark" />
        </CartProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App