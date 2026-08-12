import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/constants';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

export default function CartDrawer({ open, onClose }) {
  const { items, updateQuantity, removeItem, total } = useCart();
  const navigate = useNavigate();

  const goCheckout = () => {
    if (items.length === 0) return;
    onClose();
    navigate('/checkout');
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="bg-background border-border w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-heading flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Carrinho
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/20" />
            <p className="text-muted-foreground">Seu carrinho está vazio</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 py-4">
              {items.map(item => (
                <div key={item.id} className="flex gap-3 bg-card rounded-xl p-3 border border-border">
                  {item.image_url && !item.isKit ? (
                    <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <span className="text-2xl">{item.isKit ? '📦' : '🍺'}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.name}</h4>
                    {item.isKit && item.kitItems && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.kitItems.map(ki => `${ki.quantity}x ${ki.name}`).join(', ')}
                      </p>
                    )}
                    <p className="text-primary font-bold text-sm mt-1">{formatPrice(item.price * item.quantity)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80">
                        <Plus className="w-3 h-3" />
                      </button>
                      <button onClick={() => removeItem(item.id)} className="ml-auto text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total</span>
                <span className="font-heading font-bold text-2xl text-primary">{formatPrice(total)}</span>
              </div>
              <Button onClick={goCheckout} className="w-full h-12 font-semibold rounded-xl gap-2">
                <ArrowRight className="w-5 h-5" />
                Finalizar Pedido
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}