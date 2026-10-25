export interface Faq { id: string; kw: string[]; a: string; route?: string; label?: string }

export const FAQS: Faq[] = [
  { id: 'start', kw: ['start', 'begin', 'getting', 'first', 'new', 'how', 'use', 'site', 'app', 'guide', 'tour', 'what'], a: 'NoteNest is your private study & life workspace. Use the left menu: Notes for writing, Drawing for sketches, Journal for daily entries, Habits for streaks, Tasks & Focus for to-dos and the Pomodoro timer, Calendar for events, Media Vault for private files, and Smart Assistant for summaries. Everything is encrypted and stays in this browser.', route: 'dashboard', label: 'Open Dashboard' },
  { id: 'note', kw: ['note', 'notes', 'write', 'create', 'markdown', 'edit'], a: 'Go to Notes → New note. Type a title and your text. Use Markdown (# Heading, **bold**, - [ ] checklist) or switch to "Blocks" for a block editor. It saves automatically. Use "From template" for ready-made study or meeting notes.', route: 'notes', label: 'Open Notes' },
  { id: 'lock', kw: ['lock', 'locked', 'password', 'protect', 'private', 'secret', 'hide'], a: 'Open a note and click "Lock", then choose a password just for that note. It is separate from your login password. If you forget a note password, that note cannot be recovered. Click "Remove lock" later to unlock it for good.', route: 'notes', label: 'Open Notes' },
  { id: 'folder', kw: ['folder', 'folders', 'organize', 'organise', 'tag', 'tags', 'favorite', 'favourite', 'archive'], a: 'In Notes, use the small folder button on the left to create folders (you can add sub-folders too). Inside a note you can pick its folder and add #tags, star it as a favorite, or archive it.', route: 'notes', label: 'Open Notes' },
  { id: 'trash', kw: ['delete', 'deleted', 'trash', 'bin', 'recycle', 'restore', 'recover', 'lost', 'undo'], a: 'Deleting a note moves it to the Recycle bin (Notes → Recycle bin). You can Restore it from there, or "Delete forever". Older text can be brought back with the History button inside a note (version history).', route: 'notes', label: 'Open Notes' },
  { id: 'version', kw: ['history', 'version', 'versions', 'previous', 'older'], a: 'Inside a note click "History" to see saved versions. Versions are saved automatically as you edit, or press "Save a version now". Click Restore on one to go back (your current text is saved as a version first). Locked notes do not keep versions.', route: 'notes', label: 'Open Notes' },
  { id: 'draw', kw: ['draw', 'drawing', 'sketch', 'pen', 'pencil', 'paint', 'canvas', 'highlighter', 'eraser'], a: 'Open Drawing → New drawing. Pick a tool (pen, pencil, marker, highlighter, eraser, line, rectangle, ellipse), choose a colour or type a HEX code, and draw with mouse, finger or stylus. Undo/Redo are below the canvas.', route: 'draw', label: 'Open Drawing' },
  { id: 'export', kw: ['export', 'download', 'png', 'jpg', 'jpeg', 'svg', 'pdf', 'print', 'save', 'file'], a: 'Drawings: use the PNG / JPG / SVG / PDF buttons under the canvas. Notes: use ".md" to download Markdown, or "PDF" to open the print window and choose "Save as PDF". Settings has a readable JSON export of everything.', route: 'draw', label: 'Open Drawing' },
  { id: 'journal', kw: ['journal', 'diary', 'mood', 'entry', 'entries', 'weather', 'voice', 'photo', 'reflect', 'reflection'], a: 'Journal lets you write one entry per day with a mood, a prompt, a photo, a voice note and the weather. For weather, first set your city in Settings. "Reflect" gives a summary of your last 30 days. Photos and voice notes are encrypted.', route: 'journal', label: 'Open Journal' },
  { id: 'habit', kw: ['habit', 'habits', 'streak', 'streaks', 'daily', 'weekly', 'monthly', 'routine'], a: 'In Habits click "New habit", choose daily, weekly or monthly, and optionally a reminder time. Press "Mark done today" (or click past days to fix them). The flame shows your current streak; "best" is your longest streak.', route: 'habits', label: 'Open Habits' },
  { id: 'task', kw: ['task', 'tasks', 'todo', 'to-do', 'checklist', 'due', 'priority', 'recurring', 'repeat', 'goal', 'goals'], a: 'In Tasks & Focus add a task, set priority and due date, and optionally make it repeat daily, weekly or monthly. Click "Checklist" on a task to add steps. The Goals tab tracks progress from the tasks linked to a goal.', route: 'tasks', label: 'Open Tasks' },
  { id: 'pomo', kw: ['pomodoro', 'focus', 'timer', 'study', 'concentrate', 'break'], a: 'Go to Tasks & Focus → Pomodoro. Set work and break minutes, press "Start focus". When it ends you get an alert and the session is logged in your focus report. The page must stay open in a tab to alert you.', route: 'tasks', label: 'Open Pomodoro' },
  { id: 'cal', kw: ['calendar', 'event', 'events', 'schedule', 'reminder', 'reminders', 'exam', 'ics', 'google', 'outlook', 'sync'], a: 'Calendar has Month, Week and Day views. Click a day or "New event" to add one with a time, repeat and reminder. Google/Outlook live sync is not possible in this free app, but you can Export .ics and import it into Google Calendar or Outlook (and import theirs here).', route: 'calendar', label: 'Open Calendar' },
  { id: 'vault', kw: ['vault', 'media', 'photos', 'videos', 'audio', 'documents', 'files', 'upload', 'secure'], a: 'Media Vault stores images, videos, audio and documents encrypted with AES-256. The first time you create a separate vault password (we cannot recover it). Use "Hide" on a file to put it in the hidden section, shown with "Show hidden".', route: 'vault', label: 'Open Vault' },
  { id: 'ai', kw: ['assistant', 'summarize', 'summary', 'summarise', 'ai', 'suggest', 'suggestions', 'insights', 'breakdown', 'smart'], a: 'Smart Assistant can summarize a note, improve your writing, break a big goal into steps (and add it as a task), give habit insights, reflect on your journal, suggest what to do next, and search your notes. These work offline. "Ask Gemini" needs your own API key in Settings.', route: 'ai', label: 'Open Assistant' },
  { id: 'gemini', kw: ['gemini', 'api', 'key', 'google'], a: 'To use Gemini: get a key at aistudio.google.com, then paste it in Settings → Optional: Gemini key. It is stored encrypted in your browser. Then the Smart Assistant "Ask Gemini" tab and this chat helper can use it.', route: 'settings', label: 'Open Settings' },
  { id: 'search', kw: ['search', 'find', 'look'], a: 'Open Search in the menu and type — it looks through notes, journal, tasks, habits, events, drawings and vault file names. Locked notes only match by title.', route: 'search', label: 'Open Search' },
  { id: 'forgot', kw: ['forgot', 'forget', 'reset', 'recovery', 'login', 'cant', "can't", 'cannot', 'locked'], a: 'If you forgot your password: on the login screen click "Forgot password", enter your email, your recovery key (shown when you signed up) and a new password. Without the recovery key your data cannot be opened — nobody can recover it for you.' },
  { id: 'pin', kw: ['pin', 'screen', 'biometric', 'fingerprint', 'face'], a: 'Profile → PIN screen lock sets a 4–8 digit PIN. "Lock now" hides the screen until you enter it. Fingerprint/face unlock is not available in a web app like this. Your data is protected by your password.', route: 'profile', label: 'Open Profile' },
  { id: 'backup', kw: ['backup', 'restore', 'device', 'phone', 'laptop', 'move', 'transfer', 'another', 'switch', 'lost', 'data'], a: 'Your data is stored only in the browser you use. To save or move it: Profile → "Download encrypted backup". On the other browser/device open the login screen, click "Restore backup", choose the file, then log in with the same email and password. Clearing browser data erases everything, so back up often.', route: 'profile', label: 'Open Profile' },
  { id: 'safe', kw: ['safe', 'safety', 'secure', 'security', 'privacy', 'private', 'encrypted', 'encryption', 'see', 'someone', 'else', 'server', 'cloud'], a: 'Your notes never leave your browser. They are encrypted (AES-256) with a key unlocked by your password. There is no server, so nobody else can read them — not even us. Another person on the same browser can only see them if they know your password.' },
  { id: 'logout', kw: ['logout', 'log', 'out', 'idle', 'auto'], a: 'Use "Log out" at the bottom of the menu. Settings → Auto-logout can log you out after 5–60 idle minutes.', route: 'settings', label: 'Open Settings' },
  { id: 'theme', kw: ['theme', 'dark', 'light', 'font', 'size', 'bigger', 'text', 'appearance', 'mode'], a: 'Settings → Appearance lets you switch Light/Dark, pick a font and change the text size.', route: 'settings', label: 'Open Settings' },
  { id: 'notif', kw: ['notification', 'notifications', 'alert', 'alerts', 'popup', 'pop-up', 'remind'], a: 'The Notifications page lists reminders for events, habits and tasks due today. For pop-up alerts, click "Enable pop-ups" there and allow it in your browser. Reminders only fire while NoteNest is open in a tab.', route: 'notifications', label: 'Open Notifications' },
  { id: 'dash', kw: ['dashboard', 'score', 'productivity', 'home'], a: 'The Dashboard shows today at a glance. The productivity score averages: habits done, tasks done (due today or overdue), focus minutes against a 50-minute goal, and whether you wrote a journal entry today. Use Quick create to add a note or task fast.', route: 'dashboard', label: 'Open Dashboard' },
  { id: 'delacct', kw: ['account', 'delete', 'profile', 'name', 'email', 'change'], a: 'Profile lets you change your name and password, set a PIN, download a backup, see storage used, or delete your account (this erases everything from this browser).', route: 'profile', label: 'Open Profile' },
];

