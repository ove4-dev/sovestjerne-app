-- Sovestjerne database schema v1
-- Run this in Supabase SQL Editor.

create table if not exists parents (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  email text not null unique,
  name text,
  shopify_customer_id text,
  subscription_status text default 'pending'
);

create table if not exists children (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  parent_id uuid references parents(id) on delete cascade,
  parent_email text not null,
  child_name text not null,
  child_age integer,
  favorite_animal text,
  favorite_color text,
  favorite_place text,
  interests text,
  personality text,
  things_to_avoid text,
  dreams text
);

alter table children add column if not exists parent_id uuid references parents(id) on delete cascade;
alter table children add column if not exists favorite_place text;
alter table children add column if not exists dreams text;

create table if not exists story_bibles (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  child_id uuid references children(id) on delete cascade,
  universe_name text,
  main_character text,
  companion_name text,
  companion_type text,
  story_goal text,
  current_chapter integer default 1,
  memory text
);

create table if not exists stories (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  child_id uuid references children(id) on delete cascade,
  chapter_number integer,
  title text,
  story_text text,
  image_url text,
  email_status text default 'not_sent',
  sent_at timestamptz
);

alter table parents enable row level security;
alter table children enable row level security;
alter table story_bibles enable row level security;
alter table stories enable row level security;
