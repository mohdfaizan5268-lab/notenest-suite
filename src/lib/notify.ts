export const notifSupported = () => typeof Notification !== 'undefined';
export async function askNotif(): Promise<boolean> {
  if (!notifSupported()) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}
export function showNotif(text: string) {
  try { if (notifSupported() && Notification.permission === 'granted') new Notification('NoteNest', { body: text, icon: '/favicon.svg' }); } catch { /* ignore */ }
}
