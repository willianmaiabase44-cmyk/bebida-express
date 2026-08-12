import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { lookupCep, formatCep } from "@/lib/cep";

const DELIVERY_CITY = "Gravataí";
const DELIVERY_STATE = "RS";
const UF_OPTIONS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

function normalizeCity(city) {
  return (city || "").toLowerCase().replace(/\s+/g, "").trim();
}

export default function AddressForm({ initial, onSubmit, submitLabel = "Salvar endereço", loading }) {
  const [form, setForm] = useState({
    label: initial?.label || "Casa",
    cep: initial?.cep || "",
    street: initial?.street || "",
    number: initial?.number || "",
    complement: initial?.complement || "",
    district: initial?.district || "",
    city: initial?.city || "",
    state: initial?.state || "RS",
    reference: initial?.reference || "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");

  const isOutsideArea = form.city && form.state &&
    (normalizeCity(form.city) !== normalizeCity(DELIVERY_CITY) ||
     form.state.toUpperCase() !== DELIVERY_STATE);

  const handleCepBlur = async () => {
    const cleanCep = form.cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    setCepLoading(true);
    setCepError("");
    const data = await lookupCep(form.cep);
    setCepLoading(false);
    if (!data) {
      setCepError("CEP não encontrado. Preencha manualmente.");
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
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isOutsideArea) {
      setCepError(`Entregamos apenas em ${DELIVERY_CITY}/${DELIVERY_STATE}`);
      return;
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-2.5 text-xs text-center">
        <span className="text-muted-foreground">🛵 Entregamos apenas em </span>
        <strong className="text-primary">{DELIVERY_CITY}/{DELIVERY_STATE}</strong>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Apelido</Label>
          <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Casa" />
        </div>
        <div>
          <Label>CEP</Label>
          <div className="relative">
            <Input
              value={form.cep}
              onChange={e => setForm(f => ({ ...f, cep: formatCep(e.target.value) }))}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              className={cepError ? "border-destructive" : ""}
            />
            {cepLoading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
          </div>
          {cepError && !isOutsideArea && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{cepError}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label>Rua</Label>
          <Input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} required placeholder="Rua dos Pinheiros" />
        </div>
        <div>
          <Label>Número</Label>
          <Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} required placeholder="100" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Complemento</Label>
          <Input value={form.complement} onChange={e => setForm(f => ({ ...f, complement: e.target.value }))} placeholder="Apto 12" />
        </div>
        <div>
          <Label>Bairro</Label>
          <Input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} required placeholder="Centro" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Cidade</Label>
          <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required placeholder="Gravataí" />
        </div>
        <div>
          <Label>Estado</Label>
          <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{UF_OPTIONS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {isOutsideArea && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Fora da área de entrega. Entregamos apenas em {DELIVERY_CITY}/{DELIVERY_STATE}.
        </div>
      )}

      <div>
        <Label>Ponto de referência</Label>
        <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Próximo ao mercado" />
      </div>

      <Button type="submit" disabled={loading || isOutsideArea} className="w-full gap-2">
        <MapPin className="w-4 h-4" />
        {submitLabel}
      </Button>
    </form>
  );
}