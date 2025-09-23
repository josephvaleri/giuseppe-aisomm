-- Enable pgvector extension
create extension if not exists vector;

-- Embedding store for RAG
create table if not exists public.doc_chunks (
  chunk_id bigserial primary key,
  doc_id uuid references public.documents(id) on delete cascade,
  chunk text not null,
  embedding vector(3072)
);

-- Q/A logging + feedback
create table if not exists public.questions_answers (
  qa_id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  question text not null,
  answer text not null,
  source text not null check (source in ('db','openai')),
  retrieval_debug jsonb,
  thumbs_up boolean,
  created_at timestamptz default now(),
  edited_answer text,
  edited_by uuid references auth.users(id)
);

-- Moderation workflow
create type if not exists moderation_status as enum ('pending','accepted','rejected','edited');
create table if not exists public.moderation_items (
  item_id bigserial primary key,
  qa_id bigint references public.questions_answers(qa_id) on delete cascade,
  status moderation_status not null default 'pending',
  moderator_id uuid references auth.users(id),
  notes text,
  updated_at timestamptz default now()
);

-- Admin settings
create table if not exists public.settings (
  id int primary key default 1,
  monthly_price_cents int not null default 199,
  annual_price_cents int not null default 2000,
  trial_days int not null default 7,
  color_scheme jsonb not null default '{"primary":"#7c2d12","accent":"#f59e0b"}',
  announcement text default 'Benvenuto. I am Giuseppe and I am here to answer any of your wine questions so you can be the expert in the room. Ask me anything about wine.',
  jokes_enabled boolean not null default true,
  ml_active_versions jsonb default '{}'::jsonb,
  ml_config jsonb default '{
    "train_every_n_labels": 20,
    "reranker_promotion_min_mrr": 0.35,
    "route_auc_min": 0.70,
    "ab_enabled": false
  }'::jsonb,
  updated_at timestamptz default now()
);
insert into public.settings(id) values (1) on conflict (id) do nothing;

-- Jokes
create table if not exists public.wine_jokes (
  joke_id bigserial primary key,
  category text not null default 'general',
  joke text not null,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- ML Models
create table if not exists public.ml_models (
  model_id bigserial primary key,
  kind text not null check (kind in ('reranker','route','intent')),
  version int not null,
  weights jsonb not null,
  features_schema jsonb not null,
  metrics jsonb,
  created_at timestamptz default now(),
  created_by uuid
);

-- ML Training Examples
create table if not exists public.ml_training_examples (
  example_id bigserial primary key,
  qa_id bigint references public.questions_answers(qa_id) on delete cascade,
  kind text not null check (kind in ('reranker','route','intent')),
  features jsonb not null,
  label jsonb not null,
  meta jsonb,
  created_at timestamptz default now()
);

-- ML Events
create table if not exists public.ml_events (
  event_id bigserial primary key,
  qa_id bigint references public.questions_answers(qa_id) on delete cascade,
  kind text not null check (kind in ('rerank_infer','route_infer','intent_infer','critique','train_summary')),
  model_ref jsonb,
  input_features jsonb,
  output jsonb,
  created_at timestamptz default now()
);

-- RLS Policies

-- profiles
alter table public.profiles enable row level security;
create policy "read own or staff" on public.profiles
for select using (auth.uid() = user_id or exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('moderator','admin')
));
create policy "update own or admin" on public.profiles
for update using (auth.uid() = user_id or exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'
));

-- questions_answers
alter table public.questions_answers enable row level security;
create policy "read own or staff" on public.questions_answers
for select using (auth.uid() = user_id or exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('moderator','admin')
));
create policy "insert own" on public.questions_answers for insert with check (auth.uid() = user_id);
create policy "update staff" on public.questions_answers for update using (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('moderator','admin')
));

-- moderation_items (staff only)
alter table public.moderation_items enable row level security;
create policy "staff only" on public.moderation_items
for all using (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('moderator','admin')
)) with check (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('moderator','admin')
));

-- wine_jokes (read all; admin manage)
alter table public.wine_jokes enable row level security;
create policy "read jokes" on public.wine_jokes for select using (true);
create policy "admin jokes" on public.wine_jokes
for all using (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'
)) with check (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'
));

-- settings (admin only)
alter table public.settings enable row level security;
create policy "admin only" on public.settings
for all using (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'
)) with check (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'
));

-- ml tables (staff only)
alter table public.ml_models enable row level security;
create policy "staff ml models" on public.ml_models
for all using (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('moderator','admin')
)) with check (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('moderator','admin')
));

alter table public.ml_training_examples enable row level security;
create policy "staff ml examples" on public.ml_training_examples
for all using (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('moderator','admin')
)) with check (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('moderator','admin')
));

alter table public.ml_events enable row level security;
create policy "staff ml events" on public.ml_events
for all using (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('moderator','admin')
)) with check (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('moderator','admin')
));

-- doc_chunks (staff only)
alter table public.doc_chunks enable row level security;
create policy "staff doc chunks" on public.doc_chunks
for all using (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('moderator','admin')
)) with check (exists(
  select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('moderator','admin')
));
