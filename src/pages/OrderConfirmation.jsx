import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/constants";
import { useCustomer } from "@/context/CustomerContext";
import { CheckCircle2, Package, MapPin, Truck, Home, ShoppingBag } from "lucide-react";
import { getOrderById } from "@/services/orderService";

const STATUS_LABELS = {
  novo: "Novo", confirmado: "Confirmado", em_preparacao: "Em Preparação", pronto: "Pronto",
  saiu_para_entrega: "Saiu para Entrega", entregue: "Entregue", cancelado: "Cancelado",
};

export default function OrderConfirmation() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { customer } = useCustomer();
  const summary = location.state?.order || null;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { navigate("/"); return; }
    // Busca o pedido completo do backend (com items, address, status).
    // O summary do checkout só tem totais — não tem dados para renderizar.
    getOrderById(id)
      .then((fullOrder) => {
        if (fullOrder) setOrder(fullOrder);
        else navigate("/");
      })
      .catch(() => {
        // Fallback: se não conseguir buscar, usa o summary da navegação
        if (summary) setOrder(summary);
        else navigate("/");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!order) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      <div className="text-center space-y-3 py-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-green-500/15 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Pedido Confirmado!</h1>
          <p className="text-muted-foreground text-sm mt-1">Seu pedido <strong>#{order.order_number}</strong> foi recebido pela loja</p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground uppercase"><Package className="w-4 h-4" /> Itens</h3>
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.quantity}× {item.product_name}</span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Frete ({order.distance_km} km)</span><span>{formatPrice(order.freight)}</span></div>
            <div className="flex justify-between font-bold text-lg pt-1"><span>Total</span><span className="text-primary">{formatPrice(order.total)}</span></div>
          </div>
          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4" /> {order.address?.full}</p>
            <p className="text-muted-foreground">Status: <span className="text-foreground font-medium">{STATUS_LABELS[order.status] || order.status}</span></p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate("/")}><Home className="w-4 h-4" /> Voltar à loja</Button>
        <Button className="flex-1 gap-2" onClick={() => navigate("/minha-conta")}><ShoppingBag className="w-4 h-4" /> Meus Pedidos</Button>
      </div>
    </div>
  );
}