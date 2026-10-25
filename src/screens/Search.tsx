import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { stripMd, fmtDate } from '../lib/util';
import { Header, Empty } from '../components/ui';

export default function SearchScreen({ go }: { go: (r: string) => void }) {
  const s = useStore(); const d = s.data; const [q, setQ] = useState('');
  const r = useMemo(() => {
    const k = q.trim().toLowerCase(); if (!k) return [];
    const has = (...t: string[]) => t.join(' ').toLowerCase().includes(k);
    const out: { kind: string; title: string; sub: string; route: string; note?: string }[] = [];
    d.notes.filter(n => !n.trashed).forEach(n => { if (has(n.title, n.lock ? '' : n.mode === 'blocks' ? n.blocks.map(b => b.text).join(' ') : n.body, n.tags.join(' '))) out.push({ kind: 'Note', title: n.title || 'Untitled', sub: n.lock ? '🔒 locked (title only is searchable)' : stripMd(n.body || n.blocks.map(b => b.text).join(' ')).slice(0, 100), route: 'notes', note: n.id }); });
    d.journals.forEach(j => { if (has(j.text, j.date, j.prompt)) out.push({ kind: 'Journal', title: fmtDate(j.date), sub: j.text.slice(0, 100), route: 'journal' }); });
    d.tasks.forEach(t => { if (has(t.title, t.checklist.map(c => c.text).join(' '))) out.push({ kind: 'Task', title: t.title, sub: t.due ? 'Due ' + t.due : '', route: 'tasks' }); });
    d.habits.forEach(h => { if (has(h.name)) out.push({ kind: 'Habit', title: h.name, sub: h.freq, route: 'habits' }); });
    d.events.forEach(e => { if (has(e.title, e.notes)) out.push({ kind: 'Event', title: e.title, sub: e.date, route: 'calendar' }); });
    d.drawings.forEach(x => { if (has(x.title)) out.push({ kind: 'Drawing', title: x.title, sub: '', route: 'draw' }); });
    d.vault.filter(v => !v.hidden).forEach(v => { if (has(v.name)) out.push({ kind: 'Vault file', title: v.name, sub: 'unlock the vault to open', route: 'vault' }); });
    return out;
  }, [q, d]);
  return <>
    <Header title="Search" sub="Across notes, journal, tasks, habits, events, drawings and vault file names" />
    <input type="search" autoFocus placeholder="Type to search everything…" aria-label="Search everything" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 14 }} />
    {!q.trim() ? <Empty text="Start typing to search." /> : r.length === 0 ? <Empty text="No results." /> : r.map((x, i) => <div key={i} className="item click" onClick={() => { if (x.note) sessionStorage.setItem('nn_open_note', x.note); go(x.route); }}><span className="tag">{x.kind}</span><div className="sp" style={{ minWidth: 0 }}><b>{x.title}</b><div className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.sub}</div></div></div>)}
  </>;
}
