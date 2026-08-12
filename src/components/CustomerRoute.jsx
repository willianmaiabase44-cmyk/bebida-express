import { Navigate, Outlet } from 'react-router-dom';
import { useCustomer } from '@/context/CustomerContext';

export default function CustomerRoute() {
  const { customer, loading } = useCustomer();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!customer) {
    return <Navigate to="/register" replace />;
  }

  return <Outlet />;
}