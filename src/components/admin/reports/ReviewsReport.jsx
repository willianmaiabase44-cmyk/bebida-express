import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MessageSquare, ThumbsUp } from 'lucide-react';
import ReportToolbar, { getPresetRange, filterByDateRange } from './ReportToolbar';
import StatCard from './StatCard';
import { exportToXLSX, exportToPDF, printReport } from '@/lib/reportExport';

export default function ReviewsReport() {
  const [preset, setPreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const { data: reviews = [], isLoading } = useQuery({ queryKey: ['rpt-reviews'], queryFn: () => base44.entities.DeliveryReview.list('-created_date', 1000) });

  useEffect(() => {
    if (preset !== 'custom' && preset !== 'all') { const r = getPresetRange(preset); setDateFrom(r.from); setDateTo(r.to); }
    else if (preset === 'all') { setDateFrom(''); setDateTo(''); }
  }, [preset]);

  const filtered = useMemo(() => {
    let r = filterByDateRange(reviews, dateFrom, dateTo);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(rv => rv.motoboy_name?.toLowerCase().includes(q) || rv.customer_name?.toLowerCase().includes(q) || rv.comment?.toLowerCase().includes(q));
    }
    return r;
  }, [reviews, dateFrom, dateTo, search]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const avg = total > 0 ? filtered.reduce((s, r) => s + (r.rating || 0), 0) / total : 0;
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filtered.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating]++; });
    return { total, avg, dist };
  }, [filtered]);

  const byMotoboy = useMemo(() => {
    const map = new Map();
    filtered.forEach(r => {
      const k = r.motoboy_name || 'Sem motoboy';
      const c = map.get(k) || { name: k, count: 0, sum: 0, comments: [] };
      c.count++; c.sum += r.rating || 0;
      if (r.comment) c.comments.push({ rating: r.rating, comment: r.comment, customer: r.customer_name, date: r.date });
      map.set(k, c);
    });
    return Array.from(map.values()).map(m => ({ ...m, avg: m.count > 0 ? m.sum / m.count : 0 })).sort((a, b) => b.avg - a.avg);
  }, [filtered]);

  const handleXLSX = () => exportToXLSX(filtered.map(r => ({
    Data: (r.date || r.created_date || '').substring(0, 10), Motoboy: r.motoboy_name, Cliente: r.customer_name,
    Nota: r.rating, Comentário: r.comment || '', Pedido: r.order_number || '',
  })), 'relatorio-avaliacoes');
  const handlePDF = () => exportToPDF('Relatório de Avaliações', [
    { Indicador: 'Total de Avaliações', Valor: stats.total },
    { Indicador: 'Média Geral', Valor: stats.avg.toFixed(2) },
    ...byMotoboy.map(m => ({ Indicador: m.name, Valor: `${m.avg.toFixed(1)} (${m.count})` })),
  ], 'relatorio-avaliacoes');

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
        <StatCard icon={Star} label="Média Geral" value={stats.avg.toFixed(1)} color="text-yellow-400" />
        <StatCard icon={MessageSquare} label="Total de Avaliações" value={stats.total} color="text-blue-400" />
        <StatCard icon={ThumbsUp} label="Avaliações 5 Estrelas" value={stats.dist[5]} color="text-green-400" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição de Notas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[5, 4, 3, 2, 1].map(n => {
              const count = stats.dist[n];
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-3">
                  <span className="text-sm w-16 flex items-center gap-1">{n} <Star className="w-3 h-3 text-yellow-400" /></span>
                  <div className="flex-1 h-5 bg-secondary rounded-lg overflow-hidden">
                    <div className="h-full bg-yellow-500/30 rounded-lg flex items-center justify-end pr-2" style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}>
                      {count > 0 && <span className="text-xs font-bold text-yellow-400">{count}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Avaliação por Motoboy</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {byMotoboy.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Sem avaliações</p>}
            {byMotoboy.map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                <span className="text-sm flex-1 truncate">{m.name}</span>
                <span className="text-sm font-bold text-yellow-400 flex items-center gap-0.5"><Star className="w-3.5 h-3.5" />{m.avg.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">{m.count} aval.</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Comentários Recentes</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-80 overflow-y-auto">
          {filtered.filter(r => r.comment).length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Nenhum comentário</p>}
          {filtered.filter(r => r.comment).slice(0, 20).map((r, i) => (
            <div key={i} className="p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{r.motoboy_name}</span>
                <span className="text-xs text-yellow-400 flex items-center gap-0.5">{r.rating} <Star className="w-3 h-3" /></span>
              </div>
              <p className="text-sm text-muted-foreground">"{r.comment}"</p>
              <p className="text-xs text-muted-foreground mt-1">{r.customer_name} • {(r.date || r.created_date || '').substring(0, 10)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}