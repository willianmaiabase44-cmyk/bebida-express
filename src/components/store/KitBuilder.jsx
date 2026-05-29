import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatPrice, CATEGORIES } from '@/lib/constants';
import { useCart } from '@/context/CartContext';
import { Package, Plus, Minus, ShoppingBag, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function KitBuilder({ products }) {
  const [open, setOpen] = useState(false);
  const [kitItems, setKitItems] = useState({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const { addItem } = useCart();

  const filtered = useMemo(() => {
    return (products || []).filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === 'all' || p.category === category;
      return matchSearch && matchCat && p.active !== false && (p.stock ?? 0) > 0;
    });
  }, [products, search, category]);

  const addToKit = (product) => {
    setKitItems(prev => ({
      ...prev,
      [product.id]: {
        ...product,
        quantity: (prev[product.id]?.quantity || 0) + 1
      }
    }));
  };

  const removeFromKit = (productId) => {
    setKitItems(prev => {
      const updated = { ...prev };
      if (updated[productId].quantity <= 1) {
        delete updated[productId];
      } else {
        updated[productId] = { ...updated[productId], quantity: updated[productId].quantity - 1 };
      }
      return updated;
    });
  };

  const kitTotal = Object.values(kitItems).reduce((sum, item) => sum + item.price * item.quantity, 0);
  const kitCount = Object.values(kitItems).reduce((sum, item) => sum + item.quantity, 0);

  const handleAddKit = () => {
    if (kitCount === 0) return;
    const kitItemsList = Object.values(kitItems).map(i => ({ name: i.name, quantity: i.quantity, price: i.price }));
    addItem(
      { id: `kit-${Date.now()}`, price: kitTotal, kitItems: kitItemsList },
      1,
      true,
      `Kit Personalizado (${kitCount} itens)`
    );
    setKitItems({});
    setOpen(false);
    toast.success('Kit adicionado ao carrinho!');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-5 text-left hover:border-primary/50 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg">Monte Seu Kit</h3>
              <p className="text-sm text-muted-foreground">Escolha suas bebidas e crie seu kit personalizado</p>
            </div>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-background border-border max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="font-heading flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Monte Seu Kit
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-none" />
          </div>
          <div className="flex gap-1 overflow-x-auto mt-3 pb-2">
            <button onClick={() => setCategory('all')} className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${category === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>Todos</button>
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCategory(c.value)} className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${category === c.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {filtered.map(p => {
            const qty = kitItems[p.id]?.quantity || 0;
            return (
              <div key={p.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-xl">🍺</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-primary font-bold text-sm">{formatPrice(p.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {qty > 0 && (
                    <>
                      <button onClick={() => removeFromKit(p.id)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-5 text-center">{qty}</span>
                    </>
                  )}
                  <button onClick={() => addToKit(p)} className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {kitCount > 0 && (
          <div className="border-t border-border p-5 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{kitCount} itens</span>
              <span className="font-heading font-bold text-lg text-primary">{formatPrice(kitTotal)}</span>
            </div>
            <Button onClick={handleAddKit} className="w-full h-11 bg-primary hover:bg-primary/90 rounded-xl gap-2 font-semibold">
              <ShoppingBag className="w-4 h-4" />
              Adicionar Kit ao Carrinho
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}