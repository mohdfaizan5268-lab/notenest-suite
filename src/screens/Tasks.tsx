import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Play, Pause, RotateCcw, Target, ListChecks, Timer } from 'lucide-react';
import { useStore } from '../lib/store';
import { Task } from '../lib/types';
import { uid, today, addDays, fmtDate } from '../lib/util';
import { nextDue } from '../lib/cal';
import { showNotif } from '../lib/notify';
import { Header, Empty, Modal, useToast } from '../components/ui';

type Tab = 'tasks' | 'goals' | 'focus';
const PR = { high: 0, med: 1, low: 2 };

export default function Tasks() {
  const [tab, setTab] = useState<Tab>('tasks');
  return <>
    <Header title="Tasks & Focus" sub="Priorities, due dates, recurring tasks, checklists, goals and a Pomodoro timer" />
    <div className="tabs">{([['tasks', 'Tasks', ListChecks], ['goals', 'Goals', Target], ['focus', 'Pomodoro', Timer]] as const).map(([k, l, I]) =>
      <button key={k} className={'btn' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}><I size={15} /> {l}</button>)}</div>
    {tab === 'tasks' ? <TaskList /> : tab === 'goals' ? <Goals /> : <Pomodoro />}
  </>;
}

function TaskList() {
  const s = useStore(); const toast = useToast();
  const [title, setTitle] = useState(''); const [priority, setPriority] = useState<Task['priority']>('med'); const [due, setDue] = useState(''); const [recur, setRecur] = useState<Task['recur']>('none'); const [goalId, setGoalId] = useState('');
  const [filter, setFilter] = useState<'open' | 'done' | 'all'>('open'); const [openId, setOpenId] = useState<string | null>(null);
  const add = () => {
    if (!title.trim()) return;
    if (recur !== 'none' && !due) { toast('A recurring task needs a due date'); return; }
    s.update(d => { d.tasks.push({ id: uid(), title: title.trim(), priority, due, done: false, recur, checklist: [], goalId: goalId || null, created: Date.now() }); });
    setTitle(''); setDue(''); setRecur('none');
  };
  const complete = (t: Task) => {
    s.update(d => {
      const x = d.tasks.find(y => y.id === t.id)!;
      if (!x.done && x.recur !== 'none') { x.due = nextDue(x); x.checklist.forEach(c => { c.done = false; }); toast('Done! Next one is due ' + x.due); }
      else x.done = !x.done;
    });
  };
  const list = s.data.tasks.filter(t => filter === 'all' || (filter === 'open' ? !t.done : t.done)).sort((a, b) => Number(a.done) - Number(b.done) || (a.due || '9').localeCompare(b.due || '9') || PR[a.priority] - PR[b.priority]);
  return <>
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="row"><input type="text" placeholder="Add a task…" aria-label="New task" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} style={{ flex: '1 1 220px', width: 'auto' }} />
        <button className="btn pri" onClick={add} disabled={!title.trim()}><Plus size={16} /> Add</button></div>
      <div className="row" style={{ marginTop: 8 }}>
        <select aria-label="Priority" value={priority} onChange={e => setPriority(e.target.value as Task['priority'])} style={{ width: 'auto' }}><option value="high">High priority</option><option value="med">Medium</option><option value="low">Low</option></select>
        <input type="date" aria-label="Due date" value={due} onChange={e => setDue(e.target.value)} style={{ width: 'auto' }} />
        <select aria-label="Repeat" value={recur} onChange={e => setRecur(e.target.value as Task['recur'])} style={{ width: 'auto' }}><option value="none">No repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
        {s.data.goals.length > 0 && <select aria-label="Goal" value={goalId} onChange={e => setGoalId(e.target.value)} style={{ width: 'auto' }}><option value="">No goal</option>{s.data.goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select>}
      </div>
    </div>
    <div className="tabs">{(['open', 'done', 'all'] as const).map(f => <button key={f} className={'btn sm' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>)}</div>
    {list.length === 0 ? <Empty text={filter === 'open' ? 'Nothing to do. Enjoy! 🎉' : 'No tasks here.'} /> : list.map(t => {
      const over = !t.done && t.due && t.due < today(); const cl = t.checklist; const open = openId === t.id;
      return <div key={t.id} className="card" style={{ marginBottom: 8, padding: 12 }}>
        <div className="row">
          <input type="checkbox" checked={t.done} aria-label={'Complete ' + t.title} onChange={() => complete(t)} style={{ width: 18, height: 18 }} />
          <div className="sp" style={{ minWidth: 0 }}><span style={{ textDecoration: t.done ? 'line-through' : undefined, opacity: t.done ? .6 : 1 }}><b>{t.title}</b></span>
            <div className="small"><span className="tag" style={{ background: t.priority === 'high' ? '#fee2e2' : undefined, color: t.priority === 'high' ? '#991b1b' : undefined }}>{t.priority === 'med' ? 'medium' : t.priority}</span>
              {t.due && <span style={{ color: over ? 'var(--bad)' : 'var(--muted)' }}>{over ? 'Overdue · ' : 'Due '}{fmtDate(t.due)}</span>}
              {t.recur !== 'none' && <span className="tag" style={{ marginLeft: 6 }}>↻ {t.recur}</span>}
              {t.goalId && <span className="tag">🎯 {s.data.goals.find(g => g.id === t.goalId)?.title}</span>}
              {cl.length > 0 && <span className="muted"> · {cl.filter(c => c.done).length}/{cl.length} steps</span>}</div></div>
          <button className="btn sm" onClick={() => setOpenId(open ? null : t.id)}>{open ? 'Hide' : 'Checklist'}</button>
          <button className="btn sm ico bad" aria-label={'Delete ' + t.title} onClick={() => s.update(d => { d.tasks = d.tasks.filter(x => x.id !== t.id); })}><Trash2 size={14} /></button>
        </div>
        {open && <div style={{ marginTop: 10, paddingLeft: 28 }}>
          {cl.map(c => <div key={c.id} className="row" style={{ marginBottom: 4 }}><input type="checkbox" aria-label={c.text} checked={c.done} onChange={() => s.update(d => { const k = d.tasks.find(y => y.id === t.id)!.checklist.find(z => z.id === c.id)!; k.done = !k.done; })} />
            <span className="sp" style={{ textDecoration: c.done ? 'line-through' : undefined }}>{c.text}</span>
            <button className="btn sm ico" aria-label="Remove step" onClick={() => s.update(d => { const x = d.tasks.find(y => y.id === t.id)!; x.checklist = x.checklist.filter(z => z.id !== c.id); })}>×</button></div>)}
          <input type="text" placeholder="Add a step and press Enter" aria-label="New checklist step" onKeyDown={e => { const v = (e.target as HTMLInputElement).value.trim(); if (e.key === 'Enter' && v) { s.update(d => { d.tasks.find(y => y.id === t.id)!.checklist.push({ id: uid(), text: v, done: false }); }); (e.target as HTMLInputElement).value = ''; } }} />
        </div>}
      </div>;
    })}
  </>;
}

function Goals() {
  const s = useStore(); const [t, setT] = useState(''); const [tg, setTg] = useState('');
  return <>
    <div className="card" style={{ marginBottom: 14 }}><div className="row">
      <input type="text" placeholder="Goal (e.g. Learn React)" aria-label="Goal title" value={t} onChange={e => setT(e.target.value)} style={{ flex: '1 1 200px', width: 'auto' }} />
      <input type="text" placeholder="Target / by when (optional)" aria-label="Goal target" value={tg} onChange={e => setTg(e.target.value)} style={{ flex: '1 1 160px', width: 'auto' }} />
      <button className="btn pri" disabled={!t.trim()} onClick={() => { s.update(d => { d.goals.push({ id: uid(), title: t.trim(), target: tg.trim() }); }); setT(''); setTg(''); }}><Plus size={16} /> Add goal</button></div>
      <p className="muted small" style={{ marginBottom: 0 }}>Link tasks to a goal from the Tasks tab — progress fills as you finish them.</p></div>
    {s.data.goals.length === 0 ? <Empty text="No goals yet." /> : s.data.goals.map(g => {
      const ts = s.data.tasks.filter(x => x.goalId === g.id); const dn = ts.filter(x => x.done).length; const pct = ts.length ? Math.round(dn / ts.length * 100) : 0;
      return <div key={g.id} className="card" style={{ marginBottom: 10 }}><div className="row"><div className="sp"><b>🎯 {g.title}</b>{g.target && <div className="muted small">{g.target}</div>}</div>
        <button className="btn sm ico bad" aria-label={'Delete goal ' + g.title} onClick={() => s.update(d => { d.goals = d.goals.filter(x => x.id !== g.id); d.tasks.forEach(x => { if (x.goalId === g.id) x.goalId = null; }); })}><Trash2 size={14} /></button></div>
        <div className="bar" style={{ margin: '8px 0 4px' }}><i style={{ width: pct + '%' }} /></div><div className="muted small">{dn}/{ts.length} tasks done ({pct}%)</div></div>;
    })}
  </>;
}

interface Run { kind: 'work' | 'break'; endAt: number; mins: number; taskId?: string }
const KEY = 'nn_pomo';
function Pomodoro() {
  const s = useStore(); const toast = useToast();
  const [work, setWork] = useState(25); const [brk, setBrk] = useState(5);
  const [run, setRun] = useState<Run | null>(() => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; } });
  const [paused, setPaused] = useState<number | null>(null); const [now, setNow] = useState(Date.now()); const [taskId, setTaskId] = useState('');
  const done = useRef(false);
  useEffect(() => { const i = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(i); }, []);
  const left = run ? Math.max(0, (paused ?? now) < run.endAt ? run.endAt - (paused ?? now) : 0) : 0;
  const start = (kind: 'work' | 'break') => { const mins = kind === 'work' ? work : brk; const r = { kind, mins, endAt: Date.now() + mins * 60000, taskId: taskId || undefined }; sessionStorage.setItem(KEY, JSON.stringify(r)); setRun(r); setPaused(null); done.current = false; };
  const stop = () => { sessionStorage.removeItem(KEY); setRun(null); setPaused(null); };
  useEffect(() => {
    if (run && paused === null && left === 0 && !done.current) {
      done.current = true;
      if (run.kind === 'work') s.update(d => { d.pomos.push({ id: uid(), start: run.endAt - run.mins * 60000, mins: run.mins, kind: 'work', taskId: run.taskId }); });
      const msg = run.kind === 'work' ? 'Focus session complete — take a break!' : 'Break over — ready to focus?';
      toast(msg); if (s.data.settings.notifications) showNotif(msg); stop();
    }
  }, [left, run, paused]); // eslint-disable-line
  const mm = String(Math.floor(left / 60000)).padStart(2, '0'), ss = String(Math.floor(left / 1000) % 60).padStart(2, '0');
  const works = s.data.pomos.filter(p => p.kind === 'work');
  const todayMins = works.filter(p => new Date(p.start).toDateString() === new Date().toDateString()).reduce((a, p) => a + p.mins, 0);
  const days = Array.from({ length: 7 }, (_, i) => { const d = addDays(today(), i - 6); return { d, m: works.filter(p => new Date(p.start).toLocaleDateString('en-CA') === d).reduce((a, p) => a + p.mins, 0) }; });
  const max = Math.max(30, ...days.map(x => x.m));
  return <div className="grid g2" style={{ alignItems: 'start' }}>
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="muted">{run ? (run.kind === 'work' ? '🎯 Focus' : '☕ Break') : 'Ready'}</div>
      <div style={{ fontSize: '4rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }} data-testid="pomo-time">{run ? `${mm}:${ss}` : `${String(work).padStart(2, '0')}:00`}</div>
      {run ? <div className="row" style={{ justifyContent: 'center' }}>
        {paused === null ? <button className="btn" onClick={() => setPaused(Date.now())}><Pause size={15} /> Pause</button> : <button className="btn pri" onClick={() => { const r = { ...run, endAt: run.endAt + (Date.now() - paused) }; sessionStorage.setItem(KEY, JSON.stringify(r)); setRun(r); setPaused(null); }}><Play size={15} /> Resume</button>}
        <button className="btn bad" onClick={stop}><RotateCcw size={15} /> Cancel</button></div> :
        <div className="row" style={{ justifyContent: 'center' }}><button className="btn pri" onClick={() => start('work')}><Play size={15} /> Start focus</button><button className="btn" onClick={() => start('break')}>Start break</button></div>}
      <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
        <label style={{ margin: 0 }}>Work (min) <input type="number" min={1} max={120} value={work} onChange={e => setWork(Math.max(1, +e.target.value))} style={{ width: 70 }} disabled={!!run} /></label>
        <label style={{ margin: 0 }}>Break (min) <input type="number" min={1} max={60} value={brk} onChange={e => setBrk(Math.max(1, +e.target.value))} style={{ width: 70 }} disabled={!!run} /></label></div>
      <label>Focus on task (optional)</label><select value={taskId} onChange={e => setTaskId(e.target.value)} disabled={!!run}><option value="">— none —</option>{s.data.tasks.filter(t => !t.done).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
      <p className="muted small">The timer keeps correct time even if the tab sleeps, but it can only alert you while NoteNest is open in a tab.</p>
    </div>
    <div className="card"><h3>Focus report</h3>
      <div className="row"><div><div className="stat">{todayMins}</div><div className="muted small">min today</div></div><div><div className="stat">{works.length}</div><div className="muted small">sessions total</div></div><div><div className="stat">{Math.round(works.reduce((a, p) => a + p.mins, 0) / 60 * 10) / 10}</div><div className="muted small">hours total</div></div></div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120, marginTop: 14 }}>
        {days.map(x => <div key={x.d} style={{ flex: 1, textAlign: 'center' }}><div title={x.m + ' min'} style={{ height: Math.max(3, x.m / max * 90), background: 'var(--pri)', borderRadius: 4 }} /><div className="small muted">{new Date(x.d + 'T00:00').toLocaleDateString(undefined, { weekday: 'short' })}</div><div className="small">{x.m}</div></div>)}</div>
    </div>
  </div>;
}
