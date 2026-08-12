import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowLeftRight, Tag, BarChart3, LogOut, Menu, X, Store, Zap, ShoppingCart, Bike, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/pos', icon: ShoppingCart, label: 'PDV — Caixa' },
  { path: '/admin/quick-update', icon: Zap, label: 'Atualização Rápida' },
  { path: '/admin/products', icon: Package, label: 'Produtos' },
  { path: '/admin/stock', icon: ArrowLeftRight, label: 'Estoque' },
  { path: '/admin/promotions', icon: Tag, label: 'Promoções' },
  { path: '/admin/motoboys', icon: Bike, label: 'Motoboys' },
  { path: '/admin/deliveries', icon: MapPin, label: 'Entregas' },
  { path: '/admin/reports', icon: BarChart3, label: 'Relatórios' },
];

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    base44.auth.logout('/');
  };

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-14 px-4 bg-background/95 backdrop-blur-md border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="font-heading font-bold">Painel Admin</h1>
        <Link to="/">
          <Store className="w-5 h-5 text-muted-foreground" />
        </Link>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-heading font-bold">B</span>
            </div>
            <span className="font-heading font-bold">Beba<span className="text-primary">+</span> Admin</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border space-y-1">
          <Link to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary">
            <Store className="w-4 h-4" />
            Ver Loja
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}