import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCustomers } from '@/services/customerService';
import { listOrders } from '@/services/orderService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ShoppingCart, DollarSign, UserX } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import ReportToolbar, { getPresetRange, filterByDateRange } from './ReportToolbar';
import StatCard from './StatCard';
import { exportToXLSX, exportToPDF, printReport } from '@/lib/reportExport';

export default function CustomersReport() {
  const [preset, setPreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery({ queryKey: ['rpt-customers'], queryFn: () => listCustomers() });
  const { data: orders = [] } = useQuery({ queryKey: ['rpt-customers-orders'], queryFn: () => listOrders() });

  useEffect(() => {
    if (preset !== 'custom' && preset !== 'all') { const r = getPresetRange(preset); setDateFrom(r.from); setDateTo(r.to); }
    else if (preset === 'all') { setDateFrom(''); setDateTo(''); }
  }, [preset]);

  const customerStats = useMemo(() => {
    const filteredOrders = filterByDateRange(orders, dateFrom, dateTo).filter(o => o.status !== 'cancelado');
    const map = new Map();
    filteredOrders.forEach(o => {
      const key = o.customer_id || o.customer_phone || o.customer_name;
      if (!key) return;
      const c = map.get(key) || { id: key, name: o.customer_name, phone: o.customer_phone, orderCount: 0, totalSpent: 0, lastOrder: '' };
      c.orderCount++;
      c.totalSpent += o.total || 0;
      const d = (o.date || o.created_date || '').substring(0, 10);
      if (d > c.lastOrder) c.lastOrder = d;
      map.set(key, c);
    });
    customers.forEach(c => {
      if (!map.has(c.id)) {
        map.set(c.id, { id: c.id, name: c.name, phone: c.phone, orderCount: 0, totalSpent: 0, lastOrder: '' });
      } else {
        map.get(c.id).name = map.get(c.id).name || c.name;
      }
    });
    let arr = Array.from(map.values());
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(c => c.name?.toLowerCase().includes(q) || c.phone?.includes(q));
    }
    return arr;
  }, [customers, orders, dateFrom, dateTo, search]);

  const topBuyers = useMemo(() => [...customerStats].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10), [customerStats]);
  const inactive = useMemo(() => customerStats.filter(c => c.orderCount === 0), [customerStats]);

  const totalRevenue = customerStats.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrders = customerStats.reduce((s, c) => s + c.orderCount, 0);
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const handleXLSX = () => exportToXLSX(customerStats.map(c => ({
    Cliente: c.name, Telefone: c.phone, Pedidos: c.orderCount, 'Total Gasto': c.totalSpent,
    'Ticket Médio': c.orderCount > 0 ? c.totalSpent / c.orderCount : 0, 'Último Pedido': c.lastOrder,
  })), 'relatorio-clientes');
  const handlePDF = () => exportToPDF('Relatório de Clientes', [
    { Indicador: 'Total de Clientes', Valor: customerStats.length },
    { Indicador: 'Pedidos Totais', Valor: totalOrders },
    { Indicador: 'Faturamento Total', Valor: formatPrice(totalRevenue) },
    { Indicador: 'Ticket Médio', Valor: formatPrice(avgTicket) },
    { Indicador: 'Sem Compras', Valor: inactive.length },
  ], 'relatorio-clientes');

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
        <StatCard icon={Users} label="Total de Clientes" value={customerStats.length} color="text-indigo-400" />
        <StatCard icon={ShoppingCart} label="Pedidos Totais" value={totalOrders} color="text-blue-400" />
        <StatCard icon={DollarSign} label="Faturamento Total" value={formatPrice(totalRevenue)} color="text-green-400" />
        <StatCard icon={UserX} label="Sem Compras" value={inactive.length} color="text-red-400" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Top 10 Clientes que Mais Compram</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {topBuyers.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Sem dados no período</p>}
          {topBuyers.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
              <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name || '—'}</p>
                <p className="text-xs text-muted-foreground">{c.phone || ''}</p>
              </div>
              <span className="text-sm text-muted-foreground">{c.orderCount} pedidos</span>
              <span className="text-sm font-bold text-primary">{formatPrice(c.totalSpent)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Clientes Sem Comprar no Período</CardTitle></CardHeader>
        <CardContent>
          {inactive.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">Todos os clientes fizeram compras!</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {inactive.map(c => (
                <span key={c.id} className="px-3 py-1.5 rounded-lg bg-secondary/50 text-xs">{c.name || c.phone}</span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}