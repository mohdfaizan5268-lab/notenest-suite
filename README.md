# NoteNest Suite

A free, privacy-first productivity workspace: notes, drawing, journal, habits, tasks + Pomodoro, calendar, encrypted media vault and a smart assistant. **No server, no database, no paid services** — everything is stored encrypted inside your own browser.

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

## How your data is protected
- Your password never leaves the browser. It unlocks a random 256-bit master key (PBKDF2 → AES-256-GCM). All data and files are encrypted with that key before being saved in IndexedDB.
- At sign-up you get a **recovery key**. It's the only way back if you forget your password. Save it.
- Notes can have their own extra password. The Media Vault has its own separate password.
- The PIN is a quick *screen* lock only; the password is what protects the data.
- **Data lives only in the browser you used.** Clearing site data or switching device loses it — use *Profile → Download encrypted backup* and *Restore backup* on the login screen to move or save it.

## What's included
| Area | Included |
|---|---|
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
