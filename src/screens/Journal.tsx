import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Square, ImagePlus, CloudSun, Shuffle, Sparkles, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { Journal as J } from '../lib/types';
import { uid, today, fmtDate, addDays, parseYmd, ymd } from '../lib/util';
import { journalReflection } from '../lib/ai';
import { Img, Audio, imageToJpeg } from '../components/Media';
import { Header, Confirm, useToast } from '../components/ui';

const MOODS = ['😞', '😕', '😐', '🙂', '😄'];
const PROMPTS = ['What went well today, and why?', 'What is one thing you learned today?', 'What is weighing on your mind right now?', 'Who made your day better, and how?', 'What would make tomorrow great?', 'What are you grateful for today?', 'What challenged you today, and how did you respond?', 'Describe a small moment you want to remember.'];
const WCODE: Record<number, string> = { 0: '☀️ Clear', 1: '🌤️ Mostly clear', 2: '⛅ Partly cloudy', 3: '☁️ Overcast', 45: '🌫️ Fog', 48: '🌫️ Fog', 51: '🌦️ Drizzle', 53: '🌦️ Drizzle', 55: '🌦️ Drizzle', 61: '🌧️ Rain', 63: '🌧️ Rain', 65: '🌧️ Heavy rain', 71: '🌨️ Snow', 80: '🌦️ Showers', 81: '🌧️ Showers', 82: '⛈️ Heavy showers', 95: '⛈️ Thunderstorm' };

