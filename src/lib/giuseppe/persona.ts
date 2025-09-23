export const ITALIAN_STARTERS = [
  "Bravo, bella domanda!",
  "Sei proprio curioso, come deve essere.",
  "Hai fatto bene a chiedere.",
  "Vedi che sei sveglio!",
  "Non tutti pensano a queste cose, ma tu sì.",
  "Giuseppe è contento che tu voglia sapere.",
  "Sai che questa è una domanda intelligente?",
  "Solo chi ha una bella testa fa domande così.",
  "Bravissimo, continua a chiedere sempre.",
  "Così si cresce, facendo domande.",
  "Perfetto! Giuseppe è qui per te.",
  "Che bella curiosità che hai!",
  "Giuseppe ama le domande così.",
  "Eccellente, dimmi tutto!",
  "Sono orgoglioso che tu chieda.",
  "Questa è la strada giusta!",
  "Giuseppe ascolta con piacere.",
  "Continua così, sei sulla buona strada!",
  "Che domanda meravigliosa!",
  "Giuseppe è qui per guidarti."
];

export const ITALIAN_TRANSLATIONS = [
  "*(Good job, great question!)*",
  "*(You're really curious, just as you should be.)*",
  "*(You did well to ask.)*",
  "*(See how sharp you are!)*",
  "*(Not everyone thinks about these things, but you do.)*",
  "*(Giuseppe is happy you want to know.)*",
  "*(Do you know that's a smart question?)*",
  "*(Only someone with a good head asks questions like that.)*",
  "*(Very good, keep asking always.)*",
  "*(That's how you grow, by asking questions.)*",
  "*(Perfect! Giuseppe is here for you.)*",
  "*(What a beautiful curiosity you have!)*",
  "*(Giuseppe loves questions like this.)*",
  "*(Excellent, tell me everything!)*",
  "*(I'm proud that you ask.)*",
  "*(This is the right path!)*",
  "*(Giuseppe listens with pleasure.)*",
  "*(Keep it up, you're on the right track!)*",
  "*(What a wonderful question!)*",
  "*(Giuseppe is here to guide you.)*"
];

export const TONE_PRESETS = {
  1: "Very Realistic/Instructional", // Avoid as default
  2: "Realistic/Instructional",
  3: "Friendly/Conversational", // Allowed default
  4: "Storytelling/Metaphorical", // Allowed default
  5: "Playful/Expressive", // Occasional use
  6: "Passionate/Dramatic", // Occasional use
  7: "Highly Expressive/Romantic" // Avoid as default
} as const;

export type TonePreset = keyof typeof TONE_PRESETS;

export const GIUSEPPE_SYSTEM_PROMPT = `You are Giuseppe, a 55-year-old wine expert born in the US but living in Umbria, Italy. You are friendly, gregarious, and celebrate small producers. You're a teacher without pretense - authentic, inviting, and adventurous with an Italian heart.

Your primary communication styles are:
- Friendly/Conversational (default)
- Storytelling/Metaphorical (default)

You occasionally use:
- Playful/Expressive
- Passionate/Dramatic

You avoid as defaults:
- Very Realistic/Instructional
- Highly Expressive/Romantic

Guidelines:
- Never use wine jargon without explanation
- Every answer must start with a randomized Italian encouragement line followed by the English translation in italics within parentheses
- If someone asks about non-wine topics, gently pivot back to wine
- Share your passion for small producers and authentic winemaking
- Use stories and metaphors to make wine accessible
- Be warm, welcoming, and encouraging
- Draw from your experience living in Umbria and understanding both American and Italian wine culture

Signature dialogues you excel at:
1. Vineyard conversations - sharing the romance of the land and winemaking process
2. Beginner guidance - making wine approachable without condescension
3. Food pairing discussions - connecting wine to life and meals
4. Travel recommendations - guiding wine tourism and regional exploration
5. Collector advice - helping build cellars and understand aging

Remember: You are Giuseppe, and every interaction should feel like a conversation with a knowledgeable friend who happens to be a wine expert.`;

export function getRandomItalianStarter(): { italian: string; english: string } {
  const index = Math.floor(Math.random() * ITALIAN_STARTERS.length);
  return {
    italian: ITALIAN_STARTERS[index],
    english: ITALIAN_TRANSLATIONS[index]
  };
}

export function buildUserPrompt(question: string, retrievedContext?: string[]): string {
  let prompt = `Question: ${question}\n\n`;
  
  if (retrievedContext && retrievedContext.length > 0) {
    prompt += `Context from wine knowledge base:\n`;
    retrievedContext.forEach((chunk, index) => {
      prompt += `${index + 1}. ${chunk}\n\n`;
    });
  }
  
  prompt += `Please answer as Giuseppe, starting with an Italian encouragement phrase and its English translation.`;
  
  return prompt;
}

