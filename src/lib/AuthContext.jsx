import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import * as authService from '@/services/authService';
import { setAuthRedirectHandler } from '@/lib/apiClient';
import { isServerDown } from '@/lib/serverHealth';

const ADMIN_KEY = 'smoke_admin_auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    // Auth admin é verificada INDEPENDENTEMENTE do Base44.
    // Public settings (não-auth) carregam em paralelo e podem falhar sem afetar auth.
    checkUserAuth();
    loadPublicSettings();
    setAuthRedirectHandler(() => {
      setUser(null);
      setIsAuthenticated(false);
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login';
      }
    });
  }, []);

  const loadPublicSettings = async () => {
    try {
      setIsLoadingPublicSettings(true);
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token,
        interceptResponses: true
      });

      const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
      setAppPublicSettings(publicSettings);
      setIsLoadingPublicSettings(false);
    } catch (appError) {
      // Public settings não são auth — falha silenciosa, não bloqueia o app
      console.error('Public settings load failed (non-auth):', appError);
      setIsLoadingPublicSettings(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const stored = authService.getStoredAdmin();
      if (!stored?.access_token) {
        // Sem token do /server — tenta Base44 auth (fallback de preview)
        if (isServerDown()) {
          try {
            if (await base44.auth.isAuthenticated()) {
              const me = await base44.auth.me();
              if (me && (me.role === 'admin' || me.role === 'user')) {
                setUser({ ...me, type: 'admin' });
                setIsAuthenticated(true);
                setIsLoadingAuth(false);
                setAuthChecked(true);
                return;
              }
            }
          } catch {}
        }
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
          // Token existe mas não é admin — limpa
          localStorage.removeItem(ADMIN_KEY);
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch {
        // /server fora — tenta Base44 auth antes de deslogar
        if (isServerDown()) {
          try {
            if (await base44.auth.isAuthenticated()) {
              const me = await base44.auth.me();
              if (me && (me.role === 'admin' || me.role === 'user')) {
                setUser({ ...me, type: 'admin' });
                setIsAuthenticated(true);
                setIsLoadingAuth(false);
                setAuthChecked(true);
                return;
              }
            }
          } catch {}
        }
        localStorage.removeItem(ADMIN_KEY);
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
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      loadPublicSettings
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