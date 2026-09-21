import React, { useState } from 'react';
import { listPromotions, createPromotion, updatePromotion, deletePromotion } from '@/services/promotionService';
import { listProducts } from '@/services/productService';
import { uploadFile } from '@/services/uploadService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Tag, Upload, Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import { toast } from 'sonner';

export default function Promotions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ product_id: '', promo_price: 0, start_date: '', end_date: '', banner_url: '', active: true });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['admin-promos-all'],
    queryFn: () => listPromotions(true),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => listProducts({ includeInactive: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => createPromotion(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-promos-all'] }); toast.success('Promoção criada!'); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePromotion(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-promos-all'] }); toast.success('Promoção atualizada!'); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deletePromotion(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-promos-all'] }); toast.success('Promoção excluída!'); },
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm({ product_id: '', promo_price: 0, start_date: '', end_date: '', banner_url: '', active: true }); };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ product_id: p.product_id, promo_price: p.promo_price, start_date: p.start_date, end_date: p.end_date, banner_url: p.banner_url || '', active: p.active !== false });
    setDialogOpen(true);
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await uploadFile(file);
    setForm(f => ({ ...f, banner_url: file_url }));
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const product = products.find(p => p.id === form.product_id);
    if (!product) { toast.error('Selecione um produto'); return; }
    const data = { ...form, product_name: product.name, original_price: product.price };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const now = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl">Promoções</h1>
        <Button onClick={() => { setForm({ product_id: '', promo_price: 0, start_date: '', end_date: '', banner_url: '', active: true }); setEditing(null); setDialogOpen(true); }} className="bg-primary hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Nova Promoção
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-2">
          {promotions.map(p => {
            const isActive = p.active !== false && p.start_date <= now && p.end_date >= now;
            return (
              <Card key={p.id} className="bg-card border-border">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{p.product_name}</p>
                      <Badge className={`text-[10px] ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                        {isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground line-through">{formatPrice(p.original_price)}</span>
                      <span className="text-primary font-bold text-sm">{formatPrice(p.promo_price)}</span>
                      <span className="text-[10px] text-muted-foreground">{p.start_date} → {p.end_date}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm('Excluir promoção?')) deleteMutation.mutate(p.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {promotions.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma promoção</p>}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="bg-background border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Editar Promoção' : 'Nova Promoção'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Produto</Label>
              <Select value={form.product_id} onValueChange={v => setForm(f => ({ ...f, product_id: v }))}>
                <SelectTrigger className="bg-secondary border-none mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {formatPrice(p.price)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preço Promocional</Label>
              <Input type="number" step="0.01" min="0" value={form.promo_price} onChange={e => setForm(f => ({ ...f, promo_price: parseFloat(e.target.value) || 0 }))} className="bg-secondary border-none mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="bg-secondary border-none mt-1" />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="bg-secondary border-none mt-1" />
              </div>
            </div>
            <div>
              <Label>Banner</Label>
              <div className="mt-1 flex items-center gap-3">
                {form.banner_url && <img src={form.banner_url} alt="" className="w-20 h-12 rounded-lg object-cover" />}
                <label className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl text-sm cursor-pointer hover:bg-secondary/80">
                  <Upload className="w-4 h-4" />{uploading ? 'Enviando...' : 'Upload'}
                  <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                </label>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativa</Label>
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Salvar' : 'Criar Promoção'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}