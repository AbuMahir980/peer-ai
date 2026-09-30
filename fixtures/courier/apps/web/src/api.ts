const API_URL = import.meta.env.VITE_API_URL;

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("courier-token");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return (await response.json()) as T;
}
