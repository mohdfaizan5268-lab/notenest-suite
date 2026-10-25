import { Ev } from './types';
import { uid } from './util';
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const unesc = (s: string) => s.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\;/g, ';').replace(/\\\\/g, '\\');
export function toIcs(evs: Ev[]): string {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NoteNest Suite//EN'];
  for (const e of evs) {
    const d = e.date.replace(/-/g, '');
    L.push('BEGIN:VEVENT', `UID:${e.id}@notenest`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`);
    if (e.time) {
      L.push(`DTSTART:${d}T${e.time.replace(':', '')}00`);
      L.push(`DTEND:${d}T${(e.endTime || e.time).replace(':', '')}00`);
    } else L.push(`DTSTART;VALUE=DATE:${d}`);
    L.push(`SUMMARY:${esc(e.title)}`);
    if (e.notes) L.push(`DESCRIPTION:${esc(e.notes)}`);
    const r = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY' }[e.recur as 'daily'];
    if (r) L.push(`RRULE:FREQ=${r}`);
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}
export function fromIcs(text: string): Ev[] {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const out: Ev[] = []; let cur: Partial<Ev> | null = null;
  for (const ln of lines) {
    if (ln === 'BEGIN:VEVENT') cur = { id: uid(), title: '', date: '', time: '', endTime: '', recur: 'none', remind: 0, notes: '' };
    else if (ln === 'END:VEVENT') { if (cur && cur.date && cur.title) out.push(cur as Ev); cur = null; }
    else if (cur) {
      const i = ln.indexOf(':'); if (i < 0) continue;
      const k = ln.slice(0, i).split(';')[0]; const v = ln.slice(i + 1);
      const dm = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
      if (k === 'DTSTART' && dm) { cur.date = `${dm[1]}-${dm[2]}-${dm[3]}`; if (dm[4]) cur.time = `${dm[4]}:${dm[5]}`; }
      else if (k === 'DTEND' && dm && dm[4]) cur.endTime = `${dm[4]}:${dm[5]}`;
      else if (k === 'SUMMARY') cur.title = unesc(v);
      else if (k === 'DESCRIPTION') cur.notes = unesc(v);
      else if (k === 'RRULE') { const m = v.match(/FREQ=(DAILY|WEEKLY|MONTHLY)/); if (m) cur.recur = m[1].toLowerCase() as Ev['recur']; }
    }
  }
  return out;
}
