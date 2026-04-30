import type { GatewayEnvelope, GatewayError } from '@/types/api';

const BASE    = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const API_KEY = import.meta.env.VITE_API_KEY ?? 'dev-key-12345';

export class ApiError extends Error {
  readonly statusCode: number;
  readonly path: string;

  constructor(message: string, statusCode: number, path: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.path = path;
  }
}

async function request<T>(path: string, method: 'GET' | 'POST' | 'DELETE', body?: unknown): Promise<T> {
  const res  = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body:    body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json: GatewayEnvelope<T> | GatewayError = await res.json();
  if (!res.ok || !json.success) {
    const e = json as GatewayError;
    throw new ApiError(e.error?.message ?? 'Error', e.error?.statusCode ?? res.status, path);
  }
  return (json as GatewayEnvelope<T>).data;
}

async function upload<T>(path: string, form: FormData): Promise<T> {
  const res  = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    body:    form,
  });
  const json: GatewayEnvelope<T> | GatewayError = await res.json();
  if (!res.ok || !json.success) {
    const e = json as GatewayError;
    throw new ApiError(e.error?.message ?? 'Upload failed', e.error?.statusCode ?? res.status, path);
  }
  return (json as GatewayEnvelope<T>).data;
}

export const api = {
  get:    <T>(path: string)                => request<T>(path, 'GET'),
  post:   <T>(path: string, body: unknown) => request<T>(path, 'POST', body),
  delete: <T>(path: string)               => request<T>(path, 'DELETE'),
  upload: <T>(path: string, form: FormData) => upload<T>(path, form),
} as const;