import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import CustomerRoute from '@/components/CustomerRoute';
import MotoboyRoute from '@/components/MotoboyRoute';
import { CartProvider } from '@/context/CartContext';
import { CustomerProvider } from '@/context/CustomerContext';
import { MotoboyProvider } from '@/context/MotoboyContext';

// Public pages
import Store from '@/pages/Store';

// Customer pages
import Checkout from '@/pages/Checkout';
import MyAccount from '@/pages/MyAccount';
import OrderConfirmation from '@/pages/OrderConfirmation';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Admin pages
import AdminLayout from '@/components/admin/AdminLayout';
import Dashboard from '@/pages/admin/Dashboard';
import Products from '@/pages/admin/Products';
import Suppliers from '@/pages/admin/Suppliers';
import StockManagement from '@/pages/admin/StockManagement';
import Promotions from '@/pages/admin/Promotions';
import Reports from '@/pages/admin/Reports';
import ReportView from '@/pages/admin/ReportView';
import QuickUpdate from '@/pages/admin/QuickUpdate';
import POS from '@/pages/admin/POS';
import Motoboys from '@/pages/admin/Motoboys';
import Deliveries from '@/pages/admin/Deliveries';
import Orders from '@/pages/admin/Orders';
import DeliverySettings from '@/pages/admin/DeliverySettings';
import DeliveryReviews from '@/pages/admin/DeliveryReviews';
import AccessLinks from '@/pages/admin/AccessLinks';
import Coupons from '@/pages/admin/Coupons';

// Motoboy pages
import MotoboyLogin from '@/pages/motoboy/MotoboyLogin';
import MotoboyLayout from '@/components/motoboy/MotoboyLayout';
import MotoboyDashboard from '@/pages/motoboy/MotoboyDashboard';
import MotoboyDeliveryDetail from '@/pages/motoboy/MotoboyDeliveryDetail';
import MotoboyHistory from '@/pages/motoboy/MotoboyHistory';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Autenticação removida temporariamente — acesso livre a todas as rotas
  // (antes: authError redirecionava para /login)

  return (
    <Routes>
      {/* Public Store - No login required */}
      <Route path="/" element={<Store />} />

      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Motoboy routes */}
      <Route path="/motoboy/login" element={<MotoboyLogin />} />
      <Route element={<MotoboyRoute />}>
        <Route element={<MotoboyLayout />}>
          <Route path="/motoboy" element={<MotoboyDashboard />} />
          <Route path="/motoboy/entrega/:id" element={<MotoboyDeliveryDetail />} />
          <Route path="/motoboy/historico" element={<MotoboyHistory />} />
        </Route>
      </Route>

      {/* Customer routes - requires customer phone session */}
      <Route element={<CustomerRoute />}>
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/minha-conta" element={<MyAccount />} />
        <Route path="/pedido/:id" element={<OrderConfirmation />} />
      </Route>

      {/* Admin routes - acesso livre (autenticação removida temporariamente) */}
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/orders" element={<Orders />} />
        <Route path="/admin/products" element={<Products />} />
        <Route path="/admin/suppliers" element={<Suppliers />} />
        <Route path="/admin/stock" element={<StockManagement />} />
        <Route path="/admin/promotions" element={<Promotions />} />
        <Route path="/admin/pos" element={<POS />} />
        <Route path="/admin/delivery-settings" element={<DeliverySettings />} />
        <Route path="/admin/motoboys" element={<Motoboys />} />
        <Route path="/admin/deliveries" element={<Deliveries />} />
        <Route path="/admin/reviews" element={<DeliveryReviews />} />
        <Route path="/admin/coupons" element={<Coupons />} />
        <Route path="/admin/quick-update" element={<QuickUpdate />} />
        <Route path="/admin/reports" element={<Reports />} />
        <Route path="/admin/reports/:type" element={<ReportView />} />
        <Route path="/admin/access-links" element={<AccessLinks />} />
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
          <CustomerProvider>
            <MotoboyProvider>
              <Router>
                <AuthenticatedApp />
              </Router>
              <Toaster />
              <SonnerToaster position="top-center" theme="dark" />
            </MotoboyProvider>
          </CustomerProvider>
        </CartProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App