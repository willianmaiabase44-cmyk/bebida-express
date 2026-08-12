import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bike, Plus, Search, Pencil, Trash2, Phone, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import MotoboyForm from '@/components/admin/MotoboyForm';

const STATUS_STYLES = {
  disponivel: 'bg-green-500/20 text-green-400 border-green-500/30',
  ocupado: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  offline: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const VEHICLE_LABELS = { moto: 'Moto', carro: 'Carro', bicicleta: 'Bicicleta' };

export default function Motoboys() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['deliveryDrivers'],
    queryFn: () => base44.entities.DeliveryDriver.list(),
  });

  const filtered = drivers.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.phone?.includes(search)
  );

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('manageMotoboy', {
        action: editing ? 'update' : 'create',
        data: editing ? { ...formData, id: editing.id } : formData,
      });
      if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success(editing ? 'Motoboy atualizado!' : 'Motoboy cadastrado!');
        queryClient.invalidateQueries({ queryKey: ['deliveryDrivers'] });
        setFormOpen(false);
        setEditing(null);
      }
    } catch (err) {
      toast.error('Erro ao salvar: ' + (err.response?.data?.error || err.message || 'tente novamente'));
    }
    setSaving(false);
  };

  const handleDelete = async (driver) => {
    if (!confirm(`Excluir motoboy ${driver.name}?`)) return;
    try {
      await base44.entities.DeliveryDriver.delete(driver.id);
      toast.success('Motoboy excluído');
      queryClient.invalidateQueries({ queryKey: ['deliveryDrivers'] });
    } catch (err) {
      toast.error('Erro ao excluir');
    }
  };

  const toggleStatus = async (driver) => {
    const next = driver.status === 'disponivel' ? 'offline' : 'disponivel';
    try {
      await base44.entities.DeliveryDriver.update(driver.id, { status: next });
      queryClient.invalidateQueries({ queryKey: ['deliveryDrivers'] });
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Bike className="w-6 h-6 text-primary" /> Motoboys
          </h1>
          <p className="text-muted-foreground text-sm">Cadastre e gerencie seus entregadores</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4" /> Novo Motoboy
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Bike className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum motoboy cadastrado{search ? ' encontrado' : ''}.</p>
          {!search && <Button className="mt-4" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> Cadastrar primeiro motoboy</Button>}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(driver => (
            <Card key={driver.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <Bike className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-1">
                      {driver.name}
                      {driver.active && <BadgeCheck className="w-4 h-4 text-primary" />}
                    </h3>
                    <p className="text-xs text-muted-foreground">{VEHICLE_LABELS[driver.vehicle_type] || 'Moto'} {driver.plate ? `· ${driver.plate}` : ''}</p>
                  </div>
                </div>
                <Badge className={STATUS_STYLES[driver.status] || STATUS_STYLES.offline}>{driver.status}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-3.5 h-3.5" /> {driver.phone || '—'}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{driver.total_deliveries || 0} entregas</span>
                <span>⭐ {driver.rating?.toFixed(1) || '5.0'}</span>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(driver); setFormOpen(true); }}>
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleStatus(driver)}>
                  {driver.status === 'disponivel' ? 'Offline' : 'Disponível'}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(driver)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <MotoboyForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} motoboy={editing} saving={saving} />
    </div>
  );
}