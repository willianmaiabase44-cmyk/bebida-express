import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Receipt } from 'lucide-react';
import ReportToolbar from './ReportToolbar';

export default function AccountsPayableReport() {
  return (
    <div className="space-y-4">
      <ReportToolbar showSearch={false} preset="all" onPresetChange={() => {}} />
      <Card>
        <CardContent className="p-12 text-center">
          <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">Contas a Pagar ainda não implementadas</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
            Para visualizar este relatório, é necessário cadastrar despesas, contas e fornecedores no módulo Financeiro.
            As despesas incluirão aluguel, salários, compras de mercadoria, contas de consumo e outros custos operacionais.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}