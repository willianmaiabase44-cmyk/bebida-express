import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, CheckCircle2, Clock, XCircle, Truck } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ReportToolbar, { getPresetRange, filterByDateRange } from './ReportToolbar';
import StatCard from './StatCard';
import { exportToXLSX, exportToPDF, printReport } from '@/lib/reportExport';

const STATUS_LABELS = { novo: 'Novo', confirmado: 'Confirmado', em_preparacao: 'Em Preparação', pronto: 'Pronto', saiu_para_entrega: 'Saiu para Entrega', entregue: 'Entregue', cancelado: 'Cancelado' };
const STATUS_COLORS = { novo: 'text-blue-400', confirmado: 'text-cyan-400', em_preparacao: 'text-amber-400', pronto: 'text-yellow-400', saiu_para_entrega: 'text-orange-400', entregue: 'text-green-400', cancelado: 'text-red-400' };
const selectClass = "bg-secondary border-none rounded-lg px-3 py-1.5 text-xs cursor-pointer outline-none";

export default function OrdersReport() {
  const [preset, setPreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');

  const { data: orders = [], isLoading } = useQuery({ queryKey: ['rpt-orders-list'], queryFn: () => base44.entities.Order.list('-created_date', 1000) });

  useEffect(() => {
    if (preset !== 'custom' && preset !== 'all') { const r = getPresetRange(preset); setDateFrom(r.from); setDateTo(r.to); }
    else if (preset === 'all') { setDateFrom(''); setDateTo(''); }
  }, [preset]);

  const filtered = useMemo(() => {
    let r = filterByDateRange(orders, dateFrom, dateTo);
    if (statusFilter !== 'all') r = r.filter(o => o.status === statusFilter);
    if (channelFilter !== 'all') r = r.filter(o => (o.channel || 'online') === channelFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(o => o.customer_name?.toLowerCase().includes(q) || o.order_number?.toString().includes(q) || o.customer_phone?.includes(q));
    }
    return r;
  }, [orders, dateFrom, dateTo, statusFilter, channelFilter, search]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, o) => s + (o.total || 0), 0);
    const count = filtered.length;
    const byStatus = {};
    filtered.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
    return { total, count, avg: count > 0 ? total / count : 0, byStatus };
  }, [filtered]);

  const byDay = useMemo(() => {
    const map = new Map();
    filtered.forEach(o => {
      const d = (o.date || o.created_date || '').substring(0, 10);
      if (!d) return;
      const c = map.get(d) || { date: d, count: 0, total: 0 };
      c.count++; c.total += o.total || 0;
      map.set(d, c);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [filtered]);

  const chartData = byDay.map(d => ({ name: d.date.substring(5), pedidos: d.count }));

  const handleXLSX = () => exportToXLSX(filtered.map(o => ({
    Pedido: o.order_number, Data: (o.date || o.created_date || '').substring(0, 10), Cliente: o.customer_name,
    Telefone: o.customer_phone, Status: STATUS_LABELS[o.status] || o.status, Canal: o.channel || 'online',
    Total: o.total || 0, Pagamento: o.payment_method || '',
  })), 'relatorio-pedidos');
  const handlePDF = () => exportToPDF('Relatório de Pedidos', [
    { Indicador: 'Total de Pedidos', Valor: stats.count },
    { Indicador: 'Valor Total', Valor: formatPrice(stats.total) },
    { Indicador: 'Ticket Médio', Valor: formatPrice(stats.avg) },
    ...Object.entries(stats.byStatus).map(([k, v]) => ({ Indicador: STATUS_LABELS[k] || k, Valor: v })),
  ], 'relatorio-pedidos');

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <ReportToolbar
        preset={preset} onPresetChange={setPreset}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        search={search} onSearchChange={setSearch}
        onExportXLSX={handleXLSX} onExportPDF={handlePDF} onPrint={printReport}
        extraFilters={<>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="all">Todos status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className={selectClass}>
            <option value="all">Todos canais</option>
            <option value="online">Delivery</option>
            <option value="pdv">PDV</option>
          </select>
        </>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="Total de Pedidos" value={stats.count} color="text-blue-400" />
        <StatCard icon={Truck} label="Valor Total" value={formatPrice(stats.total)} color="text-green-400" />
        <StatCard icon={Clock} label="Ticket Médio" value={formatPrice(stats.avg)} color="text-primary" />
        <StatCard icon={XCircle} label="Cancelados" value={stats.byStatus.cancelado || 0} color="text-red-400" />
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pedidos por Dia</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(0 0% 55%)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(0 0% 55%)' }} />
                  <Tooltip contentStyle={{ background: 'hsl(0 0% 8%)', border: '1px solid hsl(0 0% 16%)', borderRadius: '8px' }} />
                  <Bar dataKey="pedidos" fill="hsl(36 90% 54%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Pedidos por Status</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(STATUS_LABELS).map(([key, label]) => {
            const count = stats.byStatus[key] || 0;
            const pct = stats.count > 0 ? (count / stats.count) * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className={`text-sm w-32 ${STATUS_COLORS[key]}`}>{label}</span>
                <div className="flex-1 h-6 bg-secondary rounded-lg overflow-hidden">
                  <div className="h-full bg-primary/30 rounded-lg flex items-center justify-end pr-2" style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}>
                    {count > 0 && <span className="text-xs font-bold text-primary">{count}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}