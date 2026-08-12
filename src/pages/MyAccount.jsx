import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatPrice } from "@/lib/constants";
import { User, MapPin, Package, Plus, Pencil, Trash2, Phone, Loader2, ShoppingBag, ArrowLeft } from "lucide-react";
import AddressForm from "@/components/checkout/AddressForm";
import { useCustomer } from "@/context/CustomerContext";

const STATUS_CONFIG = {
  novo: { label: "Novo", color: "bg-blue-500/15 text-blue-400" },
  confirmado: { label: "Confirmado", color: "bg-cyan-500/15 text-cyan-400" },
  em_preparacao: { label: "Em Preparação", color: "bg-amber-500/15 text-amber-400" },
  pronto: { label: "Pronto", color: "bg-purple-500/15 text-purple-400" },
  saiu_para_entrega: { label: "Saiu p/ Entrega", color: "bg-orange-500/15 text-orange-400" },
  entregue: { label: "Entregue", color: "bg-green-500/15 text-green-400" },
  cancelado: { label: "Cancelado", color: "bg-red-500/15 text-red-400" },
};

const PAYMENT_LABELS = { dinheiro: "Dinheiro", pix: "PIX", cartao_entrega: "Cartão na Entrega" };

export default function MyAccount() {
  const navigate = useNavigate();
  const { customer, logout } = useCustomer();
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editAddress, setEditAddress] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    if (!customer) return;
    try {
      const [addrRes, ordersRes] = await Promise.all([
        base44.functions.invoke("manageCustomerAddress", { action: "list", customer_id: customer.id }),
        base44.functions.invoke("getCustomerOrders", { customer_id: customer.id }),
      ]);
      setAddresses(addrRes.data?.addresses || []);
      setOrders(ordersRes.data?.orders || []);
    } catch (e) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [customer]);

  const handleSaveAddress = async (formData) => {
    try {
      if (editAddress?.id) {
        await base44.functions.invoke("manageCustomerAddress", {
          action: "update",
          customer_id: customer.id,
          address_id: editAddress.id,
          address: formData,
        });
      } else {
        await base44.functions.invoke("manageCustomerAddress", {
          action: "create",
          customer_id: customer.id,
          address: formData,
        });
      }
      toast.success(editAddress?.id ? "Endereço atualizado!" : "Endereço adicionado!");
      setDialogOpen(false);
      setEditAddress(null);
      load();
    } catch {
      toast.error("Erro ao salvar endereço");
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!confirm("Excluir este endereço?")) return;
    try {
      await base44.functions.invoke("manageCustomerAddress", {
        action: "delete",
        customer_id: customer.id,
        address_id: id,
      });
      toast.success("Endereço excluído");
      load();
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="font-heading text-2xl font-bold">Minha Conta</h1>
        <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={handleLogout}>Sair</Button>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="orders" className="gap-1.5"><Package className="w-4 h-4" /> Pedidos</TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5"><User className="w-4 h-4" /> Dados</TabsTrigger>
          <TabsTrigger value="addresses" className="gap-1.5"><MapPin className="w-4 h-4" /> Endereços</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-3 mt-4">
          {orders.length === 0 ? (
            <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
              Você ainda não fez pedidos
            </CardContent></Card>
          ) : (
            orders.map(order => {
              const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.novo;
              return (
                <Card key={order.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold">#{order.order_number}</span>
                          <Badge className={sc.color}>{sc.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(order.created_date).toLocaleString("pt-BR")}</p>
                        <p className="text-xs text-muted-foreground">{PAYMENT_LABELS[order.payment_method]}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatPrice(order.total)}</p>
                        <p className="text-xs text-muted-foreground">{order.items?.length || 0} {order.items?.length === 1 ? "item" : "itens"}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border space-y-1 text-sm">
                      {order.items?.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex justify-between text-muted-foreground">
                          <span className="truncate pr-2">{item.quantity}× {item.product_name}</span>
                          <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      {order.items?.length > 3 && <p className="text-xs text-muted-foreground">+ {order.items.length - 3} outros itens</p>}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.address?.full}</div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Nome</p>
                <p className="font-medium">{customer?.name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Celular</p>
                <p className="font-medium">{customer?.phone || "—"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses" className="space-y-3 mt-4">
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditAddress(null); }}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2"><Plus className="w-4 h-4" /> Adicionar endereço</Button>
            </DialogTrigger>
            <DialogContent className="bg-background border-border max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editAddress?.id ? "Editar Endereço" : "Novo Endereço"}</DialogTitle></DialogHeader>
              <AddressForm initial={editAddress} onSubmit={handleSaveAddress} submitLabel={editAddress?.id ? "Atualizar" : "Adicionar"} />
            </DialogContent>
          </Dialog>

          {addresses.map(addr => (
            <Card key={addr.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {addr.label}</p>
                    <p className="text-sm text-muted-foreground mt-1">{addr.street}, {addr.number} {addr.complement && `- ${addr.complement}`}</p>
                    <p className="text-sm text-muted-foreground">{addr.district}, {addr.city} - {addr.state}</p>
                    <p className="text-xs text-muted-foreground">CEP: {addr.cep}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditAddress(addr); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteAddress(addr.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {addresses.length === 0 && (
            <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">
              <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
              Nenhum endereço cadastrado
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}