import { Ev, Task } from './types';
import { parseYmd, addDays } from './util';
export function occursOn(e: Ev, d: string): boolean {
  if (d < e.date) return false;
  if (e.recur === 'none') return d === e.date;
  if (e.recur === 'daily') return true;
  if (e.recur === 'weekly') return parseYmd(d).getDay() === parseYmd(e.date).getDay();
  const a = parseYmd(e.date), b = parseYmd(d);
  if (a.getDate() === b.getDate()) return true;
  // month shorter than the day: show on last day
  const last = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
  return a.getDate() > last && b.getDate() === last;
}
export const eventsOn = (evs: Ev[], d: string) => evs.filter(e => occursOn(e, d)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
// when a recurring task is completed, return the next due date
export function nextDue(t: Task): string {
  const base = t.due || new Date().toISOString().slice(0, 10);
  if (t.recur === 'daily') return addDays(base, 1);
  if (t.recur === 'weekly') return addDays(base, 7);
  const d = parseYmd(base); d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
