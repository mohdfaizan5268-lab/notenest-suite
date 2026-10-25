import { useState } from 'react';
import { Plus, Flame, Trash2, Archive, AlertTriangle } from 'lucide-react';
import { useStore } from '../lib/store';
import { Habit } from '../lib/types';
import { uid, today, addDays } from '../lib/util';
import { habitStats, missedIndicator } from '../lib/habits';
import { Header, Modal, Empty, Confirm, useToast } from '../components/ui';

export default function Habits() {
  const s = useStore(); const toast = useToast();
  const [dlg, setDlg] = useState(false); const [del, setDel] = useState<Habit | null>(null);
  const [name, setName] = useState(''); const [freq, setFreq] = useState<Habit['freq']>('daily'); const [target, setTarget] = useState(3); const [remind, setRemind] = useState('');
  const habits = s.data.habits.filter(h => !h.archived);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));
  const toggle = (id: string, d: string) => s.update(x => { const h = x.habits.find(y => y.id === id)!; h.done = h.done.includes(d) ? h.done.filter(z => z !== d) : [...h.done, d]; });
  const add = () => {
    if (!name.trim()) return;
    s.update(d => { d.habits.push({ id: uid(), name: name.trim(), freq, target: freq === 'daily' ? 1 : Math.max(1, target), done: [], remind, created: Date.now() }); });
    setName(''); setRemind(''); setDlg(false); toast('Habit added');
  };
  const stats = habits.map(h => ({ h, st: habitStats(h) }));
  const avg = stats.length ? Math.round(stats.reduce((a, x) => a + x.st.rate30, 0) / stats.length * 100) : 0;
  return <>
    <Header title="Habits" sub="Daily, weekly or monthly goals with streaks and analytics"><button className="btn pri" onClick={() => setDlg(true)}><Plus size={16} /> New habit</button></Header>
    {habits.length > 0 && <div className="grid g4" style={{ marginBottom: 14 }}>
      <div className="card"><div className="muted small">Habits</div><div className="stat">{habits.length}</div></div>
      <div className="card"><div className="muted small">Done in current period</div><div className="stat">{stats.filter(x => x.st.doneNow).length}/{habits.length}</div></div>
      <div className="card"><div className="muted small">Best current streak</div><div className="stat">{Math.max(0, ...stats.map(x => x.st.current))}</div></div>
      <div className="card"><div className="muted small">30-day consistency</div><div className="stat">{avg}%</div></div></div>}
    {habits.length === 0 ? <Empty text="No habits yet. Add one — like “Read 10 pages” or “Walk”." /> : stats.map(({ h, st }) => <div key={h.id} className="card" style={{ marginBottom: 12 }}>
      <div className="row">
        <div className="sp"><b>{h.name}</b> <span className="tag">{h.freq}{h.freq !== 'daily' ? ` · ${h.target}×` : ''}</span>{h.remind && <span className="muted small">⏰ {h.remind}</span>}
          {missedIndicator(h) && <span className="small" style={{ color: 'var(--warn)' }}> <AlertTriangle size={12} style={{ verticalAlign: -1 }} /> missed yesterday</span>}</div>
        <span title="Current streak" className="row" style={{ gap: 3 }}><Flame size={16} color="var(--warn)" /><b>{st.current}</b></span>
        <span className="muted small">best {st.longest}</span>
        <button className={'btn sm' + (h.done.includes(today()) ? ' pri' : '')} onClick={() => toggle(h.id, today())}>{h.done.includes(today()) ? '✓ Done today' : 'Mark done today'}</button>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        {days.map(d => <button key={d} className="btn sm" aria-label={`${h.name} ${d}`} aria-pressed={h.done.includes(d)} onClick={() => toggle(h.id, d)} style={{ flexDirection: 'column', gap: 2, minWidth: 40 }}>
          <span className="small muted">{new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'short' })}</span><span className={'dot' + (h.done.includes(d) ? ' on' : '')} /></button>)}
        <span className="sp" />
        <div style={{ minWidth: 140 }}><div className="small muted">30 days: {Math.round(st.rate30 * 100)}% · total {st.total}</div><div className="bar"><i style={{ width: Math.round(st.rate30 * 100) + '%' }} /></div></div>
        <button className="btn sm ico" aria-label="Archive habit" onClick={() => s.update(d => { d.habits.find(x => x.id === h.id)!.archived = true; })}><Archive size={14} /></button>
        <button className="btn sm ico bad" aria-label="Delete habit" onClick={() => setDel(h)}><Trash2 size={14} /></button>
      </div>
      {h.freq !== 'daily' && <div className="muted small" style={{ marginTop: 6 }}>This {h.freq === 'weekly' ? 'week' : 'month'}: {st.countNow}/{h.target}</div>}
    </div>)}
    {s.data.habits.some(h => h.archived) && <p className="muted small">{s.data.habits.filter(h => h.archived).length} archived habit(s). <button className="btn sm" onClick={() => s.update(d => { d.habits.forEach(h => { h.archived = false; }); })}>Restore all</button></p>}
    {dlg && <Modal title="New habit" onClose={() => setDlg(false)}>
      <label>Habit name</label><input type="text" autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
      <label>How often?</label><select value={freq} onChange={e => setFreq(e.target.value as Habit['freq'])}><option value="daily">Daily</option><option value="weekly">Weekly (X times per week)</option><option value="monthly">Monthly (X times per month)</option></select>
      {freq !== 'daily' && <><label>Times per {freq === 'weekly' ? 'week' : 'month'}</label><input type="number" min={1} max={31} value={target} onChange={e => setTarget(+e.target.value)} /></>}
      <label>Reminder time (optional)</label><input type="time" value={remind} onChange={e => setRemind(e.target.value)} />
      <div className="row" style={{ marginTop: 14 }}><span className="sp" /><button className="btn" onClick={() => setDlg(false)}>Cancel</button><button className="btn pri" disabled={!name.trim()} onClick={add}>Add habit</button></div>
    </Modal>}
    {del && <Confirm text={`Delete "${del.name}" and its history?`} onClose={() => setDel(null)} onYes={() => s.update(d => { d.habits = d.habits.filter(x => x.id !== del.id); })} />}
  </>;
}
