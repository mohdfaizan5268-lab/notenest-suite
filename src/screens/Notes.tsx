import { useEffect, useMemo, useRef, useState } from 'react';
import { Star, Archive, Trash2, FolderPlus, Plus, Lock, Unlock, History, Download, Printer, ArrowUp, ArrowDown, RotateCcw, Folder as FIcon, FileText, X, ChevronLeft } from 'lucide-react';
import { useStore } from '../lib/store';
import { Note, Block, Folder } from '../lib/types';
import { uid, download, fmtTs, stripMd } from '../lib/util';
import { renderMd } from '../lib/markdown';
import { lockText, unlockText } from '../lib/crypto';
import { Header, Modal, PromptModal, Confirm, Empty, useToast } from '../components/ui';

type View = 'all' | 'fav' | 'archive' | 'trash';
const blocksText = (b: Block[]) => b.map(x => (x.type === 'todo' ? (x.done ? '[x] ' : '[ ] ') : '') + x.text).join('\n');
const blocksMd = (b: Block[]) => b.map(x => x.type === 'h' ? '## ' + x.text : x.type === 'todo' ? `- [${x.done ? 'x' : ' '}] ${x.text}` : x.type === 'quote' ? '> ' + x.text : x.type === 'code' ? '```\n' + x.text + '\n```' : x.text).join('\n\n');
const noteText = (n: Note) => n.lock ? '' : n.mode === 'blocks' ? blocksMd(n.blocks) : n.body;

export function newNote(over: Partial<Note> = {}): Note {
  const t = Date.now();
  return { id: uid(), title: '', body: '', mode: 'markdown', blocks: [], folderId: null, tags: [], fav: false, archived: false, trashed: false, created: t, updated: t, versions: [], ...over };
}

