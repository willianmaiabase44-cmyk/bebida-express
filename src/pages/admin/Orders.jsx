import React, { useState, useEffect } from "react";
import { listOrders, updateOrderStatus, assignDriver } from "@/services/orderService";
import { listMotoboys } from "@/services/motoboyService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Package, MapPin, Phone, Bike, Clock, DollarSign, ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/constants";

const STATUS_CONFIG = {
  novo: { label: "Novo", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  confirmado: { label: "Confirmado", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  em_preparacao: { label: "Em Preparação", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  pronto: { label: "Pronto", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  saiu_para_entrega: { label: "Saiu p/ Entrega", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  entregue: { label: "Entregue", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  cancelado: { label: "Cancelado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const STATUS_FLOW = ["novo", "confirmado", "em_preparacao", "pronto", "saiu_para_entrega", "entregue", "cancelado"];

const PAYMENT_LABELS = {
  dinheiro: "Dinheiro", pix: "PIX", cartao_entrega: "Cartão na Entrega",
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [motoboys, setMotoboys] = useState([]);

  const load = async () => {
    try {
      const list = await listOrders();
      setOrders(list || []);
      const allDrivers = await listMotoboys();
      setMotoboys((allDrivers || []).filter(d => d.active));
    } catch (e) {
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success("Status atualizado");
      load();
    } catch (e) {
      toast.error(e.message || "Erro ao atualizar");
    }
  };

  const assignMotoboy = async (orderId, motoboyId) => {
    const motoboy = motoboys.find(m => m.id === motoboyId);
    if (!motoboy) return;
    try {
      await assignDriver(orderId, motoboyId);
      toast.success(`${motoboy.name} enviado para a entrega`);
      load();
    } catch (e) {
      toast.error(e.message || "Erro ao designar motoboy");
    }
  };

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const newCount = orders.filter(o => o.status === "novo").length;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            Pedidos Online
            {newCount > 0 && <Badge className="bg-blue-500 text-white">{newCount} novo{newCount > 1 ? "s" : ""}</Badge>}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Pedidos feitos pelo site</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUS_FLOW.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-card border-border"><CardContent className="py-20 text-center text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          Nenhum pedido encontrado
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.novo;
            const isNew = order.status === "novo";
            const displayLabel = sc.label;
            const displayColor = sc.color;
            return (
              <Card key={order.id} className={`bg-card border-border ${isNew ? "border-blue-500/40 ring-1 ring-blue-500/20" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-bold text-lg">#{order.order_number}</span>
                        <Badge className={displayColor}>{displayLabel}</Badge>
                        {isNew && <span className="text-xs text-blue-400 animate-pulse">● Novo pedido</span>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(order.created_date).toLocaleString("pt-BR")}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{order.customer_phone || "—"}</span>
                      </div>
                      <p className="text-sm font-medium truncate">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" />{order.address?.full || "—"}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-2xl font-heading font-bold text-primary">{formatPrice(order.total)}</div>
                      <div className="text-xs text-muted-foreground">{PAYMENT_LABELS[order.payment_method] || order.payment_method}</div>
                      <div className="text-xs text-muted-foreground">{order.distance_km?.toFixed(1) || 0} km · Frete {formatPrice(order.freight || 0)}</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>Ver detalhes</Button>
                      </DialogTrigger>
                      <DialogContent className="bg-background border-border max-w-lg max-h-[85vh] overflow-y-auto">
                        <DialogHeader><DialogTitle className="font-heading">Pedido #{order.order_number}</DialogTitle></DialogHeader>
                        {selectedOrder && selectedOrder.id === order.id && <OrderDetails order={selectedOrder} motoboys={motoboys} onStatus={updateStatus} onAssign={assignMotoboy} />}
                      </DialogContent>
                    </Dialog>

                    {order.status === "novo" && <Button size="sm" onClick={() => updateStatus(order.id, "confirmado")}>Confirmar</Button>}
                    {order.status === "confirmado" && <Button size="sm" onClick={() => updateStatus(order.id, "em_preparacao")}>Em Preparação</Button>}
                    {order.status === "em_preparacao" && <Button size="sm" onClick={() => updateStatus(order.id, "pronto")}>Pronto</Button>}
                    {order.status === "pronto" && !order.motoboy_id && (
                      <Select onValueChange={(v) => assignMotoboy(order.id, v)}>
                        <SelectTrigger className="w-40 h-8"><SelectValue placeholder="Designar motoboy" /></SelectTrigger>
                        <SelectContent>{motoboys.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                    {order.status === "pronto" && order.motoboy_id && (
                      <span className="text-xs text-orange-400 flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-md">
                        <Bike className="w-3.5 h-3.5" /> {order.motoboy_name} — em rota
                      </span>
                    )}
                    {order.status === "saiu_para_entrega" && (
                      <span className="text-xs text-orange-400 flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-md">
                        <Bike className="w-3.5 h-3.5" /> {order.motoboy_name} — em rota
                      </span>
                    )}
                    {!["entregue", "cancelado"].includes(order.status) && <Button variant="outline" size="sm" className="text-destructive" onClick={() => updateStatus(order.id, "cancelado")}>Cancelar</Button>}
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

function OrderDetails({ order, motoboys, onStatus, onAssign }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <h4 className="font-semibold text-xs uppercase text-muted-foreground">Cliente</h4>
        <p>{order.customer_name}</p>
        <p className="text-muted-foreground">{order.customer_phone}</p>
        <p className="text-muted-foreground">{order.customer_email}</p>
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold text-xs uppercase text-muted-foreground">Endereço de Entrega</h4>
        <p>{order.address?.full}</p>
        {order.address?.reference && <p className="text-muted-foreground">Ref: {order.address.reference}</p>}
      </div>
      <div className="space-y-2">
        <h4 className="font-semibold text-xs uppercase text-muted-foreground">Itens</h4>
        {order.items?.map((item, i) => (
          <div key={i} className="flex justify-between">
            <span>{item.quantity}× {item.product_name}{item.is_kit ? " (Kit)" : ""}</span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-3 space-y-1">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Frete ({order.distance_km?.toFixed(1)} km)</span><span>{formatPrice(order.freight)}</span></div>
        <div className="flex justify-between font-bold text-lg pt-1"><span>Total</span><span className="text-primary">{formatPrice(order.total)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Pagamento</span><span>{PAYMENT_LABELS[order.payment_method]}</span></div>
        {order.change_for != null && order.change_for > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Troco para</span><span>{formatPrice(order.change_for)}</span></div>}
      </div>
      {order.notes && <div className="bg-secondary/50 rounded-lg p-3"><span className="text-xs text-muted-foreground">Obs: </span>{order.notes}</div>}
      {order.motoboy_name && (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center gap-2 text-sm"><Bike className="w-4 h-4 text-primary" />Motoboy: <strong>{order.motoboy_name}</strong></div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {order.motoboy_assigned_at && (
              <div className="text-muted-foreground">Designado às: <span className="text-foreground">{new Date(order.motoboy_assigned_at).toLocaleString("pt-BR")}</span></div>
            )}
            {order.accepted_at && (
              <div className="text-muted-foreground">Aceito às: <span className="text-foreground">{new Date(order.accepted_at).toLocaleString("pt-BR")}</span></div>
            )}
            {order.delivered_at && (
              <div className="text-muted-foreground">Entregue às: <span className="text-green-400">{new Date(order.delivered_at).toLocaleString("pt-BR")}</span></div>
            )}
          </div>
        </div>
      )}
      {order.status_history?.length > 0 && (
        <div className="space-y-1">
          <h4 className="font-semibold text-xs uppercase text-muted-foreground">Histórico</h4>
          {order.status_history.map((h, i) => (
            <div key={i} className="text-xs text-muted-foreground flex justify-between">
              <span>{STATUS_CONFIG[h.status]?.label || h.status}</span>
              <span>{new Date(h.date).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}