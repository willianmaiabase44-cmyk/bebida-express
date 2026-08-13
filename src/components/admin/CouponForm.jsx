import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function CouponForm({ onSubmit, initialData, submitLabel = "Salvar" }) {
  const [form, setForm] = useState({
    code: "",
    discount_percent: "",
    max_uses: "",
    per_customer_limit: "1",
    min_order_value: "",
    start_date: "",
    end_date: "",
    active: true,
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        code: initialData.code || "",
        discount_percent: initialData.discount_percent || "",
        max_uses: initialData.max_uses || "",
        per_customer_limit: initialData.per_customer_limit ?? "1",
        min_order_value: initialData.min_order_value || "",
        start_date: initialData.start_date || "",
        end_date: initialData.end_date || "",
        active: initialData.active ?? true,
      });
    }
  }, [initialData]);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.discount_percent) return;
    onSubmit({
      code: form.code.toUpperCase().trim(),
      discount_percent: parseFloat(form.discount_percent),
      max_uses: form.max_uses ? parseInt(form.max_uses) : 0,
      per_customer_limit: form.per_customer_limit ? parseInt(form.per_customer_limit) : 0,
      min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      active: form.active,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Código do Cupom *</Label>
        <Input
          value={form.code}
          onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
          placeholder="Ex: SMOKE10"
          className="font-mono uppercase"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Desconto (%) *</Label>
          <Input
            type="number"
            step="1"
            min="1"
            max="100"
            value={form.discount_percent}
            onChange={(e) => handleChange("discount_percent", e.target.value)}
            placeholder="10"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Usos máximos (0 = infinito)</Label>
          <Input
            type="number"
            min="0"
            value={form.max_uses}
            onChange={(e) => handleChange("max_uses", e.target.value)}
            placeholder="100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Limite por cliente</Label>
          <Input
            type="number"
            min="0"
            value={form.per_customer_limit}
            onChange={(e) => handleChange("per_customer_limit", e.target.value)}
            placeholder="1"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Valor mínimo (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.min_order_value}
            onChange={(e) => handleChange("min_order_value", e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Data de início</Label>
          <Input
            type="date"
            value={form.start_date}
            onChange={(e) => handleChange("start_date", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Data de validade</Label>
          <Input
            type="date"
            value={form.end_date}
            onChange={(e) => handleChange("end_date", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
        <Label className="cursor-pointer">Cupom ativo</Label>
        <Switch checked={form.active} onCheckedChange={(v) => handleChange("active", v)} />
      </div>

      <Button type="submit" className="w-full">{submitLabel}</Button>
    </form>
  );
}