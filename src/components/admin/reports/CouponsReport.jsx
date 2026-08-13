import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag, Calendar, TrendingDown, BadgeCheck } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import ReportToolbar from './ReportToolbar';
import StatCard from './StatCard';
import { exportToXLSX, exportToPDF, printReport } from '@/lib/reportExport';

export default function CouponsReport() {
  const [search, setSearch] = useState('');

  const { data: promotions = [], isLoading } = useQuery({ queryKey: ['rpt-coupons'], queryFn: () => base44.entities.Promotion.list('-created_date', 500) });

  const filtered = useMemo(() => {
    if (!search) return promotions;
    const q = search.toLowerCase();
    return promotions.filter(p => p.product_name?.toLowerCase().includes(q));
  }, [promotions, search]);

  const stats = useMemo(() => {
    const now = new Date().toISOString().substring(0, 10);
    const active = filtered.filter(p => p.active && (!p.end_date || p.end_date >= now)).length;
    const expired = filtered.filter(p => p.end_date && p.end_date < now).length;
    const totalDiscount = filtered.reduce((s, p) => s + ((p.original_price || 0) - (p.promo_price || 0)), 0);
    return { total: filtered.length, active, expired, totalDiscount };
  }, [filtered]);

  const handleXLSX = () => exportToXLSX(filtered.map(p => ({
    Produto: p.product_name, 'Preço Original': p.original_price, 'Preço Promo': p.promo_price,
    Desconto: (p.original_price || 0) - (p.promo_price || 0), Início: p.start_date, Fim: p.end_date, Ativa: p.active ? 'Sim' : 'Não',
  })), 'relatorio-cupons');
  const handlePDF = () => exportToPDF('Relatório de Cupons/Promoções', [
    { Indicador: 'Total de Promoções', Valor: stats.total },
    { Indicador: 'Ativas', Valor: stats.active },
    { Indicador: 'Expiradas', Valor: stats.expired },
    { Indicador: 'Desconto Total', Valor: formatPrice(stats.totalDiscount) },
  ], 'relatorio-cupons');

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <ReportToolbar
        preset="all" onPresetChange={() => {}}
        dateFrom="" dateTo="" onDateFromChange={() => {}} onDateToChange={() => {}}
        search={search} onSearchChange={setSearch}
        onExportXLSX={handleXLSX} onExportPDF={handlePDF} onPrint={printReport}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Tag} label="Total de Promoções" value={stats.total} color="text-pink-400" />
        <StatCard icon={BadgeCheck} label="Ativas" value={stats.active} color="text-green-400" />
        <StatCard icon={Calendar} label="Expiradas" value={stats.expired} color="text-red-400" />
        <StatCard icon={TrendingDown} label="Desconto Total" value={formatPrice(stats.totalDiscount)} color="text-amber-400" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Promoções Cadastradas</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Nenhuma promoção cadastrada</p>}
          {filtered.map(p => {
            const discount = (p.original_price || 0) - (p.promo_price || 0);
            const discountPct = p.original_price > 0 ? (discount / p.original_price) * 100 : 0;
            const expired = p.end_date && p.end_date < new Date().toISOString().substring(0, 10);
            return (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5 text-pink-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.product_name}</p>
                  <p className="text-xs text-muted-foreground">{p.start_date} → {p.end_date || '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-primary">{formatPrice(p.promo_price)}</p>
                  <p className="text-xs text-muted-foreground line-through">{formatPrice(p.original_price)}</p>
                </div>
                <Badge className={expired ? 'bg-red-500/20 text-red-400' : p.active ? 'bg-green-500/20 text-green-400' : 'bg-secondary text-muted-foreground'}>
                  {expired ? 'Expirada' : p.active ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}