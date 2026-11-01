import { useEffect, useRef, useState } from 'react';
import { ApiError } from './client';
export function useRequest() {
  const current = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  useEffect(() => () => current.current?.abort(), []);
  async function run<T>(operation: (signal: AbortSignal) => Promise<T>, onSuccess: (result: T) => void, onError?: (error: ApiError) => void) {
    if (current.current) return;
    const control = new AbortController(); current.current = control;
    setPending(true); setError(null);
    try { const result = await operation(control.signal); if (!control.signal.aborted) onSuccess(result); }
    catch (failure) {
      if (!control.signal.aborted) {
        const next = failure instanceof ApiError ? failure : new ApiError('REQUEST_FAILED', 'Something went wrong. Please try again.');
        setError(next); onError?.(next);
      }
    } finally { if (!control.signal.aborted) { current.current = null; setPending(false); } }
  }
  return { pending, error, run, clearError: () => setError(null) };
}
