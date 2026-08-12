import React, { createContext, useState, useContext, useEffect } from 'react';

const MotoboyContext = createContext();
const STORAGE_KEY = 'smoke_motoboy_session';

export const MotoboyProvider = ({ children }) => {
  const [motoboy, setMotoboy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMotoboy(JSON.parse(saved));
    } catch (e) {
      console.error('Erro ao carregar sessão do motoboy', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (motoboyData) => {
    setMotoboy(motoboyData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(motoboyData));
  };

  const logout = () => {
    setMotoboy(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <MotoboyContext.Provider value={{ motoboy, loading, login, logout, isAuthenticated: !!motoboy }}>
      {children}
    </MotoboyContext.Provider>
  );
};

export const useMotoboy = () => {
  const context = useContext(MotoboyContext);
  if (!context) throw new Error('useMotoboy must be used within MotoboyProvider');
  return context;
};