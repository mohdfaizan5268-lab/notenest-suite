import { useStore } from '../lib/store';
import { Header, useToast } from '../components/ui';
import { askNotif } from '../lib/notify';
import { download } from '../lib/util';

export default function SettingsScreen() {
  const s = useStore(); const toast = useToast(); const st = s.data.settings;
  const set = (fn: (x: typeof st) => void) => s.update(d => { fn(d.settings); });
  const exportPlain = () => {
    const d = s.data; const out = { exported: new Date().toISOString(), notes: d.notes.filter(n => !n.lock).map(n => ({ title: n.title, body: n.mode === 'blocks' ? n.blocks.map(b => b.text).join('\n') : n.body, tags: n.tags, updated: new Date(n.updated).toISOString() })), journals: d.journals, habits: d.habits, tasks: d.tasks, events: d.events };
    download('notenest-export.json', new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
  };
  return <>
    <Header title="Settings" />
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <div className="card"><h3>Appearance</h3>
        <label>Theme</label><select value={st.theme} onChange={e => set(x => { x.theme = e.target.value as 'light'; })} aria-label="Theme"><option value="light">Light</option><option value="dark">Dark</option></select>
        <label>Font</label><select value={st.font} onChange={e => set(x => { x.font = e.target.value as 'sans'; })} aria-label="Font"><option value="sans">Sans-serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select>
        <label>Text size: {st.fontSize}px</label><input type="range" min={13} max={22} value={st.fontSize} onChange={e => set(x => { x.fontSize = +e.target.value; })} aria-label="Text size" /></div>
      <div className="card"><h3>Security</h3>
        <label>Auto-logout when idle</label><select value={st.autoLogout} onChange={e => set(x => { x.autoLogout = +e.target.value; })} aria-label="Auto logout"><option value={0}>Never</option><option value={5}>5 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option></select>
        <p className="muted small">PIN lock, password change and backup are in <a href="#/profile">Profile</a>.</p></div>
      <div className="card"><h3>Notifications</h3>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--ink)' }}><input type="checkbox" checked={st.notifications} onChange={async e => { if (e.target.checked) { if (await askNotif()) set(x => { x.notifications = true; }); else toast('Permission was not granted'); } else set(x => { x.notifications = false; }); }} /> Browser pop-up alerts</label>
        <p className="muted small">In-app notifications always work. Pop-ups need your browser's permission and the app open in a tab.</p></div>
      <div className="card"><h3>Weather for journal</h3><label>Your city</label><input type="text" value={st.city} onChange={e => set(x => { x.city = e.target.value; })} placeholder="e.g. Hyderabad" aria-label="City" /></div>
      <div className="card"><h3>Optional: Gemini key</h3><p className="muted small">For the "Ask Gemini" tab only. Stored encrypted in this browser; sent only to Google when you ask.</p><input type="password" value={st.geminiKey} onChange={e => set(x => { x.geminiKey = e.target.value.trim(); })} placeholder="AI Studio API key" aria-label="Gemini key" /></div>
      <div className="card"><h3>Export</h3><p className="muted small">Readable (unencrypted) copy of your unlocked notes, journal, habits, tasks and events. Keep the file private.</p><button className="btn" onClick={exportPlain}>Export readable JSON</button> <button className="btn" onClick={() => s.exportBackup()}>Encrypted backup</button></div>
    </div>
  </>;
}
