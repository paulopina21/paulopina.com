export interface Env {
  SESSIONS: KVNamespace;
  PHOTOS?: R2Bucket;
  APP_NAME: string;
  AUTH_USER: string;
  AUTH_PASS: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function generateSessionId(): string {
  return crypto.randomUUID();
}

async function verifySession(env: Env, sessionId: string | null): Promise<boolean> {
  if (!sessionId) return false;
  const session = await env.SESSIONS.get(sessionId);
  return session !== null;
}

async function createSession(env: Env): Promise<string> {
  const sessionId = generateSessionId();
  await env.SESSIONS.put(sessionId, JSON.stringify({ loggedIn: true, createdAt: Date.now() }), {
    expirationTtl: 60 * 60 * 24, // 24 hours
  });
  return sessionId;
}

async function deleteSession(env: Env, sessionId: string): Promise<void> {
  await env.SESSIONS.delete(sessionId);
}

function getSessionIdFromRequest(request: Request): string | null {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.match(/session=([^;]+)/);
  return match ? match[1] : null;
}

// Photo storage functions (R2 when available, otherwise returns instructions)
async function uploadPhoto(
  env: Env,
  clientId: string,
  productId: string,
  file: File
): Promise<{ status: string; filename?: string; message?: string }> {
  if (!env.PHOTOS) {
    return {
      status: 'ERROR',
      message: 'R2 not configured. Enable R2 in Cloudflare dashboard and update wrangler.toml',
    };
  }

  const timestamp = Date.now();
  const randomNumber = Math.floor(Math.random() * 9000) + 1000;
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${timestamp}-${randomNumber}.${ext}`;
  const key = `${clientId}/${productId}/${filename}`;

  await env.PHOTOS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return { status: 'OK', filename };
}

async function listPhotos(
  env: Env,
  clientId: string,
  productId: string
): Promise<{ status: string; files?: { id: string; url: string }[]; message?: string }> {
  if (!env.PHOTOS) {
    return { status: 'ERROR', message: 'R2 not configured' };
  }

  const prefix = `${clientId}/${productId}/`;
  const listed = await env.PHOTOS.list({ prefix });

  const files = listed.objects.map((obj) => ({
    id: obj.key.split('/').pop()?.split('.')[0] || '',
    url: `/api/photos/${obj.key}`,
  }));

  return { status: 'OK', files };
}

async function deletePhoto(
  env: Env,
  clientId: string,
  productId: string,
  filename: string
): Promise<{ status: string; message?: string }> {
  if (!env.PHOTOS) {
    return { status: 'ERROR', message: 'R2 not configured' };
  }

  const key = `${clientId}/${productId}/${filename}`;
  await env.PHOTOS.delete(key);
  return { status: 'OK' };
}

async function deleteAllPhotos(
  env: Env,
  clientId: string,
  productId: string
): Promise<{ status: string; message?: string }> {
  if (!env.PHOTOS) {
    return { status: 'ERROR', message: 'R2 not configured' };
  }

  const prefix = `${clientId}/${productId}/`;
  const listed = await env.PHOTOS.list({ prefix });

  for (const obj of listed.objects) {
    await env.PHOTOS.delete(obj.key);
  }

  return { status: 'OK' };
}

async function listClients(env: Env): Promise<{ nome: string; data: number }[]> {
  if (!env.PHOTOS) {
    return [];
  }

  const listed = await env.PHOTOS.list();
  const clientMap = new Map<string, number>();

  for (const obj of listed.objects) {
    const parts = obj.key.split('/');
    if (parts.length >= 1) {
      const clientName = parts[0];
      const uploadTime = obj.uploaded.getTime();
      const existing = clientMap.get(clientName) || 0;
      if (uploadTime > existing) {
        clientMap.set(clientName, uploadTime);
      }
    }
  }

  return Array.from(clientMap.entries())
    .map(([nome, data]) => ({ nome, data }))
    .sort((a, b) => b.data - a.data);
}

async function getPhotoFile(env: Env, key: string): Promise<Response> {
  if (!env.PHOTOS) {
    return jsonResponse({ status: 'ERROR', message: 'R2 not configured' }, 500);
  }

  const object = await env.PHOTOS.get(key);
  if (!object) {
    return jsonResponse({ status: 'ERROR', message: 'File not found' }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return new Response(object.body, { headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check
    if (path === '/' || path === '/health') {
      return jsonResponse({ status: 'ok', app: env.APP_NAME, r2_enabled: !!env.PHOTOS });
    }

    // Auth endpoints
    if (path === '/api/login' && method === 'POST') {
      const body = await request.json() as { usuario?: string; senha?: string };
      const { usuario, senha } = body;

      if (usuario === env.AUTH_USER && senha === env.AUTH_PASS) {
        const sessionId = await createSession(env);
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
            ...CORS_HEADERS,
          },
        });
      }

      return jsonResponse({ status: 'error', message: 'Credenciais invalidas' }, 401);
    }

    if (path === '/api/logout') {
      const sessionId = getSessionIdFromRequest(request);
      if (sessionId) {
        await deleteSession(env, sessionId);
      }
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `session=; Path=/; HttpOnly; Max-Age=0`,
          ...CORS_HEADERS,
        },
      });
    }

    if (path === '/api/session') {
      const sessionId = getSessionIdFromRequest(request);
      const valid = await verifySession(env, sessionId);
      return jsonResponse({ loggedIn: valid });
    }

    // Photo API endpoints
    if (path === '/api/photos' && method === 'POST') {
      const formData = await request.formData();
      const action = formData.get('action') as string;
      const clientId = formData.get('id_cliente') as string;
      const productId = formData.get('id_produto') as string;

      if (action === 'add_image') {
        const file = formData.get('img_file') as File;
        if (!clientId || !productId || !file) {
          return jsonResponse({ status: 'ERROR', message: 'Missing parameters' }, 400);
        }
        const result = await uploadPhoto(env, clientId, productId, file);
        return jsonResponse(result);
      }

      if (action === 'delete_image') {
        const filename = formData.get('filename') as string;
        if (!clientId || !productId || !filename) {
          return jsonResponse({ status: 'ERROR', message: 'Missing parameters' }, 400);
        }
        const result = await deletePhoto(env, clientId, productId, filename);
        return jsonResponse(result);
      }

      if (action === 'delete_all_images') {
        if (!clientId || !productId) {
          return jsonResponse({ status: 'ERROR', message: 'Missing parameters' }, 400);
        }
        const result = await deleteAllPhotos(env, clientId, productId);
        return jsonResponse(result);
      }

      return jsonResponse({ status: 'ERROR', message: 'Invalid action' }, 400);
    }

    if (path === '/api/photos' && method === 'GET') {
      const clientId = url.searchParams.get('id_cliente');
      const productId = url.searchParams.get('id_produto');

      if (!clientId || !productId) {
        return jsonResponse({ status: 'ERROR', message: 'Missing parameters' }, 400);
      }

      const result = await listPhotos(env, clientId, productId);
      return jsonResponse(result);
    }

    // Serve photo file
    if (path.startsWith('/api/photos/') && method === 'GET') {
      const key = path.replace('/api/photos/', '');
      return getPhotoFile(env, key);
    }

    // Admin API (protected)
    if (path.startsWith('/api/admin/')) {
      const sessionId = getSessionIdFromRequest(request);
      const valid = await verifySession(env, sessionId);

      if (!valid) {
        return jsonResponse({ status: 'error', message: 'Unauthorized' }, 401);
      }

      if (path === '/api/admin/clients') {
        const clients = await listClients(env);
        return jsonResponse({ status: 'ok', clients });
      }
    }

    return jsonResponse({ status: 'ERROR', message: 'Not found' }, 404);
  },
};
