import { Habit } from './types';
import { addDays, today, weekStart, monthKey, parseYmd } from './util';

// A "period key" groups completions: day, ISO-ish week (Monday), or month.
const pk = (h: Habit, d: string) => h.freq === 'daily' ? d : h.freq === 'weekly' ? weekStart(d) : monthKey(d);
const prevPeriod = (h: Habit, k: string) => {
  if (h.freq === 'daily') return addDays(k, -1);
  if (h.freq === 'weekly') return addDays(k, -7);
  const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
export function periodCounts(h: Habit): Map<string, number> {
  const m = new Map<string, number>(); h.done.forEach(d => m.set(pk(h, d), (m.get(pk(h, d)) || 0) + 1)); return m;
}
export const periodMet = (h: Habit, k: string, m = periodCounts(h)) => (m.get(k) || 0) >= (h.freq === 'daily' ? 1 : h.target);
export function habitStats(h: Habit) {
  const m = periodCounts(h); const now = pk(h, today());
  let cur = 0; let k = now;
  if (!periodMet(h, k, m)) k = prevPeriod(h, k); // current period may still be in progress
  while (periodMet(h, k, m)) { cur++; k = prevPeriod(h, k); }
  const keys = [...m.keys()].filter(x => periodMet(h, x, m)).sort();
  let longest = 0, run = 0, last = '';
  for (const x of keys) { run = last && prevPeriod(h, x) === last ? run + 1 : 1; longest = Math.max(longest, run); last = x; }
  let ok = 0; for (let i = 0; i < 30; i++) { const d = addDays(today(), -i); if (h.done.includes(d)) ok++; }
  const rate30 = h.freq === 'daily' ? ok / 30 : Math.min(1, ok / (h.freq === 'weekly' ? h.target * 4.3 : h.target));
  return { current: cur, longest, rate30, total: h.done.length, doneNow: periodMet(h, now, m), countNow: m.get(now) || 0 };
}
export function missedIndicator(h: Habit): boolean {
  if (h.freq !== 'daily') return false;
  const y = addDays(today(), -1);
  return parseYmd(y) >= new Date(h.created - 86400000) && !h.done.includes(y) && !h.done.includes(today());
}
