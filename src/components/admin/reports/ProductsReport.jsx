import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatPrice, CATEGORIES } from '@/lib/constants';
import ReportToolbar, { getPresetRange, filterByDateRange } from './ReportToolbar';
import StatCard from './StatCard';
import { exportToXLSX, exportToPDF, printReport } from '@/lib/reportExport';

export default function ProductsReport() {
  const [preset, setPreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const { data: products = [], isLoading } = useQuery({ queryKey: ['rpt-products'], queryFn: () => base44.entities.Product.list('-created_date', 500) });
  const { data: orders = [] } = useQuery({ queryKey: ['rpt-products-orders'], queryFn: () => base44.entities.Order.list('-created_date', 1000) });
  const { data: sales = [] } = useQuery({ queryKey: ['rpt-products-sales'], queryFn: () => base44.entities.Sale.list('-created_date', 1000) });

  useEffect(() => {
    if (preset !== 'custom' && preset !== 'all') { const r = getPresetRange(preset); setDateFrom(r.from); setDateTo(r.to); }
    else if (preset === 'all') { setDateFrom(''); setDateTo(''); }
  }, [preset]);

  const productStats = useMemo(() => {
    const map = new Map();
    const allTx = [...filterByDateRange(orders, dateFrom, dateTo), ...filterByDateRange(sales, dateFrom, dateTo)];
    allTx.forEach(t => {
      (t.items || []).forEach(item => {
        if (!item.product_id) return;
        const c = map.get(item.product_id) || { product_id: item.product_id, name: item.product_name, quantity: 0, revenue: 0 };
        c.quantity += item.quantity || 0;
        c.revenue += (item.price || 0) * (item.quantity || 0);
        map.set(item.product_id, c);
      });
    });
    return map;
  }, [orders, sales, dateFrom, dateTo]);

  const enriched = useMemo(() => {
    return products.map(p => {
      const s = productStats.get(p.id) || { quantity: 0, revenue: 0 };
      const cost = p.cost_price || 0;
      const margin = cost > 0 ? ((p.price - cost) / p.price) * 100 : null;
      return { ...p, sold_qty: s.quantity, revenue: s.revenue, margin };
    }).filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()));
  }, [products, productStats, search]);

  const mostSold = useMemo(() => [...enriched].sort((a, b) => b.sold_qty - a.sold_qty).slice(0, 10), [enriched]);
  const leastSold = useMemo(() => [...enriched].filter(p => p.sold_qty > 0).sort((a, b) => a.sold_qty - b.sold_qty).slice(0, 10), [enriched]);
  const noSales = useMemo(() => enriched.filter(p => p.sold_qty === 0), [enriched]);

  const totalRevenue = enriched.reduce((s, p) => s + p.revenue, 0);
  const totalSold = enriched.reduce((s, p) => s + p.sold_qty, 0);

  const handleXLSX = () => exportToXLSX(enriched.map(p => ({
    Produto: p.name, Categoria: CATEGORIES.find(c => c.value === p.category)?.label || p.category,
    'Preço Venda': p.price, 'Preço Custo': p.cost_price || 0, 'Margem %': p.margin != null ? p.margin.toFixed(1) : 'N/A',
    'Qtd Vendida': p.sold_qty, Faturamento: p.revenue,
  })), 'relatorio-produtos');
  const handlePDF = () => exportToPDF('Relatório de Produtos', enriched.sort((a, b) => b.sold_qty - a.sold_qty).map(p => ({
    Produto: p.name, Vendidos: p.sold_qty, Faturamento: formatPrice(p.revenue), Margem: p.margin != null ? `${p.margin.toFixed(1)}%` : 'N/A',
  })), 'relatorio-produtos');

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <ReportToolbar
        preset={preset} onPresetChange={setPreset}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        search={search} onSearchChange={setSearch}
        onExportXLSX={handleXLSX} onExportPDF={handlePDF} onPrint={printReport}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Total de Produtos" value={products.length} color="text-primary" />
        <StatCard icon={TrendingUp} label="Unidades Vendidas" value={totalSold} color="text-green-400" />
        <StatCard icon={DollarSign} label="Faturamento Total" value={formatPrice(totalRevenue)} color="text-primary" />
        <StatCard icon={TrendingDown} label="Sem Venda no Período" value={noSales.length} color="text-red-400" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" /> Mais Vendidos</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {mostSold.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                <span className="text-sm flex-1 truncate">{p.name}</span>
                <span className="text-sm font-bold text-primary">{p.sold_qty}x</span>
                <span className="text-sm text-muted-foreground">{formatPrice(p.revenue)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-400" /> Menos Vendidos</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {leastSold.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Sem vendas no período</p>}
            {leastSold.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                <span className="text-sm flex-1 truncate">{p.name}</span>
                <span className="text-sm font-bold text-muted-foreground">{p.sold_qty}x</span>
                <span className="text-sm text-muted-foreground">{formatPrice(p.revenue)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Produtos Sem Venda no Período</CardTitle></CardHeader>
        <CardContent>
          {noSales.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">Todos os produtos tiveram vendas!</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {noSales.map(p => (
                <span key={p.id} className="px-3 py-1.5 rounded-lg bg-secondary/50 text-xs">{p.name}</span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Faturamento e Margem por Produto</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {[...enriched].sort((a, b) => b.revenue - a.revenue).map(p => (
            <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
              <span className="text-sm flex-1 truncate">{p.name}</span>
              <span className="text-sm text-muted-foreground">{formatPrice(p.price)}</span>
              {p.margin != null && <span className={`text-xs ${p.margin > 30 ? 'text-green-400' : p.margin > 10 ? 'text-amber-400' : 'text-red-400'}`}>{p.margin.toFixed(0)}%</span>}
              <span className="text-sm font-bold text-primary w-24 text-right">{formatPrice(p.revenue)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}