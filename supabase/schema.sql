create table if not exists public.pigeon_chat_rooms (
  id uuid primary key,
  token_hash text not null check (char_length(token_hash) = 64),
  created_at timestamptz not null default now()
);

create table if not exists public.pigeon_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.pigeon_chat_rooms(id) on delete cascade,
  sender_id uuid not null,
  sender_name text not null check (char_length(trim(sender_name)) between 1 and 24),
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists pigeon_chat_messages_room_created_idx
  on public.pigeon_chat_messages (room_id, created_at desc);

alter table public.pigeon_chat_rooms enable row level security;
alter table public.pigeon_chat_messages enable row level security;

revoke all on public.pigeon_chat_rooms from anon, authenticated;
revoke all on public.pigeon_chat_messages from anon, authenticated;
grant select, insert on public.pigeon_chat_rooms to service_role;
grant select, insert on public.pigeon_chat_messages to service_role;
