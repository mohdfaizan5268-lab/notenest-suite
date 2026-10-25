export type Id = string;
export interface Block { id: Id; type: 'p' | 'h' | 'todo' | 'quote' | 'code'; text: string; done?: boolean }
export interface NoteVersion { at: number; title: string; body: string }
export interface Note {
  id: Id; title: string; body: string; mode: 'markdown' | 'blocks'; blocks: Block[];
  folderId: Id | null; tags: string[]; fav: boolean; archived: boolean; trashed: boolean;
  created: number; updated: number; versions: NoteVersion[];
  lock?: { salt: string; iv: string; data: string }; // encrypted body when locked
}
export interface Folder { id: Id; name: string; parentId: Id | null }
export interface Drawing { id: Id; title: string; created: number; updated: number; w: number; h: number; bg: string; strokes: Stroke[] }
export interface Stroke { tool: string; color: string; size: number; alpha: number; pts: [number, number][]; shape?: { kind: 'line' | 'rect' | 'ellipse'; a: [number, number]; b: [number, number] } }
export interface Journal { id: Id; date: string; text: string; mood: number; prompt: string; weather: string; photoId?: Id; voiceId?: Id; voiceMime?: string; created: number; updated: number }
export interface Habit { id: Id; name: string; freq: 'daily' | 'weekly' | 'monthly'; target: number; done: string[]; remind: string; created: number; archived?: boolean }
export interface Task { id: Id; title: string; priority: 'low' | 'med' | 'high'; due: string; done: boolean; recur: 'none' | 'daily' | 'weekly' | 'monthly'; checklist: { id: Id; text: string; done: boolean }[]; goalId: Id | null; created: number }
export interface Goal { id: Id; title: string; target: string }
export interface Pomo { id: Id; start: number; mins: number; kind: 'work' | 'break'; taskId?: Id }
export interface Ev { id: Id; title: string; date: string; time: string; endTime: string; recur: 'none' | 'daily' | 'weekly' | 'monthly'; remind: number; notes: string }
export interface VaultItem { id: Id; name: string; mime: string; size: number; hidden: boolean; added: number }
export interface Notif { id: Id; at: number; text: string; read: boolean }
export interface Settings { theme: 'light' | 'dark'; font: 'sans' | 'serif' | 'mono'; fontSize: number; autoLogout: number; notifications: boolean; geminiKey: string; geminiModel?: string; city: string }
export interface Data {
  notes: Note[]; folders: Folder[]; drawings: Drawing[]; journals: Journal[]; habits: Habit[];
  tasks: Task[]; goals: Goal[]; pomos: Pomo[]; events: Ev[]; vault: VaultItem[]; notifs: Notif[];
  settings: Settings; fired: string[]; templates: { id: Id; name: string; body: string }[];
}
export const emptyData = (): Data => ({
  notes: [], folders: [], drawings: [], journals: [], habits: [], tasks: [], goals: [], pomos: [], events: [], vault: [], notifs: [],
  settings: { theme: 'light', font: 'sans', fontSize: 16, autoLogout: 15, notifications: false, geminiKey: '', city: '' },
  fired: [],
  templates: [
    { id: 't1', name: 'Meeting notes', body: '# Meeting\n\n**Date:** \n**Attendees:** \n\n## Agenda\n- \n\n## Decisions\n- \n\n## Action items\n- [ ] ' },
    { id: 't2', name: 'Study notes', body: '# Subject / Topic\n\n## Key ideas\n- \n\n## Questions\n- \n\n## Summary\n' },
    { id: 't3', name: 'Weekly plan', body: '# Weekly plan\n\n## Goals\n- [ ] \n\n## Mon\n\n## Tue\n\n## Wed\n\n## Thu\n\n## Fri\n' },
  ],
});
