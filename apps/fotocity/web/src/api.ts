const API_BASE = import.meta.env.VITE_API_URL || '';

// Token storage for cross-domain auth
function getToken(): string | null {
  return localStorage.getItem('fc_session');
}

function setToken(token: string): void {
  localStorage.setItem('fc_session', token);
}

function clearToken(): void {
  localStorage.removeItem('fc_session');
}

// Build fetch options with auth (token header + cookie fallback)
function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(opts.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...opts, headers, credentials: 'include' });
}

export async function checkSession(): Promise<boolean> {
  try {
    const res = await authFetch(`${API_BASE}/api/session`);
    const data = await res.json();
    if (!data.loggedIn) {
      clearToken();
    }
    return data.loggedIn === true;
  } catch {
    return false;
  }
}

export async function login(usuario: string, senha: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ usuario, senha }),
    });
    const data = await res.json();
    if (data.status === 'ok' && data.token) {
      setToken(data.token);
    }
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  await authFetch(`${API_BASE}/api/logout`);
  clearToken();
}

export async function uploadPhoto(
  clientId: string,
  productId: string,
  file: File
): Promise<{ status: string; filename?: string; message?: string }> {
  const formData = new FormData();
  formData.append('action', 'add_image');
  formData.append('id_cliente', clientId);
  formData.append('id_produto', productId);
  formData.append('img_file', file);

  const res = await fetch(`${API_BASE}/api/photos`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export interface Client {
  email: string;
  nome: string;
  telefone: string;
  data: number;
}

export async function getClients(): Promise<Client[]> {
  try {
    const res = await authFetch(`${API_BASE}/api/admin/clients`);
    const data = await res.json();
    return data.clients || [];
  } catch {
    return [];
  }
}

export async function getClientProducts(clientId: string): Promise<{ produto: string; data: number; qtd: number }[]> {
  try {
    const res = await authFetch(`${API_BASE}/api/admin/clients/${encodeURIComponent(clientId)}/products`);
    const data = await res.json();
    return data.products || [];
  } catch {
    return [];
  }
}

export async function getProductPhotos(clientId: string, productId: string): Promise<{ key: string; url: string; data: number; copies: number }[]> {
  try {
    const res = await authFetch(`${API_BASE}/api/admin/clients/${encodeURIComponent(clientId)}/products/${encodeURIComponent(productId)}/photos`);
    const data = await res.json();
    return data.photos || [];
  } catch {
    return [];
  }
}

export async function deleteClient(clientId: string): Promise<boolean> {
  try {
    const res = await authFetch(`${API_BASE}/api/admin/clients/${encodeURIComponent(clientId)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return data.status === 'OK';
  } catch {
    return false;
  }
}

export async function deleteProduct(clientId: string, productId: string): Promise<boolean> {
  try {
    const res = await authFetch(`${API_BASE}/api/admin/clients/${encodeURIComponent(clientId)}/products/${encodeURIComponent(productId)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return data.status === 'OK';
  } catch {
    return false;
  }
}
