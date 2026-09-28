import { API_URL } from "../config";
import { getSession } from "../features/auth/session";

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getSession();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}`, ...init.headers },
  });
  if (!response.ok) throw new Error(`Shelf API ${String(response.status)} for ${path}`);
  return (await response.json()) as T;
}
