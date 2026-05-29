import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, Clock, BarChart3, Loader2 } from 'lucide-react';
import { formatPrice, CATEGORIES } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Reports() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list('-created_date', 500),
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['admin-movements'],
    queryFn: () => base44.entities.StockMovement.list('-created_date', 1000),
  });

  const topSelling = useMemo(() =>
    [...products].sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0)).slice(0, 10),
    [products]
  );

  const lowStock = useMemo(() =>
    products.filter(p => (p.stock ?? 0) <= (p.min_stock || 5) && p.active !== false).sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0)),
    [products]
  );

  const noMovement = useMemo(() => {
    const movedIds = new Set(movements.map(m => m.product_id));
    return products.filter(p => !movedIds.has(p.id) && p.active !== false);
  }, [products, movements]);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (dateFrom && m.date < dateFrom) return false;
      if (dateTo && m.date > dateTo) return false;
      return true;
    });
  }, [movements, dateFrom, dateTo]);

  const chartData = useMemo(() =>
    topSelling.map(p => ({ name: p.name.length > 12 ? p.name.slice(0, 12) + '...' : p.name, vendas: p.total_sold || 0 })),
    [topSelling]
  );

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">Relatórios</h1>

      <Tabs defaultValue="top" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="top">Mais Vendidos</TabsTrigger>
          <TabsTrigger value="low">Estoque Baixo</TabsTrigger>
          <TabsTrigger value="idle">Sem Movimento</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="top">
          <Card className="bg-card border-border mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Top 10 Mais Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 && (
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(0 0% 55%)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(0 0% 55%)' }} />
                      <Tooltip contentStyle={{ background: 'hsl(0 0% 8%)', border: '1px solid hsl(0 0% 16%)', borderRadius: '8px', color: 'white' }} />
                      <Bar dataKey="vendas" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => <Cell key={i} fill={i === 0 ? 'hsl(0 85% 50%)' : 'hsl(0 0% 30%)'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="space-y-2">
                {topSelling.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{CATEGORIES.find(c => c.value === p.category)?.label}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{p.total_sold || 0} un.</span>
                    <span className="text-sm text-muted-foreground">{formatPrice(p.price)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Produtos com Estoque Baixo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStock.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">Mín: {p.min_stock || 5}</p>
                    </div>
                    <Badge className={`${(p.stock ?? 0) === 0 ? 'bg-destructive/20 text-destructive' : 'bg-amber-500/20 text-amber-400'}`}>
                      {p.stock ?? 0} un.
                    </Badge>
                  </div>
                ))}
                {lowStock.length === 0 && <p className="text-center text-muted-foreground py-4">Todos os produtos com estoque OK!</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="idle">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Produtos Sem Movimentação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {noMovement.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{CATEGORIES.find(c => c.value === p.category)?.label}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">Estoque: {p.stock ?? 0}</span>
                  </div>
                ))}
                {noMovement.length === 0 && <p className="text-center text-muted-foreground py-4">Todos os produtos têm movimentação!</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Histórico de Movimentações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <Label className="text-xs">De</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-secondary border-none mt-1" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Até</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-secondary border-none mt-1" />
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredMovements.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${m.type === 'entrada' ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>
                      {m.type === 'entrada' ? '+' : '-'}{m.quantity}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.product_name}</p>
                      {m.reason && <p className="text-[10px] text-muted-foreground truncate">{m.reason}</p>}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{m.date}</span>
                  </div>
                ))}
                {filteredMovements.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma movimentação no período</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}