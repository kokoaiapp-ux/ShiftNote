-- Count-only dashboard queries filter assistant messages by user and creation time.
create index if not exists messages_user_assistant_created_idx
  on public.messages (user_id, created_at desc)
  where role = 'assistant';
