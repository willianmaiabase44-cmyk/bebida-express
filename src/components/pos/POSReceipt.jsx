import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Printer } from 'lucide-react';
import { formatPrice } from '@/lib/constants';

const PAYMENT_LABELS = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
};

export default function POSReceipt({ sale, open, onClose }) {
  if (!sale) return null;

  const handlePrint = () => {
    const content = document.getElementById('pos-receipt-print');
    const win = window.open('', '', 'width=380,height=600');
    win.document.write(`
      <html><head><title>Recibo</title>
      <style>
        body { font-family: monospace; font-size: 12px; padding: 10px; }
        h2 { text-align: center; margin: 5px 0; }
        .item { display: flex; justify-content: space-between; margin: 2px 0; }
        .total { border-top: 1px dashed #000; margin-top: 8px; padding-top: 8px; font-weight: bold; }
        .center { text-align: center; }
      </style></head><body>${content.innerHTML}</body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2 justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            Venda Concluída!
          </DialogTitle>
        </DialogHeader>

        <div id="pos-receipt-print" className="space-y-3">
          <div className="text-center border-b border-dashed border-border pb-2">
            <p className="font-heading font-bold">Beba+ Mini Mercado</p>
            <p className="text-xs text-muted-foreground">{sale.date} · PDV</p>
          </div>

          <div className="space-y-1">
            {sale.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.quantity}x {item.product_name}</span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-border pt-2 space-y-1">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatPrice(sale.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pagamento</span>
              <span>{PAYMENT_LABELS[sale.payment_method]}</span>
            </div>
            {sale.amount_paid > 0 && (
              <>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Recebido</span>
                  <span>{formatPrice(sale.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-xs text-green-400 font-medium">
                  <span>Troco</span>
                  <span>{formatPrice(sale.change)}</span>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground border-t border-dashed border-border pt-2">
            Obrigado pela preferência! 🍻
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="flex-1 gap-2">
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          <Button onClick={onClose} className="flex-1 bg-primary hover:bg-primary/90">
            Nova Venda
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}