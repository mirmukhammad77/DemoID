export interface Credentials { email: string; password: string }
export interface RegistrationDetails extends Credentials { firstName: string; lastName: string; birthDate: string }
export interface Profile { id: string; email: string; firstName: string; lastName: string; birthDate: string }
export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly fields: Record<string, string[]> = {}) { super(message); }
}
const base = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000/api').replace(/\/$/, '');
async function request<T>(endpoint: string, body: BodyInit, signal: AbortSignal, json: boolean): Promise<T> {
  let response: Response;
  try {
    response = await fetch(base + endpoint, { method: 'POST', body, signal, credentials: 'omit', cache: 'no-store',
      headers: json ? { 'Content-Type': 'application/json' } : undefined });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ApiError('NETWORK_ERROR', 'Cannot reach the server. Please try again.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.code ?? 'REQUEST_FAILED', data?.message ?? 'Something went wrong. Please try again.', data?.fields ?? {});
  return data as T;
}
export const postJson = <T>(endpoint: string, details: object, signal: AbortSignal) => request<T>(endpoint, JSON.stringify(details), signal, true);
export function postPhoto<T>(endpoint: string, details: Credentials | RegistrationDetails, photo: Blob, signal: AbortSignal) {
  const form = new FormData();
  for (const [key, value] of Object.entries(details)) form.append(key, value);
  form.append('photo', photo, 'capture.jpg');
  return request<T>(endpoint, form, signal, false);
}
