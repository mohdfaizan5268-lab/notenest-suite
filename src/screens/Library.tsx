import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search as SearchI, Download, Trash2, FileText, LogOut, Copy, RefreshCw, ChevronLeft, Paperclip } from 'lucide-react';
import * as cloud from '../lib/cloud';
import { SharedNote } from '../lib/cloud';
import { useStore } from '../lib/store';
import { renderMd } from '../lib/markdown';
import { newNote } from './Notes';
import { bytes, fmtTs } from '../lib/util';
import { Header, Modal, Confirm, Empty, useToast } from '../components/ui';

export function useCloudUser() {
  const [u, setU] = useState(cloud.cloudUser()); useEffect(() => cloud.onCloudChange(() => setU(cloud.cloudUser())), []); return u;
}

export function CloudAuth({ onDone, onClose }: { onDone?: () => void; onClose: () => void }) {
  const s = useStore();
  const [mode, setMode] = useState<'in' | 'up'>('in'); const [name, setName] = useState(s.user?.name || ''); const [email, setEmail] = useState(s.user?.email || ''); const [pw, setPw] = useState('');
  const [err, setErr] = useState(''); const [info, setInfo] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'in') { await cloud.signIn(email, pw); onDone?.(); onClose(); }
      else {
        if (!name.trim()) throw new Error('Enter your name — classmates will see it on notes you share.');
        if (pw.length < 6) throw new Error('Password must be at least 6 characters.');
        const r = await cloud.signUp(name, email, pw);
        if (r === 'ok') { onDone?.(); onClose(); } else setInfo('Account created. Check your email to confirm it, then come back and Sign in.');
      }
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return <Modal title="Class library account" onClose={onClose}>
    <p className="muted small">Browsing is open to everyone. You only need this account to <b>share</b> notes. It is separate from your private NoteNest login.</p>
    <div className="tabs"><button className={'btn sm' + (mode === 'in' ? ' on' : '')} onClick={() => setMode('in')}>Sign in</button><button className={'btn sm' + (mode === 'up' ? ' on' : '')} onClick={() => setMode('up')}>Create account</button></div>
    {mode === 'up' && <><label>Your name (shown to classmates)</label><input type="text" value={name} onChange={e => setName(e.target.value)} aria-label="Library name" /></>}
    <label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} aria-label="Library email" />
    <label>Password</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} aria-label="Library password" onKeyDown={e => e.key === 'Enter' && go()} />
    {err && <div className="err" role="alert">{err}</div>}{info && <div className="okmsg">{info}</div>}
    <button className="btn pri" style={{ marginTop: 12 }} disabled={busy || !email || !pw} onClick={go}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
  </Modal>;
}

export function ShareModal({ initial, onClose, onDone }: { initial?: { title: string; body: string; tags?: string[] }; onClose: () => void; onDone: (n: SharedNote) => void }) {
  const user = useCloudUser(); const [auth, setAuth] = useState(false);
  const [name, setName] = useState(user?.name || ''); const [title, setTitle] = useState(initial?.title || ''); const [body, setBody] = useState(initial?.body || '');
  const [file, setFile] = useState<File | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (user && !name) setName(user.name); }, [user]); // eslint-disable-line
  const pick = (f: File | undefined) => {
    setErr(''); if (!f) return setFile(null);
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    if (!cloud.ALLOWED_EXT.includes(ext)) { setErr(`This file type is not allowed. Allowed: ${cloud.ALLOWED_EXT.join(', ')}`); return; }
    if (f.size > cloud.MAX_FILE) { setErr('File is too large (max 10 MB).'); return; }
    setFile(f);
  };
  const submit = async () => {
    setErr('');
    if (!user) { setAuth(true); return; }
    if (!name.trim()) return setErr('Enter your name.');
    if (!title.trim()) return setErr('Enter a title.');
    if (!body.trim() && !file) return setErr('Write some notes or attach a file.');
    setBusy(true);
    try {
      const path = file ? await cloud.uploadFile(file) : null;
      const n = await cloud.createNote({ author_name: name.trim().slice(0, 60), title: title.trim(), subject: 'General', semester: null, description: '', body: body.trim(),
        tags: (initial?.tags || []).slice(0, 8), file_path: path, file_name: file?.name || null, file_type: file?.type || null, file_size: file?.size || null });
      onDone(n);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return <Modal title="Upload notes" onClose={onClose}>
    <p className="muted small">Everything you share here is <b>public</b> — all classmates (and anyone with the site link) can read it. Don't share private information.</p>
    {user ? <div className="small row">Signed in as <b>{user.email}</b> <button className="btn sm" onClick={() => cloud.signOut()}><LogOut size={12} /> Switch</button></div> : <div className="okmsg">You need to sign in to upload. <button className="btn sm pri" onClick={() => setAuth(true)}>Sign in / Create account</button></div>}
    <label>Your name</label><input type="text" value={name} onChange={e => setName(e.target.value)} aria-label="Share name" maxLength={60} />
    <label>Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} aria-label="Share title" maxLength={200} placeholder="e.g. DBMS – Unit 2 Normalization" />
    <label>Notes (Markdown works)</label><textarea value={body} onChange={e => setBody(e.target.value)} style={{ minHeight: 140 }} aria-label="Share body" />
    <label>Attach a file (PDF, image, Word, PowerPoint, Excel, text — max 10 MB)</label><input type="file" aria-label="Share file" onChange={e => pick(e.target.files?.[0])} />
    <p className="muted small" style={{ marginBottom: 0 }}>🕒 The upload date and time are saved automatically.</p>
    {err && <div className="err" role="alert">{err}</div>}
    <div className="row" style={{ marginTop: 14 }}><span className="sp" /><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={busy} onClick={submit}>{busy ? 'Sharing…' : 'Upload notes'}</button></div>
    {auth && <CloudAuth onClose={() => setAuth(false)} />}
  </Modal>;
}

