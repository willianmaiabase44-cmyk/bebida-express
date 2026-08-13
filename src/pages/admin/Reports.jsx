import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { DollarSign, ClipboardList, Package, ArrowLeftRight, ShoppingCart, Truck, Wallet, Receipt, Users, Bike, MapPin, Tag, Star, Layers, BarChart3 } from 'lucide-react';

const REPORTS = [
  { key: 'vendas', label: 'Vendas', desc: 'Faturamento, ticket médio e formas de pagamento', icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
  { key: 'pedidos', label: 'Pedidos', desc: 'Pedidos por status, canal e período', icon: ClipboardList, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'produtos', label: 'Produtos', desc: 'Mais vendidos, faturamento e margem', icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'estoque', label: 'Estoque', desc: 'Estoque atual, baixo e movimentações', icon: ArrowLeftRight, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'compras', label: 'Compras', desc: 'Entradas por período e produto', icon: ShoppingCart, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'fornecedores', label: 'Fornecedores', desc: 'Cadastro e categorias', icon: Truck, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { key: 'financeiro', label: 'Financeiro', desc: 'Receitas, despesas e resultado', icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'contas-pagar', label: 'Contas a Pagar', desc: 'Contas pendentes e pagas', icon: Receipt, color: 'text-red-400', bg: 'bg-red-500/10' },
  { key: 'clientes', label: 'Clientes', desc: 'Cadastro, compras e ticket médio', icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { key: 'motoboys', label: 'Motoboys', desc: 'Entregas, avaliações e performance', icon: Bike, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { key: 'entregas', label: 'Entregas', desc: 'Distância, fretes e status', icon: MapPin, color: 'text-teal-400', bg: 'bg-teal-500/10' },
  { key: 'cupons', label: 'Cupons', desc: 'Promoções ativas e desempenho', icon: Tag, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { key: 'avaliacoes', label: 'Avaliações', desc: 'Notas, comentários e média geral', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { key: 'combos', label: 'Combos', desc: 'Kits e combos vendidos', icon: Layers, color: 'text-violet-400', bg: 'bg-violet-500/10' },
];

export default function Reports() {
  const navigate = useNavigate();
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" /> Relatórios
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Escolha o tipo de relatório que deseja visualizar</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {REPORTS.map(r => (
          <Card
            key={r.key}
            className="p-5 cursor-pointer hover:border-primary/50 transition-all hover:scale-[1.02] group"
            onClick={() => navigate(`/admin/reports/${r.key}`)}
          >
            <div className={`w-12 h-12 rounded-xl ${r.bg} flex items-center justify-center mb-3`}>
              <r.icon className={`w-6 h-6 ${r.color}`} />
            </div>
            <h3 className="font-heading font-bold text-base group-hover:text-primary transition-colors">{r.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}