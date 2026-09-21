// ============================================================
// apiClient.js — Cliente HTTP independente para o backend /server
// ============================================================
// Não depende do Base44. Gerencia tokens JWT (access + refresh)
// em localStorage e renova automaticamente em caso de 401.
//
// Three auth types coexist (admin, customer, motoboy) mas cada
// área da app usa apenas um tipo por vez.
// ============================================================

export const API_BASE_URL = import.meta.env.VITE_SERVER_API_URL || '/server-api';

const STORAGE_KEYS = {
  admin: 'smoke_admin_auth',
  customer: 'smoke_customer_session',
  motoboy: 'smoke_motoboy_session',
};

// --- Token helpers -------------------------------------------------

function getAuthData() {
  for (const key of Object.values(STORAGE_KEYS)) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.access_token) return { type: parsed.type, ...parsed };
      } catch {
        // ignore
      }
    }
  }
  return null;
}

function getAccessToken() {
  const data = getAuthData();
  return data?.access_token || null;
}

function getRefreshToken() {
  const data = getAuthData();
  return data?.refresh_token || null;
}

function updateAccessToken(newToken) {
  for (const key of Object.values(STORAGE_KEYS)) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.refresh_token) {
          parsed.access_token = newToken;
          localStorage.setItem(key, JSON.stringify(parsed));
          return;
        }
      } catch {
        // ignore
      }
    }
  }
}

function clearAuthData() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.access_token) {
          localStorage.removeItem(key);
        }
      } catch {
        // ignore
      }
    }
  });
}

// --- Refresh lock (evita múltiplas renovações simultâneas) ---------

let refreshPromise = null;

async function doRefresh() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthData();
    return null;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        clearAuthData();
        return null;
      }
      const data = await res.json();
      if (data.access_token) {
        updateAccessToken(data.access_token);
        if (data.refresh_token) {
          // Atualiza refresh token se rotacionado
          for (const key of Object.values(STORAGE_KEYS)) {
            const raw = localStorage.getItem(key);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (parsed.access_token === data.access_token || parsed.refresh_token === refreshToken) {
                  parsed.refresh_token = data.refresh_token;
                  localStorage.setItem(key, JSON.stringify(parsed));
                  break;
                }
              } catch {
                // ignore
              }
            }
          }
        }
        return data.access_token;
      }
      clearAuthData();
      return null;
    } catch {
      clearAuthData();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// --- API Client ----------------------------------------------------

export async function apiRequest(path, options = {}) {
  const token = getAccessToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Tenta renovar o token em caso de 401
  if (response.status === 401 && !options._retried) {
    const newToken = await doRefresh();
    if (newToken) {
      return apiRequest(path, {
        ...options,
        _retried: true,
        headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
      });
    }
    // Refresh falhou — redireciona para login
    triggerAuthRedirect();
  }

  return response;
}

// --- Atalhos -------------------------------------------------------

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) =>
    apiRequest(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),
  put: (path, body, options) =>
    apiRequest(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  patch: (path, body, options) =>
    apiRequest(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};

// --- Redirect handler ----------------------------------------------

let redirectHandler = null;

export function setAuthRedirectHandler(fn) {
  redirectHandler = fn;
}

function triggerAuthRedirect() {
  if (redirectHandler) {
    redirectHandler();
  }
}

// Helper: chama a API e retorna JSON parseado, lançando erro em caso de falha
export async function apiJson(path, options = {}) {
  const res = await apiRequest(path, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || `Erro ${res.status}`);
  }
  return res.json();
}

export { clearAuthData, getAccessToken, getAuthData };