import { useMemo, useRef, useState } from 'react';
import { Plus, Download, Upload, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { Ev } from '../lib/types';
import { uid, today, addDays, ymd, parseYmd, weekStart, download, fmtDate } from '../lib/util';
import { eventsOn } from '../lib/cal';
import { toIcs, fromIcs } from '../lib/ics';
import { Header, Modal, useToast } from '../components/ui';

type View = 'month' | 'week' | 'day';
const blank = (date: string): Ev => ({ id: uid(), title: '', date, time: '', endTime: '', recur: 'none', remind: 0, notes: '' });

export default function Calendar() {
  const s = useStore(); const toast = useToast();
  const [view, setView] = useState<View>('month'); const [cur, setCur] = useState(today());
  const [edit, setEdit] = useState<Ev | null>(null); const [isNew, setIsNew] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const evs = s.data.events;
  const days = useMemo(() => {
    if (view === 'day') return [cur];
    if (view === 'week') { const w = weekStart(cur); return Array.from({ length: 7 }, (_, i) => addDays(w, i)); }
    const d = parseYmd(cur); const first = new Date(d.getFullYear(), d.getMonth(), 1); const ws = weekStart(ymd(first));
    const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); const total = Math.ceil(((first.getDay() + 6) % 7 + n) / 7) * 7;
    return Array.from({ length: total }, (_, i) => addDays(ws, i));
  }, [view, cur]);
  const step = (k: number) => { if (view === 'day') setCur(addDays(cur, k)); else if (view === 'week') setCur(addDays(cur, 7 * k)); else { const d = parseYmd(cur); d.setDate(1); d.setMonth(d.getMonth() + k); setCur(ymd(d)); } };
  const title = view === 'day' ? fmtDate(cur) : view === 'week' ? `Week of ${fmtDate(days[0])}` : parseYmd(cur).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const open = (e: Ev, n: boolean) => { setEdit({ ...e }); setIsNew(n); };
  const save = () => {
    if (!edit || !edit.title.trim()) return;
    if (edit.time && edit.endTime && edit.endTime < edit.time) { toast('End time must be after start time'); return; }
    const e = { ...edit, title: edit.title.trim() };
    s.update(d => { const i = d.events.findIndex(x => x.id === e.id); if (i >= 0) d.events[i] = e; else d.events.push(e); }); setEdit(null); toast('Event saved');
  };
  const importIcs = async (f: File) => {
    const list = fromIcs(await f.text()); if (!list.length) { toast('No events found in that file'); return; }
    s.update(d => { list.forEach(e => d.events.push(e)); }); toast(`Imported ${list.length} event(s)`);
  };
  return <>
    <Header title="Calendar" sub="Day, week and month views with reminders and repeating events">
      <button className="btn" onClick={() => { download('notenest-calendar.ics', new Blob([toIcs(evs)], { type: 'text/calendar' })); }}><Download size={15} /> Export .ics</button>
      <button className="btn" onClick={() => file.current?.click()}><Upload size={15} /> Import .ics</button>
      <input ref={file} type="file" accept=".ics,text/calendar" hidden onChange={e => { const f = e.target.files?.[0]; if (f) importIcs(f); e.target.value = ''; }} />
      <button className="btn pri" onClick={() => open(blank(cur), true)}><Plus size={16} /> New event</button></Header>
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn sm" onClick={() => step(-1)} aria-label="Previous">‹</button><button className="btn sm" onClick={() => setCur(today())}>Today</button><button className="btn sm" onClick={() => step(1)} aria-label="Next">›</button>
        <b className="sp" style={{ textAlign: 'center' }}>{title}</b>
        {(['month', 'week', 'day'] as const).map(v => <button key={v} className={'btn sm' + (view === v ? ' on' : '')} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
      </div>
      {view === 'day' ? <div>{(() => { const l = eventsOn(evs, cur); const t = s.data.tasks.filter(x => !x.done && x.due === cur);
        return l.length + t.length === 0 ? <p className="muted">Nothing scheduled.</p> : <>{l.map(e => <div key={e.id} className="item click" onClick={() => open(e, false)}><b>{e.time || 'All day'}{e.endTime && '–' + e.endTime}</b><span className="sp">{e.title}</span>{e.recur !== 'none' && <span className="tag">↻ {e.recur}</span>}</div>)}
          {t.map(x => <div key={x.id} className="item"><b>Task</b><span className="sp">{x.title}</span></div>)}</>; })()}</div> :
        <div className="cal">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => <div key={x} className="h">{x}</div>)}
          {days.map(d => { const l = eventsOn(evs, d); const tk = s.data.tasks.filter(x => !x.done && x.due === d);
            return <div key={d} className={'d' + (d === today() ? ' today' : '') + (view === 'month' && d.slice(0, 7) !== cur.slice(0, 7) ? ' dim' : '')} style={view === 'week' ? { minHeight: 200 } : undefined}
              onClick={() => open(blank(d), true)} aria-label={'Day ' + d}>
              <b>{+d.slice(8)}</b>
              {l.slice(0, view === 'week' ? 20 : 3).map(e => <div key={e.id} className="evp" onClick={ev => { ev.stopPropagation(); open(e, false); }}>{e.time && e.time + ' '}{e.title}</div>)}
              {view === 'month' && l.length > 3 && <div className="muted">+{l.length - 3} more</div>}
              {tk.length > 0 && <div className="muted" style={{ fontSize: '.7rem' }}>✓ {tk.length} task{tk.length > 1 ? 's' : ''}</div>}
            </div>; })}</div>}
    </div>
    <p className="muted small">Google / Outlook: live two-way sync needs their paid-free developer approval and a server, which this free app doesn't have. Instead, export an <b>.ics</b> file and import it into Google Calendar or Outlook (and vice-versa).</p>
    {edit && <Modal title={isNew ? 'New event' : 'Edit event'} onClose={() => setEdit(null)}>
      <label>Title</label><input type="text" autoFocus value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} aria-label="Event title" />
      <label>Date</label><input type="date" value={edit.date} onChange={e => setEdit({ ...edit, date: e.target.value })} aria-label="Event date" />
      <div className="row"><div className="sp"><label>Start</label><input type="time" value={edit.time} onChange={e => setEdit({ ...edit, time: e.target.value })} aria-label="Start time" /></div><div className="sp"><label>End</label><input type="time" value={edit.endTime} onChange={e => setEdit({ ...edit, endTime: e.target.value })} aria-label="End time" /></div></div>
      <label>Repeats</label><select value={edit.recur} onChange={e => setEdit({ ...edit, recur: e.target.value as Ev['recur'] })}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
      <label>Reminder (needs a start time)</label><select value={edit.remind} disabled={!edit.time} onChange={e => setEdit({ ...edit, remind: +e.target.value })}><option value={0}>None</option><option value={5}>5 minutes before</option><option value={15}>15 minutes before</option><option value={60}>1 hour before</option></select>
      <label>Notes</label><textarea value={edit.notes} onChange={e => setEdit({ ...edit, notes: e.target.value })} style={{ minHeight: 60 }} />
      <div className="row" style={{ marginTop: 14 }}>
        {!isNew && <button className="btn bad" onClick={() => { s.update(d => { d.events = d.events.filter(x => x.id !== edit.id); }); setEdit(null); toast('Event deleted'); }}><Trash2 size={14} /> Delete</button>}
        <span className="sp" /><button className="btn" onClick={() => setEdit(null)}>Cancel</button><button className="btn pri" disabled={!edit.title.trim() || !edit.date} onClick={save}>Save</button></div>
    </Modal>}
  </>;
}
