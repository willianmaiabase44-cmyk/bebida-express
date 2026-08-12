import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const VEHICLE_TYPES = [
  { value: 'moto', label: 'Moto' },
  { value: 'carro', label: 'Carro' },
  { value: 'bicicleta', label: 'Bicicleta' },
];

const STATUS_OPTIONS = [
  { value: 'disponivel', label: 'Disponível' },
  { value: 'ocupado', label: 'Ocupado' },
  { value: 'offline', label: 'Offline' },
];

export default function MotoboyForm({ open, onClose, onSave, motoboy, saving }) {
  const [formData, setFormData] = useState({
    name: '', phone: '', login: '', password: '', vehicle_type: 'moto', plate: '', status: 'disponivel', active: true,
  });

  useEffect(() => {
    if (motoboy) {
      setFormData({
        name: motoboy.name || '',
        phone: motoboy.phone || '',
        login: motoboy.login || '',
        password: '',
        vehicle_type: motoboy.vehicle_type || 'moto',
        plate: motoboy.plate || '',
        status: motoboy.status || 'disponivel',
        active: motoboy.active !== false,
      });
    } else {
      setFormData({ name: '', phone: '', login: '', password: '', vehicle_type: 'moto', plate: '', status: 'disponivel', active: true });
    }
  }, [motoboy, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{motoboy ? 'Editar Motoboy' : 'Novo Motoboy'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="João Silva" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone / WhatsApp *</Label>
            <Input id="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required placeholder="(51) 99999-9999" />
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <Label htmlFor="login" className="text-primary font-semibold">Login de Acesso *</Label>
            <Input id="login" value={formData.login} onChange={e => setFormData({ ...formData, login: e.target.value })} required placeholder="joao.silva" autoCapitalize="none" />
            <p className="text-xs text-muted-foreground">Usado pelo motoboy para entrar na área dele</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              {motoboy ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}
            </Label>
            <Input id="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!motoboy} placeholder="••••••••" />
            {!motoboy && <p className="text-xs text-muted-foreground">A senha será armazenada com hash (criptografada)</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={formData.vehicle_type} onValueChange={v => setFormData({ ...formData, vehicle_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plate">Placa</Label>
              <Input id="plate" value={formData.plate} onChange={e => setFormData({ ...formData, plate: e.target.value })} placeholder="ABC1D23" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="active" className="cursor-pointer">Motoboy ativo</Label>
            <Switch id="active" checked={formData.active} onCheckedChange={v => setFormData({ ...formData, active: v })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}