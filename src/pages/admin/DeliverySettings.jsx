import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MapPin, Save, Loader2, Truck, Navigation, MapPinCheck } from "lucide-react";
import { formatPrice } from "@/lib/constants";
import { lookupCep, formatCep } from "@/lib/cep";

const UF_OPTIONS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export default function DeliverySettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const [form, setForm] = useState({
    store_name: "Smoke Bebidas",
    cep: "", street: "", number: "", complement: "", district: "", city: "", state: "RS",
    lat: null, lng: null, freight_per_km: 2.5, min_freight: 0, free_freight_threshold: 0,
    max_delivery_radius_km: 0, estimated_delivery_minutes: 30,
    delivery_enabled: true, delivery_city: "Gravataí", delivery_state: "RS",
  });

  const load = async () => {
    try {
      const list = await base44.entities.StoreSettings.list();
      setSettings(list?.[0] || null);
    } catch (e) {
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (settings) {
      setForm({
        store_name: settings.store_name || "Smoke Bebidas",
        cep: settings.cep || "", street: settings.street || "", number: settings.number || "",
        complement: settings.complement || "", district: settings.district || "",
        city: settings.city || "", state: settings.state || "RS",
        lat: settings.lat, lng: settings.lng,
        freight_per_km: settings.freight_per_km ?? 2.5,
        min_freight: settings.min_freight ?? 0,
        free_freight_threshold: settings.free_freight_threshold ?? 0,
        max_delivery_radius_km: settings.max_delivery_radius_km ?? 0,
        estimated_delivery_minutes: settings.estimated_delivery_minutes ?? 30,
        delivery_enabled: settings.delivery_enabled ?? true,
        delivery_city: settings.delivery_city || "Gravataí",
        delivery_state: settings.delivery_state || "RS",
      });
    }
  }, [settings]);

  const handleCepBlur = async () => {
    const cleanCep = form.cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    setCepLoading(true);
    const data = await lookupCep(form.cep);
    setCepLoading(false);
    if (!data) {
      toast.error("CEP não encontrado");
      return;
    }
    setForm(f => ({
      ...f,
      cep: data.cep,
      street: data.street || f.street,
      district: data.district || f.district,
      city: data.city || f.city,
      state: data.state || f.state,
      complement: data.complement || f.complement,
    }));
    toast.success("Endereço preenchido pelo CEP!");
  };

  const handleGeocode = async () => {
    if (!form.street || !form.city || !form.state) {
      toast.error("Preencha rua, cidade e estado para geolocalizar");
      return;
    }
    setGeocoding(true);
    try {
      const fullAddr = `${form.street}, ${form.number} - ${form.district}, ${form.city} - ${form.state}, Brasil`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddr)}&limit=1`, {
        headers: { "User-Agent": "SmokeBebidas/1.0" }
      });
      const data = await res.json();
      if (data?.[0]) {
        setForm(f => ({ ...f, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }));
        toast.success("Endereço localizado!");
      } else {
        toast.error("Endereço não encontrado pelo mapa");
      }
    } catch {
      toast.error("Erro ao geolocalizar");
    } finally {
      setGeocoding(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings?.id) {
        await base44.entities.StoreSettings.update(settings.id, form);
      } else {
        await base44.entities.StoreSettings.create(form);
      }
      toast.success("Configurações salvas!");
      load();
    } catch (e) {
      toast.error("Erro ao salvar: " + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Configurações de Entrega</h1>
        <p className="text-muted-foreground text-sm mt-1">Endereço da loja, área de entrega e cálculo de frete por KM</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Endereço da loja */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><MapPin className="w-5 h-5 text-primary" /> Endereço da Loja</CardTitle>
            <CardDescription>Ponto de partida de todas as entregas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>CEP</Label>
              <div className="relative">
                <Input
                  value={form.cep}
                  onChange={e => setForm(f => ({ ...f, cep: formatCep(e.target.value) }))}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                />
                {cepLoading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Digite o CEP e saia do campo para preencher automaticamente</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Rua</Label>
                <Input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} placeholder="Rua dos Pinheiros" />
              </div>
              <div>
                <Label>Número</Label>
                <Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} placeholder="100" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Complemento</Label>
                <Input value={form.complement} onChange={e => setForm(f => ({ ...f, complement: e.target.value }))} placeholder="Sala 12" />
              </div>
              <div>
                <Label>Bairro</Label>
                <Input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="Centro" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cidade</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Gravataí" />
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UF_OPTIONS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline" onClick={handleGeocode} disabled={geocoding} className="w-full gap-2">
              {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              Obter Latitude/Longitude
            </Button>
            {form.lat != null && form.lng != null && (
              <div className="bg-secondary/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Latitude:</span><span className="font-mono">{form.lat.toFixed(6)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Longitude:</span><span className="font-mono">{form.lng.toFixed(6)}</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Frete + Área de entrega */}
        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><MapPinCheck className="w-5 h-5 text-primary" /> Área de Entrega</CardTitle>
              <CardDescription>Cidade onde a loja faz entregas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cidade de entrega</Label>
                  <Input value={form.delivery_city} onChange={e => setForm(f => ({ ...f, delivery_city: e.target.value }))} placeholder="Gravataí" />
                </div>
                <div>
                  <Label>Estado (UF)</Label>
                  <Select value={form.delivery_state} onValueChange={v => setForm(f => ({ ...f, delivery_state: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UF_OPTIONS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">Pedidos fora de <strong className="text-primary">{form.delivery_city || "Gravataí"}/{form.delivery_state || "RS"}</strong> serão recusados automaticamente.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Truck className="w-5 h-5 text-primary" /> Frete por KM</CardTitle>
              <CardDescription>Valor cobrado por quilômetro de rota</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Valor por KM (R$)</Label>
                <Input type="number" step="0.01" value={form.freight_per_km} onChange={e => setForm(f => ({ ...f, freight_per_km: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Frete mínimo (R$) — opcional</Label>
                <Input type="number" step="0.01" value={form.min_freight} onChange={e => setForm(f => ({ ...f, min_freight: parseFloat(e.target.value) || 0 }))} />
                <p className="text-xs text-muted-foreground mt-1">Se 0, sem valor mínimo</p>
              </div>
              <div>
                <Label>Frete grátis acima de (R$) — opcional</Label>
                <Input type="number" step="0.01" value={form.free_freight_threshold} onChange={e => setForm(f => ({ ...f, free_freight_threshold: parseFloat(e.target.value) || 0 }))} />
                <p className="text-xs text-muted-foreground mt-1">Pedidos acima deste valor não pagam frete. Se 0, desativado.</p>
              </div>
              <div>
                <Label>Raio máximo de entrega (KM) — opcional</Label>
                <Input type="number" step="0.1" value={form.max_delivery_radius_km} onChange={e => setForm(f => ({ ...f, max_delivery_radius_km: parseFloat(e.target.value) || 0 }))} />
                <p className="text-xs text-muted-foreground mt-1">Endereços além desta distância são recusados. Se 0, sem limite.</p>
              </div>
              <div>
                <Label>Tempo estimado de entrega (minutos)</Label>
                <Input type="number" step="1" value={form.estimated_delivery_minutes} onChange={e => setForm(f => ({ ...f, estimated_delivery_minutes: parseInt(e.target.value) || 30 }))} />
                <p className="text-xs text-muted-foreground mt-1">Tempo médio exibido para o cliente no checkout</p>
              </div>
              <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
                <div>
                  <Label className="cursor-pointer">Entregas habilitadas</Label>
                  <p className="text-xs text-muted-foreground">Clientes podem fazer pedidos online</p>
                </div>
                <Switch checked={form.delivery_enabled} onCheckedChange={v => setForm(f => ({ ...f, delivery_enabled: v }))} />
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm space-y-1">
                <p className="text-muted-foreground mb-1">Exemplo de cálculo:</p>
                <p>6 km × {formatPrice(form.freight_per_km)} = <span className="font-bold text-primary">{formatPrice(6 * form.freight_per_km)}</span></p>
                {form.free_freight_threshold > 0 && (
                  <p className="text-muted-foreground">Pedidos acima de <span className="font-bold text-primary">{formatPrice(form.free_freight_threshold)}</span> = <span className="font-bold text-primary">Frete grátis</span></p>
                )}
                {form.max_delivery_radius_km > 0 && (
                  <p className="text-muted-foreground">Raio máximo: <span className="font-bold text-primary">{form.max_delivery_radius_km} km</span></p>
                )}
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} size="lg" className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </div>
  );
}