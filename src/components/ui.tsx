import { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

const ToastCtx = createContext<(m: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [m, setM] = useState(''); const t = useRef<number>();
  const show = useCallback((x: string) => { setM(x); window.clearTimeout(t.current); t.current = window.setTimeout(() => setM(''), 2600); }, []);
  return <ToastCtx.Provider value={show}>{children}{m && <div className="toast" role="status">{m}</div>}</ToastCtx.Provider>;
}
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [onClose]);
  return <div className="modal" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="card" role="dialog" aria-label={title}>
      <div className="row"><h2 className="sp">{title}</h2><button className="btn ico" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
      {children}
    </div></div>;
}
// Ask for a password/text in a modal
export function PromptModal({ title, label, type = 'password', confirmText = 'OK', onSubmit, onClose, hint }:
  { title: string; label: string; type?: string; confirmText?: string; onSubmit: (v: string) => Promise<string | void> | string | void; onClose: () => void; hint?: string }) {
  const [v, setV] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); setErr(''); try { const r = await onSubmit(v); if (r) setErr(r); } catch (e) { setErr((e as Error).message); } setBusy(false); };
  return <Modal title={title} onClose={onClose}>
    {hint && <p className="muted small">{hint}</p>}
    <label>{label}</label>
    <input type={type} autoFocus value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
    {err && <div className="err">{err}</div>}
    <div className="row" style={{ marginTop: 14 }}><span className="sp" /><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={busy || !v} onClick={go}>{confirmText}</button></div>
  </Modal>;
}
export function Confirm({ text, onYes, onClose, yes = 'Delete' }: { text: string; onYes: () => void; onClose: () => void; yes?: string }) {
  return <Modal title="Are you sure?" onClose={onClose}><p>{text}</p>
    <div className="row"><span className="sp" /><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={() => { onYes(); onClose(); }}>{yes}</button></div></Modal>;
}
export const Empty = ({ text }: { text: string }) => <div className="card muted" style={{ textAlign: 'center', padding: 30 }}>{text}</div>;
export const Header = ({ title, children, sub }: { title: string; sub?: string; children?: ReactNode }) =>
  <div className="row" style={{ marginBottom: 16 }}><div className="sp"><h1>{title}</h1>{sub && <div className="muted small">{sub}</div>}</div>{children}</div>;
