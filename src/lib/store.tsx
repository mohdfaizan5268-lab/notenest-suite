import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { Data, emptyData } from './types';
import { idbGet, idbPut, idbDel, idbKeys } from './idb';
import * as C from './crypto';
import { b64, unb64, download } from './util';

interface Account {
  email: string; name: string; created: number;
  pw: { salt: string; iv: string; ct: string }; rec: { salt: string; iv: string; ct: string };
  pin?: { salt: string; hash: string };
  vault?: { salt: string; iv: string; ct: string };
}
interface Ctx {
  status: 'loading' | 'out' | 'in';
  user: { email: string; name: string } | null;
  hasPin: boolean; hasVault: boolean; locked: boolean; recovery: string | null; ackRecovery: () => void;
  data: Data; update: (fn: (d: Data) => void) => void;
  signup: (name: string, email: string, pw: string) => Promise<string>;
  login: (email: string, pw: string) => Promise<void>;
  logout: () => void;
  reset: (email: string, rec: string, newPw: string) => Promise<void>;
  changePassword: (oldPw: string, newPw: string) => Promise<void>;
  changeName: (n: string) => Promise<void>;
  setPin: (pin: string) => Promise<void>; clearPin: (pw: string) => Promise<void>;
  unlockPin: (pin: string) => Promise<boolean>; lockNow: () => void;
  putBlob: (id: string, bytes: Uint8Array, key?: CryptoKey) => Promise<void>;
  getBlob: (id: string, key?: CryptoKey) => Promise<Uint8Array>;
  delBlob: (id: string) => Promise<void>;
  vaultSetup: (pw: string) => Promise<CryptoKey>;
  vaultOpen: (pw: string) => Promise<CryptoKey | null>;
  exportBackup: () => Promise<void>;
  importBackup: (file: File) => Promise<string>;
  deleteAccount: (pw: string) => Promise<void>;
  storageUsed: () => Promise<{ used: number; quota: number }>;
}
const StoreCtx = createContext<Ctx>(null as unknown as Ctx);
export const useStore = () => useContext(StoreCtx);
const norm = (e: string) => e.trim().toLowerCase();
const SS = 'nn_session', LK = 'nn_locked';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Ctx['status']>('loading');
  const [acct, setAcct] = useState<Account | null>(null);
  const [data, setData] = useState<Data>(emptyData());
  const [locked, setLocked] = useState(false);
  const [recovery, setRecovery] = useState<string | null>(null);
  const master = useRef<CryptoKey | null>(null);
  const dirty = useRef(false);
  const timer = useRef<number>();
  const dataRef = useRef(data); dataRef.current = data;
  const acctRef = useRef(acct); acctRef.current = acct;

  const flush = useCallback(async () => {
    if (!dirty.current || !master.current || !acctRef.current) return;
    dirty.current = false;
    const s = await C.sealText(master.current, JSON.stringify(dataRef.current));
    await idbPut('data', acctRef.current.email, s);
  }, []);

  const update = useCallback((fn: (d: Data) => void) => {
    setData(prev => { const n = structuredClone(prev); fn(n); dataRef.current = n; return n; });
    dirty.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { flush(); }, 400);
  }, [flush]);

  const enter = useCallback(async (a: Account, key: CryptoKey) => {
    master.current = key;
    const sealed = await idbGet<C.Sealed>('data', a.email);
    let d = emptyData();
    if (sealed) d = { ...emptyData(), ...JSON.parse(await C.openText(key, sealed)) };
    dataRef.current = d; acctRef.current = a;
    setAcct(a); setData(d); setStatus('in');
    sessionStorage.setItem(SS, JSON.stringify({ email: a.email, key: await C.exportKey(key) }));
  }, []);

  // restore session on refresh
  useEffect(() => {
    (async () => {
      try {
        const s = sessionStorage.getItem(SS);
        if (s) {
          const { email, key } = JSON.parse(s);
          const a = await idbGet<Account>('accounts', email);
          if (a) { await enter(a, await C.importKey(key)); if (a.pin && sessionStorage.getItem(LK) === '1') setLocked(true); return; }
        }
      } catch { sessionStorage.removeItem(SS); }
      setStatus('out');
    })();
  }, [enter]);

  useEffect(() => {
    const f = () => { flush(); };
    const v = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('beforeunload', f); document.addEventListener('visibilitychange', v);
    return () => { window.removeEventListener('beforeunload', f); document.removeEventListener('visibilitychange', v); };
  }, [flush]);

  // idle auto-logout
  useEffect(() => {
    if (status !== 'in' || !data.settings.autoLogout) return;
    const ms = data.settings.autoLogout * 60000; let t = 0;
    const reset = () => { window.clearTimeout(t); t = window.setTimeout(() => { logoutRef.current(); }, ms); };
    const ev = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    ev.forEach(e => window.addEventListener(e, reset, { passive: true })); reset();
    return () => { window.clearTimeout(t); ev.forEach(e => window.removeEventListener(e, reset)); };
  }, [status, data.settings.autoLogout]);

  const logout = useCallback(async () => {
    window.clearTimeout(timer.current); await flush();
    master.current = null; acctRef.current = null;
    sessionStorage.removeItem(SS); sessionStorage.removeItem(LK);
    setAcct(null); setData(emptyData()); setLocked(false); setStatus('out');
  }, [flush]);
  const logoutRef = useRef(logout); logoutRef.current = logout;

  const api: Ctx = useMemo(() => ({
    status, user: acct ? { email: acct.email, name: acct.name } : null,
    hasPin: !!acct?.pin, hasVault: !!acct?.vault, locked, recovery, ackRecovery: () => setRecovery(null), data, update,
    async signup(name, email, pw) {
      email = norm(email);
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.');
      if (pw.length < 8) throw new Error('Password must be at least 8 characters.');
      if (await idbGet('accounts', email)) throw new Error('An account with this email already exists on this device. Log in instead.');
      const key = await C.newMasterKey();
      const recovery = C.newRecoveryKey();
      const a: Account = { email, name: name.trim() || 'Friend', created: Date.now(), pw: await C.wrapMaster(key, pw), rec: await C.wrapMaster(key, C.normRecovery(recovery)) };
      await idbPut('accounts', email, a);
      await idbPut('data', email, await C.sealText(key, JSON.stringify(emptyData())));
      setRecovery(recovery);
      await enter(a, key);
      return recovery;
    },
    async login(email, pw) {
      email = norm(email);
      const a = await idbGet<Account>('accounts', email);
      if (!a) throw new Error('No account with this email on this device. (Accounts live only in the browser where they were created — use Restore backup to move one.)');
      let key: CryptoKey;
      try { key = await C.unwrapMaster(a.pw, pw); } catch { throw new Error('Wrong password.'); }
      await enter(a, key);
    },
    logout,
    async reset(email, rec, newPw) {
      email = norm(email);
      if (newPw.length < 8) throw new Error('New password must be at least 8 characters.');
      const a = await idbGet<Account>('accounts', email);
      if (!a) throw new Error('No account with this email on this device.');
      let key: CryptoKey;
      try { key = await C.unwrapMaster(a.rec, C.normRecovery(rec)); } catch { throw new Error('That recovery key is not correct.'); }
      const n = { ...a, pw: await C.wrapMaster(key, newPw) };
      await idbPut('accounts', email, n); await enter(n, key);
    },
    async changePassword(oldPw, newPw) {
      if (newPw.length < 8) throw new Error('New password must be at least 8 characters.');
      const a = acctRef.current!;
      try { await C.unwrapMaster(a.pw, oldPw); } catch { throw new Error('Current password is wrong.'); }
      const n = { ...a, pw: await C.wrapMaster(master.current!, newPw) };
      await idbPut('accounts', n.email, n); setAcct(n);
    },
    async changeName(nm) { const n = { ...acctRef.current!, name: nm.trim() || 'Friend' }; await idbPut('accounts', n.email, n); setAcct(n); },
    async setPin(pin) {
      if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN must be 4 to 8 digits.');
      const salt = C.randBytes(16);
      const n = { ...acctRef.current!, pin: { salt: b64(salt), hash: await C.hashPin(pin, salt) } };
      await idbPut('accounts', n.email, n); setAcct(n);
    },
    async clearPin(pw) {
      const a = acctRef.current!;
      try { await C.unwrapMaster(a.pw, pw); } catch { throw new Error('Wrong password.'); }
      const n = { ...a }; delete n.pin; await idbPut('accounts', n.email, n); setAcct(n); setLocked(false); sessionStorage.removeItem(LK);
    },
    async unlockPin(pin) {
      const p = acctRef.current?.pin; if (!p) return true;
      if ((await C.hashPin(pin, unb64(p.salt))) === p.hash) { setLocked(false); sessionStorage.removeItem(LK); return true; }
      return false;
    },
    lockNow() { if (acctRef.current?.pin) { sessionStorage.setItem(LK, '1'); setLocked(true); } },
    async putBlob(id, bytes, key) {
      const s = await C.seal(key || master.current!, bytes);
      await idbPut('blobs', acctRef.current!.email + ':' + id, s);
    },
    async getBlob(id, key) {
      const s = await idbGet<C.Sealed>('blobs', acctRef.current!.email + ':' + id);
      if (!s) throw new Error('File data not found.');
      return C.open(key || master.current!, s);
    },
    async delBlob(id) { await idbDel('blobs', acctRef.current!.email + ':' + id); },
    async vaultSetup(pw) {
      if (pw.length < 6) throw new Error('Vault password must be at least 6 characters.');
      const salt = C.randBytes(16); const k = await C.deriveKey(pw, salt);
      const v = { salt: b64(salt), ...(await C.sealText(k, 'vault-ok')) };
      const n = { ...acctRef.current!, vault: v }; await idbPut('accounts', n.email, n); setAcct(n); return k;
    },
    async vaultOpen(pw) {
      const v = acctRef.current?.vault; if (!v) return null;
      try { const k = await C.deriveKey(pw, unb64(v.salt)); if ((await C.openText(k, v)) === 'vault-ok') return k; } catch { /* wrong */ }
      return null;
    },
    async exportBackup() {
      await flush();
      const a = acctRef.current!; const email = a.email;
      const d = await idbGet('data', email);
      const keys = (await idbKeys('blobs')).map(String).filter(k => k.startsWith(email + ':'));
      const blobs: Record<string, unknown> = {};
      for (const k of keys) blobs[k.slice(email.length + 1)] = await idbGet('blobs', k);
      const out = { app: 'notenest-suite', version: 1, exported: new Date().toISOString(), account: a, data: d, blobs };
      download(`notenest-backup-${new Date().toISOString().slice(0, 10)}.nnbackup`, new Blob([JSON.stringify(out)], { type: 'application/json' }));
    },
    async importBackup(file) {
      let o: any;
      try { o = JSON.parse(await file.text()); } catch { throw new Error('This file is not a valid NoteNest backup.'); }
      if (o?.app !== 'notenest-suite' || !o.account?.email || !o.data) throw new Error('This file is not a NoteNest backup.');
      const email = o.account.email as string;
      await idbPut('accounts', email, o.account); await idbPut('data', email, o.data);
      for (const [id, v] of Object.entries(o.blobs || {})) await idbPut('blobs', email + ':' + id, v);
      return email;
    },
    async deleteAccount(pw) {
      const a = acctRef.current!;
      try { await C.unwrapMaster(a.pw, pw); } catch { throw new Error('Wrong password.'); }
      for (const k of (await idbKeys('blobs')).map(String).filter(k => k.startsWith(a.email + ':'))) await idbDel('blobs', k);
      await idbDel('data', a.email); await idbDel('accounts', a.email);
      dirty.current = false; await logout();
    },
    async storageUsed() {
      const e = await navigator.storage?.estimate?.();
      return { used: e?.usage || 0, quota: e?.quota || 0 };
    },
  }), [status, acct, locked, recovery, data, update, logout, flush, enter]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}
