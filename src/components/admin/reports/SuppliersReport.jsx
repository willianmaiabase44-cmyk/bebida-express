import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listSuppliers } from '@/services/supplierService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Phone, Mail, BadgeCheck } from 'lucide-react';
import ReportToolbar from './ReportToolbar';
import StatCard from './StatCard';
import { exportToXLSX, exportToPDF, printReport } from '@/lib/reportExport';

export default function SuppliersReport() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: suppliers = [], isLoading } = useQuery({ queryKey: ['rpt-suppliers'], queryFn: () => listSuppliers() });

  const filtered = useMemo(() => {
    return suppliers.filter(s => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.name?.toLowerCase().includes(q) || s.contact_name?.toLowerCase().includes(q) || s.phone?.includes(q) || s.category?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [suppliers, search, categoryFilter]);

  const categories = useMemo(() => {
    const set = new Set(suppliers.map(s => s.category).filter(Boolean));
    return Array.from(set);
  }, [suppliers]);

  const stats = useMemo(() => {
    const active = filtered.filter(s => s.active).length;
    const byCat = {};
    filtered.forEach(s => { if (s.category) byCat[s.category] = (byCat[s.category] || 0) + 1; });
    return { total: filtered.length, active, inactive: filtered.length - active, byCat };
  }, [filtered]);

  const handleXLSX = () => exportToXLSX(filtered.map(s => ({
    Nome: s.name, Contato: s.contact_name, Telefone: s.phone, Email: s.email,
    CNPJ: s.cnpj, Categoria: s.category, Endereço: s.address, Ativo: s.active ? 'Sim' : 'Não',
  })), 'relatorio-fornecedores');
  const handlePDF = () => exportToPDF('Relatório de Fornecedores', filtered.map(s => ({
    Fornecedor: s.name, Contato: s.contact_name || '—', Telefone: s.phone || '—', Categoria: s.category || '—',
  })), 'relatorio-fornecedores');

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const selectClass = "bg-secondary border-none rounded-lg px-3 py-1.5 text-xs cursor-pointer outline-none";

  return (
    <div className="space-y-4">
      <ReportToolbar
        preset="all" onPresetChange={() => {}}
        dateFrom="" dateTo="" onDateFromChange={() => {}} onDateToChange={() => {}}
        search={search} onSearchChange={setSearch}
        onExportXLSX={handleXLSX} onExportPDF={handlePDF} onPrint={printReport}
        extraFilters={
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={selectClass}>
            <option value="all">Todas categorias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Truck} label="Total de Fornecedores" value={stats.total} color="text-cyan-400" />
        <StatCard icon={BadgeCheck} label="Ativos" value={stats.active} color="text-green-400" />
        <StatCard icon={Truck} label="Inativos" value={stats.inactive} color="text-red-400" />
      </div>

      {Object.keys(stats.byCat).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Fornecedores por Categoria</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCat).map(([cat, count]) => (
                <Badge key={cat} variant="secondary" className="text-sm">{cat}: {count}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Lista de Fornecedores</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Nenhum fornecedor encontrado</p>}
          {filtered.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.category || 'Sem categoria'}</p>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-0.5 text-xs text-muted-foreground">
                {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
              </div>
              <Badge variant={s.active ? 'default' : 'secondary'}>{s.active ? 'Ativo' : 'Inativo'}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}