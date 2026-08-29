import type { ApiError } from '@iwantit/shared';

export const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3333' : '');

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number, public readonly fieldErrors?: Record<string, string[]>) { super(message); }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Não foi possível conectar ao servidor.' })) as ApiError;
    throw new ApiRequestError(body.message, response.status, body.fieldErrors);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
