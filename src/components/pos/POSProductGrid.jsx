import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CATEGORIES } from '@/lib/constants';
import { formatPrice } from '@/lib/constants';

export default function POSProductGrid({ products, search, setSearch, category, setCategory, onAdd, cartQty }) {
  const filtered = products.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !category || p.category === category;
    return matchSearch && matchCat && p.active !== false;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Buscar produto ou código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-11 text-base"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-thin">
        <button
          onClick={() => setCategory('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${!category ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
        >
          Todos
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${category === c.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {filtered.map(product => {
            const outOfStock = (product.stock ?? 0) <= 0;
            const qty = cartQty(product.id) || 0;
            return (
              <button
                key={product.id}
                onClick={() => !outOfStock && onAdd(product)}
                disabled={outOfStock}
                className={`relative text-left rounded-xl border p-3 transition-all ${outOfStock ? 'border-border opacity-40 cursor-not-allowed' : 'border-border hover:border-primary hover:bg-primary/5 active:scale-[0.98]'}`}
              >
                {qty > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {qty}
                  </span>
                )}
                <div className="aspect-square rounded-lg bg-secondary mb-2 overflow-hidden flex items-center justify-center">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🍺</span>
                  )}
                </div>
                <p className="text-xs font-medium line-clamp-2 leading-tight min-h-[2rem]">{product.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold text-primary">{formatPrice(product.price)}</span>
                  <span className={`text-[10px] ${outOfStock ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {outOfStock ? 'Sem estoque' : `${product.stock ?? 0} un`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-10 text-sm">Nenhum produto encontrado</p>
        )}
      </div>
    </div>
  );
}