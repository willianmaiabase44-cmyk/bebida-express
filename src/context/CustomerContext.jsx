import React, { createContext, useState, useContext, useEffect } from 'react';

const CustomerContext = createContext();
const STORAGE_KEY = 'smoke_customer_session';

export const CustomerProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCustomer(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Erro ao carregar sessão do cliente', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (customerData) => {
    setCustomer(customerData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customerData));
  };

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <CustomerContext.Provider value={{ customer, loading, login, logout, isAuthenticated: !!customer }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (!context) throw new Error('useCustomer must be used within CustomerProvider');
  return context;
};