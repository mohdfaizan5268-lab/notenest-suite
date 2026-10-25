import { useState } from 'react';
import { FileText, Repeat, CheckSquare, CalendarDays, Timer, BookHeart, Plus } from 'lucide-react';
import { useStore } from '../lib/store';
import { today, fmtDate, uid, stripMd } from '../lib/util';
import { eventsOn } from '../lib/cal';
import { habitStats } from '../lib/habits';
import { newNote } from './Notes';
import { Header, Empty } from '../components/ui';

export function scoreOf(d: ReturnType<typeof useStore>['data']) {
  const t = today(); const parts: { label: string; v: number }[] = [];
  const dh = d.habits.filter(h => !h.archived && h.freq === 'daily');
  const all = d.habits.filter(h => !h.archived);
  if (all.length) parts.push({ label: 'Habits', v: all.filter(h => habitStats(h).doneNow).length / all.length });
  const due = d.tasks.filter(x => x.due && x.due <= t);
  if (due.length) parts.push({ label: 'Tasks', v: due.filter(x => x.done).length / due.length });
  const mins = d.pomos.filter(p => p.kind === 'work' && new Date(p.start).toLocaleDateString('en-CA') === t).reduce((a, p) => a + p.mins, 0);
  parts.push({ label: 'Focus (50 min goal)', v: Math.min(1, mins / 50) });
  parts.push({ label: 'Journal', v: d.journals.some(j => j.date === t && j.text.trim()) ? 1 : 0 });
  void dh;
  return { score: Math.round(parts.reduce((a, p) => a + p.v, 0) / parts.length * 100), parts, mins };
}

export default function Dashboard({ go }: { go: (r: string) => void }) {
  const s = useStore(); const d = s.data; const t = today();
  const [quick, setQuick] = useState('');
  const hr = new Date().getHours(); const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const sc = scoreOf(d);
  const dueTasks = d.tasks.filter(x => !x.done && x.due && x.due <= t);
  const evs = eventsOn(d.events, t);
  const notes = d.notes.filter(n => !n.trashed && !n.archived).sort((a, b) => b.updated - a.updated).slice(0, 4);
  const jr = [...d.journals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const hs = d.habits.filter(h => !h.archived);
  const openNote = (id: string) => { sessionStorage.setItem('nn_open_note', id); go('notes'); };
  const qnote = () => { const n = newNote(); s.update(x => { x.notes.unshift(n); }); openNote(n.id); };
  const qtask = () => { if (!quick.trim()) return; s.update(x => { x.tasks.push({ id: uid(), title: quick.trim(), priority: 'med', due: t, done: false, recur: 'none', checklist: [], goalId: null, created: Date.now() }); }); setQuick(''); };
  const mood = ['😞', '😕', '😐', '🙂', '😄'];
  return <>
    <Header title={`${greet}, ${s.user?.name}`} sub={fmtDate(t)} />
    <div className="card" style={{ marginBottom: 14 }}>
      <b>Quick create</b>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn" onClick={qnote}><FileText size={15} /> Note</button>
        <button className="btn" onClick={() => go('journal')}><BookHeart size={15} /> Journal today</button>
        <button className="btn" onClick={() => go('calendar')}><CalendarDays size={15} /> Event</button>
        <input type="text" placeholder="Quick task for today… (Enter)" aria-label="Quick task" value={quick} onChange={e => setQuick(e.target.value)} onKeyDown={e => e.key === 'Enter' && qtask()} style={{ flex: '1 1 220px', width: 'auto' }} />
        <button className="btn pri" onClick={qtask} disabled={!quick.trim()}><Plus size={15} /> Add task</button></div></div>
    <div className="grid g4" style={{ marginBottom: 14 }}>
      <div className="card" title="Average of: habits done, tasks done (due today or overdue), focus minutes vs 50, journal written"><div className="muted small">Productivity score</div><div className="stat" data-testid="score">{sc.score}%</div><div className="bar"><i style={{ width: sc.score + '%' }} /></div></div>
      <div className="card"><div className="muted small"><Timer size={13} /> Focus today</div><div className="stat">{sc.mins}<span className="small muted"> min</span></div></div>
      <div className="card"><div className="muted small"><CheckSquare size={13} /> Tasks due / overdue</div><div className="stat">{dueTasks.length}</div></div>
      <div className="card"><div className="muted small"><CalendarDays size={13} /> Events today</div><div className="stat">{evs.length}</div></div>
    </div>
    <div className="grid g2">
      <div className="card"><h3><Repeat size={15} /> Habits</h3>{hs.length === 0 ? <p className="muted">No habits yet.</p> : hs.slice(0, 6).map(h => { const st = habitStats(h); return <div key={h.id} className="row" style={{ marginBottom: 4 }}><span>{st.doneNow ? '✅' : '⬜'}</span><span className="sp">{h.name}</span><span className="muted small">🔥 {st.current}</span></div>; })}<button className="btn sm" onClick={() => go('habits')}>Open habits</button></div>
      <div className="card"><h3><CheckSquare size={15} /> Tasks due</h3>{dueTasks.length === 0 ? <p className="muted">Nothing due. 🎉</p> : dueTasks.slice(0, 6).map(x => <div key={x.id} className="row" style={{ marginBottom: 4 }}><input type="checkbox" aria-label={'Complete ' + x.title} onChange={() => s.update(y => { y.tasks.find(z => z.id === x.id)!.done = true; })} /><span className="sp">{x.title}</span><span className="muted small">{x.due < t ? 'overdue' : 'today'}</span></div>)}<button className="btn sm" onClick={() => go('tasks')}>Open tasks</button></div>
      <div className="card"><h3><CalendarDays size={15} /> Today's events</h3>{evs.length === 0 ? <p className="muted">No events today.</p> : evs.map(e => <div key={e.id} className="row"><b>{e.time || 'All day'}</b><span>{e.title}</span></div>)}<button className="btn sm" style={{ marginTop: 8 }} onClick={() => go('calendar')}>Open calendar</button></div>
      <div className="card"><h3><FileText size={15} /> Recent notes</h3>{notes.length === 0 ? <p className="muted">No notes yet.</p> : notes.map(n => <div key={n.id} className="item click" onClick={() => openNote(n.id)}><div className="sp" style={{ minWidth: 0 }}><b>{n.title || 'Untitled'}</b><div className="muted small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.lock ? '🔒 locked' : stripMd(n.mode === 'blocks' ? n.blocks.map(b => b.text).join(' ') : n.body).slice(0, 80)}</div></div></div>)}</div>
      <div className="card"><h3><BookHeart size={15} /> Recent journal</h3>{jr.length === 0 ? <p className="muted">No entries yet.</p> : jr.map(j => <div key={j.id} className="row" style={{ marginBottom: 4 }}><span style={{ fontSize: '1.2rem' }}>{mood[j.mood - 1]}</span><span className="sp small">{fmtDate(j.date)}</span></div>)}<button className="btn sm" onClick={() => go('journal')}>Open journal</button></div>
      <div className="card"><h3>Score breakdown</h3>{sc.parts.map(p => <div key={p.label} style={{ marginBottom: 6 }}><div className="small row"><span className="sp">{p.label}</span>{Math.round(p.v * 100)}%</div><div className="bar"><i style={{ width: p.v * 100 + '%' }} /></div></div>)}{!d.notes.length && !hs.length && <Empty text="Add a habit or task to get started" />}</div>
    </div>
  </>;
}
