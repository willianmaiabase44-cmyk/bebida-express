import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, MapPin, DollarSign, CreditCard, ChevronRight, Bike } from 'lucide-react';
import { useMotoboy } from '@/context/MotoboyContext';
import { formatPrice } from '@/lib/constants';

const PAYMENT_LABELS = { dinheiro: 'Dinheiro', pix: 'PIX', cartao_entrega: 'Cartão na Entrega' };

const STATUS_INFO = {
  pronto: { label: 'Aguardando Aceite', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  saiu_para_entrega: { label: 'Saiu para Entrega', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
};

export default function MotoboyDashboard() {
  const navigate = useNavigate();
  const { motoboy } = useMotoboy();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('getMotoboyOrders', {
        motoboy_id: motoboy.id,
        type: 'active',
      });
      setOrders(res.data?.orders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-bold">Minhas Entregas</h1>
        <p className="text-sm text-muted-foreground">{orders.length} {orders.length === 1 ? 'entrega pendente' : 'entregas pendentes'}</p>
      </div>

      {orders.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Bike className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma entrega no momento</p>
            <p className="text-sm mt-1">Aguarde o administrador designar pedidos para você</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const si = STATUS_INFO[order.status] || STATUS_INFO.pronto;
            return (
              <Card key={order.id} className="bg-card border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-lg">#{order.order_number}</span>
                    <Badge className={si.color}>{si.label}</Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{order.customer_name}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{order.address?.full || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{PAYMENT_LABELS[order.payment_method] || order.payment_method}</span>
                    </div>
                    {order.change_for != null && order.change_for > 0 && (
                      <p className="text-xs text-amber-400 ml-6">Troco para {formatPrice(order.change_for)}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor do pedido</p>
                      <p className="font-heading font-bold text-primary text-lg flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {formatPrice(order.total)}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => navigate(`/motoboy/entrega/${order.id}`)}>
                      Ver Pedido <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}