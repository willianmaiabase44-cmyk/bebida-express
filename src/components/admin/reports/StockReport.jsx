import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listProducts } from '@/services/productService';
import { listMovements } from '@/services/stockService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, XCircle, ArrowLeftRight, DollarSign } from 'lucide-react';
import { formatPrice, CATEGORIES } from '@/lib/constants';
import ReportToolbar, { getPresetRange, filterByDateRange } from './ReportToolbar';
import StatCard from './StatCard';
import { exportToXLSX, exportToPDF, printReport } from '@/lib/reportExport';

export default function StockReport() {
  const [preset, setPreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const { data: products = [], isLoading } = useQuery({ queryKey: ['rpt-stock-products'], queryFn: () => listProducts({ includeInactive: true }) });
  const { data: movements = [] } = useQuery({ queryKey: ['rpt-stock-movements'], queryFn: () => listMovements() });

  useEffect(() => {
    if (preset !== 'custom' && preset !== 'all') { const r = getPresetRange(preset); setDateFrom(r.from); setDateTo(r.to); }
    else if (preset === 'all') { setDateFrom(''); setDateTo(''); }
  }, [preset]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  const lowStock = useMemo(() => filteredProducts.filter(p => (p.stock ?? 0) <= (p.min_stock || 5) && (p.stock ?? 0) > 0), [filteredProducts]);
  const outStock = useMemo(() => filteredProducts.filter(p => (p.stock ?? 0) <= 0), [filteredProducts]);

  const filteredMovements = useMemo(() => {
    let r = filterByDateRange(movements, dateFrom, dateTo);
    if (search) r = r.filter(m => m.product_name?.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [movements, dateFrom, dateTo, search]);

  const stats = useMemo(() => {
    const totalItems = filteredProducts.length;
    const stockValue = filteredProducts.reduce((s, p) => s + (p.stock || 0) * (p.cost_price || p.price || 0), 0);
    const entradas = filteredMovements.filter(m => m.type === 'entrada').reduce((s, m) => s + m.quantity, 0);
    const saidas = filteredMovements.filter(m => m.type === 'saida').reduce((s, m) => s + m.quantity, 0);
    return { totalItems, stockValue, entradas, saidas };
  }, [filteredProducts, filteredMovements]);

  const handleXLSX = () => exportToXLSX(filteredProducts.map(p => ({
    Produto: p.name, Categoria: CATEGORIES.find(c => c.value === p.category)?.label || p.category,
    Estoque: p.stock || 0, 'Estoque Mín': p.min_stock || 5, 'Preço': p.price, 'Valor Estoque': (p.stock || 0) * (p.cost_price || p.price || 0),
  })), 'relatorio-estoque');
  const handlePDF = () => exportToPDF('Relatório de Estoque', [
    { Indicador: 'Total de Produtos', Valor: stats.totalItems },
    { Indicador: 'Valor em Estoque', Valor: formatPrice(stats.stockValue) },
    { Indicador: 'Estoque Baixo', Valor: lowStock.length },
    { Indicador: 'Sem Estoque', Valor: outStock.length },
    { Indicador: 'Entradas (período)', Valor: stats.entradas },
    { Indicador: 'Saídas (período)', Valor: stats.saidas },
  ], 'relatorio-estoque');

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
        <StatCard icon={Package} label="Total de Produtos" value={stats.totalItems} color="text-primary" />
        <StatCard icon={DollarSign} label="Valor em Estoque" value={formatPrice(stats.stockValue)} color="text-green-400" />
        <StatCard icon={AlertTriangle} label="Estoque Baixo" value={lowStock.length} color="text-amber-400" />
        <StatCard icon={XCircle} label="Sem Estoque" value={outStock.length} color="text-red-400" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Estoque Baixo</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {lowStock.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Tudo OK!</p>}
            {lowStock.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                <span className="text-sm flex-1 truncate">{p.name}</span>
                <Badge className="bg-amber-500/20 text-amber-400">{p.stock} un.</Badge>
                <span className="text-xs text-muted-foreground">mín: {p.min_stock || 5}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400" /> Sem Estoque</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {outStock.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Tudo OK!</p>}
            {outStock.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                <span className="text-sm flex-1 truncate">{p.name}</span>
                <Badge className="bg-red-500/20 text-red-400">0 un.</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowLeftRight className="w-4 h-4 text-primary" /> Movimentações do Período</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-3 text-sm">
            <span className="text-green-400">Entradas: <strong>{stats.entradas} un.</strong></span>
            <span className="text-red-400">Saídas: <strong>{stats.saidas} un.</strong></span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredMovements.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Sem movimentações no período</p>}
            {filteredMovements.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                <Badge variant="outline" className={`text-[10px] shrink-0 ${m.type === 'entrada' ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>
                  {m.type === 'entrada' ? '+' : '-'}{m.quantity}
                </Badge>
                <span className="text-sm flex-1 truncate">{m.product_name}</span>
                {m.reason && <span className="text-xs text-muted-foreground truncate hidden sm:block">{m.reason}</span>}
                <span className="text-xs text-muted-foreground shrink-0">{(m.date || '').substring(0, 10)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}