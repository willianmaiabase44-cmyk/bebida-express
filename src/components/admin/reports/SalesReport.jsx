import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, CreditCard } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ReportToolbar, { getPresetRange, filterByDateRange } from './ReportToolbar';
import StatCard from './StatCard';
import { exportToXLSX, exportToPDF, printReport } from '@/lib/reportExport';

const PAY_LABELS = { dinheiro: 'Dinheiro', pix: 'PIX', cartao_entrega: 'Cartão na Entrega', cartao_credito: 'Crédito', cartao_debito: 'Débito' };
const selectClass = "bg-secondary border-none rounded-lg px-3 py-1.5 text-xs cursor-pointer outline-none";

export default function SalesReport() {
  const [preset, setPreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [payFilter, setPayFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');

  const { data: sales = [], isLoading: ls } = useQuery({ queryKey: ['rpt-sales'], queryFn: () => base44.entities.Sale.list('-created_date', 1000) });
  const { data: orders = [], isLoading: lo } = useQuery({ queryKey: ['rpt-orders'], queryFn: () => base44.entities.Order.list('-created_date', 1000) });

  useEffect(() => {
    if (preset !== 'custom' && preset !== 'all') { const r = getPresetRange(preset); setDateFrom(r.from); setDateTo(r.to); }
    else if (preset === 'all') { setDateFrom(''); setDateTo(''); }
  }, [preset]);

  const transactions = useMemo(() => {
    let s = filterByDateRange(sales, dateFrom, dateTo).filter(x => x.status !== 'cancelada');
    let o = filterByDateRange(orders, dateFrom, dateTo).filter(x => x.status !== 'cancelado');
    if (payFilter !== 'all') { s = s.filter(x => x.payment_method === payFilter); o = o.filter(x => x.payment_method === payFilter); }
    if (channelFilter === 'pdv') { s = s.filter(x => !x.channel || x.channel === 'pdv'); o = []; }
    if (channelFilter === 'delivery') { o = o.filter(x => x.channel === 'online'); s = []; }
    const all = [
      ...s.map(x => ({ date: (x.date || x.created_date || '').substring(0, 10), channel: 'PDV', payment: x.payment_method, total: x.total || 0, items: x.items || [] })),
      ...o.map(x => ({ date: (x.date || x.created_date || '').substring(0, 10), channel: 'Delivery', payment: x.payment_method, total: x.total || 0, items: x.items || [] })),
    ];
    if (search) {
      const q = search.toLowerCase();
      return all.filter(t => t.channel.toLowerCase().includes(q) || (PAY_LABELS[t.payment] || '').toLowerCase().includes(q));
    }
    return all;
  }, [sales, orders, dateFrom, dateTo, payFilter, channelFilter, search]);

  const stats = useMemo(() => {
    const total = transactions.reduce((s, t) => s + t.total, 0);
    const count = transactions.length;
    return { total, count, avg: count > 0 ? total / count : 0 };
  }, [transactions]);

  const topProducts = useMemo(() => {
    const map = new Map();
    transactions.forEach(t => t.items.forEach(item => {
      const k = item.product_name || 'Produto';
      const c = map.get(k) || { name: k, quantity: 0, revenue: 0 };
      c.quantity += item.quantity || 0;
      c.revenue += (item.price || 0) * (item.quantity || 0);
      map.set(k, c);
    }));
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }, [transactions]);

  const payBreakdown = useMemo(() => {
    const map = new Map();
    transactions.forEach(t => {
      const k = t.payment || 'unknown';
      const c = map.get(k) || { method: k, count: 0, total: 0 };
      c.count++; c.total += t.total;
      map.set(k, c);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [transactions]);

  const byDay = useMemo(() => {
    const map = new Map();
    transactions.forEach(t => {
      if (!t.date) return;
      const c = map.get(t.date) || { date: t.date, total: 0, count: 0 };
      c.total += t.total; c.count++;
      map.set(t.date, c);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [transactions]);

  const chartData = byDay.map(d => ({ name: d.date.substring(5), valor: d.total }));

  const handleXLSX = () => exportToXLSX(transactions.map(t => ({ Data: t.date, Canal: t.channel, Pagamento: PAY_LABELS[t.payment] || t.payment, Total: t.total })), 'relatorio-vendas');
  const handlePDF = () => exportToPDF('Relatório de Vendas', [
    { Indicador: 'Total Vendado', Valor: formatPrice(stats.total) },
    { Indicador: 'Quantidade', Valor: stats.count },
    { Indicador: 'Ticket Médio', Valor: formatPrice(stats.avg) },
    ...payBreakdown.map(p => ({ Indicador: `${PAY_LABELS[p.method] || p.method}`, Valor: formatPrice(p.total) })),
  ], 'relatorio-vendas');

  if (ls || lo) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <ReportToolbar
        preset={preset} onPresetChange={setPreset}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        search={search} onSearchChange={setSearch}
        onExportXLSX={handleXLSX} onExportPDF={handlePDF} onPrint={printReport}
        extraFilters={<>
          <select value={payFilter} onChange={e => setPayFilter(e.target.value)} className={selectClass}>
            <option value="all">Todas formas</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao_entrega">Cartão na Entrega</option>
            <option value="cartao_credito">Crédito</option>
            <option value="cartao_debito">Débito</option>
          </select>
          <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className={selectClass}>
            <option value="all">Todos canais</option>
            <option value="pdv">PDV</option>
            <option value="delivery">Delivery</option>
          </select>
        </>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={DollarSign} label="Total Vendido" value={formatPrice(stats.total)} color="text-green-400" />
        <StatCard icon={ShoppingCart} label="Quantidade de Vendas" value={stats.count} color="text-blue-400" />
        <StatCard icon={TrendingUp} label="Ticket Médio" value={formatPrice(stats.avg)} color="text-primary" />
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Vendas por Dia</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(0 0% 55%)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(0 0% 55%)' }} tickFormatter={v => `R${v}`} />
                  <Tooltip contentStyle={{ background: 'hsl(0 0% 8%)', border: '1px solid hsl(0 0% 16%)', borderRadius: '8px' }} formatter={v => formatPrice(v)} />
                  <Bar dataKey="valor" fill="hsl(36 90% 54%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Formas de Pagamento</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {payBreakdown.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Sem dados</p>}
            {payBreakdown.map(p => (
              <div key={p.method} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                <span className="text-sm">{PAY_LABELS[p.method] || p.method}</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-primary">{formatPrice(p.total)}</span>
                  <span className="text-xs text-muted-foreground ml-2">{p.count}x</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Produtos Mais Vendidos</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {topProducts.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Sem dados</p>}
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                <span className="text-sm flex-1 truncate">{p.name}</span>
                <span className="text-sm font-bold text-primary">{p.quantity}x</span>
                <span className="text-sm text-muted-foreground">{formatPrice(p.revenue)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}