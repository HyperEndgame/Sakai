create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  title text not null,
  due_date date,
  quadrant int not null default 4 check (quadrant between 1 and 4),
  reason text,
  source text not null default 'assistant',
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  category text not null,
  name text not null,
  value numeric,
  note text,
  updated_at timestamptz not null default now()
);

create table briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  content text not null,
  top_action text not null,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table tasks enable row level security;
alter table milestones enable row level security;
alter table briefings enable row level security;
alter table messages enable row level security;

create policy "own tasks" on tasks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own milestones" on milestones for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own briefings" on briefings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own messages" on messages for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter publication supabase_realtime add table tasks, briefings;
