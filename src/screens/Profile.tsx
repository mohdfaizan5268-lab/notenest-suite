import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { bytes, fmtTs } from '../lib/util';
import { Header, PromptModal, Confirm, useToast } from '../components/ui';

export default function Profile() {
  const s = useStore(); const toast = useToast();
  const [name, setName] = useState(s.user?.name || ''); const [old, setOld] = useState(''); const [nw, setNw] = useState(''); const [pin, setPin] = useState('');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [use, setUse] = useState<{ used: number; quota: number } | null>(null);
  const [dlg, setDlg] = useState<'' | 'clearpin' | 'delete'>('');
  useEffect(() => { s.storageUsed().then(setUse); }, []); // eslint-disable-line
  const run = async (fn: () => Promise<void>, ok: string) => { setErr(''); setMsg(''); try { await fn(); setMsg(ok); } catch (e) { setErr((e as Error).message); } };
  const d = s.data;
  return <>
    <Header title="Profile & security" sub={s.user?.email} />
    {msg && <div className="okmsg" role="status">{msg}</div>}{err && <div className="err" role="alert">{err}</div>}
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <div className="card"><h3>Your name</h3><input type="text" value={name} onChange={e => setName(e.target.value)} aria-label="Display name" /><button className="btn pri" style={{ marginTop: 10 }} onClick={() => run(() => s.changeName(name), 'Name updated')}>Save name</button></div>
      <div className="card"><h3>Change password</h3><label>Current password</label><input type="password" value={old} onChange={e => setOld(e.target.value)} aria-label="Current password" /><label>New password (min 8)</label><input type="password" value={nw} onChange={e => setNw(e.target.value)} aria-label="New password" />
        <button className="btn pri" style={{ marginTop: 10 }} onClick={() => run(async () => { await s.changePassword(old, nw); setOld(''); setNw(''); }, 'Password changed. Your recovery key still works.')}>Change password</button></div>
      <div className="card"><h3>PIN screen lock</h3><p className="muted small">A quick lock for when you step away. (Your data is protected by your password; the PIN only hides the screen. Biometrics aren't available in a web app like this.)</p>
        {s.hasPin ? <div className="row"><span className="sp">PIN is <b>on</b></span><button className="btn" onClick={s.lockNow}>Lock now</button><button className="btn bad" onClick={() => setDlg('clearpin')}>Remove PIN</button></div> :
          <div className="row"><input type="password" inputMode="numeric" placeholder="4–8 digits" aria-label="New PIN" value={pin} onChange={e => setPin(e.target.value)} style={{ flex: 1, width: 'auto' }} /><button className="btn pri" onClick={() => run(async () => { await s.setPin(pin); setPin(''); }, 'PIN set')}>Set PIN</button></div>}</div>
      <div className="card"><h3>Your data on this device</h3>
        <p className="small">{d.notes.length} notes · {d.journals.length} journal entries · {d.habits.length} habits · {d.tasks.length} tasks · {d.events.length} events · {d.vault.length} vault files</p>
        {use && <p className="small muted">Browser storage used: {bytes(use.used)} of about {bytes(use.quota)} available.</p>}
        <div className="row"><button className="btn" onClick={() => run(() => s.exportBackup(), 'Encrypted backup downloaded. Keep it safe — it needs your password to open.')}>Download encrypted backup</button></div>
        <p className="muted small" style={{ marginBottom: 0 }}>Data lives only in this browser. Clearing site data or switching browsers loses it — back up regularly.</p></div>
      <div className="card"><h3>Sessions</h3><p className="small">You are signed in on this browser only. Sessions end when the tab closes or after {d.settings.autoLogout ? d.settings.autoLogout + ' idle minutes' : 'you log out (auto-logout is off)'}.</p><button className="btn" onClick={s.logout}>Log out</button></div>
      <div className="card"><h3 style={{ color: 'var(--bad)' }}>Delete account</h3><p className="small muted">Permanently erases everything from this browser.</p><button className="btn bad" onClick={() => setDlg('delete')}>Delete my account…</button></div>
    </div>
    {dlg === 'clearpin' && <PromptModal title="Remove PIN" label="Account password" confirmText="Remove" onClose={() => setDlg('')} onSubmit={async v => { await s.clearPin(v); setDlg(''); toast('PIN removed'); }} />}
    {dlg === 'delete' && <PromptModal title="Delete account" label="Type your password to confirm" confirmText="Delete everything" onClose={() => setDlg('')} onSubmit={async v => { await s.deleteAccount(v); }} hint="This cannot be undone." />}
    <span hidden>{fmtTs(0)}<Confirm text="" onYes={() => {}} onClose={() => {}} /></span>
  </>;
}
