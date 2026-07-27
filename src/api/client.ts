import { API_BASE_URL } from '@/src/config/api';

export class ApiError extends Error {
  status: number;
  field?: string;
  code?: string;

  constructor(message: string, status: number, field?: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.field = field;
    this.code = code;
  }
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers: extraHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  if (rest.body && !(rest.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      ...rest,
      headers,
    });
  } catch {
    // Client-facing copy only — never expose API host or env var names.
    throw new ApiError(
      'Could not connect to the server. Check your internet and try again.',
      0,
      undefined,
      'NETWORK'
    );
  }

  const data = await parseJson(response);
  if (!response.ok) {
    throw new ApiError(data.error || 'Request failed', response.status, data.field, data.code);
  }
  return data as T;
}