FAQS.unshift({ id: 'share', kw: ['share', 'sharing', 'classmates', 'class', 'library', 'upload', 'everyone', 'friends', 'students'], a: 'Class Notes is the heart of NoteNest: notes uploaded there are visible to everyone in your class. To upload: open Class Notes → "Upload notes" (or open any note → "Upload to class notes"), sign in once, type your name and a title, write notes and/or attach a PDF/image/Word file, then press "Upload notes". The upload date and time are saved automatically. Anyone can browse and search without an account. You can delete your own uploads later.', route: 'library', label: 'Open Class Notes' });
export const SUGGESTED = ['How do I upload notes for my class?', 'How do I get started?', 'How do I lock a note?', 'I forgot my password', 'How do I back up my data?', 'How do I use Pomodoro?'];

const STOP = new Set('i a an the to do is are can my me of in on it how what where when why does this that and or for with you your'.split(' '));
const tok = (s: string) => (s.toLowerCase().match(/[a-z0-9'-]+/g) || []);

const RULES: [RegExp, string][] = [
  [/share|sharing|classmate|class library|upload|everyone|friends/i, 'share'],
  [/forgot|forget|reset|recovery key|can'?t (log|sign)|cannot (log|sign)/i, 'forgot'],
  [/vault/i, 'vault'], [/\bpin\b|fingerprint|biometric|face (id|unlock)/i, 'pin'],
  [/back ?up|restore|another (device|browser)|phone|laptop|move my|transfer|switch (device|browser)/i, 'backup'],
  [/gemini|api key/i, 'gemini'], [/lock/i, 'lock'],
  [/safe|secur|privacy|encrypt|who can (see|read)|someone else/i, 'safe'],
  [/pomodoro|focus|timer/i, 'pomo'], [/pdf|png|jpe?g|svg|export|download|print/i, 'export'],
  [/recycle|trash|deleted|restore/i, 'trash'], [/history|version/i, 'version'],
  [/streak|habit/i, 'habit'], [/journal|diary|mood/i, 'journal'], [/calendar|event|exam|\.ics|outlook/i, 'cal'],
  [/draw|sketch|pen\b|pencil/i, 'draw'], [/dark|theme|font/i, 'theme'], [/notification|reminder|alert/i, 'notif'],
  [/score|dashboard/i, 'dash'], [/task|to-?do|goal/i, 'task'], [/folder|tag/i, 'folder'], [/search/i, 'search'],
  [/summar|assistant|suggest/i, 'ai'], [/log ?out|idle/i, 'logout'], [/delete.*account|change.*(name|password)|profile/i, 'delacct'],
];
export function localAnswer(q: string): { text: string; route?: string; label?: string } {
  const words = tok(q).filter(w => !STOP.has(w));
  if (!words.length) return { text: 'Ask me anything about using NoteNest — for example "How do I lock a note?"' };
  for (const [re, id] of RULES) if (re.test(q)) { const f = FAQS.find(x => x.id === id)!; return { text: f.a, route: f.route, label: f.label }; }
  let best: Faq | null = null; let bestScore = 0;
  for (const f of FAQS) {
    if (f.id === 'start') continue;
    let sc = 0; for (const w of words) if (f.kw.includes(w)) sc += 2; else if (f.kw.some(k => k.length > 3 && (k.startsWith(w) || w.startsWith(k)) && w.length > 3)) sc += 1;
    if (sc > bestScore) { best = f; bestScore = sc; }
  }
  if (best && bestScore >= 2) return { text: best.a, route: best.route, label: best.label };
  if (/\b(start|begin|guide|tour|help|get started)\b/i.test(q)) { const f = FAQS[0]; return { text: f.a, route: f.route, label: f.label }; }
  return { text: "I'm not sure about that one. I can help with notes, drawing, journal, habits, tasks, Pomodoro, calendar, vault, backup, passwords and settings. Try one of the suggestions below, or add a Gemini key in Settings so I can answer more freely." };
}

export const GUIDE_FOR_AI = `You are "NoteNest Guide", a friendly helper inside the NoteNest Suite web app used by college students. Answer ONLY questions about how to use NoteNest Suite. If asked something unrelated, politely say you can only help with NoteNest. Keep answers short (under 120 words), use simple English, and give clear click-by-click steps. Never invent features that are not listed. If a feature is not available, say so honestly.

FACTS ABOUT THE APP:
${FAQS.map(f => '- ' + f.a).join('\n')}
- Not available: email OTP, Google login, fingerprint/face unlock, live Google/Outlook sync, syncing between devices (use backup/restore), reminders when the app is closed.
`;
