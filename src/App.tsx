import { useEffect, useState } from 'react';
import { LayoutDashboard, Share2, FileText, PenTool, BookHeart, Repeat, CheckSquare, CalendarDays, Lock, Sparkles, Search, Bell, User, Settings as Cog, Menu, LogOut, Shield } from 'lucide-react';
import { useStore } from './lib/store';
import { ToastProvider } from './components/ui';
import { eventsOn } from './lib/cal';
import { today, uid } from './lib/util';
import { showNotif } from './lib/notify';
import Chatbot from './components/Chatbot';
import Auth, { RecoveryScreen } from './screens/Auth';
import Dashboard from './screens/Dashboard';
import Library from './screens/Library';
import Notes from './screens/Notes';
import Draw from './screens/Draw';
import Journal from './screens/Journal';
import Habits from './screens/Habits';
import Tasks from './screens/Tasks';
import Calendar from './screens/Calendar';
import Vault from './screens/Vault';
import AI from './screens/AI';
import SearchScreen from './screens/Search';
import Notifications from './screens/Notifications';
import Profile from './screens/Profile';
import SettingsScreen from './screens/Settings';

const NAV = [
  ['library', 'Class Notes', Share2], ['dashboard', 'Dashboard', LayoutDashboard], ['notes', 'Notes', FileText], ['draw', 'Drawing', PenTool], ['journal', 'Journal', BookHeart],
  ['habits', 'Habits', Repeat], ['tasks', 'Tasks & Focus', CheckSquare], ['calendar', 'Calendar', CalendarDays], ['vault', 'Media Vault', Lock],
  ['ai', 'Smart Assistant', Sparkles], ['search', 'Search', Search], ['notifications', 'Notifications', Bell], ['profile', 'Profile', User], ['settings', 'Settings', Cog],
] as const;

export function useRoute(): [string, (r: string) => void] {
  const get = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'library');
  const [r, setR] = useState(get());
  useEffect(() => { const f = () => setR(get()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return [r, (x: string) => { location.hash = '/' + x; }];
}

function LockScreen() {
  const s = useStore(); const [pin, setPin] = useState(''); const [err, setErr] = useState('');
  const go = async () => { if (!(await s.unlockPin(pin))) { setErr('Wrong PIN'); setPin(''); } };
  return <div className="lock"><div className="card" style={{ width: 320, textAlign: 'center' }}>
    <Shield size={32} color="var(--pri)" /><h2>NoteNest is locked</h2>
    <input type="password" inputMode="numeric" autoFocus placeholder="Enter PIN" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} aria-label="PIN" />
    {err && <div className="err">{err}</div>}
    <button className="btn pri" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} onClick={go}>Unlock</button>
    <button className="btn" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} onClick={s.logout}>Log out instead</button>
  </div></div>;
}

function Shell() {
  const s = useStore(); const [route, go] = useRoute(); const [open, setOpen] = useState(false);
  const unread = s.data.notifs.filter(n => !n.read).length;
  const { theme, font, fontSize } = s.data.settings;
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.dataset.font = font; document.documentElement.style.setProperty('--fs', fontSize + 'px'); }, [theme, font, fontSize]);

  // reminder scheduler (only runs while the app is open in a tab)
  useEffect(() => {
    const tick = () => {
      const now = new Date(); const t = today(); const hm = now.toTimeString().slice(0, 5);
      const fire: { key: string; text: string }[] = [];
      for (const e of eventsOn(s.data.events, t)) {
        if (!e.time || !e.remind) continue;
        const [h, m] = e.time.split(':').map(Number); const at = h * 60 + m - e.remind; const cur = now.getHours() * 60 + now.getMinutes();
        if (cur >= at && cur <= h * 60 + m) fire.push({ key: `ev:${e.id}:${t}`, text: `${e.title} at ${e.time}` });
      }
      for (const h of s.data.habits) if (!h.archived && h.remind && h.remind <= hm && !h.done.includes(t)) fire.push({ key: `hb:${h.id}:${t}`, text: `Habit reminder: ${h.name}` });
      for (const k of s.data.tasks) if (!k.done && k.due === t) fire.push({ key: `tk:${k.id}:${t}`, text: `Task due today: ${k.title}` });
      const fresh = fire.filter(f => !s.data.fired.includes(f.key));
      if (fresh.length) {
        s.update(d => { fresh.forEach(f => { d.fired.push(f.key); d.notifs.unshift({ id: uid(), at: Date.now(), text: f.text, read: false }); }); d.fired = d.fired.slice(-400); d.notifs = d.notifs.slice(0, 200); });
        if (s.data.settings.notifications) fresh.forEach(f => showNotif(f.text));
      }
    };
    tick(); const i = window.setInterval(tick, 30000); return () => window.clearInterval(i);
  }, [s.data.events, s.data.habits, s.data.tasks, s.data.fired, s.data.settings.notifications]); // eslint-disable-line

  const Screen = { library: Library, dashboard: Dashboard, notes: Notes, draw: Draw, journal: Journal, habits: Habits, tasks: Tasks, calendar: Calendar, vault: Vault, ai: AI, search: SearchScreen, notifications: Notifications, profile: Profile, settings: SettingsScreen }[route] || Library;
  return <div className="app">
    <div className="top noprint"><button className="btn ico" aria-label="Menu" onClick={() => setOpen(!open)}><Menu size={18} /></button><b>NoteNest Suite</b></div>
    <nav className={'side noprint' + (open ? ' open' : '')} aria-label="Main">
      <div className="brand"><i>N</i> NoteNest</div>
      {NAV.map(([id, label, Icon]) => <a key={id} href={'#/' + id} className={'nav' + (route === id ? ' on' : '')} onClick={() => setOpen(false)}>
        <Icon size={17} /> {label}{id === 'notifications' && unread > 0 && <span className="badge">{unread}</span>}</a>)}
      <span className="sp" />
      {s.hasPin && <button className="nav" onClick={s.lockNow}><Shield size={17} /> Lock now</button>}
      <button className="nav" onClick={s.logout}><LogOut size={17} /> Log out</button>
    </nav>
    <main className="main" key={route}><Screen go={go} /></main>
    <Chatbot go={go} />
    {s.locked && <LockScreen />}
  </div>;
}

function GuestShell({ onBack }: { onBack: () => void }) {
  return <div style={{ maxWidth: 1000, margin: '0 auto', padding: '16px 14px 60px' }}>
    <div className="row" style={{ marginBottom: 14 }}><div className="brand" style={{ padding: 0 }}><i>N</i> NoteNest Class Notes</div><span className="sp" /><button className="btn" onClick={onBack}>Log in / Sign up</button></div>
    <Library guest />
  </div>;
}

export default function App() {
  const s = useStore(); const [guest, setGuest] = useState(false);
  if (s.status === 'loading') return <div className="auth muted">Loading…</div>;
  return <ToastProvider>{s.status === 'out' ? (guest ? <GuestShell onBack={() => setGuest(false)} /> : <Auth onBrowse={() => setGuest(true)} />) : s.recovery ? <RecoveryScreen /> : <Shell />}</ToastProvider>;
}
