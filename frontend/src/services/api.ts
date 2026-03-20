function resolveApiBase() {
  const envBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  // Use || (not ??) so empty-string doesn't win.
  const base = (envBase || 'http://127.0.0.1:8000').trim();
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

const API_BASE = resolveApiBase();

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export function getToken() {
  return localStorage.getItem('token') ?? '';
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

export async function api<T>(
  path: string,
  options: { method?: HttpMethod; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();
  const isJson = contentType.includes('application/json');
  const data = text && isJson ? (JSON.parse(text) as unknown) : text || null;
  if (!res.ok) {
    // HTML fallback
    if (!isJson && typeof data === 'string' && data.includes('<!DOCTYPE')) {
      throw new Error(`API returned HTML (not JSON). Check VITE_API_BASE. URL: ${url}`);
    }

    // Attempt to stringify DRF validation dictionaries e.g. {"username": ["This field is required."]}
    if (data && typeof data === 'object') {
      const dbg = data as any;
      if (dbg.error) throw new Error(dbg.error);
      if (dbg.detail) throw new Error(dbg.detail);
      // Flatten dictionary errors into a readable string
      const errStrs = Object.entries(dbg)
        .filter(([k]) => typeof k === 'string')
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`);
      if (errStrs.length) {
        throw new Error(errStrs.join(' | '));
      }
    }
    
    throw new Error(`HTTP ${res.status}`);
  }
  return data as T;
}

