import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Credentials, Profile } from '../../shared/api/client';
import { useRequest } from '../../shared/api/use-request';
import { CameraCapture } from '../../shared/camera/CameraCapture';
import { ErrorNotice, Field, Steps } from '../../shared/ui/forms';
import { validateCredentials, verifyFace } from './api';
export function Login({ onVerified }: { onVerified: (profile: Profile) => void }) {
  const [details, setDetails] = useState<Credentials>({ email: '', password: '' });
  const [capture, setCapture] = useState(false);
  const request = useRequest();
  function validate(event: FormEvent) { event.preventDefault(); void request.run(signal => validateCredentials(details, signal), () => setCapture(true)); }
  function submit(photo: Blob) {
    void request.run(signal => verifyFace(details, photo, signal), profile => { setDetails({ email: '', password: '' }); onVerified(profile); }, error => {
      if (error.code === 'INVALID_CREDENTIALS' || error.code === 'VALIDATION_ERROR') { setCapture(false); setDetails(current => ({ ...current, password: '' })); }
    });
  }
  return <><Steps second={capture} /><h1>{capture ? 'Let’s make sure it’s you' : 'Welcome back'}</h1><p className="intro">{capture ? 'Take a new photo to compare with your registered face.' : 'Enter your email and password to get started.'}</p><ErrorNotice error={request.error} />
    {capture ? <CameraCapture busy={request.pending} submitLabel="Verify my face" onSubmit={submit} onBack={() => { request.clearError(); setCapture(false); }} /> : <form onSubmit={validate}>
      <Field label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} value={details.email} onChange={e => setDetails(current => ({ ...current, email: e.target.value }))} errors={request.error?.fields.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={128} value={details.password} onChange={e => setDetails(current => ({ ...current, password: e.target.value }))} errors={request.error?.fields.password} />
      <button className="full" type="submit" disabled={request.pending}>{request.pending ? 'Checking credentials…' : 'Continue to face verification →'}</button>
    </form>}</>;
}
