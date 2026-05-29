import React, { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = useCallback((product, quantity = 1, isKit = false, kitName = '') => {
    setItems(prev => {
      const key = isKit ? `kit-${Date.now()}` : product.id;
      const existing = !isKit ? prev.find(i => i.id === key && !i.isKit) : null;
      if (existing) {
        return prev.map(i => i.id === key && !i.isKit ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, {
        id: key,
        productId: product.id,
        name: isKit ? kitName : product.name,
        price: product.price,
        image_url: product.image_url,
        quantity,
        isKit,
        kitItems: isKit ? product.kitItems : null
      }];
    });
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
    }
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);