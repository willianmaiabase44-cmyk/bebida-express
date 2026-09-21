import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listProducts, updateProduct } from "@/services/productService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Save, Package, DollarSign, AlertTriangle } from "lucide-react";

const CATEGORY_LABELS = {
  cervejas: "🍺 Cervejas",
  refrigerantes: "🥤 Refrigerantes",
  energeticos: "⚡ Energéticos",
  aguas: "💧 Águas",
  destilados: "🥃 Destilados",
  vinhos: "🍷 Vinhos",
  sucos: "🧃 Sucos",
  gelo: "🧊 Gelo",
};

export default function QuickUpdate() {
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => listProducts({ includeInactive: true }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
  });

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleChange = (id, field, value) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const getValue = (product, field) => {
    if (edits[product.id]?.[field] !== undefined) return edits[product.id][field];
    return product[field] ?? "";
  };

  const hasChanges = (id) => edits[id] && Object.keys(edits[id]).length > 0;
  const totalEdits = Object.keys(edits).length;

  const saveAll = async () => {
    setSaving(true);
    const ids = Object.keys(edits);
    await Promise.all(
      ids.map((id) => {
        const data = {};
        if (edits[id].price !== undefined) data.price = parseFloat(edits[id].price);
        if (edits[id].stock !== undefined) data.stock = parseInt(edits[id].stock);
        return updateMutation.mutateAsync({ id, data });
      })
    );
    setEdits({});
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast.success(`${ids.length} produto(s) atualizado(s) com sucesso!`);
    setSaving(false);
  };

  const saveSingle = async (product) => {
    const edit = edits[product.id];
    if (!edit) return;
    const data = {};
    if (edit.price !== undefined) data.price = parseFloat(edit.price);
    if (edit.stock !== undefined) data.stock = parseInt(edit.stock);
    await updateMutation.mutateAsync({ id: product.id, data });
    setEdits((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast.success(`${product.name} atualizado!`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading">Atualização Rápida</h1>
          <p className="text-muted-foreground text-sm">Edite preços e estoque diretamente na tabela</p>
        </div>
        {totalEdits > 0 && (
          <Button onClick={saveAll} disabled={saving} className="gap-2 shrink-0">
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : `Salvar tudo (${totalEdits})`}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_120px_100px_80px] gap-2 px-4 py-2 bg-secondary text-xs text-muted-foreground font-medium uppercase tracking-wide">
          <span>Produto</span>
          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />Preço (R$)</span>
          <span className="flex items-center gap-1"><Package className="w-3 h-3" />Estoque</span>
          <span></span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Nenhum produto encontrado.
            </div>
          )}
          {filtered.map((product) => {
            const isLow = product.stock <= product.min_stock;
            const changed = hasChanges(product.id);
            return (
              <div
                key={product.id}
                className={`grid grid-cols-[1fr_120px_100px_80px] gap-2 items-center px-4 py-3 transition-colors ${changed ? "bg-primary/5" : "hover:bg-secondary/30"}`}
              >
                {/* Name */}
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[product.category] || product.category}</span>
                    {isLow && (
                      <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                        <AlertTriangle className="w-3 h-3" />
                        baixo
                      </span>
                    )}
                    {changed && <Badge className="text-xs py-0 h-4">editado</Badge>}
                  </div>
                </div>

                {/* Price */}
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={getValue(product, "price")}
                  onChange={(e) => handleChange(product.id, "price", e.target.value)}
                  className="h-8 text-sm"
                />

                {/* Stock */}
                <Input
                  type="number"
                  min="0"
                  value={getValue(product, "stock")}
                  onChange={(e) => handleChange(product.id, "stock", e.target.value)}
                  className="h-8 text-sm"
                />

                {/* Save button */}
                <Button
                  size="sm"
                  variant={changed ? "default" : "ghost"}
                  disabled={!changed || saving}
                  onClick={() => saveSingle(product)}
                  className="h-8 px-2 text-xs"
                >
                  <Save className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {totalEdits > 0 && (
        <div className="flex justify-end">
          <Button onClick={saveAll} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : `Salvar tudo (${totalEdits} alterações)`}
          </Button>
        </div>
      )}
    </div>
  );
}