import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";

const UF_OPTIONS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export default function AddressForm({ initial, onSubmit, submitLabel = "Salvar endereço", loading }) {
  const [form, setForm] = useState({
    label: initial?.label || "Casa",
    cep: initial?.cep || "",
    street: initial?.street || "",
    number: initial?.number || "",
    complement: initial?.complement || "",
    district: initial?.district || "",
    city: initial?.city || "",
    state: initial?.state || "SP",
    reference: initial?.reference || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Apelido</Label>
          <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Casa" />
        </div>
        <div>
          <Label>CEP</Label>
          <Input value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} placeholder="00000-000" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label>Rua</Label>
          <Input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} required placeholder="Av. Paulista" />
        </div>
        <div>
          <Label>Número</Label>
          <Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} required placeholder="1000" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Complemento</Label>
          <Input value={form.complement} onChange={e => setForm(f => ({ ...f, complement: e.target.value }))} placeholder="Apto 12" />
        </div>
        <div>
          <Label>Bairro</Label>
          <Input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} required placeholder="Bela Vista" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Cidade</Label>
          <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required placeholder="São Paulo" />
        </div>
        <div>
          <Label>Estado</Label>
          <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{UF_OPTIONS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Ponto de referência</Label>
        <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Próximo ao mercado" />
      </div>
      <Button type="submit" disabled={loading} className="w-full gap-2">
        <MapPin className="w-4 h-4" />
        {submitLabel}
      </Button>
    </form>
  );
}