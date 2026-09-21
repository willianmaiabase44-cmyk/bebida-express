import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listOrders } from '@/services/orderService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, ShoppingCart, DollarSign } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import ReportToolbar, { getPresetRange, filterByDateRange } from './ReportToolbar';
import StatCard from './StatCard';
import { exportToXLSX, exportToPDF, printReport } from '@/lib/reportExport';

export default function CombosReport() {
  const [preset, setPreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const { data: orders = [], isLoading } = useQuery({ queryKey: ['rpt-combos'], queryFn: () => listOrders() });

  useEffect(() => {
    if (preset !== 'custom' && preset !== 'all') { const r = getPresetRange(preset); setDateFrom(r.from); setDateTo(r.to); }
    else if (preset === 'all') { setDateFrom(''); setDateTo(''); }
  }, [preset]);

  const comboData = useMemo(() => {
    const filtered = filterByDateRange(orders, dateFrom, dateTo).filter(o => o.status !== 'cancelado');
    const comboOrders = filtered.filter(o => (o.items || []).some(item => item.is_kit));
    const map = new Map();
    comboOrders.forEach(o => {
      (o.items || []).filter(i => i.is_kit).forEach(item => {
        const k = item.product_name || 'Combo';
        const c = map.get(k) || { name: k, quantity: 0, revenue: 0, orders: 0 };
        c.quantity += item.quantity || 0;
        c.revenue += (item.price || 0) * (item.quantity || 0);
        c.orders++;
        map.set(k, c);
      });
    });
    let arr = Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(c => c.name?.toLowerCase().includes(q));
    }
    return { comboOrders, items: arr };
  }, [orders, dateFrom, dateTo, search]);

  const totalRevenue = comboData.items.reduce((s, c) => s + c.revenue, 0);
  const totalQty = comboData.items.reduce((s, c) => s + c.quantity, 0);

  const handleXLSX = () => exportToXLSX(comboData.items.map(c => ({
    Combo: c.name, Quantidade: c.quantity, Faturamento: c.revenue, Pedidos: c.orders,
  })), 'relatorio-combos');
  const handlePDF = () => exportToPDF('Relatório de Combos', comboData.items.map(c => ({
    Combo: c.name, Quantidade: c.quantity, Faturamento: formatPrice(c.revenue),
  })), 'relatorio-combos');

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

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Layers} label="Combos Vendidos" value={totalQty} color="text-violet-400" />
        <StatCard icon={DollarSign} label="Faturamento em Combos" value={formatPrice(totalRevenue)} color="text-primary" />
        <StatCard icon={ShoppingCart} label="Pedidos com Combo" value={comboData.comboOrders.length} color="text-violet-400" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Combos Vendidos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {comboData.items.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Nenhum combo vendido no período</p>}
          {comboData.items.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
              <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
              <span className="text-sm flex-1 truncate">{c.name}</span>
              <span className="text-sm text-muted-foreground">{c.orders} pedidos</span>
              <span className="text-sm font-bold text-primary">{c.quantity}x</span>
              <span className="text-sm text-muted-foreground">{formatPrice(c.revenue)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}