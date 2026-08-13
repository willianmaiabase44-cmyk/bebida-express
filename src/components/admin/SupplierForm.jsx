import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const empty = { name: '', contact_name: '', phone: '', email: '', cnpj: '', category: '', address: '', notes: '', active: true };

export default function SupplierForm({ open, onClose, onSave, supplier, saving }) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open) setForm(supplier ? { ...empty, ...supplier } : empty);
  }, [open, supplier]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome / Empresa *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Distribuidora XYZ" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Contato</Label>
              <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="João Silva" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(51) 99999-9999" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contato@xyz.com" />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input value={form.category} onChange={e => set('category', e.target.value)} placeholder="Cervejas, Destilados, Refrigerantes..." />
          </div>
          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número, bairro, cidade" />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Prazos, condições de pagamento..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {supplier ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}