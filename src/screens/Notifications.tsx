import { Bell } from 'lucide-react';
import { useStore } from '../lib/store';
import { fmtTs } from '../lib/util';
import { askNotif, notifSupported } from '../lib/notify';
import { Header, Empty, useToast } from '../components/ui';

export default function Notifications() {
  const s = useStore(); const toast = useToast(); const n = s.data.notifs;
  return <>
    <Header title="Notifications" sub="Reminders for events, habits and tasks due today">
      <button className="btn" onClick={() => s.update(d => { d.notifs.forEach(x => { x.read = true; }); })}>Mark all read</button>
      <button className="btn bad" onClick={() => s.update(d => { d.notifs = []; })}>Clear all</button></Header>
    <div className="card" style={{ marginBottom: 14 }}><div className="row"><Bell size={16} /><span className="sp small">Pop-up alerts: <b>{!notifSupported() ? 'not supported in this browser' : s.data.settings.notifications && Notification.permission === 'granted' ? 'on' : 'off'}</b>. Reminders only fire while NoteNest is open in a browser tab.</span>
      {notifSupported() && <button className="btn sm" onClick={async () => { if (await askNotif()) { s.update(d => { d.settings.notifications = true; }); toast('Pop-up alerts enabled'); } else toast('Permission was not granted'); }}>Enable pop-ups</button>}</div></div>
    {n.length === 0 ? <Empty text="No notifications yet." /> : n.map(x => <div key={x.id} className="item click" style={{ opacity: x.read ? .6 : 1 }} onClick={() => s.update(d => { d.notifs.find(y => y.id === x.id)!.read = true; })}><span>{x.read ? '' : '🔵'}</span><span className="sp">{x.text}</span><span className="muted small">{fmtTs(x.at)}</span></div>)}
  </>;
}
