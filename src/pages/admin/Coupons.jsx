import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listCoupons, createCoupon, updateCoupon, deleteCoupon } from "@/services/couponService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Tag, Plus, Pencil, Trash2, Power, Search } from "lucide-react";
import CouponForm from "@/components/admin/CouponForm";

export default function Coupons() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => listCoupons(),
  });

  const filtered = coupons.filter((c) =>
    !search || c.code?.toLowerCase().includes(search.toLowerCase())
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["coupons"] });

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editTarget) {
        await updateCoupon(editTarget.id, data);
        toast.success("Cupom atualizado!");
      } else {
        await createCoupon(data);
        toast.success("Cupom criado!");
      }
      setDialogOpen(false);
      setEditTarget(null);
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.message || "Erro ao salvar cupom");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon) => {
    try {
      await updateCoupon(coupon.id, { active: !coupon.active });
      toast.success(coupon.active ? "Cupom desativado" : "Cupom ativado");
      refresh();
    } catch {
      toast.error("Erro ao alterar cupom");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCoupon(deleteTarget.id);
      toast.success("Cupom excluído");
      setDeleteTarget(null);
      refresh();
    } catch {
      toast.error("Erro ao excluir cupom");
    }
  };

  const openEdit = (coupon) => {
    setEditTarget(coupon);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            Cupons de Desconto
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie cupons para os clientes do delivery.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditTarget(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Novo Cupom</Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editTarget ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
            </DialogHeader>
            <CouponForm
              onSubmit={handleSave}
              initialData={editTarget}
              submitLabel={saving ? "Salvando..." : editTarget ? "Atualizar" : "Criar Cupom"}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <Tag className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhum cupom cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((coupon) => {
            const expired = coupon.end_date && coupon.end_date < new Date().toISOString().split("T")[0];
            const usesLeft = coupon.max_uses > 0 ? `${coupon.used_count || 0} / ${coupon.max_uses}` : `${coupon.used_count || 0} / ∞`;
            return (
              <Card key={coupon.id} className="border-border bg-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono font-bold text-lg tracking-wide">{coupon.code}</p>
                      <p className="text-2xl font-bold text-primary">{coupon.discount_percent}%</p>
                    </div>
                    <Badge className={
                      !coupon.active ? "bg-secondary text-muted-foreground" :
                      expired ? "bg-red-500/20 text-red-400" :
                      "bg-green-500/20 text-green-400"
                    }>
                      {!coupon.active ? "Inativo" : expired ? "Expirado" : "Ativo"}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>Utilizações:</span><span className="text-foreground font-medium">{usesLeft}</span></div>
                    <div className="flex justify-between"><span>Limite por cliente:</span><span className="text-foreground font-medium">{coupon.per_customer_limit > 0 ? coupon.per_customer_limit : "∞"}</span></div>
                    {coupon.min_order_value > 0 && (
                      <div className="flex justify-between"><span>Mín. do pedido:</span><span className="text-foreground font-medium">R$ {coupon.min_order_value.toFixed(2)}</span></div>
                    )}
                    {(coupon.start_date || coupon.end_date) && (
                      <div className="flex justify-between"><span>Validade:</span><span className="text-foreground font-medium">{coupon.start_date || "—"} → {coupon.end_date || "—"}</span></div>
                    )}
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => openEdit(coupon)}>
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => handleToggle(coupon)}>
                      <Power className="w-3.5 h-3.5" /> {coupon.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(coupon)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `Cupom "${deleteTarget.code}" será removido permanentemente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}