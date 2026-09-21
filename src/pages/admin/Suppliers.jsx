import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/services/supplierService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Plus, Search, Pencil, Trash2, Phone, Mail, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import SupplierForm from '@/components/admin/SupplierForm';

export default function Suppliers() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => listSuppliers(),
  });

  const filtered = suppliers.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editing) {
        await updateSupplier(editing.id, formData);
        toast.success('Fornecedor atualizado!');
      } else {
        await createSupplier(formData);
        toast.success('Fornecedor cadastrado!');
      }
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error('Erro ao salvar: ' + (err.response?.data?.error || err.message || 'tente novamente'));
    }
    setSaving(false);
  };

  const handleDelete = async (supplier) => {
    if (!confirm(`Excluir fornecedor ${supplier.name}?`)) return;
    try {
      await deleteSupplier(supplier.id);
      toast.success('Fornecedor excluído');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    } catch (err) {
      toast.error('Erro ao excluir');
    }
  };

  const toggleActive = async (supplier) => {
    try {
      await updateSupplier(supplier.id, { active: !supplier.active });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> Fornecedores
          </h1>
          <p className="text-muted-foreground text-sm">Cadastre e gerencie seus fornecedores</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4" /> Novo Fornecedor
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, contato, telefone ou categoria..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum fornecedor cadastrado{search ? ' encontrado' : ''}.</p>
          {!search && <Button className="mt-4" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> Cadastrar primeiro fornecedor</Button>}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(supplier => (
            <Card key={supplier.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-1">
                      {supplier.name}
                      {supplier.active && <BadgeCheck className="w-4 h-4 text-primary" />}
                    </h3>
                    {supplier.category && <p className="text-xs text-muted-foreground">{supplier.category}</p>}
                  </div>
                </div>
                <Badge variant={supplier.active ? 'default' : 'secondary'}>{supplier.active ? 'Ativo' : 'Inativo'}</Badge>
              </div>
              {supplier.contact_name && (
                <p className="text-sm text-muted-foreground">{supplier.contact_name}</p>
              )}
              <div className="space-y-1 text-sm">
                {supplier.phone && (
                  <a href={`tel:${supplier.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                    <Phone className="w-3.5 h-3.5" /> {supplier.phone}
                  </a>
                )}
                {supplier.email && (
                  <p className="flex items-center gap-2 text-muted-foreground truncate">
                    <Mail className="w-3.5 h-3.5" /> {supplier.email}
                  </p>
                )}
              </div>
              {supplier.notes && (
                <p className="text-xs text-muted-foreground italic line-clamp-2">{supplier.notes}</p>
              )}
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(supplier); setFormOpen(true); }}>
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(supplier)}>
                  {supplier.active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(supplier)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SupplierForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} supplier={editing} saving={saving} />
    </div>
  );
}