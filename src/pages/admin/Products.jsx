import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, Package, Loader2, Upload } from 'lucide-react';
import { CATEGORIES, formatPrice } from '@/lib/constants';
import { toast } from 'sonner';

const EMPTY_PRODUCT = { name: '', description: '', category: 'cervejas', price: 0, cost_price: 0, stock: 0, min_stock: 5, image_url: '', is_featured: false, is_new: false, active: true };

export default function Products() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list('-created_date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Produto criado!'); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Produto atualizado!'); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Produto excluído!'); },
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(EMPTY_PRODUCT); };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || '', category: p.category, price: p.price, cost_price: p.cost_price || 0, stock: p.stock || 0, min_stock: p.min_stock || 5, image_url: p.image_url || '', is_featured: p.is_featured || false, is_new: p.is_new || false, active: p.active !== false });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, image_url: file_url }));
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Nome é obrigatório'); return; }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl">Produtos</h1>
        <Button onClick={() => { setForm(EMPTY_PRODUCT); setEditing(null); setDialogOpen(true); }} className="bg-primary hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Novo Produto
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-none" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <Card key={p.id} className="bg-card border-border">
              <CardContent className="p-3 flex items-center gap-3">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    {!p.active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                    {p.is_featured && <Badge className="bg-primary/20 text-primary text-[10px]">Destaque</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-primary font-bold text-sm">{formatPrice(p.price)}</span>
                    <span className="text-xs text-muted-foreground">Estoque: {p.stock ?? 0}</span>
                    <Badge variant="outline" className="text-[10px]">{CATEGORIES.find(c => c.value === p.category)?.label}</Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm('Excluir produto?')) deleteMutation.mutate(p.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum produto encontrado</p>}
        </div>
      )}

      {/* Product Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="bg-background border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-secondary border-none mt-1" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-secondary border-none mt-1" rows={2} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="bg-secondary border-none mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preço de Venda</Label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} className="bg-secondary border-none mt-1" />
              </div>
              <div>
                <Label>Preço de Custo</Label>
                <Input type="number" step="0.01" min="0" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: parseFloat(e.target.value) || 0 }))} className="bg-secondary border-none mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estoque</Label>
                <Input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} className="bg-secondary border-none mt-1" />
              </div>
              <div>
                <Label>Estoque Mínimo</Label>
                <Input type="number" min="0" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: parseInt(e.target.value) || 0 }))} className="bg-secondary border-none mt-1" />
              </div>
            </div>
            <div>
              <Label>Imagem</Label>
              <div className="mt-1 flex items-center gap-3">
                {form.image_url && <img src={form.image_url} alt="" className="w-16 h-16 rounded-xl object-cover" />}
                <label className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl text-sm cursor-pointer hover:bg-secondary/80">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Enviando...' : 'Upload'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Produto Destaque</Label>
              <Switch checked={form.is_featured} onCheckedChange={v => setForm(f => ({ ...f, is_featured: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Lançamento</Label>
              <Switch checked={form.is_new} onCheckedChange={v => setForm(f => ({ ...f, is_new: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Salvar' : 'Criar Produto'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}