import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

import SalesReport from '@/components/admin/reports/SalesReport';
import OrdersReport from '@/components/admin/reports/OrdersReport';
import ProductsReport from '@/components/admin/reports/ProductsReport';
import StockReport from '@/components/admin/reports/StockReport';
import PurchasesReport from '@/components/admin/reports/PurchasesReport';
import SuppliersReport from '@/components/admin/reports/SuppliersReport';
import FinancialReport from '@/components/admin/reports/FinancialReport';
import AccountsPayableReport from '@/components/admin/reports/AccountsPayableReport';
import CustomersReport from '@/components/admin/reports/CustomersReport';
import MotoboysReport from '@/components/admin/reports/MotoboysReport';
import DeliveriesReport from '@/components/admin/reports/DeliveriesReport';
import CouponsReport from '@/components/admin/reports/CouponsReport';
import ReviewsReport from '@/components/admin/reports/ReviewsReport';
import CombosReport from '@/components/admin/reports/CombosReport';

const REPORT_MAP = {
  vendas: { title: 'Relatório de Vendas', component: SalesReport },
  pedidos: { title: 'Relatório de Pedidos', component: OrdersReport },
  produtos: { title: 'Relatório de Produtos', component: ProductsReport },
  estoque: { title: 'Relatório de Estoque', component: StockReport },
  compras: { title: 'Relatório de Compras', component: PurchasesReport },
  fornecedores: { title: 'Relatório de Fornecedores', component: SuppliersReport },
  financeiro: { title: 'Relatório Financeiro', component: FinancialReport },
  'contas-pagar': { title: 'Relatório de Contas a Pagar', component: AccountsPayableReport },
  clientes: { title: 'Relatório de Clientes', component: CustomersReport },
  motoboys: { title: 'Relatório de Motoboys', component: MotoboysReport },
  entregas: { title: 'Relatório de Entregas', component: DeliveriesReport },
  cupons: { title: 'Relatório de Cupons', component: CouponsReport },
  avaliacoes: { title: 'Relatório de Avaliações', component: ReviewsReport },
  combos: { title: 'Relatório de Combos', component: CombosReport },
};

export default function ReportView() {
  const { type } = useParams();
  const navigate = useNavigate();
  const config = REPORT_MAP[type];

  if (!config) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-muted-foreground">Relatório não encontrado</p>
        <Button variant="outline" onClick={() => navigate('/admin/reports')}>Voltar para Relatórios</Button>
      </div>
    );
  }

  const ReportComponent = config.component;
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/reports')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-heading font-bold text-2xl">{config.title}</h1>
      </div>
      <ReportComponent />
    </div>
  );
}