import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, MapPin, CheckCircle2, XCircle } from 'lucide-react';
import { useMotoboy } from '@/context/MotoboyContext';
import { formatPrice } from '@/lib/constants';

const STATUS_INFO = {
  entregue: { label: 'Entregue', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  cancelado: { label: 'Cancelado', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

export default function MotoboyHistory() {
  const { motoboy } = useMotoboy();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await base44.functions.invoke('getMotoboyOrders', {
          motoboy_id: motoboy.id,
          type: 'history',
        });
        setOrders(res.data?.orders || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-bold">Histórico de Entregas</h1>
        <p className="text-sm text-muted-foreground">{orders.length} {orders.length === 1 ? 'entrega' : 'entregas'} realizadas</p>
      </div>

      {orders.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma entrega no histórico</p>
            <p className="text-sm mt-1">Suas entregas concluídas aparecerão aqui</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const si = STATUS_INFO[order.status] || STATUS_INFO.entregue;
            return (
              <Card key={order.id} className="bg-card border-border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold">#{order.order_number}</span>
                    <Badge className={si.color}>{si.label}</Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {order.address?.full}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
                    <span className="text-muted-foreground">
                      {order.delivered_at
                        ? new Date(order.delivered_at).toLocaleString('pt-BR')
                        : new Date(order.created_date).toLocaleString('pt-BR')}
                    </span>
                    <span className="font-bold text-primary">{formatPrice(order.total)}</span>
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