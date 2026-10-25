import { useCallback, useEffect, useRef, useState } from 'react';
import { Pen, Pencil, Highlighter, Eraser, Minus, Square, Circle, Undo2, Redo2, Trash2, Plus, ChevronLeft, Brush } from 'lucide-react';
import { useStore } from '../lib/store';
import { Drawing, Stroke } from '../lib/types';
import { uid, download, fmtTs } from '../lib/util';
import { jpegToPdf } from '../lib/pdf';
import { Header, Empty, Confirm, useToast } from '../components/ui';

const W = 1000, H = 640;
const TOOLS = [['pen', 'Pen', Pen], ['pencil', 'Pencil', Pencil], ['marker', 'Marker', Brush], ['highlighter', 'Highlighter', Highlighter], ['eraser', 'Eraser', Eraser], ['line', 'Line', Minus], ['rect', 'Rectangle', Square], ['ellipse', 'Ellipse', Circle]] as const;

function style(s: Stroke, bg: string) {
  const k = s.tool;
  const color = k === 'eraser' ? bg : s.color;
  const size = k === 'highlighter' ? s.size * 3 : k === 'marker' ? s.size * 2 : k === 'pencil' ? Math.max(1, s.size * 0.6) : k === 'eraser' ? s.size * 3 : s.size;
  const alpha = k === 'highlighter' ? 0.35 : k === 'pencil' ? 0.65 : k === 'marker' ? 0.9 : 1;
  const cap = k === 'highlighter' ? 'butt' : 'round';
  return { color, size, alpha, cap };
}
function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, bg: string) {
  const st = style(s, bg);
  ctx.save(); ctx.globalAlpha = st.alpha; ctx.strokeStyle = st.color; ctx.lineWidth = st.size; ctx.lineCap = st.cap as CanvasLineCap; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (s.shape) {
    const [a, b] = [s.shape.a, s.shape.b];
    if (s.shape.kind === 'line') { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    else if (s.shape.kind === 'rect') ctx.rect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    else ctx.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2, Math.abs(b[1] - a[1]) / 2, 0, 0, Math.PI * 2);
  } else if (s.pts.length === 1) { ctx.arc(s.pts[0][0], s.pts[0][1], st.size / 2, 0, Math.PI * 2); ctx.fillStyle = st.color; ctx.fill(); }
  else { ctx.moveTo(s.pts[0][0], s.pts[0][1]); for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i][0], s.pts[i][1]); }
  ctx.stroke(); ctx.restore();
}
function toSvg(d: Drawing): string {
  const f = (n: number) => Math.round(n * 10) / 10;
  const els = d.strokes.map(s => {
    const st = style(s, d.bg); const at = `stroke="${st.color}" stroke-width="${f(st.size)}" stroke-opacity="${st.alpha}" stroke-linecap="${st.cap}" stroke-linejoin="round" fill="none"`;
    if (s.shape) { const [a, b] = [s.shape.a, s.shape.b];
      if (s.shape.kind === 'line') return `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" ${at}/>`;
      if (s.shape.kind === 'rect') return `<rect x="${f(Math.min(a[0], b[0]))}" y="${f(Math.min(a[1], b[1]))}" width="${f(Math.abs(b[0] - a[0]))}" height="${f(Math.abs(b[1] - a[1]))}" ${at}/>`;
      return `<ellipse cx="${f((a[0] + b[0]) / 2)}" cy="${f((a[1] + b[1]) / 2)}" rx="${f(Math.abs(b[0] - a[0]) / 2)}" ry="${f(Math.abs(b[1] - a[1]) / 2)}" ${at}/>`; }
    if (s.pts.length === 1) return `<circle cx="${f(s.pts[0][0])}" cy="${f(s.pts[0][1])}" r="${f(st.size / 2)}" fill="${st.color}" fill-opacity="${st.alpha}"/>`;
    return `<path d="M${s.pts.map(p => f(p[0]) + ' ' + f(p[1])).join(' L')}" ${at}/>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="${d.bg}"/>\n${els}\n</svg>`;
}

export default function Draw() {
  const s = useStore(); const toast = useToast();
  const [id, setId] = useState<string | null>(null);
  const [del, setDel] = useState<Drawing | null>(null);
  const list = [...s.data.drawings].sort((a, b) => b.updated - a.updated);
  const cur = s.data.drawings.find(d => d.id === id);
  const create = () => { const d: Drawing = { id: uid(), title: 'Untitled drawing', created: Date.now(), updated: Date.now(), w: W, h: H, bg: '#ffffff', strokes: [] }; s.update(x => { x.drawings.unshift(d); }); setId(d.id); };
  if (cur) return <Canvas key={cur.id} d={cur} onBack={() => setId(null)} />;
  return <>
    <Header title="Drawing" sub="Pens, pencils, highlighters, shapes — draw with mouse, finger or stylus. Export as PNG, JPG, SVG or PDF."><button className="btn pri" onClick={create}><Plus size={16} /> New drawing</button></Header>
    {list.length === 0 ? <Empty text="No drawings yet. Start a new one!" /> : <div className="grid g4">
      {list.map(d => <div key={d.id} className="card item click" style={{ display: 'block' }} onClick={() => setId(d.id)}>
        <b>{d.title}</b><div className="muted small">{d.strokes.length} strokes · {fmtTs(d.updated)}</div>
        <button className="btn sm bad" style={{ marginTop: 8 }} onClick={e => { e.stopPropagation(); setDel(d); }}><Trash2 size={13} /> Delete</button></div>)}
    </div>}
    {del && <Confirm text={`Delete "${del.title}"?`} onClose={() => setDel(null)} onYes={() => { s.update(x => { x.drawings = x.drawings.filter(y => y.id !== del.id); }); toast('Deleted'); }} />}
  </>;
}

function Canvas({ d, onBack }: { d: Drawing; onBack: () => void }) {
  const s = useStore(); const toast = useToast();
  const cv = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState('pen'); const [color, setColor] = useState('#111827'); const [hex, setHex] = useState('#111827'); const [size, setSize] = useState(4);
  const strokes = useRef<Stroke[]>(d.strokes); const redo = useRef<Stroke[]>([]); const curS = useRef<Stroke | null>(null);
  const [, force] = useState(0); const bg = d.bg;

  const paint = useCallback(() => {
    const c = cv.current; if (!c) return; const ctx = c.getContext('2d')!;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    strokes.current.forEach(x => drawStroke(ctx, x, bg)); if (curS.current) drawStroke(ctx, curS.current, bg);
  }, [bg]);
  useEffect(() => { paint(); }, [paint]);
  const save = () => { s.update(x => { const t = x.drawings.find(y => y.id === d.id); if (t) { t.strokes = strokes.current; t.updated = Date.now(); } }); force(n => n + 1); };
  const pos = (e: React.PointerEvent): [number, number] => { const r = cv.current!.getBoundingClientRect(); return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)]; };
  const down = (e: React.PointerEvent) => {
    e.preventDefault(); cv.current!.setPointerCapture(e.pointerId); const p = pos(e); const shape = ['line', 'rect', 'ellipse'].includes(tool);
    curS.current = { tool, color, size, alpha: 1, pts: [p], shape: shape ? { kind: tool as 'line', a: p, b: p } : undefined }; paint();
  };
  const move = (e: React.PointerEvent) => {
    const c = curS.current; if (!c) return; const p = pos(e);
    if (c.shape) c.shape.b = p; else c.pts.push(p); requestAnimationFrame(paint);
  };
  const up = () => {
    const c = curS.current; if (!c) return; curS.current = null;
    strokes.current = [...strokes.current, c]; redo.current = []; paint(); save();
  };
  const undo = () => { const x = strokes.current.at(-1); if (!x) return; redo.current.push(x); strokes.current = strokes.current.slice(0, -1); paint(); save(); };
  const redoIt = () => { const x = redo.current.pop(); if (!x) return; strokes.current = [...strokes.current, x]; paint(); save(); };
  const snap = () => ({ ...d, strokes: strokes.current });
  const name = () => (d.title || 'drawing').replace(/[^\w\- ]+/g, '');
  const exp = (kind: 'png' | 'jpg' | 'svg' | 'pdf') => {
    if (kind === 'svg') return download(name() + '.svg', new Blob([toSvg(snap())], { type: 'image/svg+xml' }));
    paint();
    cv.current!.toBlob(async b => {
      if (!b) return;
      if (kind === 'pdf') { const jb = await new Promise<Blob | null>(r => cv.current!.toBlob(r, 'image/jpeg', 0.92)); download(name() + '.pdf', jpegToPdf(new Uint8Array(await jb!.arrayBuffer()), W, H)); }
      else download(name() + '.' + kind, b);
    }, kind === 'png' ? 'image/png' : 'image/jpeg', 0.92);
  };
  const setBg = (c: string) => { s.update(x => { const t = x.drawings.find(y => y.id === d.id)!; t.bg = c; }); };

  return <>
    <Header title="Drawing"><button className="btn" onClick={onBack}><ChevronLeft size={15} /> All drawings</button></Header>
    <div className="card">
      <input type="text" value={d.title} aria-label="Drawing title" onChange={e => s.update(x => { x.drawings.find(y => y.id === d.id)!.title = e.target.value; })} style={{ marginBottom: 10, fontWeight: 700 }} />
      <div className="row" style={{ marginBottom: 10 }}>
        {TOOLS.map(([k, l, I]) => <button key={k} className={'btn sm' + (tool === k ? ' on' : '')} title={l} aria-label={l} aria-pressed={tool === k} onClick={() => setTool(k)}><I size={15} /></button>)}
        <input type="color" aria-label="Color" value={color} onChange={e => { setColor(e.target.value); setHex(e.target.value); }} style={{ width: 38, height: 32, padding: 0, border: 0, background: 'none' }} />
        <input type="text" aria-label="HEX color" value={hex} onChange={e => { setHex(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setColor(e.target.value); }} style={{ width: 90 }} />
        {['#111827', '#dc2626', '#ea580c', '#16a34a', '#2563eb', '#9333ea'].map(c => <button key={c} aria-label={'Color ' + c} onClick={() => { setColor(c); setHex(c); }} style={{ width: 22, height: 22, borderRadius: 99, border: color === c ? '3px solid var(--pri)' : '1px solid var(--line)', background: c, cursor: 'pointer' }} />)}
        <label style={{ margin: 0 }}>Size <input type="range" min={1} max={30} value={size} onChange={e => setSize(+e.target.value)} aria-label="Brush size" /></label>
        <label style={{ margin: 0 }}>Paper <select value={bg} onChange={e => setBg(e.target.value)} style={{ width: 'auto' }}><option value="#ffffff">White</option><option value="#fffbeb">Cream</option><option value="#0f172a">Dark</option></select></label>
      </div>
      <canvas ref={cv} width={W} height={H} className="draw" style={{ width: '100%', height: 'auto', aspectRatio: `${W}/${H}` }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Drawing canvas" data-testid="canvas" />
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn sm" onClick={undo} disabled={!strokes.current.length}><Undo2 size={14} /> Undo</button>
        <button className="btn sm" onClick={redoIt} disabled={!redo.current.length}><Redo2 size={14} /> Redo</button>
        <button className="btn sm bad" onClick={() => { strokes.current = []; redo.current = []; paint(); save(); }}>Clear</button>
        <span className="sp" /><b className="small muted">Export:</b>
        {(['png', 'jpg', 'svg', 'pdf'] as const).map(k => <button key={k} className="btn sm" onClick={() => { exp(k); toast('Exporting ' + k.toUpperCase()); }}>{k.toUpperCase()}</button>)}
      </div>
      <div className="muted small" style={{ marginTop: 8 }}>Saved automatically as you draw.</div>
    </div>
  </>;
}
