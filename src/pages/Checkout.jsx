import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCart } from "@/context/CartContext";
import { useCustomer } from "@/context/CustomerContext";
import { formatPrice } from "@/lib/constants";
import { toast } from "sonner";
import { Loader2, MapPin, Plus, Truck, ShoppingBag, CheckCircle2, ArrowLeft } from "lucide-react";
import AddressForm from "@/components/checkout/AddressForm";

const PAYMENT_OPTIONS = [
  { value: "pix", label: "PIX", desc: "Pagamento via PIX" },
  { value: "dinheiro", label: "Dinheiro", desc: "Pagamento em espécie na entrega" },
  { value: "cartao_entrega", label: "Cartão na Entrega", desc: "Crédito ou débito na entrega" },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { customer } = useCustomer();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [freightData, setFreightData] = useState(null);
  const [calculatingFreight, setCalculatingFreight] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);

  const loadAddresses = async () => {
    if (!customer) return;
    try {
      const res = await base44.functions.invoke("manageCustomerAddress", {
        action: "list",
        customer_id: customer.id,
      });
      const list = res.data?.addresses || [];
      setAddresses(list);
      if (list.length > 0 && !selectedAddressId) setSelectedAddressId(list[0].id);
    } catch (e) {
      toast.error("Erro ao carregar endereços");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAddresses(); }, [customer]);

  useEffect(() => {
    if (!selectedAddressId || items.length === 0) {
      setFreightData(null);
      return;
    }
    setCalculatingFreight(true);
    base44.functions.invoke("calculateFreight", { address_id: selectedAddressId })
      .then(res => setFreightData(res.data))
      .catch(e => {
        toast.error(e.response?.data?.error || "Erro ao calcular frete");
        setFreightData(null);
      })
      .finally(() => setCalculatingFreight(false));
  }, [selectedAddressId]);

  const handleAddAddress = async (formData) => {
    try {
      await base44.functions.invoke("manageCustomerAddress", {
        action: "create",
        customer_id: customer.id,
        address: formData,
      });
      toast.success("Endereço adicionado!");
      setAddDialogOpen(false);
      loadAddresses();
    } catch (e) {
      toast.error("Erro ao salvar endereço");
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) { toast.error("Selecione um endereço de entrega"); return; }
    if (!freightData) { toast.error("Aguarde o cálculo do frete"); return; }
    setPlacing(true);
    try {
      const payload = {
        items: items.map(i => ({
          product_id: i.productId,
          product_name: i.name,
          price: i.price,
          quantity: i.quantity,
          is_kit: i.isKit || false,
          kit_items: i.kitItems ? i.kitItems.map(ki => `${ki.quantity}x ${ki.name}`).join(", ") : "",
        })),
        address_id: selectedAddressId,
        customer_id: customer.id,
        payment_method: paymentMethod,
        change_for: paymentMethod === "dinheiro" && changeFor ? parseFloat(changeFor) : null,
        notes,
      };
      const res = await base44.functions.invoke("placeOrder", payload);
      if (res.data?.success) {
        clearCart();
        navigate(`/pedido/${res.data.order_id}`, { state: { order: res.data } });
      } else {
        toast.error(res.data?.error || "Erro ao finalizar pedido");
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Erro ao finalizar pedido");
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
        <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/30" />
        <p className="text-muted-foreground">Seu carrinho está vazio</p>
        <Button onClick={() => navigate("/")} variant="outline">Voltar para a loja</Button>
      </div>
    );
  }

  const freight = freightData?.freight || 0;
  const grandTotal = total + freight;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="font-heading text-2xl font-bold">Finalizar Pedido</h1>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><MapPin className="w-4 h-4 text-primary" /> Endereço de Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {addresses.length === 0 ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado</p>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> Adicionar endereço</Button></DialogTrigger>
                <DialogContent className="bg-background border-border max-w-md max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Novo Endereço</DialogTitle></DialogHeader>
                  <AddressForm onSubmit={handleAddAddress} submitLabel="Adicionar" />
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {addresses.map(addr => (
                  <label key={addr.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedAddressId === addr.id ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}>
                    <input type="radio" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} className="mt-1 accent-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{addr.label}</p>
                      <p className="text-xs text-muted-foreground">{addr.street}, {addr.number} - {addr.district}, {addr.city} - {addr.state}</p>
                    </div>
                  </label>
                ))}
              </div>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4" /> Adicionar outro</Button></DialogTrigger>
                <DialogContent className="bg-background border-border max-w-md max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Novo Endereço</DialogTitle></DialogHeader>
                  <AddressForm onSubmit={handleAddAddress} submitLabel="Adicionar" />
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardContent>
      </Card>

      {selectedAddressId && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {calculatingFreight ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Calculando distância e frete...</div>
            ) : freightData ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="w-4 h-4 text-primary" />
                  <span>Distância: <strong>{freightData.distance_km} km</strong></span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">{formatPrice(freightData.freight_per_km)}/km</span>
                  <p className="font-bold text-primary text-lg">{formatPrice(freight)}</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base">Forma de Pagamento</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            {PAYMENT_OPTIONS.map(opt => (
              <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === opt.value ? "border-primary bg-primary/10" : "border-border"}`}>
                <RadioGroupItem value={opt.value} />
                <div>
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
          {paymentMethod === "dinheiro" && (
            <div className="pt-2">
              <Label>Troco para quanto? (opcional)</Label>
              <Input type="number" step="0.01" value={changeFor} onChange={e => setChangeFor(e.target.value)} placeholder="Ex: 100,00" />
            </div>
          )}
          <div className="pt-2">
            <Label>Observações (opcional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: entregar na portaria" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base">Resumo do Pedido</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="truncate pr-2">{item.quantity}× {item.name}</span>
              <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Frete {freightData ? `(${freightData.distance_km} km)` : ""}</span><span>{freight > 0 ? formatPrice(freight) : "—"}</span></div>
            <div className="flex justify-between font-bold text-xl pt-1"><span>Total</span><span className="text-primary">{formatPrice(grandTotal)}</span></div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handlePlaceOrder} disabled={placing || !freightData || calculatingFreight} size="lg" className="w-full gap-2 text-base">
        {placing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
        {placing ? "Confirmando..." : `Confirmar Pedido · ${formatPrice(grandTotal)}`}
      </Button>
    </div>
  );
}