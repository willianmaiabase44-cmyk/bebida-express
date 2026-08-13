import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Route, DollarSign, Bike } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import ReportToolbar, { getPresetRange, filterByDateRange } from './ReportToolbar';
import StatCard from './StatCard';
import { exportToXLSX, exportToPDF, printReport } from '@/lib/reportExport';

const STATUS_LABELS = { pendente: 'Pendente', em_rota: 'Em Rota', entregue: 'Entregue', cancelada: 'Cancelada' };

export default function DeliveriesReport() {
  const [preset, setPreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const { data: deliveries = [], isLoading } = useQuery({ queryKey: ['rpt-deliveries'], queryFn: () => base44.entities.Delivery.list('-created_date', 1000) });
  const { data: orders = [] } = useQuery({ queryKey: ['rpt-deliveries-orders'], queryFn: () => base44.entities.Order.list('-created_date', 1000) });

  useEffect(() => {
    if (preset !== 'custom' && preset !== 'all') { const r = getPresetRange(preset); setDateFrom(r.from); setDateTo(r.to); }
    else if (preset === 'all') { setDateFrom(''); setDateTo(''); }
  }, [preset]);

  const allDeliveries = useMemo(() => {
    const orderDeliveries = filterByDateRange(orders, dateFrom, dateTo)
      .filter(o => o.status === 'entregue' || o.status === 'saiu_para_entrega' || o.motoboy_id)
      .map(o => ({
        id: o.id, date: (o.date || o.created_date || '').substring(0, 10), client: o.customer_name,
        motoboy: o.motoboy_name || '—', status: o.status === 'entregue' ? 'entregue' : o.status === 'saiu_para_entrega' ? 'em_rota' : 'pendente',
        distance: o.distance_km ? o.distance_km * 1000 : 0, freight: o.freight || 0, total: o.total || 0,
      }));
    const directDeliveries = filterByDateRange(deliveries, dateFrom, dateTo).map(d => ({
      id: d.id, date: (d.date || d.created_date || '').substring(0, 10), client: d.client_name,
      motoboy: d.motoboy_name || '—', status: d.status || 'pendente',
      distance: d.distance || 0, freight: 0, total: d.total || 0,
    }));
    let all = [...orderDeliveries, ...directDeliveries];
    if (search) {
      const q = search.toLowerCase();
      all = all.filter(d => d.client?.toLowerCase().includes(q) || d.motoboy?.toLowerCase().includes(q));
    }
    return all;
  }, [deliveries, orders, dateFrom, dateTo, search]);

  const stats = useMemo(() => {
    const total = allDeliveries.length;
    const totalDistance = allDeliveries.reduce((s, d) => s + (d.distance || 0), 0) / 1000;
    const totalFreight = allDeliveries.reduce((s, d) => s + (d.freight || 0), 0);
    const byStatus = {};
    allDeliveries.forEach(d => { byStatus[d.status] = (byStatus[d.status] || 0) + 1; });
    return { total, totalDistance, totalFreight, avgFreight: total > 0 ? totalFreight / total : 0, avgDistance: total > 0 ? totalDistance / total : 0, byStatus };
  }, [allDeliveries]);

  const byMotoboy = useMemo(() => {
    const map = new Map();
    allDeliveries.forEach(d => {
      const k = d.motoboy || 'Sem motoboy';
      const c = map.get(k) || { name: k, count: 0, distance: 0 };
      c.count++; c.distance += (d.distance || 0) / 1000;
      map.set(k, c);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allDeliveries]);

  const handleXLSX = () => exportToXLSX(allDeliveries.map(d => ({
    Data: d.date, Cliente: d.client, Motoboy: d.motoboy, Status: STATUS_LABELS[d.status] || d.status,
    'Distância (km)': ((d.distance || 0) / 1000).toFixed(1), Frete: d.freight, Total: d.total,
  })), 'relatorio-entregas');
  const handlePDF = () => exportToPDF('Relatório de Entregas', [
    { Indicador: 'Total de Entregas', Valor: stats.total },
    { Indicador: 'Distância Total (km)', Valor: stats.totalDistance.toFixed(1) },
    { Indicador: 'Frete Total', Valor: formatPrice(stats.totalFreight) },
    { Indicador: 'Frete Médio', Valor: formatPrice(stats.avgFreight) },
    ...Object.entries(stats.byStatus).map(([k, v]) => ({ Indicador: STATUS_LABELS[k] || k, Valor: v })),
  ], 'relatorio-entregas');

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
        <StatCard icon={MapPin} label="Total de Entregas" value={stats.total} color="text-teal-400" />
        <StatCard icon={Route} label="Distância Total" value={`${stats.totalDistance.toFixed(1)} km`} color="text-blue-400" />
        <StatCard icon={DollarSign} label="Frete Total" value={formatPrice(stats.totalFreight)} color="text-green-400" />
        <StatCard icon={Route} label="Frete Médio" value={formatPrice(stats.avgFreight)} color="text-primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Status das Entregas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                <span className="text-sm">{label}</span>
                <Badge variant="secondary">{stats.byStatus[key] || 0}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bike className="w-4 h-4 text-primary" /> Entregas por Motoboy</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {byMotoboy.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                <span className="text-sm truncate">{m.name}</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-primary">{m.count} entregas</span>
                  <span className="text-xs text-muted-foreground ml-2">{m.distance.toFixed(1)} km</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}