export default function Library({ guest = false }: { guest?: boolean }) {
  const s = useStore(); const toast = useToast(); const user = useCloudUser();
  const [list, setList] = useState<SharedNote[] | null>(null); const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<SharedNote | null>(null); const [share, setShare] = useState(false); const [auth, setAuth] = useState(false); const [del, setDel] = useState<SharedNote | null>(null);
  const load = useCallback(() => { setErr(''); setList(null); cloud.listNotes().then(setList).catch(e => { setErr(e.message); setList([]); }); }, []);
  useEffect(() => { if (cloud.cloudConfigured) load(); }, [load]);
  const shown = useMemo(() => (list || []).filter(n => !q || (n.title + ' ' + n.author_name).toLowerCase().includes(q.toLowerCase())), [list, q]);
  const view = async (n: SharedNote) => { setOpen(n); try { setOpen(await cloud.getNote(n.id)); } catch (e) { toast((e as Error).message); setOpen(null); } };

  if (!cloud.cloudConfigured) return <><Header title="Class Library" />
    <div className="card"><h3>Class Notes: not connected yet</h3><p>The shared library needs the free online database. The site owner must add two settings on Render (<code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>) and run the setup SQL. See the README, "Turn on class sharing".</p></div></>;

  if (open) return <>
    <div className="row" style={{ marginBottom: 12 }}><button className="btn sm" onClick={() => setOpen(null)}><ChevronLeft size={14} /> Class Notes</button></div>
    <div className="card">
      <div className="row"><h1 className="sp">{open.title}</h1></div>
      <div className="muted small" style={{ margin: '6px 0 12px' }}>👤 Uploaded by <b>{open.author_name}</b> · 🕒 {fmtTs(new Date(open.created_at).getTime())}</div>
      {open.file_path && <div className="card" style={{ background: 'var(--priS)', marginBottom: 12 }}>
        <div className="row"><Paperclip size={16} /><b className="sp">{open.file_name}</b><span className="muted small">{open.file_size ? bytes(open.file_size) : ''}</span>
          <a className="btn sm" href={cloud.fileUrl(open.file_path)} target="_blank" rel="noopener noreferrer" download={open.file_name || undefined}><Download size={14} /> Open / download</a></div>
        {open.file_type?.startsWith('image/') && <img src={cloud.fileUrl(open.file_path)} alt={open.title} style={{ maxWidth: '100%', marginTop: 10, borderRadius: 8 }} />}
      </div>}
      {open.body ? <div className="md" dangerouslySetInnerHTML={{ __html: renderMd(open.body) }} /> : !open.file_path && <p className="muted">No text.</p>}
      <div className="row" style={{ marginTop: 16 }}>
        {open.body && <button className="btn" onClick={() => { if (s.status !== 'in') { toast('Log in to NoteNest to save a copy'); return; } const n = newNote({ title: open.title, body: open.body || '', tags: [...open.tags] }); s.update(d => { d.notes.unshift(n); }); toast('Saved a copy to your private Notes'); }}><Copy size={14} /> Save a copy to my notes</button>}
        {user && user.id === open.user_id && <button className="btn bad" onClick={() => setDel(open)}><Trash2 size={14} /> Delete my upload</button>}
      </div>
    </div>
    {del && <Confirm text={`Remove "${del.title}" for everyone?`} onClose={() => setDel(null)} onYes={async () => { try { await cloud.deleteNote(del); toast('Removed'); setOpen(null); load(); } catch (e) { toast((e as Error).message); } }} />}
  </>;

  return <>
    <Header title="Class Notes" sub="Notes uploaded by your classmates — open to everyone">
      <button className="btn" onClick={load} aria-label="Refresh"><RefreshCw size={15} /></button>
      {user ? <button className="btn" onClick={() => cloud.signOut()} title={user.email}><LogOut size={15} /> {user.name}</button> : <button className="btn" onClick={() => setAuth(true)}>Sign in</button>}
      <button className="btn pri" onClick={() => setShare(true)}><Plus size={16} /> Upload notes</button></Header>
    {guest && <div className="okmsg">You're browsing as a guest. Log in to NoteNest (back on the login page) to also use private notes, journal, habits and more.</div>}
    <div className="row" style={{ marginBottom: 12 }}>
      <div style={{ position: 'relative', flex: '1 1 220px' }}><SearchI size={15} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--muted)' }} /><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by title or name…" aria-label="Search class library" style={{ paddingLeft: 32 }} /></div>
    </div>
    {err && <div className="err" role="alert">{err}</div>}
    {list === null ? <p className="muted">Loading notes…</p> : shown.length === 0 ? <Empty text={list.length ? 'No notes match your search.' : 'No notes uploaded yet. Be the first — click "Upload notes"!'} /> :
      <div className="grid g2">{shown.map(n => <div key={n.id} className="card item click" style={{ display: 'block' }} onClick={() => view(n)}>
        <div className="row"><FileText size={16} /><b className="sp">{n.title}</b>{n.file_path && <Paperclip size={14} />}</div>
        <div className="muted small" style={{ marginTop: 6 }}>👤 {n.author_name}</div><div className="muted small">🕒 {fmtTs(new Date(n.created_at).getTime())}</div></div>)}</div>}
    {share && <ShareModal onClose={() => setShare(false)} onDone={n => { setShare(false); toast('Uploaded! 🎉'); load(); view(n); }} />}
    {auth && <CloudAuth onClose={() => setAuth(false)} />}
  </>;
}