export default function Notes() {
  const s = useStore(); const toast = useToast();
  const { notes, folders, templates } = s.data;
  const [view, setView] = useState<View>('all');
  const [folder, setFolder] = useState<string | null>(null);
  const [tag, setTag] = useState(''); const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(() => sessionStorage.getItem('nn_open_note'));
  const [tplOpen, setTplOpen] = useState(false); const [folderDlg, setFolderDlg] = useState<{ parent: string | null; edit?: Folder } | null>(null);
  const [delFolder, setDelFolder] = useState<Folder | null>(null);
  useEffect(() => { sessionStorage.removeItem('nn_open_note'); }, []);

  const allTags = useMemo(() => [...new Set(notes.filter(n => !n.trashed).flatMap(n => n.tags))].sort(), [notes]);
  const list = useMemo(() => notes.filter(n => {
    if (view === 'trash') return n.trashed;
    if (n.trashed) return false;
    if (view === 'archive') return n.archived;
    if (n.archived) return false;
    if (view === 'fav' && !n.fav) return false;
    if (folder && n.folderId !== folder) return false;
    if (tag && !n.tags.includes(tag)) return false;
    if (q) { const t = (n.title + ' ' + noteText(n) + ' ' + n.tags.join(' ')).toLowerCase(); if (!t.includes(q.toLowerCase())) return false; }
    return true;
  }).sort((a, b) => b.updated - a.updated), [notes, view, folder, tag, q]);

  const create = (body = '', title = '', mode: Note['mode'] = 'markdown') => {
    const n = newNote({ body, title, mode, folderId: folder, blocks: mode === 'blocks' ? [{ id: uid(), type: 'p', text: '' }] : [] });
    s.update(d => { d.notes.unshift(n); }); setSel(n.id); setView('all'); setTplOpen(false);
  };
  const cur = notes.find(n => n.id === sel) || null;

  const renderFolders = (parent: string | null, depth: number): JSX.Element[] =>
    folders.filter(f => f.parentId === parent).sort((a, b) => a.name.localeCompare(b.name)).flatMap(f => [
      <div key={f.id} className="row" style={{ paddingLeft: depth * 14, gap: 2 }}>
        <button className={'btn sm sp' + (folder === f.id ? ' on' : '')} style={{ justifyContent: 'flex-start' }} onClick={() => { setFolder(folder === f.id ? null : f.id); setView('all'); }}><FIcon size={13} /> {f.name}</button>
        <button className="btn sm ico" aria-label={'Add subfolder in ' + f.name} onClick={() => setFolderDlg({ parent: f.id })}><FolderPlus size={12} /></button>
        <button className="btn sm ico" aria-label={'Rename ' + f.name} onClick={() => setFolderDlg({ parent: f.parentId, edit: f })}>✎</button>
        <button className="btn sm ico bad" aria-label={'Delete folder ' + f.name} onClick={() => setDelFolder(f)}><X size={12} /></button>
      </div>, ...renderFolders(f.id, depth + 1)]);

  return <>
    <Header title="Notes" sub="Markdown or block editor · folders · tags · locks · version history">
      <button className="btn" onClick={() => setTplOpen(true)}>From template</button>
      <button className="btn pri" onClick={() => create()}><Plus size={16} /> New note</button>
    </Header>
    <div className="grid" style={{ gridTemplateColumns: cur ? 'minmax(0,1fr)' : 'minmax(0,240px) minmax(0,1fr)', alignItems: 'start' }}>
      {!cur && <div className="card">
        {([['all', 'All notes', FileText], ['fav', 'Favorites', Star], ['archive', 'Archive', Archive], ['trash', 'Recycle bin', Trash2]] as const).map(([v, l, I]) =>
          <button key={v} className={'nav' + (view === v && !folder ? ' on' : '')} onClick={() => { setView(v); setFolder(null); setTag(''); }}><I size={15} /> {l}</button>)}
        <div className="row" style={{ marginTop: 14 }}><b className="sp small muted">FOLDERS</b><button className="btn sm ico" aria-label="New folder" onClick={() => setFolderDlg({ parent: null })}><FolderPlus size={13} /></button></div>
        {renderFolders(null, 0)}
        {!folders.length && <div className="muted small">No folders yet.</div>}
        {allTags.length > 0 && <><b className="small muted" style={{ display: 'block', marginTop: 14 }}>TAGS</b>
          <div style={{ marginTop: 6 }}>{allTags.map(t => <button key={t} className={'tag'} style={{ border: 0, cursor: 'pointer', outline: tag === t ? '2px solid var(--pri)' : 0 }} onClick={() => setTag(tag === t ? '' : t)}>#{t}</button>)}</div></>}
      </div>}
      <div>
        {!cur ? <>
          <input type="search" placeholder="Search notes (title, text, tags)…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search notes" style={{ marginBottom: 12 }} />
          {view === 'trash' && list.length > 0 && <div className="row" style={{ marginBottom: 10 }}><span className="muted small sp">Items in the bin stay until you delete them.</span><button className="btn sm bad" onClick={() => { s.update(d => { d.notes = d.notes.filter(n => !n.trashed); }); }}>Empty bin</button></div>}
          {list.length === 0 ? <Empty text={view === 'trash' ? 'The recycle bin is empty.' : q ? 'No notes match your search.' : 'No notes here yet. Create your first note!'} /> :
            list.map(n => <div key={n.id} className="item click" onClick={() => setSel(n.id)}>
              <div className="sp" style={{ minWidth: 0 }}>
                <div><b>{n.lock && <Lock size={13} style={{ verticalAlign: -2 }} />} {n.title || 'Untitled'}</b> {n.fav && <Star size={13} fill="var(--pri)" color="var(--pri)" />}</div>
                <div className="muted small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.lock ? 'Locked note' : stripMd(noteText(n)).slice(0, 110) || 'Empty note'}</div>
                <div>{n.tags.map(t => <span key={t} className="tag">#{t}</span>)}<span className="muted small">{fmtTs(n.updated)}</span></div>
              </div>
              {view === 'trash' && <>
                <button className="btn sm" onClick={e => { e.stopPropagation(); s.update(d => { const x = d.notes.find(y => y.id === n.id)!; x.trashed = false; }); }}><RotateCcw size={13} /> Restore</button>
                <button className="btn sm bad" onClick={e => { e.stopPropagation(); s.update(d => { d.notes = d.notes.filter(y => y.id !== n.id); }); }}>Delete forever</button></>}
            </div>)}
        </> : <Editor key={cur.id} note={cur} onBack={() => setSel(null)} />}
      </div>
    </div>
    {tplOpen && <Modal title="Start from a template" onClose={() => setTplOpen(false)}>
      <button className="item click" style={{ width: '100%', textAlign: 'left' }} onClick={() => create('', '', 'markdown')}><b>Blank markdown note</b></button>
      <button className="item click" style={{ width: '100%', textAlign: 'left' }} onClick={() => create('', '', 'blocks')}><b>Blank block-editor note</b></button>
      {templates.map(t => <button key={t.id} className="item click" style={{ width: '100%', textAlign: 'left' }} onClick={() => create(t.body, t.name)}>{t.name}</button>)}
    </Modal>}
    {folderDlg && <PromptModal title={folderDlg.edit ? 'Rename folder' : 'New folder'} label="Folder name" type="text" confirmText="Save" onClose={() => setFolderDlg(null)}
      onSubmit={v => { const name = v.trim(); if (!name) return 'Enter a name.'; s.update(d => { if (folderDlg.edit) d.folders.find(f => f.id === folderDlg.edit!.id)!.name = name; else d.folders.push({ id: uid(), name, parentId: folderDlg.parent }); }); setFolderDlg(null); }} />}
    {delFolder && <Confirm text={`Delete folder "${delFolder.name}"? Its notes and subfolders move up one level — nothing is lost.`} onClose={() => setDelFolder(null)}
      onYes={() => { s.update(d => { d.notes.forEach(n => { if (n.folderId === delFolder.id) n.folderId = delFolder.parentId; }); d.folders.forEach(f => { if (f.parentId === delFolder.id) f.parentId = delFolder.parentId; }); d.folders = d.folders.filter(f => f.id !== delFolder.id); }); if (folder === delFolder.id) setFolder(null); toast('Folder deleted'); }} />}
  </>;
}

function Editor({ note, onBack }: { note: Note; onBack: () => void }) {
  const s = useStore(); const toast = useToast();
  const [pw, setPw] = useState<string | null>(null); // password held in memory while a locked note is open
  const [plain, setPlain] = useState<{ body: string; blocks: Block[]; mode: Note['mode'] } | null>(null);
  const [ask, setAsk] = useState(note.lock ? 'open' : '');
  const [dlg, setDlg] = useState<'' | 'lock' | 'unlockperm' | 'hist'>('');
  const [preview, setPreview] = useState(true); const [tagIn, setTagIn] = useState('');
  const saveT = useRef<number>();

  const locked = !!note.lock;
  const body = locked ? plain?.body ?? '' : note.body;
  const blocks = locked ? plain?.blocks ?? [] : note.blocks;
  const mode = locked ? plain?.mode ?? 'markdown' : note.mode;
  const ready = !locked || plain !== null;

  const patch = (fn: (n: Note) => void) => s.update(d => { const n = d.notes.find(x => x.id === note.id); if (n) { fn(n); n.updated = Date.now(); } });
  const snapshot = (n: Note) => {
    const last = n.versions[0]; const content = noteText(n);
    if (!n.lock && content && (!last || (Date.now() - last.at > 120000 && last.body !== content))) { n.versions.unshift({ at: Date.now(), title: n.title, body: content }); n.versions = n.versions.slice(0, 25); }
  };
  const setContent = (nb: string, nbl: Block[], nm: Note['mode'] = mode) => {
    if (locked) {
      if (!pw) return;
      const p = { body: nb, blocks: nbl, mode: nm }; setPlain(p);
      window.clearTimeout(saveT.current);
      saveT.current = window.setTimeout(async () => { const l = await lockText(pw, JSON.stringify(p)); patch(n => { n.lock = { salt: l.salt, iv: l.iv, data: l.ct }; }); }, 800);
    } else patch(n => { snapshot(n); n.body = nb; n.blocks = nbl; n.mode = nm; });
  };
  const upBlock = (id: string, p: Partial<Block>) => setContent(body, blocks.map(b => b.id === id ? { ...b, ...p } : b));
  const move = (i: number, dlt: number) => { const a = [...blocks]; const j = i + dlt; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setContent(body, a); };
  const addTag = () => { const t = tagIn.trim().replace(/^#/, '').toLowerCase(); if (t && !note.tags.includes(t)) patch(n => { n.tags.push(t); }); setTagIn(''); };
  const md = mode === 'blocks' ? blocksMd(blocks) : body;
  const exportMd = () => download((note.title || 'note') + '.md', new Blob([(note.title ? '# ' + note.title + '\n\n' : '') + md], { type: 'text/markdown' }));
  const printIt = () => { const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print'); return; } w.document.write(`<html><head><title>${note.title || 'Note'}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:30px auto;line-height:1.6}pre{background:#f3f3f3;padding:8px}</style></head><body><h1>${renderMd('# ' + (note.title || 'Untitled')).replace(/<\/?h1[^>]*>/g, '')}</h1>${renderMd(md)}</body></html>`); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); };

  return <div className="card">
    <div className="row" style={{ marginBottom: 10 }}>
      <button className="btn sm" onClick={onBack}><ChevronLeft size={14} /> Notes</button><span className="sp" />
      <button className={'btn sm' + (note.fav ? ' on' : '')} aria-label="Favorite" onClick={() => patch(n => { n.fav = !n.fav; })}><Star size={14} /></button>
      <button className="btn sm" onClick={() => locked ? setDlg('unlockperm') : setDlg('lock')}>{locked ? <><Unlock size={14} /> Remove lock</> : <><Lock size={14} /> Lock</>}</button>
      {!locked && <button className="btn sm" onClick={() => setDlg('hist')}><History size={14} /> History ({note.versions.length})</button>}
      {ready && <><button className="btn sm" onClick={exportMd}><Download size={14} /> .md</button><button className="btn sm" onClick={printIt}><Printer size={14} /> PDF</button></>}
      <button className="btn sm" onClick={() => { patch(n => { n.archived = !n.archived; }); onBack(); }}><Archive size={14} /> {note.archived ? 'Unarchive' : 'Archive'}</button>
      <button className="btn sm bad" onClick={() => { patch(n => { n.trashed = !n.trashed; }); onBack(); toast(note.trashed ? 'Restored' : 'Moved to recycle bin'); }}>{note.trashed ? <><RotateCcw size={14} /> Restore</> : <><Trash2 size={14} /> Delete</>}</button>
    </div>
    <input type="text" placeholder="Title" value={note.title} onChange={e => patch(n => { n.title = e.target.value; })} style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }} aria-label="Note title" />
    <div className="row" style={{ marginBottom: 10 }}>
      <select aria-label="Folder" value={note.folderId || ''} onChange={e => patch(n => { n.folderId = e.target.value || null; })} style={{ width: 'auto' }}>
        <option value="">No folder</option>{s.data.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
      {note.tags.map(t => <span key={t} className="tag">#{t} <button style={{ border: 0, background: 'none', cursor: 'pointer', color: 'inherit' }} aria-label={'Remove tag ' + t} onClick={() => patch(n => { n.tags = n.tags.filter(x => x !== t); })}>×</button></span>)}
      <input type="text" placeholder="+ tag" value={tagIn} onChange={e => setTagIn(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} onBlur={addTag} style={{ width: 100 }} aria-label="Add tag" />
    </div>
    {!ready ? <div className="muted"><Lock size={16} /> This note is locked.<br /><button className="btn pri" style={{ marginTop: 8 }} onClick={() => setAsk('open')}>Enter password</button></div> : <>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className={'btn sm' + (mode === 'markdown' ? ' on' : '')} onClick={() => mode !== 'markdown' && setContent(body || md, blocks, 'markdown')}>Markdown</button>
        <button className={'btn sm' + (mode === 'blocks' ? ' on' : '')} onClick={() => mode !== 'blocks' && setContent(body, blocks.length ? blocks : body.split(/\n{2,}/).filter(Boolean).map(t => ({ id: uid(), type: 'p' as const, text: t })).concat(body ? [] : [{ id: uid(), type: 'p' as const, text: '' }]), 'blocks')}>Blocks</button>
        {mode === 'markdown' && <button className={'btn sm' + (preview ? ' on' : '')} onClick={() => setPreview(!preview)}>Preview</button>}
      </div>
      {mode === 'markdown' ? <div className={preview ? 'editor' : ''}>
        <textarea aria-label="Note body" value={body} onChange={e => setContent(e.target.value, blocks)} placeholder="Write in Markdown… # Heading, **bold**, - [ ] todo, `code`" />
        {preview && <div className="md card" style={{ overflow: 'auto' }} dangerouslySetInnerHTML={{ __html: renderMd(body) }} />}
      </div> : <div>
        {blocks.map((b, i) => <div key={b.id} className="blk">
          <select aria-label="Block type" value={b.type} onChange={e => upBlock(b.id, { type: e.target.value as Block['type'] })} style={{ width: 90 }}>
            <option value="p">Text</option><option value="h">Heading</option><option value="todo">To-do</option><option value="quote">Quote</option><option value="code">Code</option></select>
          {b.type === 'todo' && <input type="checkbox" aria-label="Done" checked={!!b.done} onChange={e => upBlock(b.id, { done: e.target.checked })} style={{ marginTop: 12 }} />}
          <textarea aria-label={'Block ' + (i + 1)} value={b.text} rows={1} onChange={e => upBlock(b.id, { text: e.target.value })} style={{ fontWeight: b.type === 'h' ? 700 : 400, fontFamily: b.type === 'code' ? 'monospace' : undefined, textDecoration: b.done ? 'line-through' : undefined }} />
          <button className="btn sm ico" aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp size={12} /></button>
          <button className="btn sm ico" aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown size={12} /></button>
          <button className="btn sm ico bad" aria-label="Delete block" onClick={() => setContent(body, blocks.filter(x => x.id !== b.id))}><X size={12} /></button>
        </div>)}
        <button className="btn sm" onClick={() => setContent(body, [...blocks, { id: uid(), type: 'p', text: '' }])}><Plus size={13} /> Add block</button>
      </div>}
    </>}
    <div className="muted small" style={{ marginTop: 10 }}>Saved automatically · last edit {fmtTs(note.updated)}</div>

    {ask === 'open' && <PromptModal title="Unlock note" label="Note password" confirmText="Unlock" onClose={() => { setAsk(''); if (!plain) onBack(); }}
      onSubmit={async v => { try { const t = await unlockText(v, { salt: note.lock!.salt, iv: note.lock!.iv, ct: note.lock!.data }); setPlain(JSON.parse(t)); setPw(v); setAsk(''); } catch { return 'Wrong password.'; } }} />}
    {dlg === 'lock' && <PromptModal title="Lock this note" label="Choose a password for this note" confirmText="Lock" hint="Separate from your account password. If you forget it, this note cannot be recovered." onClose={() => setDlg('')}
      onSubmit={async v => { if (v.length < 4) return 'Use at least 4 characters.'; const p = { body: note.body, blocks: note.blocks, mode: note.mode }; const l = await lockText(v, JSON.stringify(p)); patch(n => { n.lock = { salt: l.salt, iv: l.iv, data: l.ct }; n.body = ''; n.blocks = []; n.versions = []; }); setPlain(p); setPw(v); setDlg(''); toast('Note locked'); }} />}
    {dlg === 'unlockperm' && <PromptModal title="Remove lock" label="Note password" confirmText="Remove lock" onClose={() => setDlg('')}
      onSubmit={async v => { try { const t = JSON.parse(await unlockText(v, { salt: note.lock!.salt, iv: note.lock!.iv, ct: note.lock!.data })); patch(n => { n.lock = undefined; n.body = t.body; n.blocks = t.blocks; n.mode = t.mode; }); setPlain(null); setPw(null); setDlg(''); toast('Lock removed'); } catch { return 'Wrong password.'; } }} />}
    {dlg === 'hist' && <Modal title="Version history" onClose={() => setDlg('')}>
      <button className="btn sm" onClick={() => { patch(n => { const c = noteText(n); if (c) { n.versions.unshift({ at: Date.now(), title: n.title, body: c }); n.versions = n.versions.slice(0, 25); } }); toast('Version saved'); }}>Save a version now</button>
      {note.versions.length === 0 && <p className="muted">No versions yet. They are saved automatically as you edit.</p>}
      {note.versions.map(v => <div key={v.at} className="item"><div className="sp"><b>{fmtTs(v.at)}</b><div className="muted small">{stripMd(v.body).slice(0, 90)}</div></div>
        <button className="btn sm" onClick={() => { patch(n => { const c = noteText(n); if (c) n.versions.unshift({ at: Date.now(), title: n.title, body: c }); n.mode = 'markdown'; n.body = v.body; n.title = v.title || n.title; n.versions = n.versions.slice(0, 25); }); setDlg(''); toast('Restored — your previous text was saved as a version'); }}>Restore</button></div>)}
    </Modal>}
  </div>;
}
