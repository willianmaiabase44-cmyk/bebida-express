import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Package, TrendingUp } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import ReportToolbar, { getPresetRange, filterByDateRange } from './ReportToolbar';
import StatCard from './StatCard';
import { exportToXLSX, exportToPDF, printReport } from '@/lib/reportExport';

export default function PurchasesReport() {
  const [preset, setPreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const { data: movements = [], isLoading } = useQuery({ queryKey: ['rpt-purchases'], queryFn: () => base44.entities.StockMovement.list('-created_date', 1000) });

  useEffect(() => {
    if (preset !== 'custom' && preset !== 'all') { const r = getPresetRange(preset); setDateFrom(r.from); setDateTo(r.to); }
    else if (preset === 'all') { setDateFrom(''); setDateTo(''); }
  }, [preset]);

  const purchases = useMemo(() => {
    let r = filterByDateRange(movements, dateFrom, dateTo).filter(m => m.type === 'entrada');
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(m => m.product_name?.toLowerCase().includes(q) || m.reason?.toLowerCase().includes(q));
    }
    return r;
  }, [movements, dateFrom, dateTo, search]);

  const stats = useMemo(() => {
    const totalQty = purchases.reduce((s, m) => s + m.quantity, 0);
    const totalValue = purchases.reduce((s, m) => s + (m.quantity * (m.unit_cost || 0)), 0);
    return { count: purchases.length, totalQty, totalValue };
  }, [purchases]);

  const byProduct = useMemo(() => {
    const map = new Map();
    purchases.forEach(m => {
      const k = m.product_name || 'Produto';
      const c = map.get(k) || { name: k, quantity: 0, count: 0 };
      c.quantity += m.quantity; c.count++;
      map.set(k, c);
    });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [purchases]);

  const handleXLSX = () => exportToXLSX(purchases.map(m => ({
    Data: (m.date || m.created_date || '').substring(0, 10), Produto: m.product_name,
    Quantidade: m.quantity, 'Estoque Após': m.stock_after ?? '', Motivo: m.reason || '',
  })), 'relatorio-compras');
  const handlePDF = () => exportToPDF('Relatório de Compras', [
    { Indicador: 'Total de Entradas', Valor: stats.count },
    { Indicador: 'Quantidade Total', Valor: stats.totalQty },
    ...byProduct.slice(0, 15).map(p => ({ Indicador: p.name, Valor: `${p.quantity} un. (${p.count}x)` })),
  ], 'relatorio-compras');

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
        <StatCard icon={ShoppingCart} label="Total de Compras" value={stats.count} color="text-purple-400" />
        <StatCard icon={Package} label="Quantidade Total" value={`${stats.totalQty} un.`} color="text-primary" />
        <StatCard icon={TrendingUp} label="Entradas no Período" value={stats.count} color="text-green-400" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Compras por Produto</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {byProduct.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Nenhuma compra no período</p>}
          {byProduct.map((p, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
              <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
              <span className="text-sm flex-1 truncate">{p.name}</span>
              <span className="text-sm text-muted-foreground">{p.count}x</span>
              <span className="text-sm font-bold text-primary">{p.quantity} un.</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Entradas</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-64 overflow-y-auto">
          {purchases.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Sem entradas no período</p>}
          {purchases.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
              <span className="text-xs text-green-400 font-bold shrink-0">+{m.quantity}</span>
              <span className="text-sm flex-1 truncate">{m.product_name}</span>
              {m.reason && <span className="text-xs text-muted-foreground truncate hidden sm:block">{m.reason}</span>}
              <span className="text-xs text-muted-foreground shrink-0">{(m.date || '').substring(0, 10)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}