export default function Journal() {
  const s = useStore(); const toast = useToast();
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(today().slice(0, 7));
  const [rec, setRec] = useState(false); const [reflection, setReflection] = useState('');
  const [del, setDel] = useState(false); const [busyW, setBusyW] = useState(false);
  const mr = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]);
  const entry = s.data.journals.find(j => j.date === date);
  const ensure = (): string => {
    if (entry) return entry.id; const id = uid();
    s.update(d => { d.journals.push({ id, date, text: '', mood: 3, prompt: PROMPTS[Math.floor(Math.random() * PROMPTS.length)], weather: '', created: Date.now(), updated: Date.now() }); }); return id;
  };
  const patch = (fn: (j: J) => void) => { const id = ensure(); s.update(d => { const j = d.journals.find(x => x.id === id)!; fn(j); j.updated = Date.now(); }); };
  useEffect(() => () => { mr.current?.stream.getTracks().forEach(t => t.stop()); }, []);

  const startRec = async () => {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true });
      const m = new MediaRecorder(st); mr.current = m; chunks.current = [];
      m.ondataavailable = e => e.data.size && chunks.current.push(e.data);
      m.onstop = async () => {
        st.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: m.mimeType || 'audio/webm' }); const id = uid();
        await s.putBlob(id, new Uint8Array(await blob.arrayBuffer()));
        patch(j => { if (j.voiceId) s.delBlob(j.voiceId); j.voiceId = id; j.voiceMime = blob.type || 'audio/webm'; }); toast('Voice note saved (encrypted)');
      };
      m.start(); setRec(true);
    } catch { toast('Microphone not available or permission denied'); }
  };
  const stopRec = () => { mr.current?.stop(); setRec(false); };
  const photo = async (f: File | undefined) => {
    if (!f) return; try { const id = uid(); await s.putBlob(id, await imageToJpeg(f)); patch(j => { if (j.photoId) s.delBlob(j.photoId); j.photoId = id; }); toast('Photo added (encrypted)'); } catch (e) { toast((e as Error).message || 'Could not add photo'); }
  };
  const weather = async () => {
    const city = s.data.settings.city.trim(); if (!city) { toast('Set your city in Settings first'); return; }
    setBusyW(true);
    try {
      const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`)).json();
      const p = g.results?.[0]; if (!p) throw new Error('City not found');
      const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code`)).json();
      const label = `${WCODE[w.current.weather_code] || '🌡️ Weather'} ${Math.round(w.current.temperature_2m)}°C · ${p.name}`;
      patch(j => { j.weather = label; }); toast('Weather added');
    } catch (e) { toast((e as Error).message === 'City not found' ? 'City not found — check Settings' : 'Could not fetch weather (are you online?)'); }
    setBusyW(false);
  };

  const cells = useMemo(() => {
    const [y, m] = month.split('-').map(Number); const first = new Date(y, m - 1, 1); const lead = (first.getDay() + 6) % 7; const n = new Date(y, m, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => ymd(new Date(y, m - 1, i + 1)))] as (string | null)[];
  }, [month]);
  const shiftMonth = (k: number) => { const [y, m] = month.split('-').map(Number); const d = new Date(y, m - 1 + k, 1); setMonth(ymd(d).slice(0, 7)); };
  const sorted = [...s.data.journals].sort((a, b) => b.date.localeCompare(a.date));

  return <>
    <Header title="Journal" sub="Private, encrypted daily entries with mood, photo, voice and weather" />
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="row"><button className="btn sm" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">‹</button>
          <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} style={{ width: 'auto' }} aria-label="Entry date" />
          <button className="btn sm" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">›</button><button className="btn sm" onClick={() => setDate(today())}>Today</button></div>
        <h2 style={{ marginTop: 12 }}>{fmtDate(date)}</h2>
        <label>How are you feeling?</label>
        <div>{MOODS.map((m, i) => <button key={i} className={'mood' + (entry?.mood === i + 1 ? ' on' : '')} aria-label={'Mood ' + (i + 1)} onClick={() => patch(j => { j.mood = i + 1; })}>{m}</button>)}</div>
        <div className="row" style={{ marginTop: 10 }}><i className="muted sp">💭 {entry?.prompt || 'Start writing and a prompt will be saved with your entry.'}</i>
          <button className="btn sm" onClick={() => patch(j => { j.prompt = PROMPTS[(PROMPTS.indexOf(j.prompt) + 1) % PROMPTS.length]; })}><Shuffle size={13} /> New prompt</button></div>
        <textarea aria-label="Journal entry" style={{ minHeight: 200, marginTop: 8 }} placeholder="Write freely… this stays on your device, encrypted." value={entry?.text || ''} onChange={e => patch(j => { j.text = e.target.value; })} />
        {entry?.weather && <div className="small" style={{ marginTop: 6 }}>{entry.weather}</div>}
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn sm" onClick={weather} disabled={busyW}><CloudSun size={14} /> {busyW ? 'Fetching…' : 'Add weather'}</button>
          <label className="btn sm" style={{ margin: 0, color: 'var(--ink)', cursor: 'pointer' }}><ImagePlus size={14} /> Photo<input type="file" accept="image/*" hidden onChange={e => { photo(e.target.files?.[0]); e.target.value = ''; }} /></label>
          {rec ? <button className="btn sm bad" onClick={stopRec}><Square size={14} /> Stop recording</button> : <button className="btn sm" onClick={startRec}><Mic size={14} /> Record voice</button>}
          {entry && <button className="btn sm bad" onClick={() => setDel(true)}><Trash2 size={14} /> Delete entry</button>}
        </div>
        {entry?.photoId && <div style={{ marginTop: 10 }}><Img id={entry.photoId} alt="Journal photo" style={{ maxHeight: 240 }} /></div>}
        {entry?.voiceId && <div style={{ marginTop: 10 }}><Audio id={entry.voiceId} mime={entry.voiceMime || 'audio/webm'} /></div>}
      </div>
      <div>
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="row"><button className="btn sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button><b className="sp" style={{ textAlign: 'center' }}>{parseYmd(month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b><button className="btn sm" onClick={() => shiftMonth(1)} aria-label="Next month">›</button></div>
          <div className="cal" style={{ marginTop: 8 }}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => <div key={i} className="h">{x}</div>)}
            {cells.map((c, i) => c ? (() => { const j = s.data.journals.find(x => x.date === c); return <div key={c} className={'d' + (c === today() ? ' today' : '')} style={{ minHeight: 44, outline: c === date ? '2px solid var(--pri)' : undefined }} onClick={() => setDate(c)}>{+c.slice(8)}<div>{j ? MOODS[j.mood - 1] : ''}</div></div>; })() : <div key={i} />)}</div>
        </div>
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="row"><b className="sp">Reflection summary</b><button className="btn sm" onClick={() => setReflection(journalReflection(s.data))}><Sparkles size={14} /> Reflect</button></div>
          {reflection && <p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{reflection}</p>}
        </div>
        <div className="card"><b>Timeline</b>{sorted.length === 0 && <p className="muted">No entries yet.</p>}
          {sorted.slice(0, 15).map(j => <div key={j.id} className="item click" style={{ marginTop: 8 }} onClick={() => { setDate(j.date); setMonth(j.date.slice(0, 7)); }}><span style={{ fontSize: '1.3rem' }}>{MOODS[j.mood - 1]}</span><div className="sp" style={{ minWidth: 0 }}><b className="small">{fmtDate(j.date)}</b><div className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.text || '(no text)'}</div></div></div>)}</div>
      </div>
    </div>
    {del && entry && <Confirm text="Delete this journal entry, including its photo and voice note?" onClose={() => setDel(false)} onYes={() => { if (entry.photoId) s.delBlob(entry.photoId); if (entry.voiceId) s.delBlob(entry.voiceId); s.update(d => { d.journals = d.journals.filter(x => x.id !== entry.id); }); toast('Entry deleted'); }} />}
  </>;
}
