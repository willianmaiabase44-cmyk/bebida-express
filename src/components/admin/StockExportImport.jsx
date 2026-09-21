import React, { useState, useRef } from 'react';
import { createProduct, updateProduct } from '@/services/productService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Download, Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

const HEADERS = [
  'name',
  'description',
  'category',
  'price',
  'cost_price',
  'stock',
  'min_stock',
  'image_url',
  'is_featured',
  'is_new',
  'active',
];

function toCSV(rows) {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(';') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [HEADERS.join(';')];
  rows.forEach((r) => {
    lines.push(HEADERS.map((h) => escape(r[h])).join(';'));
  });
  return lines.join('\n');
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) throw new Error('Arquivo vazio');
  const splitLine = (line) => {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQ = false; }
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ';') { out.push(cur); cur = ''; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = splitLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((l) => {
    const vals = splitLine(l);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
}

function parseBool(v) {
  return String(v).toLowerCase() === 'true' || v === '1' || v === 'sim';
}

export default function StockExportImport({ products = [] }) {
  const [importOpen, setImportOpen] = useState(false);
  const [parsed, setParsed] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleExport = () => {
    const rows = products.map((p) => ({
      name: p.name ?? '',
      description: p.description ?? '',
      category: p.category ?? '',
      price: p.price ?? 0,
      cost_price: p.cost_price ?? 0,
      stock: p.stock ?? 0,
      min_stock: p.min_stock ?? 0,
      image_url: p.image_url ?? '',
      is_featured: p.is_featured ? 'true' : 'false',
      is_new: p.is_new ? 'true' : 'false',
      active: p.active ? 'true' : 'false',
    }));
    const csv = toCSV(rows);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estoque_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} produtos exportados`);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target.result);
        setParsed(rows);
      } catch (err) {
        toast.error('Erro ao ler CSV: ' + err.message);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setLoading(true);
    let updated = 0;
    let created = 0;
    let skipped = 0;
    try {
      const existingByName = {};
      products.forEach((p) => {
        if (p.name) existingByName[p.name.toLowerCase().trim()] = p;
      });
      for (const row of parsed) {
        const name = (row.name || '').trim();
        if (!name) { skipped++; continue; }
        const data = {
          name,
          description: row.description || '',
          category: row.category || 'cervejas',
          price: parseFloat(row.price) || 0,
          cost_price: parseFloat(row.cost_price) || 0,
          stock: parseFloat(row.stock) || 0,
          min_stock: parseFloat(row.min_stock) || 0,
          image_url: row.image_url || '',
          is_featured: parseBool(row.is_featured),
          is_new: parseBool(row.is_new),
          active: row.active === '' ? true : parseBool(row.active),
        };
        const existing = existingByName[name.toLowerCase()];
        if (existing) {
          await updateProduct(existing.id, data);
          updated++;
        } else {
          await createProduct(data);
          created++;
        }
      }
      toast.success(`Importação concluída: ${updated} atualizados, ${created} criados${skipped ? `, ${skipped} ignorados` : ''}`);
      setImportOpen(false);
      setParsed([]);
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      toast.error('Erro na importação: ' + (err.message || 'desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const sample = toCSV([{
      name: 'Cerveja Exemplo',
      description: 'Descrição do produto',
      category: 'cervejas',
      price: 8.5,
      cost_price: 5.0,
      stock: 100,
      min_stock: 10,
      image_url: '',
      is_featured: 'false',
      is_new: 'false',
      active: 'true',
    }]);
    const blob = new Blob(['\ufeff' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_estoque.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button onClick={handleExport} variant="outline" className="gap-2 border-border" disabled={products.length === 0}>
        <Download className="w-4 h-4" /> Exportar
      </Button>
      <Button onClick={() => setImportOpen(true)} variant="outline" className="gap-2 border-border">
        <Upload className="w-4 h-4" /> Importar
      </Button>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="bg-background border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" /> Importar Estoque
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Selecione um arquivo CSV (separado por ponto e vírgula <code className="text-foreground">;</code>) com os produtos.
              Produtos com o mesmo <strong>nome</strong> serão atualizados; novos nomes serão criados.
            </div>
            <div>
              <Label>Arquivo CSV</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:font-medium hover:file:bg-primary/90 cursor-pointer"
              />
            </div>
            <button onClick={downloadTemplate} className="text-xs text-primary underline hover:no-underline">
              Baixar modelo de planilha
            </button>
            {parsed.length > 0 && (
              <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                <p className="font-medium">{parsed.length} produtos encontrados no arquivo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Serão atualizados/criados ao confirmar a importação.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setImportOpen(false); setParsed([]); }} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleImport} className="bg-primary hover:bg-primary/90" disabled={parsed.length === 0 || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Importar ${parsed.length || ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}