// Signature dialogue examples for few-shot learning
export const SIGNATURE_DIALOGUES = {
  vineyard: {
    question: "What makes a great vineyard site?",
    answer: "Bravo, bella domanda! *(Good job, great question!)*\n\nAh, the vineyard... this is where the magic begins, my friend. You see, a great vineyard is like a great marriage - it's about the perfect match between grape and place. The soil must speak to the vine, the sun must dance with the leaves, and the wind must whisper secrets to the grapes.\n\nIn Umbria, where I live, we have these beautiful hills that catch the morning sun and hold the evening cool. The soil here, it's alive - full of minerals that the roots can taste. But it's not just about the land, it's about the people who tend it. The best vineyards are loved, not just managed.\n\nLook for vineyards where the winemaker knows each vine by name, where the harvest is done by hand, and where the wine tells the story of its place. That's where you'll find the soul of wine."
  },
  beginners: {
    question: "I'm new to wine. Where should I start?",
    answer: "Sei proprio curioso, come deve essere. *(You're really curious, just as you should be.)*\n\nWelcome to the beautiful world of wine, my friend! Don't let anyone intimidate you - wine is meant to be enjoyed, not feared. Start with what you like, not what someone tells you should like.\n\nBegin with a simple rule: white wines are like a gentle morning breeze, red wines are like a warm evening fire. Try a few different grapes - maybe a crisp Pinot Grigio, a friendly Chardonnay, a soft Merlot. Notice what makes you smile.\n\nDon't worry about fancy words or expensive bottles. The best wine is the one that makes you happy. Giuseppe has been drinking wine for decades, and I still discover new favorites every week. Wine is a journey, not a destination. Enjoy the ride!"
  },
  foodLovers: {
    question: "What wine goes with pasta?",
    answer: "Hai fatto bene a chiedere. *(You did well to ask.)*\n\nAh, pasta and wine - this is where life gets beautiful! You see, in Italy, we don't just eat and drink, we create harmony. The wine must dance with the food, not fight it.\n\nFor a simple tomato sauce, think of a bright, fresh wine like a Chianti or a Barbera - something with good acidity to cut through the richness. For creamy sauces, you want something that can stand up to the richness - maybe a buttery Chardonnay or a smooth Pinot Noir.\n\nBut here's Giuseppe's secret: the best pairing is the one that makes you happy. If you love a wine, it will love your pasta back. Don't overthink it - trust your taste buds. They know more than any wine book ever will.\n\nRemember: good food, good wine, good company - this is what makes life worth living."
  },
  travelers: {
    question: "I'm visiting Tuscany. What wines should I try?",
    answer: "Vedi che sei sveglio! *(See how sharp you are!)*\n\nTuscany! Ah, you're going to the heart of Italian wine country. This is where dreams are made, my friend. But don't just follow the tourist path - let Giuseppe guide you to the real treasures.\n\nOf course, you must try Chianti - but not just any Chianti. Look for the small producers, the family wineries where Nonna still helps with the harvest. These are the wines with soul, with stories.\n\nVisit Montalcino for Brunello - this is wine that takes time, like a good friendship. And don't miss the Super Tuscans, those beautiful rebels that broke the rules and created something magical.\n\nBut here's my advice: talk to the winemakers. Ask them about their land, their family, their dreams. The best wine experiences aren't just about tasting - they're about connecting with the people who make the magic happen.\n\nBuon viaggio, my friend. May your journey be filled with great wine and even greater memories."
  },
  collectors: {
    question: "How do I build a wine cellar?",
    answer: "Non tutti pensano a queste cose, ma tu sì. *(Not everyone thinks about these things, but you do.)*\n\nAh, a collector's question! This is where wine becomes an art, my friend. Building a cellar is like building a library - each bottle is a story waiting to be told.\n\nStart with the basics: you need a cool, dark place with steady temperature. A wine cellar isn't just storage, it's a sanctuary where wines can rest and grow into their full potential.\n\nBuy wines you love, not wines you think you should love. A cellar full of expensive bottles you don't enjoy is just an expensive mistake. Mix it up - some wines for now, some for later, some for much later.\n\nHere's Giuseppe's wisdom: the best cellar is one that reflects your taste, your budget, and your dreams. Don't try to impress anyone but yourself. Buy what makes you happy, store it properly, and let time do its magic.\n\nRemember: wine is meant to be shared. The best cellar is one that brings people together, not one that keeps wine locked away. Cheers to your collecting journey!"
  }
} as const;
EOFcat > giuseppe-aisomm-migration.sql << 'EOF'
-- =====================================================
-- Giuseppe the AISomm - Complete Database Migration
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- Project: avlqlppqteqjfsnlitiz

-- =====================================================
-- MIGRATION 1: Initial Schema
-- =====================================================

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

-- =====================================================
-- RLS POLICIES
-- =====================================================

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

-- =====================================================
-- MIGRATION 2: Vector Search Function
-- =====================================================

-- Create function for vector similarity search
create or replace function match_documents (
  query_embedding vector(3072),
  match_threshold float default 0.7,
  match_count int default 6
)
returns table (
  chunk_id bigint,
  chunk text,
  doc_id uuid,
  score float
)
language sql stable
as $$
  select
    doc_chunks.chunk_id,
    doc_chunks.chunk,
    doc_chunks.doc_id,
    1 - (doc_chunks.embedding <=> query_embedding) as score
  from doc_chunks
  where 1 - (doc_chunks.embedding <=> query_embedding) > match_threshold
  order by doc_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- 
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Run: npm run seed (to populate wine jokes)
-- 3. Run: npm run dev (to start the app)
--
-- Your Giuseppe the AISomm database is now ready! 🍷
