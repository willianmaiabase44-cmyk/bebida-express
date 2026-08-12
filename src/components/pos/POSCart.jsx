import React from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/constants';

const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
  { value: 'pix', label: 'PIX', icon: '📱' },
  { value: 'cartao_credito', label: 'Crédito', icon: '💳' },
  { value: 'cartao_debito', label: 'Débito', icon: '💳' },
];

export default function POSCart({ items, total, onUpdateQty, onRemove, onClear, onCheckout, paymentMethod, setPaymentMethod, amountPaid, setAmountPaid, processing }) {
  const change = amountPaid > 0 ? Math.max(0, amountPaid - total) : 0;
  const needsChange = paymentMethod === 'dinheiro';

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-heading font-bold text-lg flex items-center gap-2">
          🛒 Carrinho
          {items.length > 0 && <span className="text-sm text-muted-foreground font-normal">({items.reduce((s, i) => s + i.quantity, 0)})</span>}
        </h2>
        {items.length > 0 && (
          <button onClick={onClear} className="text-muted-foreground hover:text-destructive transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
            <div className="text-4xl mb-2 opacity-30">🛒</div>
            Carrinho vazio
            <p className="text-xs mt-1">Toque nos produtos para adicionar</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
              <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">🍺</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <p className="text-xs text-primary font-bold">{formatPrice(item.price)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onUpdateQty(item.id, item.quantity - 1)} className="w-6 h-6 rounded bg-secondary flex items-center justify-center hover:bg-border">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.id, item.quantity + 1)} className="w-6 h-6 rounded bg-secondary flex items-center justify-center hover:bg-border">
                  <Plus className="w-3 h-3" />
                </button>
                <button onClick={() => onRemove(item.id)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive ml-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="border-t border-border p-4 space-y-3">
          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Total</span>
            <span className="font-heading font-bold text-2xl text-primary">{formatPrice(total)}</span>
          </div>

          {/* Payment methods */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Forma de pagamento</p>
            <div className="grid grid-cols-4 gap-1.5">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border text-[10px] font-medium transition-all ${paymentMethod === m.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                >
                  <span className="text-base">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount paid (cash only) */}
          {needsChange && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Valor recebido</p>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={amountPaid || ''}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                className="h-10"
              />
              <div className="flex gap-1.5 mt-1.5">
                {[total, Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map(v => (
                  <button key={v} onClick={() => setAmountPaid(v)} className="flex-1 py-1 rounded-md bg-secondary text-xs hover:bg-border">
                    {formatPrice(v)}
                  </button>
                ))}
              </div>
              {amountPaid > 0 && (
                <div className="flex items-center justify-between mt-2 px-1">
                  <span className="text-xs text-muted-foreground">Troco</span>
                  <span className="text-sm font-bold text-green-400">{formatPrice(change)}</span>
                </div>
              )}
            </div>
          )}

          {/* Checkout */}
          <Button
            onClick={onCheckout}
            disabled={processing || (needsChange && amountPaid < total)}
            className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90"
          >
            {processing ? 'Processando...' : `Finalizar Venda — ${formatPrice(total)}`}
          </Button>
        </div>
      )}
    </div>
  );
}