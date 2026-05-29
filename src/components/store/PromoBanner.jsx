import React from 'react';
import { formatPrice } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Flame } from 'lucide-react';

export default function PromoBanner({ promotions }) {
  if (!promotions || promotions.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-xl">Promoções</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
        {promotions.map(promo => (
          <div
            key={promo.id}
            className="snap-start shrink-0 w-72 sm:w-80 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 relative"
          >
            {promo.banner_url ? (
              <img src={promo.banner_url} alt={promo.product_name} className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-gradient-to-br from-primary/30 to-background flex items-center justify-center">
                <span className="text-5xl">🔥</span>
              </div>
            )}
            <div className="p-4">
              <Badge className="bg-primary text-primary-foreground mb-2">PROMO</Badge>
              <h3 className="font-heading font-semibold text-lg">{promo.product_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground line-through text-sm">{formatPrice(promo.original_price)}</span>
                <span className="text-primary font-bold text-lg">{formatPrice(promo.promo_price)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}