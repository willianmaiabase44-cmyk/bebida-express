import React from 'react';
import ProductCard from './ProductCard';

export default function ProductSection({ title, icon, products, promoMap }) {
  if (!products || products.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h2 className="font-heading font-bold text-xl">{title}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {products.map(p => (
          <ProductCard key={p.id} product={p} promoPrice={promoMap?.[p.id]} />
        ))}
      </div>
    </section>
  );
}