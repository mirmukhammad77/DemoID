import { useState } from 'react';
import type { Profile } from '../shared/api/client';
import { Login } from '../features/login/Login';
import { Registration } from '../features/registration/Registration';
import { ProfileDetails } from '../features/profile/ProfileDetails';
import './styles.css';
export function App() {
  const [flow, setFlow] = useState<'login' | 'registration'>('login');
  const [profile, setProfile] = useState<Profile | null>(null);
  return <div className="page"><header className="brand"><span className="brand-mark" aria-hidden="true">D<span>•</span></span><span>DemoID<small>IDENTITY VERIFICATION</small></span></header>
    <main className="card">{profile ? <ProfileDetails profile={profile} /> : <><nav className="tabs" aria-label="Account actions"><button type="button" className={flow === 'login' ? 'selected' : ''} aria-pressed={flow === 'login'} onClick={() => setFlow('login')}>Sign in</button><button type="button" className={flow === 'registration' ? 'selected' : ''} aria-pressed={flow === 'registration'} onClick={() => setFlow('registration')}>Create account</button></nav>{flow === 'login' ? <Login onVerified={setProfile} /> : <Registration onLogin={() => setFlow('login')} />}</>}</main>
    {!profile && <footer><span aria-hidden="true">◈</span> Two steps. One verified you.</footer>}</div>;
}
