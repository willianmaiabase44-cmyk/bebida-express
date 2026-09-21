import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MapPin } from 'lucide-react';
import { getDeliveryRoute } from '@/services/freightService';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/constants';

export default function DeliveryForm({ open, onClose, onSave, delivery }) {
  const [formData, setFormData] = useState({
    client_name: '', client_phone: '', address: '', reference: '', items_description: '', total: '',
  });
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (delivery) {
      setFormData({
        client_name: delivery.client_name || '',
        client_phone: delivery.client_phone || '',
        address: delivery.address || '',
        reference: delivery.reference || '',
        items_description: delivery.items_description || '',
        total: delivery.total || '',
      });
    } else {
      setFormData({ client_name: '', client_phone: '', address: '', reference: '', items_description: '', total: '' });
    }
  }, [delivery, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.address.trim()) {
      toast.error('Endereço é obrigatório');
      return;
    }
    setGeocoding(true);
    try {
      const routeData = await getDeliveryRoute(formData.address);
      onSave({
        ...formData,
        total: parseFloat(formData.total) || 0,
        lat: routeData.client_lat,
        lng: routeData.client_lon,
        distance: routeData.distance,
        duration: routeData.duration,
      });
    } catch (err) {
      toast.error('Erro ao buscar endereço: ' + (err.message || 'tente novamente'));
    }
    setGeocoding(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{delivery ? 'Editar Entrega' : 'Nova Entrega'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name">Cliente *</Label>
              <Input id="client_name" value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} required placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_phone">Telefone</Label>
              <Input id="client_phone" value={formData.client_phone} onChange={e => setFormData({ ...formData, client_phone: e.target.value })} placeholder="(11) 99999-9999" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Endereço de Entrega *</Label>
            <Input id="address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required placeholder="Rua, número, bairro, cidade" />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> O endereço será geolocalizado para calcular a rota
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Ponto de referência</Label>
            <Input id="reference" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} placeholder="Ex: portão azul, ao lado da padaria" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="items">Itens do pedido</Label>
            <Textarea id="items" value={formData.items_description} onChange={e => setFormData({ ...formData, items_description: e.target.value })} placeholder="Ex: 2x Cerveja, 1x Gelo 5kg" rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total">Valor total (R$)</Label>
            <Input id="total" type="number" step="0.01" value={formData.total} onChange={e => setFormData({ ...formData, total: e.target.value })} placeholder="0,00" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={geocoding}>Cancelar</Button>
            <Button type="submit" disabled={geocoding}>
              {geocoding ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando rota...</> : 'Salvar e calcular rota'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}