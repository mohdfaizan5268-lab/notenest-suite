# NoteNest Suite

A free workspace built so students can **share class notes with each other**, plus private notes, drawing, journal, habits, tasks + Pomodoro, calendar, encrypted media vault and a smart assistant. Your *private* notes, journal, habits and files are stored encrypted inside your own browser. The **Class Notes** is the shared part: notes you choose to share are public to the whole class.

## Run it on your computer
```
npm install
npm run dev        # opens http://localhost:5173
npm run build      # production build into dist/
```

## Put it on GitHub, then Render (free)
1. On github.com click **New repository** → name it `notenest-suite` → Create (leave it empty).
2. Unzip this project. In the folder open a terminal and run:
   ```
   git init
   git add .
   git commit -m "NoteNest Suite"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/notenest-suite.git
   git push -u origin main
   ```
3. On render.com: **New +** → **Static Site** → connect the repo.
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - No environment variables are needed.
4. Click **Create Static Site**. When it finishes, your link is shown at the top.
   (`render.yaml` is included, so **New + → Blueprint** also works.)

## Turn on class sharing (one-time, ~10 minutes)
The Class Notes uses the same free online database as the class notes app.
1. **Create the table and file storage.** Open `supabase-setup.sql` in this project and copy everything. In your Bolt project (or the Supabase SQL editor) paste it and run it. In Bolt you can say: *"Run this SQL as a migration"* and paste it. It is safe to run twice.
2. **Add two settings on Render.** Render → your `notenest-suite` site → **Environment** → add:
   - `VITE_SUPABASE_URL` = same value as your class notes site
   - `VITE_SUPABASE_ANON_KEY` = same value as your class notes site
   (Open the class notes service's Environment tab and copy the two values.) Save — Render rebuilds.
3. Open the site → **Class Notes** → **Upload notes**. Create the library account the first time.

How it works: anyone can **browse and read** without any account (the login page has a "Browse the class notes library" button). Students need a free account only to **upload**. You can only delete your own uploads. Shared text is sanitized, and attachments are limited to PDF / images / Office / text files up to 10 MB.
**Everything in the library is public** to anyone who has the site link — remind classmates not to share private information. (To restrict reading to signed-in students only, change the `select` policy `to anon, authenticated` into `to authenticated` in the SQL.)

## Gemini for the chat helper (optional)
- **Per student:** open the chat bubble → **🔑 Add Gemini key** → paste a key from aistudio.google.com → Save. It is stored encrypted in that browser only.
- **One key for everyone:** add `VITE_GEMINI_API_KEY` on Render (Environment). Students then get Gemini answers without doing anything. Because the key ships inside the website, anyone can find it, so in Google AI Studio / Google Cloud restrict that key to your site address and set a quota.
Without any key the helper still answers using built-in help.

## How your private data is protected
- Your password never leaves the browser. It unlocks a random 256-bit master key (PBKDF2 → AES-256-GCM). All data and files are encrypted with that key before being saved in IndexedDB.
- At sign-up you get a **recovery key**. It's the only way back if you forget your password. Save it.
- Notes can have their own extra password. The Media Vault has its own separate password.
- The PIN is a quick *screen* lock only; the password is what protects the data.
- **Data lives only in the browser you used.** Clearing site data or switching device loses it — use *Profile → Download encrypted backup* and *Restore backup* on the login screen to move or save it.

## What's included
| Area | Included |
|---|---|
| Class Notes | Public uploaded notes with the uploader's name, title, automatic upload time, text and file attachments; search; save a copy to your own notes; delete your own uploads; browse without login |
| Accounts | Email + password, recovery key reset, PIN lock, idle auto-logout, change password, delete account, encrypted backup/restore |
| Dashboard | Greeting, productivity score, habits, tasks due, today's events, recent notes/journal, focus stats, quick create |
| Notes | Markdown with live preview, block editor, nested folders, tags, favorites, archive, recycle bin, per-note password lock, templates, version history, full-text search, export .md / print-to-PDF |
| Drawing | Pen, pencil, marker, highlighter, eraser, line/rectangle/ellipse, mouse/finger/stylus, colour picker + HEX, undo/redo, export PNG / JPG / SVG / PDF |
| Journal | Daily entries, mood, reflection prompts, calendar timeline, photo, voice note, weather (Open-Meteo, no key), reflection summary |
| Habits | Daily/weekly/monthly, streaks, longest streak, 30-day analytics, missed indicator, reminders |
| Tasks | Priorities, due dates, recurring, checklists, goals with progress |
| Pomodoro | Work/break timer, focus report |
| Calendar | Day/week/month, recurring events, reminders, .ics import/export |
| Media Vault | AES-256-GCM encrypted images/video/audio/docs, own password, hidden files |
| Smart Assistant | Offline: summarize, writing help, task breakdown, habit insights, journal reflection, suggestions, knowledge search. Optional: ask Gemini with your own free key |
| Other | Global search, notifications centre, profile, settings (theme, font, text size, security, notifications, export) |

## Honest limits (things a free, server-less web app cannot do)
- **No email OTP, Google login, JWT or multi-device accounts** — these need a server. Accounts exist per browser; move data with backup/restore.
- **No biometric unlock** (fingerprint/face) — not available to this kind of web app.
- **Google/Outlook live sync** isn't possible without a server; use .ics export/import instead.
- **Reminders and pop-ups only fire while the app is open in a browser tab.**
- **The "AI" tools are simple offline algorithms**, not a large language model, unless you add your own Gemini key (that option is untested against the live Google service).
- Browser storage is limited by your browser/disk.
- The Class Notes has no moderation tools; the admin can delete rows in the database dashboard.
- If the database project is paused or removed, the library stops working (private notes still work).
