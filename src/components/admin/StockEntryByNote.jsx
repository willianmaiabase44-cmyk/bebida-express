import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function StockEntryByNote({ open, onOpenChange }) {
  const [noteNumber, setNoteNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list('-created_date', 500),
    enabled: open,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 200),
    enabled: open,
  });

  const entryMutation = useMutation({
    mutationFn: async () => {
      const validItems = items.filter(i => i.product_id && i.quantity > 0);
      if (!noteNumber.trim()) throw new Error('Informe o número da nota');
      if (validItems.length === 0) throw new Error('Adicione ao menos um produto');

      const today = new Date().toISOString().split('T')[0];
      const reason = `Entrada por nota: ${noteNumber.trim()}${supplier ? ` — Fornecedor: ${supplier}` : ''}`;

      // Processa cada item: atualiza estoque do produto + cria movimentação
      for (const item of validItems) {
        const product = products.find(p => p.id === item.product_id);
        if (!product) continue;
        const newStock = (product.stock || 0) + Number(item.quantity);
        await base44.entities.Product.update(product.id, { stock: newStock });
        await base44.entities.StockMovement.create({
          product_id: product.id,
          product_name: product.name,
          type: 'entrada',
          quantity: Number(item.quantity),
          date: today,
          reason,
          stock_after: newStock,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movements'] });
      toast.success('Entrada por nota registrada! Estoque atualizado.');
      setNoteNumber('');
      setSupplier('');
      setItems([{ product_id: '', quantity: 1 }]);
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message || 'Erro ao registrar entrada'),
  });

  const addItem = () => setItems([...items, { product_id: '', quantity: 1 }]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    setItems(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Entrada por Nota Fiscal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nº da Nota *</Label>
              <Input value={noteNumber} onChange={e => setNoteNumber(e.target.value)} placeholder="Ex: 000.123.456" className="bg-secondary border-none mt-1" />
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Select value={supplier} onValueChange={setSupplier}>
                <SelectTrigger className="bg-secondary border-none mt-1"><SelectValue placeholder="Opcional..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Produtos da Nota</Label>
            <div className="space-y-2 mt-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Select value={item.product_id} onValueChange={v => updateItem(idx, 'product_id', v)}>
                    <SelectTrigger className="bg-secondary border-none flex-1">
                      <SelectValue placeholder="Selecione o produto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} (Est: {p.stock ?? 0})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="bg-secondary border-none w-20"
                    placeholder="Qtd"
                  />
                  {items.length > 1 && (
                    <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addItem} className="mt-2 gap-1 border-border">
              <Plus className="w-3.5 h-3.5" /> Adicionar produto
            </Button>
          </div>

          <Button
            onClick={() => entryMutation.mutate()}
            disabled={entryMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 gap-2"
          >
            {entryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Registrar Entrada e Atualizar Estoque
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}