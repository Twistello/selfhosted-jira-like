export async function api<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {method, credentials:'same-origin', headers:body === undefined ? undefined : {'Content-Type':'application/json'}, body:body === undefined ? undefined : JSON.stringify(body)});
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(Array.isArray(data?.message) ? data.message.join(', ') : data?.message || `HTTP ${response.status}`);
  return data as T;
}
export function rows(value: any): any[] { return Array.isArray(value) ? value : value?.items || value?.data || []; }
