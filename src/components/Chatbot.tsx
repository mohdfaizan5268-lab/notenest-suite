import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { useStore } from '../lib/store';
import { localAnswer, SUGGESTED, GUIDE_FOR_AI } from '../lib/guide';
import { askGemini } from '../lib/ai';

interface Msg { who: 'bot' | 'me'; text: string; route?: string; label?: string }

export default function Chatbot({ go }: { go: (r: string) => void }) {
  const s = useStore(); const key = s.data.settings.geminiKey;
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ who: 'bot', text: `Hi ${s.user?.name || 'there'}! 👋 I'm your NoteNest guide. Ask me how to use anything on this site.` }]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, open, busy]);

  const send = async (text: string) => {
    text = text.trim(); if (!text || busy) return; setQ('');
    const hist = [...msgs, { who: 'me' as const, text }]; setMsgs(hist);
    const local = localAnswer(text);
    if (key) {
      setBusy(true);
      try {
        const convo = hist.slice(-7, -1).map(m => (m.who === 'me' ? 'Student: ' : 'Guide: ') + m.text).join('\n');
        const ans = await askGemini(key, `${GUIDE_FOR_AI}\nConversation so far:\n${convo}\n\nStudent question: ${text}\n\nGuide answer:`, s.data.settings.geminiModel || '', false);
        setMsgs(m => [...m, { who: 'bot', text: ans, route: local.route, label: local.label }]);
      } catch {
        setMsgs(m => [...m, { who: 'bot', text: local.text + '\n\n(Gemini could not be reached, so this is my built-in answer.)', route: local.route, label: local.label }]);
      }
      setBusy(false);
    } else setMsgs(m => [...m, { who: 'bot', ...local }]);
  };

  return <div className="noprint">
    {!open && <button className="chat-bubble" aria-label="Open help chat" onClick={() => setOpen(true)}><MessageCircle size={24} /></button>}
    {open && <div className="chat-panel" role="dialog" aria-label="NoteNest guide chat">
      <div className="chat-head"><Sparkles size={16} /><b className="sp">NoteNest Guide</b><span className="small">{key ? 'Gemini on' : 'Built-in help'}</span>
        <button className="btn ico sm" aria-label="Close chat" onClick={() => setOpen(false)}><X size={15} /></button></div>
      <div className="chat-body">
        {msgs.map((m, i) => <div key={i} className={'chat-msg ' + m.who}>
          <div>{m.text}</div>
          {m.route && m.label && <button className="btn sm" style={{ marginTop: 6 }} onClick={() => { go(m.route!); setOpen(false); }}>{m.label} →</button>}
        </div>)}
        {busy && <div className="chat-msg bot muted">Thinking…</div>}
        {msgs.length <= 2 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{SUGGESTED.map(x => <button key={x} className="btn sm" onClick={() => send(x)}>{x}</button>)}</div>}
        <div ref={end} />
      </div>
      <div className="chat-input"><input type="text" value={q} placeholder="Ask how to use NoteNest…" aria-label="Ask the guide" onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(q)} />
        <button className="btn pri ico" aria-label="Send" disabled={busy || !q.trim()} onClick={() => send(q)}><Send size={16} /></button></div>
    </div>}
  </div>;
}
