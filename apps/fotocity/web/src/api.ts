const API_BASE = import.meta.env.VITE_API_URL || '';

export async function checkSession(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/session`, { credentials: 'include' });
    const data = await res.json();
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
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/logout`, { credentials: 'include' });
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

export async function getClients(): Promise<{ nome: string; data: number }[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/clients`, { credentials: 'include' });
    const data = await res.json();
    return data.clients || [];
  } catch {
    return [];
  }
}
