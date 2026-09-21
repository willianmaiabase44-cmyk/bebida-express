import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import * as authService from '@/services/authService';
import { setAuthRedirectHandler } from '@/lib/apiClient';

// base44 import retained for platform compatibility — auth is handled by /server API

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkUserAuth();
    setAuthRedirectHandler(() => {
      setUser(null);
      setIsAuthenticated(false);
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login';
      }
    });
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const stored = authService.getStoredAdmin();
      if (!stored?.access_token) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }
      try {
        const me = await authService.getMe();
        if (me.type === 'admin') {
          setUser({ ...me.user, type: 'admin' });
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('smoke_admin_auth');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch {
        localStorage.removeItem('smoke_admin_auth');
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
    }
  };

  const logout = async (shouldRedirect = true) => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: null,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      loadPublicSettings: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};