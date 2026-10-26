import { Data } from './types';
import { stripMd, today, addDays, parseYmd } from './util';
import { habitStats } from './habits';

const STOP = new Set('a an the and or but if of to in on at for with is are was were be been it this that as by from i you we they he she my your our not no so do does did have has had can will would should could about into than then them there their what which who whom just also very more most some any'.split(' '));
const words = (t: string) => (t.toLowerCase().match(/[a-z0-9']+/g) || []);

export function summarize(text: string, n = 3): string {
  const clean = text.replace(/```[\s\S]*?```/g, ' ').replace(/^#+\s*/gm, '').trim();
  const sents = clean.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 20);
  if (sents.length <= n) return sents.length ? sents.map(s => '• ' + stripMd(s)).join('\n') : 'Not enough text to summarize yet.';
  const freq: Record<string, number> = {};
  words(clean).forEach(w => { if (!STOP.has(w) && w.length > 2) freq[w] = (freq[w] || 0) + 1; });
  const scored = sents.map((s, i) => ({ s, i, sc: words(s).reduce((a, w) => a + (freq[w] || 0), 0) / Math.sqrt(words(s).length + 1) }));
  return scored.sort((a, b) => b.sc - a.sc).slice(0, n).sort((a, b) => a.i - b.i).map(x => '• ' + stripMd(x.s)).join('\n');
}
export function breakDown(goal: string): string[] {
  const parts = goal.split(/\band\b|,|;|\bthen\b/i).map(s => s.trim()).filter(Boolean);
  const core = parts.length > 1 ? parts : [goal.trim()];
  const steps = ['Define what "done" looks like for: ' + goal.trim(), 'Gather what you need (notes, tools, people)'];
  core.forEach(p => steps.push(p.charAt(0).toUpperCase() + p.slice(1)));
  steps.push('Review the result and fix anything missing', 'Mark it done and note what you learned');
  return steps;
}
export function improveWriting(t: string): string {
  return t.replace(/[ \t]+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').replace(/([,.!?;:])(?=[A-Za-z])/g, '$1 ')
    .replace(/\bi\b/g, 'I').replace(/(^|[.!?]\s+)([a-z])/g, (_m, a, b) => a + b.toUpperCase()).replace(/\n{3,}/g, '\n\n').trim();
}
export function habitInsights(d: Data): string {
  const hs = d.habits.filter(h => !h.archived);
  if (!hs.length) return 'Add a habit first and I can analyze it.';
  const L: string[] = [];
  const st = hs.map(h => ({ h, s: habitStats(h) }));
  const best = [...st].sort((a, b) => b.s.current - a.s.current)[0];
  if (best.s.current > 0) L.push(`🔥 "${best.h.name}" is your strongest streak right now: ${best.s.current}.`);
  const weak = [...st].sort((a, b) => a.s.rate30 - b.s.rate30)[0];
  L.push(`📉 "${weak.h.name}" has the lowest 30-day completion (${Math.round(weak.s.rate30 * 100)}%). Try a smaller target or a fixed time of day.`);
  const dow = [0, 0, 0, 0, 0, 0, 0];
  hs.forEach(h => h.done.forEach(x => dow[(parseYmd(x).getDay() + 6) % 7]++));
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  if (dow.some(x => x)) L.push(`📅 You are most consistent on ${names[dow.indexOf(Math.max(...dow))]}s and least on ${names[dow.indexOf(Math.min(...dow))]}s.`);
  return L.join('\n');
}
export function journalReflection(d: Data): string {
  const cut = addDays(today(), -30);
  const js = d.journals.filter(j => j.date >= cut);
  if (!js.length) return 'Write a few journal entries and I can reflect on them.';
  const avg = js.reduce((a, j) => a + j.mood, 0) / js.length;
  const freq: Record<string, number> = {};
  js.forEach(j => words(j.text).forEach(w => { if (!STOP.has(w) && w.length > 3) freq[w] = (freq[w] || 0) + 1; }));
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
  const moods = ['very low', 'low', 'neutral', 'good', 'great'];
  return `In the last 30 days you wrote ${js.length} entr${js.length === 1 ? 'y' : 'ies'}. Your average mood was ${avg.toFixed(1)}/5 (${moods[Math.round(avg) - 1]}).\n` +
    (top.length ? `Words that came up most: ${top.join(', ')}.\n` : '') +
    (avg < 3 ? 'It looks like it has been a heavier stretch — consider a small kind thing for yourself this week.' : 'Nice — keep noting what is working for you.');
}
export function suggestions(d: Data): string {
  const L: string[] = []; const t = today();
  const overdue = d.tasks.filter(x => !x.done && x.due && x.due < t);
  const dueToday = d.tasks.filter(x => !x.done && x.due === t);
  if (overdue.length) L.push(`⏰ ${overdue.length} overdue task(s). Start with "${overdue[0].title}".`);
  if (dueToday.length) L.push(`📌 ${dueToday.length} task(s) due today.`);
  const hs = d.habits.filter(h => !h.archived && h.freq === 'daily' && !h.done.includes(t));
  if (hs.length) L.push(`🌱 Habits not done yet today: ${hs.map(h => h.name).join(', ')}.`);
  if (!d.journals.some(j => j.date === t)) L.push('📓 You have not journaled today.');
  const hi = d.tasks.filter(x => !x.done && x.priority === 'high');
  if (hi.length) L.push(`🔴 High-priority open: ${hi.slice(0, 3).map(x => x.title).join('; ')}.`);
  return L.length ? L.join('\n') : "You're all caught up. 🎉";
}
export function knowledgeSearch(d: Data, q: string): { id: string; title: string; snippet: string }[] {
  const qs = words(q).filter(w => !STOP.has(w)); if (!qs.length) return [];
  return d.notes.filter(n => !n.trashed && !n.lock).map(n => {
    const txt = (n.title + ' ' + n.body + ' ' + n.blocks.map(b => b.text).join(' ')).toLowerCase();
    const sc = qs.reduce((a, w) => a + (txt.split(w).length - 1), 0);
    const i = qs.map(w => txt.indexOf(w)).filter(x => x >= 0)[0] ?? 0;
    return { id: n.id, title: n.title || 'Untitled', snippet: stripMd(n.body || n.blocks.map(b => b.text).join(' ')).slice(Math.max(0, i - 30), i + 120), sc };
  }).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 8);
}
// Optional key shared by the whole site (set VITE_GEMINI_API_KEY on Render). NOTE: anything in a website's code is visible to visitors.
export const sharedGeminiKey = ((import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || '').trim();
const BASE = 'https://generativelanguage.googleapis.com/v1beta/';
// Google retires models often, so we ask the API which models this key can use and pick the newest stable "flash".
export async function pickGeminiModel(key: string): Promise<string> {
  const r = await fetch(BASE + 'models?pageSize=200&key=' + encodeURIComponent(key));
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'Could not list Gemini models. Check your key.');
  const names: string[] = (j.models || []).filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m: { name: string }) => m.name.replace(/^models\//, ''))
    .filter((n: string) => /^gemini-[\d.]+-flash$/.test(n));
  const ver = (n: string) => parseFloat(n.split('-')[1]);
  names.sort((a, b) => ver(b) - ver(a));
  if (!names.length) throw new Error('No Gemini flash model is available for this key. Type a model name in Settings.');
  return names[0];
}
export async function askGemini(key: string, prompt: string, model = '', showModel = true): Promise<string> {
  const m = model.trim() || (await pickGeminiModel(key));
  const r = await fetch(`${BASE}models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'Gemini request failed');
  return (j?.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join('') || 'No answer returned.') + (showModel ? `\n\n(model: ${m})` : '');
}
