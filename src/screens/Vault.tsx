import { useRef, useState } from 'react';
import { Lock, Upload, Download, Trash2, Eye, EyeOff, File as FileIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { uid, bytes, download, fmtTs } from '../lib/util';
import { VaultItem } from '../lib/types';
import { Header, Modal, PromptModal, Confirm, Empty, useToast } from '../components/ui';
import { useBlobUrl } from '../components/Media';

// The vault key lives only in memory while the vault is open.
export default function Vault() {
  const s = useStore(); const toast = useToast();
  const [key, setKey] = useState<CryptoKey | null>(null); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [err, setErr] = useState('');
  const has = s.hasVault;
  const [showHidden, setShowHidden] = useState(false); const [askHidden, setAskHidden] = useState(false);
  const [view, setView] = useState<VaultItem | null>(null); const [del, setDel] = useState<VaultItem | null>(null); const [busy, setBusy] = useState(false);
  const fi = useRef<HTMLInputElement>(null);

  if (!key) return <>
    <Header title="Media Vault" sub="Encrypted storage for photos, videos, audio and documents" />
    <div className="card" style={{ maxWidth: 420 }}>
      <Lock size={28} color="var(--pri)" />
      <h2>{has ? 'Unlock your vault' : 'Create your vault password'}</h2>
      {!has && <p className="muted small">This password is separate from your login. Files are encrypted with it, so if you forget it they cannot be recovered.</p>}
      <label>Vault password</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus aria-label="Vault password" onKeyDown={e => e.key === 'Enter' && (document.getElementById('vgo') as HTMLButtonElement)?.click()} />
      {!has && <><label>Repeat password</label><input type="password" value={pw2} onChange={e => setPw2(e.target.value)} aria-label="Repeat vault password" /></>}
      {err && <div className="err">{err}</div>}
      <button id="vgo" className="btn pri" style={{ marginTop: 12 }} onClick={async () => {
        setErr('');
        try {
          if (has) { const k = await s.vaultOpen(pw); if (!k) { setErr('Wrong vault password.'); return; } setKey(k); }
          else { if (pw !== pw2) { setErr('Passwords do not match.'); return; } setKey(await s.vaultSetup(pw)); }
          setPw(''); setPw2('');
        } catch (e) { setErr((e as Error).message); }
      }}>{has ? 'Unlock' : 'Create vault'}</button>
    </div></>;

  const items = s.data.vault.filter(v => showHidden || !v.hidden).sort((a, b) => b.added - a.added);
  const add = async (files: FileList | null) => {
    if (!files) return; setBusy(true);
    try { for (const f of Array.from(files)) { const id = uid(); await s.putBlob(id, new Uint8Array(await f.arrayBuffer()), key); s.update(d => { d.vault.push({ id, name: f.name, mime: f.type || 'application/octet-stream', size: f.size, hidden: false, added: Date.now() }); }); } toast('Encrypted & stored'); }
    catch { toast('Could not store that file (is the disk full?)'); }
    setBusy(false);
  };
  const dl = async (v: VaultItem) => { try { download(v.name, new Blob([await s.getBlob(v.id, key) as BlobPart], { type: v.mime })); } catch { toast('Could not decrypt that file'); } };
  return <>
    <Header title="Media Vault" sub={`${s.data.vault.length} file(s) · AES-256-GCM encrypted`}>
      <button className="btn" onClick={() => showHidden ? setShowHidden(false) : setAskHidden(true)}>{showHidden ? <><EyeOff size={15} /> Hide hidden</> : <><Eye size={15} /> Show hidden</>}</button>
      <button className="btn pri" disabled={busy} onClick={() => fi.current?.click()}><Upload size={15} /> {busy ? 'Encrypting…' : 'Add files'}</button>
      <button className="btn" onClick={() => setKey(null)}><Lock size={15} /> Lock vault</button>
      <input ref={fi} type="file" multiple hidden onChange={e => { add(e.target.files); e.target.value = ''; }} /></Header>
    {items.length === 0 ? <Empty text="The vault is empty. Add photos, videos, audio or documents." /> : <div className="grid g4">
      {items.map(v => <div key={v.id} className="card"><div className="row"><FileIcon size={16} /><b className="sp" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.name}>{v.name}</b></div>
        <div className="muted small">{bytes(v.size)} · {fmtTs(v.added)}{v.hidden && ' · hidden'}</div>
        <div className="row" style={{ marginTop: 8 }}>
          {/^(image|video|audio)\//.test(v.mime) && <button className="btn sm" onClick={() => setView(v)}>Open</button>}
          <button className="btn sm ico" aria-label="Download" onClick={() => dl(v)}><Download size={14} /></button>
          <button className="btn sm ico" aria-label={v.hidden ? 'Unhide' : 'Hide'} onClick={() => s.update(d => { const x = d.vault.find(y => y.id === v.id)!; x.hidden = !x.hidden; })}>{v.hidden ? <Eye size={14} /> : <EyeOff size={14} />}</button>
          <button className="btn sm ico bad" aria-label="Delete" onClick={() => setDel(v)}><Trash2 size={14} /></button></div></div>)}
    </div>}
    {askHidden && <PromptModal title="Show hidden files" label="Vault password" confirmText="Show" onClose={() => setAskHidden(false)} onSubmit={async v => { if (!(await s.vaultOpen(v))) return 'Wrong vault password.'; setShowHidden(true); setAskHidden(false); }} />}
    {view && <Viewer v={view} k={key} onClose={() => setView(null)} />}
    {del && <Confirm text={`Permanently delete "${del.name}"?`} onClose={() => setDel(null)} onYes={() => { s.delBlob(del.id); s.update(d => { d.vault = d.vault.filter(x => x.id !== del.id); }); }} />}
  </>;
}
function Viewer({ v, k, onClose }: { v: VaultItem; k: CryptoKey; onClose: () => void }) {
  const { url, err } = useBlobUrl(v.id, v.mime, k);
  return <Modal title={v.name} onClose={onClose}>{err ? <div className="err">{err}</div> : !url ? <p>Decrypting…</p> : v.mime.startsWith('image') ? <img src={url} alt={v.name} style={{ maxWidth: '100%' }} /> : v.mime.startsWith('video') ? <video src={url} controls style={{ maxWidth: '100%' }} /> : <audio src={url} controls style={{ width: '100%' }} />}</Modal>;
}
