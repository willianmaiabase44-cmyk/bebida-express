import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowDownCircle, ArrowUpCircle, Search, Loader2, Plus, FileText } from 'lucide-react';
import StockEntryByNote from '@/components/admin/StockEntryByNote';
import { formatPrice } from '@/lib/constants';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function StockManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [moveType, setMoveType] = useState('entrada');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list('-created_date', 500),
  });

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['admin-movements'],
    queryFn: () => base44.entities.StockMovement.list('-created_date', 200),
  });

  const moveMutation = useMutation({
    mutationFn: async () => {
      const product = products.find(p => p.id === selectedProduct);
      if (!product) throw new Error('Produto não encontrado');
      const newStock = moveType === 'entrada'
        ? (product.stock || 0) + quantity
        : Math.max(0, (product.stock || 0) - quantity);

      await base44.entities.StockMovement.create({
        product_id: product.id,
        product_name: product.name,
        type: moveType,
        quantity,
        date: new Date().toISOString().split('T')[0],
        reason,
        stock_after: newStock,
      });
      await base44.entities.Product.update(product.id, { stock: newStock });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movements'] });
      toast.success('Movimentação registrada!');
      setDialogOpen(false);
      setSelectedProduct('');
      setQuantity(1);
      setReason('');
    },
  });

  const filteredMovements = movements.filter(m => !search || m.product_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl">Controle de Estoque</h1>
        <div className="flex gap-2">
          <Button onClick={() => setNoteDialogOpen(true)} variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
            <FileText className="w-4 h-4" /> Entrada por Nota
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Nova Movimentação
          </Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-none" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-2">
          {filteredMovements.map(m => (
            <Card key={m.id} className="bg-card border-border">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.type === 'entrada' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  {m.type === 'entrada' ? <ArrowDownCircle className="w-5 h-5 text-green-500" /> : <ArrowUpCircle className="w-5 h-5 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.product_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={`text-[10px] ${m.type === 'entrada' ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>
                      {m.type === 'entrada' ? '+' : '-'}{m.quantity} un.
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{m.date}</span>
                  </div>
                  {m.reason && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{m.reason}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Após</p>
                  <p className="font-bold text-sm">{m.stock_after ?? '—'}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredMovements.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma movimentação</p>}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-background border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Nova Movimentação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMoveType('entrada')} className={`p-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border transition-all ${moveType === 'entrada' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-secondary border-border text-muted-foreground'}`}>
                <ArrowDownCircle className="w-4 h-4" /> Entrada
              </button>
              <button onClick={() => setMoveType('saida')} className={`p-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border transition-all ${moveType === 'saida' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-secondary border-border text-muted-foreground'}`}>
                <ArrowUpCircle className="w-4 h-4" /> Saída
              </button>
            </div>
            <div>
              <Label>Produto</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="bg-secondary border-none mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} (Estoque: {p.stock ?? 0})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" min="1" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} className="bg-secondary border-none mt-1" />
            </div>
            <div>
              <Label>{moveType === 'entrada' ? 'Observação' : 'Motivo'}</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} className="bg-secondary border-none mt-1" rows={2} />
            </div>
            <Button onClick={() => moveMutation.mutate()} className="w-full bg-primary hover:bg-primary/90" disabled={!selectedProduct || moveMutation.isPending}>
              {moveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar Movimentação'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <StockEntryByNote open={noteDialogOpen} onOpenChange={setNoteDialogOpen} />
    </div>
  );
}