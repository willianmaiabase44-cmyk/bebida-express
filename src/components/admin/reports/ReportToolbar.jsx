import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, FileSpreadsheet, FileText, Printer } from 'lucide-react';

export const DATE_PRESETS = [
  { key: 'today', label: 'Hoje' },
  { key: 'yesterday', label: 'Ontem' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'month', label: 'Mês atual' },
  { key: 'all', label: 'Tudo' },
  { key: 'custom', label: 'Personalizado' },
];

export function getPresetRange(key) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fmt = (d) => d.toISOString().substring(0, 10);
  switch (key) {
    case 'today': return { from: fmt(today), to: fmt(today) };
    case 'yesterday': { const y = new Date(today); y.setDate(y.getDate() - 1); return { from: fmt(y), to: fmt(y) }; }
    case '7d': { const d = new Date(today); d.setDate(d.getDate() - 6); return { from: fmt(d), to: fmt(today) }; }
    case '30d': { const d = new Date(today); d.setDate(d.getDate() - 29); return { from: fmt(d), to: fmt(today) }; }
    case 'month': return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(today) };
    default: return { from: '', to: '' };
  }
}

export function filterByDateRange(items, dateFrom, dateTo, dateField = 'created_date') {
  if (!dateFrom && !dateTo) return items;
  return items.filter(item => {
    const raw = item[dateField] || item.created_date || item.date;
    if (!raw) return false;
    const d = typeof raw === 'string' ? raw.substring(0, 10) : new Date(raw).toISOString().substring(0, 10);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  });
}

const selectClass = "bg-secondary border-none rounded-lg px-3 py-1.5 text-xs cursor-pointer outline-none";

export default function ReportToolbar({
  preset, onPresetChange,
  dateFrom, dateTo, onDateFromChange, onDateToChange,
  search, onSearchChange, showSearch = true,
  onExportXLSX, onExportPDF, onPrint,
  extraFilters,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {DATE_PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => onPresetChange(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                preset === p.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <Input type="date" value={dateFrom} onChange={e => onDateFromChange(e.target.value)} className="w-36 bg-secondary border-none text-xs h-8" />
            <span className="text-muted-foreground text-xs">até</span>
            <Input type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)} className="w-36 bg-secondary border-none text-xs h-8" />
          </div>
        )}

        {showSearch && (
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => onSearchChange(e.target.value)} className="pl-9 bg-secondary border-none text-sm h-8" />
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {onExportXLSX && (
            <button onClick={onExportXLSX} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground border border-border">
              <FileSpreadsheet className="w-3.5 h-3.5" /> XLSX
            </button>
          )}
          {onExportPDF && (
            <button onClick={onExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground border border-border">
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
          )}
          {onPrint && (
            <button onClick={onPrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground border border-border">
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
          )}
        </div>
      </div>

      {extraFilters && <div className="flex flex-wrap gap-2">{extraFilters}</div>}
    </div>
  );
}