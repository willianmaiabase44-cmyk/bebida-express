import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bike, Package, CheckCircle2, XCircle, Star } from 'lucide-react';
import ReportToolbar, { getPresetRange, filterByDateRange } from './ReportToolbar';
import StatCard from './StatCard';
import { exportToXLSX, exportToPDF, printReport } from '@/lib/reportExport';

export default function MotoboysReport() {
  const [preset, setPreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const { data: drivers = [], isLoading } = useQuery({ queryKey: ['rpt-motoboys'], queryFn: () => base44.entities.DeliveryDriver.list() });
  const { data: orders = [] } = useQuery({ queryKey: ['rpt-motoboys-orders'], queryFn: () => base44.entities.Order.list('-created_date', 1000) });
  const { data: reviews = [] } = useQuery({ queryKey: ['rpt-motoboys-reviews'], queryFn: () => base44.entities.DeliveryReview.list('-created_date', 500) });

  useEffect(() => {
    if (preset !== 'custom' && preset !== 'all') { const r = getPresetRange(preset); setDateFrom(r.from); setDateTo(r.to); }
    else if (preset === 'all') { setDateFrom(''); setDateTo(''); }
  }, [preset]);

  const driverStats = useMemo(() => {
    const filteredOrders = filterByDateRange(orders, dateFrom, dateTo).filter(o => o.motoboy_id);
    const filteredReviews = filterByDateRange(reviews, dateFrom, dateTo);
    const map = new Map();
    drivers.forEach(d => {
      map.set(d.id, { id: d.id, name: d.name, phone: d.phone, total: 0, entregues: 0, cancelados: 0, saiu: 0, reviews: [], avgRating: d.rating || 5 });
    });
    filteredOrders.forEach(o => {
      const s = map.get(o.motoboy_id);
      if (!s) return;
      s.total++;
      if (o.status === 'entregue') s.entregues++;
      else if (o.status === 'cancelado') s.cancelados++;
      else if (o.status === 'saiu_para_entrega') s.saiu++;
    });
    filteredReviews.forEach(r => {
      const s = map.get(r.motoboy_id);
      if (s) s.reviews.push(r.rating);
    });
    let arr = Array.from(map.values()).map(s => {
      const avgR = s.reviews.length > 0 ? s.reviews.reduce((a, b) => a + b, 0) / s.reviews.length : s.avgRating;
      return { ...s, avgRating: avgR, reviewCount: s.reviews.length };
    });
    if (search) arr = arr.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()));
    return arr;
  }, [drivers, orders, reviews, dateFrom, dateTo, search]);

  const totalDeliveries = driverStats.reduce((s, d) => s + d.total, 0);
  const totalEntregues = driverStats.reduce((s, d) => s + d.entregues, 0);
  const totalCancelados = driverStats.reduce((s, d) => s + d.cancelados, 0);
  const avgRating = driverStats.length > 0 ? driverStats.reduce((s, d) => s + d.avgRating, 0) / driverStats.length : 5;

  const handleXLSX = () => exportToXLSX(driverStats.map(d => ({
    Motoboy: d.name, Telefone: d.phone, 'Total Entregas': d.total, 'Entregues': d.entregues, 'Cancelados': d.cancelados, 'Avaliação': d.avgRating.toFixed(1), 'Nº Avaliações': d.reviewCount,
  })), 'relatorio-motoboys');
  const handlePDF = () => exportToPDF('Relatório de Motoboys', driverStats.map(d => ({
    Motoboy: d.name, Entregas: d.total, Entregues: d.entregues, Cancelados: d.cancelados, Avaliação: d.avgRating.toFixed(1),
  })), 'relatorio-motoboys');

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
        <StatCard icon={Bike} label="Total de Motoboys" value={drivers.length} color="text-orange-400" />
        <StatCard icon={Package} label="Total de Entregas" value={totalDeliveries} color="text-primary" />
        <StatCard icon={CheckCircle2} label="Entregues" value={totalEntregues} color="text-green-400" />
        <StatCard icon={Star} label="Avaliação Média" value={avgRating.toFixed(1)} color="text-yellow-400" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Performance por Motoboy</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {driverStats.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Nenhum motoboy cadastrado</p>}
          {driverStats.map(d => (
            <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Bike className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.phone}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="text-center">
                  <p className="font-bold">{d.total}</p>
                  <p className="text-[10px] text-muted-foreground">total</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-green-400">{d.entregues}</p>
                  <p className="text-[10px] text-muted-foreground">entregues</p>
                </div>
                {d.cancelados > 0 && <div className="text-center">
                  <p className="font-bold text-red-400">{d.cancelados}</p>
                  <p className="text-[10px] text-muted-foreground">cancel.</p>
                </div>}
                <div className="text-center">
                  <p className="font-bold text-yellow-400 flex items-center gap-0.5"><Star className="w-3 h-3" />{d.avgRating.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">{d.reviewCount} aval.</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}