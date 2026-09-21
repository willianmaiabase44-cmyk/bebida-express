import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listSales } from '@/services/saleService';
import { listOrders } from '@/services/orderService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ReportToolbar, { getPresetRange, filterByDateRange } from './ReportToolbar';
import StatCard from './StatCard';
import { exportToXLSX, exportToPDF, printReport } from '@/lib/reportExport';

const selectClass = "bg-secondary border-none rounded-lg px-3 py-1.5 text-xs cursor-pointer outline-none";

export default function FinancialReport() {
  const [preset, setPreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');

  const { data: sales = [], isLoading: ls } = useQuery({ queryKey: ['rpt-fin-sales'], queryFn: () => listSales() });
  const { data: orders = [], isLoading: lo } = useQuery({ queryKey: ['rpt-fin-orders'], queryFn: () => listOrders() });

  useEffect(() => {
    if (preset !== 'custom' && preset !== 'all') { const r = getPresetRange(preset); setDateFrom(r.from); setDateTo(r.to); }
    else if (preset === 'all') { setDateFrom(''); setDateTo(''); }
  }, [preset]);

  const revenue = useMemo(() => {
    let s = filterByDateRange(sales, dateFrom, dateTo).filter(x => x.status !== 'cancelada');
    let o = filterByDateRange(orders, dateFrom, dateTo).filter(x => x.status !== 'cancelado');
    if (channelFilter === 'pdv') { o = []; }
    if (channelFilter === 'delivery') { s = []; }
    const pdvRev = s.reduce((sum, x) => sum + (x.total || 0), 0);
    const delRev = o.reduce((sum, x) => sum + (x.total || 0), 0);
    const pdvCount = s.length;
    const delCount = o.length;
    const byDay = {};
    s.forEach(x => {
      const d = (x.date || x.created_date || '').substring(0, 10);
      if (d) byDay[d] = (byDay[d] || 0) + (x.total || 0);
    });
    o.forEach(x => {
      const d = (x.date || x.created_date || '').substring(0, 10);
      if (d) byDay[d] = (byDay[d] || 0) + (x.total || 0);
    });
    return { pdvRev, delRev, delCount, pdvCount, total: pdvRev + delRev, byDay };
  }, [sales, orders, dateFrom, dateTo, channelFilter]);

  const costData = useMemo(() => {
    // Calculate COGS from products sold
    const allTx = [...filterByDateRange(sales, dateFrom, dateTo), ...filterByDateRange(orders, dateFrom, dateTo)];
    let totalCost = 0;
    const productMap = new Map();
    // Build product cost lookup
    // We don't have products here, so we'll estimate from items
    allTx.forEach(t => {
      (t.items || []).forEach(item => {
        // We don't have cost_price in the transaction, so we can't calculate COGS here
        // This would need product data
      });
    });
    return { totalCost: 0 };
  }, [sales, orders, dateFrom, dateTo]);

  const chartData = useMemo(() => {
    return Object.entries(revenue.byDay).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([date, val]) => ({
      name: date.substring(5), receita: val,
    }));
  }, [revenue]);

  const handleXLSX = () => exportToXLSX([
    { Indicador: 'Receita PDV', Valor: revenue.pdvRev },
    { Indicador: 'Receita Delivery', Valor: revenue.delRev },
    { Indicador: 'Receita Total', Valor: revenue.total },
    { Indicador: 'Vendas PDV', Valor: revenue.pdvCount },
    { Indicador: 'Pedidos Delivery', Valor: revenue.delCount },
  ], 'relatorio-financeiro');
  const handlePDF = () => exportToPDF('Relatório Financeiro', [
    { Indicador: 'Receita PDV', Valor: formatPrice(revenue.pdvRev) },
    { Indicador: 'Receita Delivery', Valor: formatPrice(revenue.delRev) },
    { Indicador: 'Receita Total', Valor: formatPrice(revenue.total) },
    { Indicador: 'Vendas PDV (qtd)', Valor: revenue.pdvCount },
    { Indicador: 'Pedidos Delivery (qtd)', Valor: revenue.delCount },
  ], 'relatorio-financeiro');

  if (ls || lo) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <ReportToolbar
        preset={preset} onPresetChange={setPreset}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        search={search} onSearchChange={setSearch}
        onExportXLSX={handleXLSX} onExportPDF={handlePDF} onPrint={printReport}
        extraFilters={
          <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className={selectClass}>
            <option value="all">Todos canais</option>
            <option value="pdv">PDV</option>
            <option value="delivery">Delivery</option>
          </select>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Receita Total" value={formatPrice(revenue.total)} color="text-green-400" />
        <StatCard icon={TrendingUp} label="Receita PDV" value={formatPrice(revenue.pdvRev)} color="text-blue-400" />
        <StatCard icon={TrendingUp} label="Receita Delivery" value={formatPrice(revenue.delRev)} color="text-teal-400" />
        <StatCard icon={Wallet} label="Transações" value={revenue.pdvCount + revenue.delCount} color="text-primary" />
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Receita por Dia</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(0 0% 55%)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(0 0% 55%)' }} tickFormatter={v => `R${v}`} />
                  <Tooltip contentStyle={{ background: 'hsl(0 0% 8%)', border: '1px solid hsl(0 0% 16%)', borderRadius: '8px' }} formatter={v => formatPrice(v)} />
                  <Bar dataKey="receita" fill="hsl(36 90% 54%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-secondary/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <TrendingDown className="w-4 h-4 inline mr-1" />
            Despesas e contas a pagar ainda não implementadas. Para um resultado financeiro completo, cadastre despesas no módulo Financeiro.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}