import { useState } from 'react';
import type { FormEvent } from 'react';
import type { RegistrationDetails } from '../../shared/api/client';
import { useRequest } from '../../shared/api/use-request';
import { CameraCapture } from '../../shared/camera/CameraCapture';
import { ErrorNotice, Field, Steps } from '../../shared/ui/forms';
import { completeRegistration, validateRegistration } from './api';
const empty: RegistrationDetails = { email: '', password: '', firstName: '', lastName: '', birthDate: '' };
export function Registration({ onLogin }: { onLogin: () => void }) {
  const [details, setDetails] = useState<RegistrationDetails>(empty);
  const [step, setStep] = useState<'details' | 'capture' | 'done'>('details');
  const request = useRequest();
  function change(field: keyof RegistrationDetails, value: string) { setDetails(current => ({ ...current, [field]: value })); }
  function validate(event: FormEvent) { event.preventDefault(); void request.run(signal => validateRegistration(details, signal), () => setStep('capture')); }
  function complete(photo: Blob) {
    void request.run(signal => completeRegistration(details, photo, signal), () => { setDetails(empty); setStep('done'); }, error => {
      if (error.code === 'EMAIL_CONFLICT' || error.code === 'VALIDATION_ERROR') setStep('details');
    });
  }
  if (step === 'done') return <div className="success"><div className="success-mark" aria-hidden="true">✓</div><h1>You're all set.</h1><p>Your account and reference photo have been saved. You can now sign in.</p><button onClick={onLogin}>Continue to sign in</button></div>;
  return <><Steps second={step === 'capture'} registration /><h1>{step === 'details' ? 'Create your account' : 'A face to your name'}</h1><p className="intro">{step === 'details' ? 'Start with a few details. Your face photo comes next.' : 'Take a clear photo to use for future sign-ins.'}</p><ErrorNotice error={request.error} />
    {step === 'capture' ? <CameraCapture busy={request.pending} submitLabel="Create account" onSubmit={complete} onBack={() => { request.clearError(); setStep('details'); }} /> : <form onSubmit={validate}>
      <div className="field-row"><Field label="First name" name="firstName" autoComplete="given-name" required maxLength={100} value={details.firstName} onChange={e => change('firstName', e.target.value)} errors={request.error?.fields.firstName} /><Field label="Last name" name="lastName" autoComplete="family-name" required maxLength={100} value={details.lastName} onChange={e => change('lastName', e.target.value)} errors={request.error?.fields.lastName} /></div>
      <Field label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} value={details.email} onChange={e => change('email', e.target.value)} errors={request.error?.fields.email} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" required minLength={8} maxLength={128} value={details.password} onChange={e => change('password', e.target.value)} errors={request.error?.fields.password} />
      <Field label="Birth date" name="birthDate" type="date" autoComplete="bday" required max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)} value={details.birthDate} onChange={e => change('birthDate', e.target.value)} errors={request.error?.fields.birthDate} />
      <button className="full" type="submit" disabled={request.pending}>{request.pending ? 'Checking details…' : 'Continue to face capture →'}</button>
    </form>}</>;
}
