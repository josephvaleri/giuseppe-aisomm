-- Wine experience enum
do $$ begin
  create type wine_experience_level as enum (
    'newbie',
    'casual_fan',
    'appellation_aware',
    'case_pro',
    'sommelier'
  );
exception when duplicate_object then null; end $$;

-- Details (1:1 with profiles)
create table if not exists public.profile_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_name text,
  phone text,
  experience wine_experience_level default 'newbie',
  time_zone text, -- IANA tz, e.g. "America/New_York"
  people_count int check (people_count >= 1) default 1,
  share_cellar boolean default false,
  avatar_url text,
  avatar_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Taste preferences (1:1)
create table if not exists public.profile_taste_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  styles text[] default '{}',   -- e.g., ['crisp','earthy','oaky','funky']
  colors text[] default '{}',   -- ['red','white','rosé','orange','sparkling']
  grapes text[] default '{}',   -- free text tags
  regions text[] default '{}',  -- free text tags
  sweetness int check (sweetness between 0 and 10) default 2,
  acidity int check (acidity between 0 and 10) default 6,
  tannin int check (tannin between 0 and 10) default 4,
  body int check (body between 0 and 10) default 5,
  oak int check (oak between 0 and 10) default 3,
  price_min int default 10,
  price_max int default 50,
  old_world_bias int check (old_world_bias between -10 and 10) default 0,
  sparkling_preference boolean default false,
  natural_pref boolean default false,
  organic_pref boolean default false,
  biodynamic_pref boolean default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated-at trigger
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_touch_profile_details on public.profile_details;
create trigger trg_touch_profile_details
before update on public.profile_details
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_touch_profile_taste_preferences on public.profile_taste_preferences;
create trigger trg_touch_profile_taste_preferences
before update on public.profile_taste_preferences
for each row execute procedure public.touch_updated_at();

-- RLS
alter table public.profile_details enable row level security;
alter table public.profile_taste_preferences enable row level security;

do $$ begin
  create policy "details_owner_select" on public.profile_details for select
  using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "details_owner_upsert" on public.profile_details for insert
  with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "details_owner_update" on public.profile_details for update
  using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "taste_owner_select" on public.profile_taste_preferences for select
  using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "taste_owner_upsert" on public.profile_taste_preferences for insert
  with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "taste_owner_update" on public.profile_taste_preferences for update
  using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Enable RLS on profiles if not already enabled
alter table public.profiles enable row level security;

do $$ begin
  create policy "profiles_owner_select" on public.profiles
  for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_owner_update_limited" on public.profiles
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
