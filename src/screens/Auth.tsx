import { useState } from 'react';
import { Copy, Download, ShieldCheck } from 'lucide-react';
import { download } from '../lib/util';
import { useStore } from '../lib/store';

export default function Auth() {
  const s = useStore();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'restore'>('login');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [rec, setRec] = useState(''); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(''); setOk(''); try { await fn(); } catch (e) { setErr((e as Error).message); } setBusy(false); };

  return <div className="auth"><div className="card">
    <div className="brand" style={{ padding: 0, marginBottom: 6 }}><i>N</i> NoteNest Suite</div>
    <p className="muted small" style={{ marginTop: 0 }}>Private notes, journal, habits & tasks. Everything is encrypted and stays in this browser.</p>
    <div className="tabs">
      {(['login', 'signup'] as const).map(m => <button key={m} className={'btn sm' + (mode === m ? ' on' : '')} onClick={() => { setMode(m); setErr(''); setOk(''); }}>{m === 'login' ? 'Log in' : 'Sign up'}</button>)}
      <button className={'btn sm' + (mode === 'reset' ? ' on' : '')} onClick={() => { setMode('reset'); setErr(''); }}>Forgot password</button>
      <button className={'btn sm' + (mode === 'restore' ? ' on' : '')} onClick={() => { setMode('restore'); setErr(''); }}>Restore backup</button>
    </div>
    {mode === 'signup' && <><label>Your name</label><input type="text" value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></>}
    {mode !== 'restore' && <><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></>}
    {mode === 'reset' && <><label>Recovery key</label><input type="text" value={rec} onChange={e => setRec(e.target.value)} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" /></>}
    {mode !== 'restore' && <><label>{mode === 'reset' ? 'New password' : 'Password'}{mode !== 'login' && ' (min 8 characters)'}</label>
      <input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        onKeyDown={e => { if (e.key === 'Enter') (document.getElementById('go') as HTMLButtonElement)?.click(); }} /></>}
    {mode === 'restore' && <><p className="muted small">Moving to a new browser or device? Choose your <code>.nnbackup</code> file, then log in with the same email and password.</p>
      <input type="file" accept=".nnbackup,application/json" onChange={e => { const f = e.target.files?.[0]; if (f) run(async () => { const em = await s.importBackup(f); setEmail(em); setMode('login'); setOk('Backup restored. Log in with your usual password.'); }); }} /></>}
    {err && <div className="err" role="alert">{err}</div>}
    {ok && <div className="okmsg">{ok}</div>}
    {mode !== 'restore' && <button id="go" className="btn pri" style={{ width: '100%', marginTop: 14, justifyContent: 'center' }} disabled={busy} onClick={() => run(async () => {
      if (mode === 'login') await s.login(email, pw);
      else if (mode === 'signup') { await s.signup(name, email, pw); }
      else await s.reset(email, rec, pw);
    })}>{busy ? 'Working…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Reset password & log in'}</button>}
    <p className="muted small" style={{ marginTop: 14 }}>No email verification is used because there is no server — your account exists only in this browser.</p>
  </div></div>;
}

export function RecoveryScreen() {
  const s = useStore(); const key = s.recovery!; const [saved, setSaved] = useState(false);
  return <div className="auth"><div className="card">
    <h1><ShieldCheck size={22} style={{ verticalAlign: -4 }} /> Save your recovery key</h1>
    <p>This is the <b>only</b> way to get your data back if you forget your password. Nobody (not even us) can recover it — your notes are encrypted on this device.</p>
    <div className="card" style={{ background: 'var(--priS)', textAlign: 'center', fontSize: '1.25rem', letterSpacing: 1, fontWeight: 700, userSelect: 'all' }} data-testid="reckey">{key}</div>
    <div className="row" style={{ marginTop: 10 }}>
      <button className="btn" onClick={() => navigator.clipboard?.writeText(key)}><Copy size={15} /> Copy</button>
      <button className="btn" onClick={() => download('notenest-recovery-key.txt', new Blob([`NoteNest recovery key for ${s.user?.email}\n\n${key}\n\nKeep this file somewhere safe.`]))}><Download size={15} /> Download</button>
    </div>
    <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--ink)', fontSize: '.9rem', marginTop: 16 }}>
      <input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} /> I have saved my recovery key
    </label>
    <button className="btn pri" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} disabled={!saved} onClick={s.ackRecovery}>Continue to NoteNest</button>
  </div></div>;
}
