import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Bike, Package, History, LogOut, Store } from 'lucide-react';
import { useMotoboy } from '@/context/MotoboyContext';

export default function MotoboyLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { motoboy, logout } = useMotoboy();

  const handleLogout = () => {
    logout();
    navigate('/motoboy/login');
  };

  const navItems = [
    { path: '/motoboy', icon: Package, label: 'Entregas' },
    { path: '/motoboy/historico', icon: History, label: 'Histórico' },
  ];

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Bike className="w-5 h-5 text-primary" />
            </div>
            <div className="leading-tight">
              <p className="font-heading font-bold text-sm">Smoke Bebidas</p>
              <p className="text-xs text-muted-foreground">{motoboy?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-24 min-h-[calc(100vh-3.5rem)]">
        <Outlet />
      </main>

      {/* Bottom Nav (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-around h-16">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}