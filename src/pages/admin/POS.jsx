import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listProducts } from '@/services/productService';
import { createSale } from '@/services/saleService';
import { toast } from 'sonner';
import { Loader2, ShoppingCart } from 'lucide-react';
import POSProductGrid from '@/components/pos/POSProductGrid';
import POSCart from '@/components/pos/POSCart';
import POSReceipt from '@/components/pos/POSReceipt';

export default function POS() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [amountPaid, setAmountPaid] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => listProducts({ includeInactive: true }),
  });

  const addToCart = (product) => {
    const inCart = cart.find(i => i.id === product.id);
    if (inCart && inCart.quantity >= (product.stock ?? 0)) {
      toast.error('Quantidade máxima em estoque atingida');
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        stock: product.stock ?? 0,
        quantity: 1,
      }];
    });
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.id !== id));
      return;
    }
    const item = cart.find(i => i.id === id);
    if (item && qty > item.stock) {
      toast.error('Quantidade máxima em estoque atingida');
      return;
    }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => { setCart([]); setAmountPaid(0); };

  const cartQty = (id) => cart.find(i => i.id === id)?.quantity || 0;
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const checkout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      const change = paymentMethod === 'dinheiro' && amountPaid > 0 ? Math.max(0, amountPaid - total) : 0;

      // Create sale (backend handles stock decrement + movements atomically)
      const sale = await createSale({
        items: cart.map(i => ({
          product_id: i.id,
          product_name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        total,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'dinheiro' ? amountPaid : total,
        change,
        channel: 'pdv',
        status: 'concluida',
        date,
      });

      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movements'] });

      setCompletedSale(sale);
      setCart([]);
      setAmountPaid(0);
      setPaymentMethod('dinheiro');
      toast.success('Venda finalizada com sucesso!');
    } catch (err) {
      toast.error('Erro ao finalizar venda: ' + (err.message || 'tente novamente'));
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-bold text-2xl">PDV — Ponto de Venda</h1>
      </div>

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 min-h-0">
        {/* Products */}
        <div className="rounded-xl border border-border bg-card p-3 min-h-0 flex flex-col">
          <POSProductGrid
            products={products}
            search={search}
            setSearch={setSearch}
            category={category}
            setCategory={setCategory}
            onAdd={addToCart}
            cartQty={cartQty}
          />
        </div>

        {/* Cart */}
        <div className="rounded-xl overflow-hidden min-h-0 flex flex-col">
          <POSCart
            items={cart}
            total={total}
            onUpdateQty={updateQty}
            onRemove={removeFromCart}
            onClear={clearCart}
            onCheckout={checkout}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            amountPaid={amountPaid}
            setAmountPaid={setAmountPaid}
            processing={processing}
          />
        </div>
      </div>

      {/* Receipt */}
      <POSReceipt
        sale={completedSale}
        open={!!completedSale}
        onClose={() => setCompletedSale(null)}
      />
    </div>
  );
}