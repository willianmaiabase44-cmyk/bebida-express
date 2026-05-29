import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, Tag, ArrowLeftRight, TrendingUp } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { data: products = [], isLoading: loadingP } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list('-created_date', 500),
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['admin-promos'],
    queryFn: () => base44.entities.Promotion.filter({ active: true }),
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['admin-movements'],
    queryFn: () => base44.entities.StockMovement.list('-created_date', 500),
  });

  const now = new Date().toISOString().split('T')[0];
  const activePromos = promotions.filter(p => p.start_date <= now && p.end_date >= now);
  const lowStock = products.filter(p => (p.stock ?? 0) <= (p.min_stock || 5) && p.active !== false);
  const topSelling = [...products].sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0)).slice(0, 5);

  if (loadingP) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const stats = [
    { label: 'Total de Produtos', value: products.length, icon: Package, color: 'text-blue-400' },
    { label: 'Estoque Baixo', value: lowStock.length, icon: AlertTriangle, color: 'text-amber-400' },
    { label: 'Promoções Ativas', value: activePromos.length, icon: Tag, color: 'text-primary' },
    { label: 'Movimentações', value: movements.length, icon: ArrowLeftRight, color: 'text-green-400' },
  ];

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {stats.map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="font-heading font-bold text-2xl">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Selling */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSelling.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg">🍺</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.total_sold || 0} vendidos</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{formatPrice(p.price)}</span>
                </div>
              ))}
              {topSelling.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto ainda</p>}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStock.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center gap-3">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg">🍺</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Min: {p.min_stock || 5}</p>
                  </div>
                  <span className={`text-sm font-bold ${(p.stock ?? 0) === 0 ? 'text-destructive' : 'text-amber-400'}`}>
                    {p.stock ?? 0} un.
                  </span>
                </div>
              ))}
              {lowStock.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Estoque OK!</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}