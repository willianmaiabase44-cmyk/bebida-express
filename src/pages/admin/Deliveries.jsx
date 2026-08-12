import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Plus, Search, Phone, Navigation, Loader2, Package, Check, X, Route } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice, STORE_COORDS } from '@/lib/constants';
import DeliveryForm from '@/components/admin/DeliveryForm';
import RouteMap from '@/components/admin/RouteMap';

const STATUS_STYLES = {
  pendente: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  em_rota: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  entregue: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelada: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const STATUS_LABELS = {
  pendente: 'Pendente', em_rota: 'Em Rota', entregue: 'Entregue', cancelada: 'Cancelada',
};

const formatDuration = (seconds) => {
  if (!seconds) return '—';
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
};

const formatDistance = (meters) => {
  if (!meters) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export default function Deliveries() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [routeView, setRouteView] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const queryClient = useQueryClient();

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => base44.entities.Delivery.list('-created_date', 50),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['deliveryDrivers'],
    queryFn: () => base44.entities.DeliveryDriver.list(),
  });

  const availableDrivers = drivers.filter(d => d.status === 'disponivel' && d.active !== false);

  const filtered = deliveries.filter(d => {
    const matchSearch = !search ||
      d.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.address?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async (formData) => {
    try {
      const payload = { ...formData, date: new Date().toISOString().split('T')[0] };
      if (editing) {
        await base44.entities.Delivery.update(editing.id, payload);
        toast.success('Entrega atualizada!');
      } else {
        await base44.entities.Delivery.create(payload);
        toast.success('Entrega criada com rota calculada!');
      }
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error('Erro ao salvar: ' + (err.message || 'tente novamente'));
    }
  };

  const assignMotoboy = async (delivery, motoboyId) => {
    if (!motoboyId) return;
    const motoboy = drivers.find(d => d.id === motoboyId);
    try {
      await base44.entities.Delivery.update(delivery.id, {
        motoboy_id: motoboyId,
        motoboy_name: motoboy?.name || '',
        status: delivery.status === 'pendente' ? 'em_rota' : delivery.status,
      });
      await base44.entities.DeliveryDriver.update(motoboyId, { status: 'ocupado' });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryDrivers'] });
      toast.success(`${motoboy?.name} designado para a entrega!`);
    } catch (err) {
      toast.error('Erro ao designar motoboy');
    }
  };

  const updateStatus = async (delivery, status) => {
    try {
      const updates = { status };
      if (status === 'entregue' && delivery.motoboy_id) {
        await base44.entities.DeliveryDriver.update(delivery.motoboy_id, {
          status: 'disponivel',
          total_deliveries: (drivers.find(d => d.id === delivery.motoboy_id)?.total_deliveries || 0) + 1,
        });
        queryClient.invalidateQueries({ queryKey: ['deliveryDrivers'] });
      }
      if (status === 'cancelada' && delivery.motoboy_id) {
        await base44.entities.DeliveryDriver.update(delivery.motoboy_id, { status: 'disponivel' });
        queryClient.invalidateQueries({ queryKey: ['deliveryDrivers'] });
      }
      await base44.entities.Delivery.update(delivery.id, updates);
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      toast.success(`Status: ${STATUS_LABELS[status]}`);
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  const viewRoute = async (delivery) => {
    setRouteView(delivery);
    setRouteData(null);
    setRouteLoading(true);
    try {
      const res = await base44.functions.invoke('getDeliveryRoute', { address: delivery.address });
      if (res.data?.error) {
        toast.error(res.data.error);
        setRouteData(null);
      } else {
        setRouteData(res.data);
      }
    } catch (err) {
      toast.error('Erro ao buscar rota');
    }
    setRouteLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> Entregas
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie entregas e designe motoboys com rota otimizada</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4" /> Nova Entrega
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente ou endereço..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="em_rota">Em rota</SelectItem>
            <SelectItem value="entregue">Entregues</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma entrega{search || statusFilter !== 'all' ? ' encontrada' : ''}.</p>
          {!search && statusFilter === 'all' && <Button className="mt-4" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> Criar primeira entrega</Button>}
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map(delivery => (
            <Card key={delivery.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{delivery.client_name}</h3>
                    <Badge className={STATUS_STYLES[delivery.status]}>{STATUS_LABELS[delivery.status]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {delivery.address}
                  </p>
                  {delivery.reference && <p className="text-xs text-muted-foreground pl-5">📌 {delivery.reference}</p>}
                </div>
                {delivery.total > 0 && <span className="text-primary font-semibold whitespace-nowrap">{formatPrice(delivery.total)}</span>}
              </div>

              {delivery.items_description && (
                <p className="text-sm text-muted-foreground bg-secondary/30 rounded-md p-2 flex items-start gap-1.5">
                  <Package className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {delivery.items_description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {delivery.client_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {delivery.client_phone}</span>}
                {delivery.distance > 0 && <span className="flex items-center gap-1"><Route className="w-3 h-3" /> {formatDistance(delivery.distance)}</span>}
                {delivery.duration > 0 && <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> {formatDuration(delivery.duration)}</span>}
              </div>

              {delivery.motoboy_name && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Motoboy:</span>
                  <Badge variant="secondary">{delivery.motoboy_name}</Badge>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => viewRoute(delivery)}>
                  <Route className="w-3.5 h-3.5" /> Ver Rota
                </Button>
                {delivery.status === 'pendente' && (
                  <Select onValueChange={(v) => assignMotoboy(delivery, v)}>
                    <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Designar motoboy" /></SelectTrigger>
                    <SelectContent>
                      {availableDrivers.length === 0 ? (
                        <SelectItem value="_none" disabled>Nenhum disponível</SelectItem>
                      ) : availableDrivers.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {delivery.status === 'em_rota' && (
                  <>
                    <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus(delivery, 'entregue')}>
                      <Check className="w-3.5 h-3.5" /> Entregue
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatus(delivery, 'cancelada')}>
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => { setEditing(delivery); setFormOpen(true); }}>
                  Editar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DeliveryForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} delivery={editing} />

      {/* Route Dialog */}
      <Dialog open={!!routeView} onOpenChange={(v) => { if (!v) { setRouteView(null); setRouteData(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="w-5 h-5 text-primary" /> Rota da Entrega
            </DialogTitle>
          </DialogHeader>
          {routeView && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="font-semibold">{routeView.client_name}</p>
                <p className="text-sm text-muted-foreground">{routeView.address}</p>
              </div>
              {routeLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Calculando rota...</span>
                </div>
              ) : routeData ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-secondary/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Distância</p>
                      <p className="text-lg font-bold text-primary">{formatDistance(routeData.distance)}</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Tempo estimado</p>
                      <p className="text-lg font-bold text-primary">{formatDuration(routeData.duration)}</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Motoboy</p>
                      <p className="text-sm font-bold">{routeView.motoboy_name || '—'}</p>
                    </div>
                  </div>
                  <RouteMap
                    storeCoords={[routeData.store_lat, routeData.store_lon]}
                    clientCoords={[routeData.client_lat, routeData.client_lon]}
                    routeGeometry={routeData.route_geometry}
                    height="350px"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    🔴 Smoke Bebidas &nbsp;→&nbsp; 🔵 Cliente
                  </p>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Não foi possível calcular a rota para este endereço.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}