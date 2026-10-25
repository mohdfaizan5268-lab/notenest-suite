// Tiny client for the shared class library (Supabase / Bolt Database REST API).
// Only PUBLIC class notes live online. Private NoteNest data never goes here.
const BASE = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) || '').replace(/\/$/, '');
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';
export const cloudConfigured = !!(BASE && ANON);
export const MAX_FILE = 10 * 1024 * 1024;
export const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md', 'csv'];

export interface CloudUser { id: string; email: string; name: string }
interface Session { access_token: string; refresh_token: string; expires_at: number; user: CloudUser }
export interface SharedNote {
  id: string; user_id: string; author_name: string; title: string; subject: string; semester: string | null; description: string;
  body?: string; tags: string[]; file_path: string | null; file_name: string | null; file_type: string | null; file_size: number | null; created_at: string;
}
const SK = 'nn_cloud_session';
let sess: Session | null = null;
const listeners = new Set<() => void>();
export const onCloudChange = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
const emit = () => listeners.forEach(f => f());

function load() { try { const s = localStorage.getItem(SK); sess = s ? JSON.parse(s) : null; } catch { sess = null; } }
function save(s: Session | null) { sess = s; try { if (s) localStorage.setItem(SK, JSON.stringify(s)); else localStorage.removeItem(SK); } catch { /* storage blocked */ } emit(); }
load();
export const cloudUser = (): CloudUser | null => sess?.user || null;

function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Wrong email or password.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'This email is already registered. Use Sign in.';
  if (m.includes('password') && m.includes('at least')) return 'Password must be at least 6 characters.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first (check your inbox), then sign in.';
  if (m.includes('row-level security') || m.includes('permission denied') || m.includes('policy')) return 'The class library is not fully set up yet (database permissions). Ask the admin to run the setup SQL.';
  if (m.includes('relation') && m.includes('does not exist')) return 'The class library table does not exist yet. Ask the admin to run the setup SQL.';
  if (m.includes('bucket not found')) return 'The file storage bucket is missing. Ask the admin to run the setup SQL.';
  return msg;
}
async function parseErr(r: Response): Promise<string> {
  try { const j = await r.json(); return friendly(j.error_description || j.msg || j.message || j.error || r.statusText); } catch { return friendly(r.statusText || 'Request failed'); }
}
async function refresh(): Promise<void> {
  if (!sess) return;
  const r = await fetch(`${BASE}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: sess.refresh_token }) });
  if (!r.ok) { save(null); return; }
  save(toSession(await r.json()));
}
function toSession(j: any): Session {
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600),
    user: { id: j.user.id, email: j.user.email, name: j.user.user_metadata?.display_name || j.user.email.split('@')[0] } };
}
async function call(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  if (!cloudConfigured) throw new Error('The class library is not connected yet (missing Supabase settings).');
  if (sess && sess.expires_at - 60 < Date.now() / 1000) await refresh();
  const headers: Record<string, string> = { apikey: ANON, Authorization: 'Bearer ' + (sess?.access_token || ANON), ...(init.headers as Record<string, string> || {}) };
  let r: Response;
  try { r = await fetch(BASE + path, { ...init, headers }); } catch { throw new Error('Could not reach the class library. Check your internet connection.'); }
  if (r.status === 401 && sess && retry) { await refresh(); return call(path, init, false); }
  return r;
}
export async function signUp(name: string, email: string, password: string): Promise<'ok' | 'confirm'> {
  if (!cloudConfigured) throw new Error('The class library is not connected yet.');
  const r = await fetch(`${BASE}/auth/v1/signup`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), password, data: { display_name: name.trim() } }) });
  if (!r.ok) throw new Error(await parseErr(r));
  const j = await r.json();
  if (j.access_token) { save(toSession(j)); return 'ok'; }
  return 'confirm';
}
export async function signIn(email: string, password: string): Promise<void> {
  if (!cloudConfigured) throw new Error('The class library is not connected yet.');
  const r = await fetch(`${BASE}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), password }) });
  if (!r.ok) throw new Error(await parseErr(r));
  save(toSession(await r.json()));
}
export function signOut() { save(null); }

const LIST_COLS = 'id,user_id,author_name,title,subject,semester,description,tags,file_path,file_name,file_type,file_size,created_at';
export async function listNotes(): Promise<SharedNote[]> {
  const r = await call(`/rest/v1/shared_notes?select=${LIST_COLS}&order=created_at.desc&limit=300`);
  if (!r.ok) throw new Error(await parseErr(r)); return r.json();
}
export async function getNote(id: string): Promise<SharedNote> {
  const r = await call(`/rest/v1/shared_notes?select=*&id=eq.${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error(await parseErr(r));
  const a = await r.json(); if (!a.length) throw new Error('This note no longer exists.'); return a[0];
}
export async function createNote(n: Omit<SharedNote, 'id' | 'user_id' | 'created_at'>): Promise<SharedNote> {
  if (!sess) throw new Error('Please sign in to share notes.');
  const r = await call('/rest/v1/shared_notes', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ ...n, user_id: sess.user.id }) });
  if (!r.ok) throw new Error(await parseErr(r)); return (await r.json())[0];
}
const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');
export async function uploadFile(f: File): Promise<string> {
  if (!sess) throw new Error('Please sign in to share notes.');
  const safe = f.name.replace(/[^\w.\-]+/g, '_').slice(-80);
  const path = `${sess.user.id}/${Date.now()}-${safe}`;
  const r = await call(`/storage/v1/object/shared-files/${enc(path)}`, { method: 'POST', headers: { 'Content-Type': f.type || 'application/octet-stream', 'x-upsert': 'false' }, body: f });
  if (!r.ok) throw new Error(await parseErr(r)); return path;
}
export const fileUrl = (path: string) => `${BASE}/storage/v1/object/public/shared-files/${enc(path)}`;
export async function deleteNote(n: { id: string; file_path: string | null }): Promise<void> {
  const r = await call(`/rest/v1/shared_notes?id=eq.${encodeURIComponent(n.id)}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(await parseErr(r));
  if (n.file_path) await call(`/storage/v1/object/shared-files/${enc(n.file_path)}`, { method: 'DELETE' }).catch(() => {});
}
