-- NoteNest class library setup. Run this ONCE (Supabase SQL editor, or paste into Bolt chat and ask it to run it as a migration).
-- Safe to run again.

create table if not exists public.shared_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Student',
  title text not null check (char_length(title) between 1 and 200),
  subject text not null default 'General' check (char_length(subject) between 1 and 100), -- no longer used by the app; kept so older installs keep working
  semester text,
  description text not null default '' check (char_length(description) <= 500),
  body text not null default '' check (char_length(body) <= 200000),
  tags text[] not null default '{}',
  file_path text,
  file_name text,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);
create index if not exists shared_notes_created_idx on public.shared_notes (created_at desc);

alter table public.shared_notes enable row level security;

drop policy if exists "anyone can read shared notes" on public.shared_notes;
create policy "anyone can read shared notes" on public.shared_notes for select to anon, authenticated using (true);

drop policy if exists "signed in users can share" on public.shared_notes;
create policy "signed in users can share" on public.shared_notes for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "owners can edit their shares" on public.shared_notes;
create policy "owners can edit their shares" on public.shared_notes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owners can delete their shares" on public.shared_notes;
create policy "owners can delete their shares" on public.shared_notes for delete to authenticated using (auth.uid() = user_id);

-- File storage (public bucket, 10 MB limit)
insert into storage.buckets (id, name, public, file_size_limit)
values ('shared-files', 'shared-files', true, 10485760)
on conflict (id) do update set public = true, file_size_limit = 10485760;

drop policy if exists "anyone can read shared files" on storage.objects;
create policy "anyone can read shared files" on storage.objects for select to anon, authenticated using (bucket_id = 'shared-files');

drop policy if exists "signed in users can upload shared files" on storage.objects;
create policy "signed in users can upload shared files" on storage.objects for insert to authenticated
  with check (bucket_id = 'shared-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "owners can delete their shared files" on storage.objects;
create policy "owners can delete their shared files" on storage.objects for delete to authenticated
  using (bucket_id = 'shared-files' and (storage.foldername(name))[1] = auth.uid()::text);
