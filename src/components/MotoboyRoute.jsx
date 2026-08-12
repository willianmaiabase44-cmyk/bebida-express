import { Navigate, Outlet } from 'react-router-dom';
import { useMotoboy } from '@/context/MotoboyContext';

export default function MotoboyRoute() {
  const { motoboy, loading } = useMotoboy();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!motoboy) {
    return <Navigate to="/motoboy/login" replace />;
  }

  return <Outlet />;
}