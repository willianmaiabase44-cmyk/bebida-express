import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowLeftRight, Tag, BarChart3, LogOut, Menu, X, Store, Zap, ShoppingCart, Bike, MapPin, ClipboardList, Settings, Truck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/constants';

const NAV_ITEMS = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/orders', icon: ClipboardList, label: 'Pedidos Online' },
  { path: '/admin/pos', icon: ShoppingCart, label: 'PDV — Caixa' },
  { path: '/admin/quick-update', icon: Zap, label: 'Atualização Rápida' },
  { path: '/admin/products', icon: Package, label: 'Produtos' },
  { path: '/admin/suppliers', icon: Truck, label: 'Fornecedores' },
  { path: '/admin/stock', icon: ArrowLeftRight, label: 'Estoque' },
  { path: '/admin/promotions', icon: Tag, label: 'Promoções' },
  { path: '/admin/delivery-settings', icon: Settings, label: 'Config. de Entrega' },
  { path: '/admin/motoboys', icon: Bike, label: 'Motoboys' },
  { path: '/admin/deliveries', icon: MapPin, label: 'Entregas' },
  { path: '/admin/reviews', icon: BarChart3, label: 'Avaliações' },
  { path: '/admin/reports', icon: BarChart3, label: 'Relatórios' },
];

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const knownOrderIds = useRef(new Set());

  useEffect(() => {
    // Carrega pedidos existentes para não disparar notificação no carregamento inicial
    base44.entities.Order.list('-created_date', 50).then(orders => {
      orders.forEach(o => knownOrderIds.current.add(o.id));
    }).catch(() => {});

    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create' && event.data && !knownOrderIds.current.has(event.data.id)) {
        knownOrderIds.current.add(event.data.id);
        const o = event.data;
        toast.success('Novo pedido recebido!', {
          description: `#${o.order_number || ''} — ${o.customer_name || 'Cliente'} • ${formatPrice(o.total)}`,
          action: { label: 'Ver', onClick: () => window.location.href = '/admin/orders' },
          duration: 8000,
        });
      }
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

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
        <h1 className="font-heading font-bold text-sm">Smoke Bebidas</h1>
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
            <img
              src="https://media.base44.com/images/public/6a196352fac9a14d99de4405/0bcaa04b8_generated_image.png"
              alt="Smoke Bebidas"
              className="h-8 w-auto object-contain"
            />
            <span className="font-heading font-bold text-sm">Smoke Bebidas</span>
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