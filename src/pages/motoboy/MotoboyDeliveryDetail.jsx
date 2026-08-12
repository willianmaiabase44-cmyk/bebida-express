import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, MapPin, Package, CreditCard, DollarSign, Phone, Navigation, CheckCircle2, ExternalLink } from 'lucide-react';
import { useMotoboy } from '@/context/MotoboyContext';
import { formatPrice } from '@/lib/constants';
import { toast } from 'sonner';
import RouteMap from '@/components/admin/RouteMap';

const PAYMENT_LABELS = { dinheiro: 'Dinheiro', pix: 'PIX', cartao_entrega: 'Cartão na Entrega' };

const STATUS_INFO = {
  pronto: { label: 'Aguardando Aceite', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  saiu_para_entrega: { label: 'Saiu para Entrega', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  entregue: { label: 'Entregue', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
};

export default function MotoboyDeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { motoboy } = useMotoboy();
  const [order, setOrder] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('getMotoboyOrders', {
        motoboy_id: motoboy.id,
        type: 'active',
      });
      const orders = res.data?.orders || [];
      // Busca também no histórico caso já tenha sido entregue
      const resHist = await base44.functions.invoke('getMotoboyOrders', {
        motoboy_id: motoboy.id,
        type: 'history',
      });
      const allOrders = [...orders, ...(resHist.data?.orders || [])];
      const found = allOrders.find(o => o.id === id);
      if (found) setOrder(found);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const loadRoute = async () => {
    if (!order?.address) return;
    setRouteLoading(true);
    try {
      const res = await base44.functions.invoke('getDeliveryRoute', {
        address: order.address,
      });
      if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        setRoute(res.data);
      }
    } catch (e) {
      toast.error('Erro ao carregar rota');
    } finally {
      setRouteLoading(false);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('motoboyManageOrder', {
        action: 'accept',
        order_id: order.id,
        motoboy_id: motoboy.id,
      });
      if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success('Entrega aceita! Saiu para entrega.');
        load();
      }
    } catch (e) {
      toast.error('Erro ao aceitar entrega');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (!confirm('Confirmar entrega do pedido #' + order.order_number + '?')) return;
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('motoboyManageOrder', {
        action: 'deliver',
        order_id: order.id,
        motoboy_id: motoboy.id,
      });
      if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success('Pedido marcado como entregue!');
        navigate('/motoboy');
      }
    } catch (e) {
      toast.error('Erro ao finalizar entrega');
    } finally {
      setActionLoading(false);
    }
  };

  const openGoogleMaps = () => {
    if (order.address_lat && order.address_lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${order.address_lat},${order.address_lng}`;
      window.open(url, '_blank');
    } else if (route?.client_lat && route?.client_lon) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${route.client_lat},${route.client_lon}`;
      window.open(url, '_blank');
    } else {
      const addr = encodeURIComponent(order.address?.full || '');
      window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`, '_blank');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!order) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-muted-foreground">Pedido não encontrado</p>
        <Button variant="outline" onClick={() => navigate('/motoboy')}>Voltar</Button>
      </div>
    );
  }

  const si = STATUS_INFO[order.status] || STATUS_INFO.pronto;
  const canAccept = order.status === 'pronto';
  const canDeliver = order.status === 'saiu_para_entrega';

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/motoboy')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-heading text-xl font-bold">Pedido #{order.order_number}</h1>
          <Badge className={si.color + ' mt-1'}>{si.label}</Badge>
        </div>
      </div>

      {/* Cliente e Endereço */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{order.customer_name}</span>
            </div>
            <a href={`tel:${order.customer_phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Phone className="w-4 h-4" />
              {order.customer_phone}
            </a>
          </div>
          <div className="border-t border-border pt-3 space-y-1">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Endereço de Entrega
            </h3>
            <p className="text-sm">{order.address?.full}</p>
            {order.address?.reference && (
              <p className="text-xs text-muted-foreground">Ref: {order.address.reference}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Itens e Pagamento */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Itens</h3>
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.quantity}× {item.product_name}</span>
                <span className="text-muted-foreground">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span>{formatPrice(order.freight || 0)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-1">
              <span>Total</span>
              <span className="text-primary flex items-center gap-0.5">
                <DollarSign className="w-4 h-4" />{formatPrice(order.total)}
              </span>
            </div>
            <div className="flex justify-between text-xs pt-1">
              <span className="text-muted-foreground">Pagamento</span>
              <span className="font-medium">{PAYMENT_LABELS[order.payment_method] || order.payment_method}</span>
            </div>
            {order.change_for != null && order.change_for > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Troco para</span>
                <span className="text-amber-400">{formatPrice(order.change_for)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rota e Mapa */}
      {(canAccept || canDeliver) && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" /> Rota da Entrega
              </h3>
              {route && (
                <div className="text-right text-xs text-muted-foreground">
                  <p>{(route.distance / 1000).toFixed(1)} km</p>
                  <p>{Math.round(route.duration / 60)} min</p>
                </div>
              )}
            </div>

            {!showMap && !route && (
              <Button variant="outline" className="w-full" onClick={() => { setShowMap(true); loadRoute(); }} disabled={routeLoading}>
                {routeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Navigation className="w-4 h-4" /> Ver Rota</>}
              </Button>
            )}

            {showMap && routeLoading && (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {showMap && route && (
              <div className="space-y-3">
                <RouteMap
                  storeCoords={[route.store_lat, route.store_lon]}
                  clientCoords={[route.client_lat, route.client_lon]}
                  routeGeometry={route.route_geometry}
                  height="300px"
                />
                <Button variant="outline" className="w-full gap-2" onClick={openGoogleMaps}>
                  <ExternalLink className="w-4 h-4" /> Abrir no Google Maps
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="space-y-3">
        {canAccept && (
          <Button size="lg" className="w-full h-14 text-base" onClick={handleAccept} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Aceitar Entrega</>}
          </Button>
        )}
        {canDeliver && (
          <Button size="lg" className="w-full h-14 text-base bg-green-600 hover:bg-green-700" onClick={handleDeliver} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Marcar como Entregue</>}
          </Button>
        )}
        {order.status === 'entregue' && (
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-2" />
              <p className="font-medium text-green-400">Pedido Entregue</p>
              {order.delivered_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(order.delivered_at).toLocaleString('pt-BR')}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}