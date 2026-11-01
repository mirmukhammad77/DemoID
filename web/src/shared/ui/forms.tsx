import type { InputHTMLAttributes } from 'react';
import type { ApiError } from '../api/client';
export function Field({ label, errors, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; errors?: string[] }) {
  const errorId = errors?.length ? input.name + '-error' : undefined;
  return <label className="field"><span>{label}</span><input {...input} aria-invalid={!!errors?.length} aria-describedby={errorId} />
    {errors?.length ? <small id={errorId} className="field-error">{errors.join('. ')}</small> : null}</label>;
}
export function ErrorNotice({ error }: { error: ApiError | null }) {
  return error ? <p className="notice error" role="alert">{error.message}</p> : null;
}
export function Steps({ second, registration = false }: { second: boolean; registration?: boolean }) {
  return <ol className="steps" aria-label="Verification progress"><li className={!second ? 'active' : 'done'} aria-current={!second ? 'step' : undefined}><span>1</span>{registration ? 'Your details' : 'Credentials'}</li><li className={second ? 'active' : ''} aria-current={second ? 'step' : undefined}><span>2</span>Face verification</li></ol>;
}
