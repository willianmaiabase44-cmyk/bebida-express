import React from 'react';
import { Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/constants';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

export default function ProductCard({ product, promoPrice }) {
  const { addItem } = useCart();

  const displayPrice = promoPrice ?? product.price;
  const outOfStock = (product.stock ?? 0) <= 0;

  const handleAdd = () => {
    if (outOfStock) return;
    addItem({ ...product, price: displayPrice });
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  return (
    <div className="group bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/40 transition-all duration-300">
      <div className="relative aspect-square bg-secondary/50 overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
        {promoPrice && (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px]">PROMO</Badge>
        )}
        {product.is_new && (
          <Badge className="absolute top-2 right-2 bg-green-600 text-white text-[10px]">NOVO</Badge>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <span className="text-sm font-semibold text-muted-foreground">Esgotado</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">{product.description}</p>
        )}
        <div className="flex items-end justify-between mt-auto">
          <div>
            {promoPrice && (
              <span className="text-[11px] text-muted-foreground line-through block">{formatPrice(product.price)}</span>
            )}
            <span className="font-heading font-bold text-lg text-primary">{formatPrice(displayPrice)}</span>
          </div>
          <Button
            size="icon"
            className="h-9 w-9 rounded-xl bg-primary hover:bg-primary/90"
            onClick={handleAdd}
            disabled={outOfStock}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {!outOfStock && product.stock <= (product.min_stock || 5) && product.stock > 0 && (
          <p className="text-[10px] text-amber-500 mt-1">Últimas {product.stock} unidades!</p>
        )}
      </div>
    </div>
  );
}