import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import StoreHeader from '@/components/store/StoreHeader';
import PromoBanner from '@/components/store/PromoBanner';
import ProductSection from '@/components/store/ProductSection';
import ProductCard from '@/components/store/ProductCard';
import CartDrawer from '@/components/store/CartDrawer';
import KitBuilder from '@/components/store/KitBuilder';
import { CATEGORIES } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export default function Store() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-store'],
    queryFn: () => base44.entities.Product.filter({ active: true }, '-created_date', 200),
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions-store'],
    queryFn: () => base44.entities.Promotion.filter({ active: true }),
  });

  const now = new Date().toISOString().split('T')[0];
  const activePromos = promotions.filter(p => p.start_date <= now && p.end_date >= now);
  const promoMap = {};
  activePromos.forEach(p => { promoMap[p.product_id] = p.promo_price; });

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = activeCategory === 'all' || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, activeCategory]);

  const featured = products.filter(p => p.is_featured);
  const newProducts = products.filter(p => p.is_new);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <StoreHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onCartOpen={() => setCartOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Hero Banner */}
        {activeCategory === 'all' && !searchQuery && (
          <>
            <div className="rounded-2xl bg-gradient-to-r from-primary/30 via-primary/10 to-background border border-primary/20 p-6 sm:p-10 mb-8">
              <h2 className="font-heading font-bold text-2xl sm:text-4xl mb-2">
                Suas bebidas favoritas<br />
                <span className="text-primary">com entrega rápida</span>
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md">
                Cervejas geladas, drinks, refrigerantes e muito mais. Monte seu pedido e receba em casa!
              </p>
            </div>

            <div className="mb-8">
              <KitBuilder products={products} />
            </div>

            <PromoBanner promotions={activePromos} />

            <ProductSection title="Mais Vendidos" icon="🏆" products={featured} promoMap={promoMap} />
            <ProductSection title="Lançamentos" icon="✨" products={newProducts} promoMap={promoMap} />
          </>
        )}

        {/* Product Grid */}
        <section>
          {(activeCategory !== 'all' || searchQuery) && (
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-heading font-bold text-xl">
                {searchQuery ? `Resultados para "${searchQuery}"` : CATEGORIES.find(c => c.value === activeCategory)?.label}
              </h2>
              <span className="text-muted-foreground text-sm">({filtered.length})</span>
            </div>
          )}
          {activeCategory === 'all' && !searchQuery && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🍻</span>
              <h2 className="font-heading font-bold text-xl">Todos os Produtos</h2>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} promoPrice={promoMap[p.id]} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Nenhum produto encontrado</p>
            </div>
          )}
        </section>
      </main>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}