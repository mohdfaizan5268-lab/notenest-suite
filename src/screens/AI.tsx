import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useStore } from '../lib/store';
import { summarize, breakDown, improveWriting, habitInsights, journalReflection, suggestions, knowledgeSearch, askGemini } from '../lib/ai';
import { uid, today } from '../lib/util';
import { Header, useToast } from '../components/ui';

type Tool = 'summ' | 'write' | 'break' | 'habit' | 'journal' | 'sugg' | 'search' | 'ask';
export default function AI({ go }: { go: (r: string) => void }) {
  const s = useStore(); const toast = useToast(); const d = s.data;
  const [tool, setTool] = useState<Tool>('summ'); const [text, setText] = useState(''); const [out, setOut] = useState(''); const [steps, setSteps] = useState<string[]>([]);
  const [noteId, setNoteId] = useState(''); const [hits, setHits] = useState<{ id: string; title: string; snippet: string }[] | null>(null); const [busy, setBusy] = useState(false);
  const open = d.notes.filter(n => !n.trashed && !n.lock);
  const fromNote = (id: string) => { setNoteId(id); const n = open.find(x => x.id === id); if (n) setText(n.mode === 'blocks' ? n.blocks.map(b => b.text).join('\n') : n.body); };
  const tabs: [Tool, string][] = [['summ', 'Summarize'], ['write', 'Writing help'], ['break', 'Task breakdown'], ['habit', 'Habit insights'], ['journal', 'Journal reflection'], ['sugg', 'Suggestions'], ['search', 'Knowledge search'], ['ask', 'Ask Gemini (optional)']];
  const run = async () => {
    setOut(''); setSteps([]); setHits(null);
    if (tool === 'summ') setOut(summarize(text));
    else if (tool === 'write') setOut(improveWriting(text));
    else if (tool === 'break') setSteps(breakDown(text));
    else if (tool === 'habit') setOut(habitInsights(d));
    else if (tool === 'journal') setOut(journalReflection(d));
    else if (tool === 'sugg') setOut(suggestions(d));
    else if (tool === 'search') setHits(knowledgeSearch(d, text));
    else if (tool === 'ask') {
      if (!d.settings.geminiKey) { setOut('Add your free Gemini API key in Settings first.'); return; }
      setBusy(true);
      try { setOut(await askGemini(d.settings.geminiKey, (text ? '' : '') + text)); } catch (e) { setOut('Error: ' + (e as Error).message); }
      setBusy(false);
    }
  };
  const needsText = ['summ', 'write', 'break', 'search', 'ask'].includes(tool);
  return <>
    <Header title="Smart Assistant" sub="Works fully offline on your own data. Optionally connect your own Gemini key for open-ended questions." />
    <div className="tabs">{tabs.map(([k, l]) => <button key={k} className={'btn sm' + (tool === k ? ' on' : '')} onClick={() => { setTool(k); setOut(''); setSteps([]); setHits(null); }}>{l}</button>)}</div>
    <div className="card">
      {needsText && <>
        {(tool === 'summ' || tool === 'write') && <><label>Load from a note</label><select value={noteId} onChange={e => fromNote(e.target.value)} aria-label="Pick note"><option value="">— paste text below —</option>{open.map(n => <option key={n.id} value={n.id}>{n.title || 'Untitled'}</option>)}</select></>}
        <label>{tool === 'break' ? 'Describe your goal or big task' : tool === 'search' ? 'What are you looking for in your notes?' : tool === 'ask' ? 'Your question' : 'Text'}</label>
        <textarea aria-label="Assistant input" value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 120 }} /></>}
      <button className="btn pri" style={{ marginTop: 10 }} onClick={run} disabled={busy || (needsText && !text.trim())}><Sparkles size={15} /> {busy ? 'Thinking…' : 'Run'}</button>
      {tool === 'ask' && <p className="muted small">Your question is sent to Google's Gemini using your own key. Nothing else from NoteNest is sent. Get a free key at aistudio.google.com.</p>}
      {out && <div className="card" style={{ background: 'var(--priS)', marginTop: 12, whiteSpace: 'pre-wrap' }} data-testid="ai-out">{out}</div>}
      {out && tool === 'write' && <button className="btn sm" style={{ marginTop: 8 }} onClick={() => navigator.clipboard?.writeText(out).then(() => toast('Copied'))}>Copy</button>}
      {steps.length > 0 && <div style={{ marginTop: 12 }}><ol>{steps.map((x, i) => <li key={i}>{x}</li>)}</ol>
        <button className="btn pri" onClick={() => { s.update(x => { const id = uid(); x.tasks.push({ id, title: text.trim().slice(0, 80), priority: 'med', due: '', done: false, recur: 'none', checklist: steps.map(t => ({ id: uid(), text: t, done: false })), goalId: null, created: Date.now() }); }); toast('Added as a task with a checklist'); go('tasks'); }}>Add as task with checklist</button></div>}
      {hits && (hits.length === 0 ? <p className="muted">No matching notes (locked notes are never searched).</p> : hits.map(h => <div key={h.id} className="item click" onClick={() => { sessionStorage.setItem('nn_open_note', h.id); go('notes'); }}><div><b>{h.title}</b><div className="muted small">…{h.snippet}…</div></div></div>))}
    </div>
    <span hidden>{today()}</span>
  </>;
}
