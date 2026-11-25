-- KN Admin Portal relational schema starter for Supabase (Postgres)
create extension if not exists pgcrypto;
create table if not exists profiles(id uuid primary key references auth.users(id) on delete cascade, full_name text, role text not null default 'staff' check(role in ('admin','manager','staff','finance')), created_at timestamptz default now());
create table if not exists agents(id uuid primary key default gen_random_uuid(), name text not null, pic text, phone text, email text, address text, note text, created_at timestamptz default now());
create table if not exists airlines(id uuid primary key default gen_random_uuid(), name text not null, route text, price numeric default 0, note text, created_at timestamptz default now());
create table if not exists destinations(id uuid primary key default gen_random_uuid(), name text not null, country text, city text, note text, created_at timestamptz default now());
create table if not exists packages(id uuid primary key default gen_random_uuid(), name text not null, duration text, countries text, price numeric default 0, description text, created_at timestamptz default now());
create table if not exists departures(id uuid primary key default gen_random_uuid(), name text not null, date date, package_id uuid references packages(id), quota integer default 0, airline text, status text, created_at timestamptz default now());
create table if not exists bookings(id uuid primary key default gen_random_uuid(), code text unique not null, agent_id uuid references agents(id), departure_id uuid references departures(id), pax integer default 1, price numeric default 0, extra numeric default 0, discount numeric default 0, status text default 'Booked', note text, created_at timestamptz default now());
create table if not exists participants(id uuid primary key default gen_random_uuid(), booking_id uuid references bookings(id) on delete cascade, name text not null, passport text, birth date, gender text, expiry date, nationality text, created_at timestamptz default now());
create table if not exists rooms(id uuid primary key default gen_random_uuid(), booking_id uuid references bookings(id) on delete cascade, room text, type text, note text, created_at timestamptz default now());
create table if not exists room_participants(room_id uuid references rooms(id) on delete cascade, participant_id uuid references participants(id) on delete cascade, primary key(room_id,participant_id));
create table if not exists payments(id uuid primary key default gen_random_uuid(), booking_id uuid references bookings(id) on delete cascade, date date, amount numeric not null, method text, reference text, note text, created_at timestamptz default now());
create table if not exists system_settings(key text primary key, value jsonb not null default '{}'::jsonb);
-- Enable RLS. Policies and app authentication must be configured before production use.
alter table profiles enable row level security;
alter table agents enable row level security;
alter table airlines enable row level security;
alter table destinations enable row level security;
alter table packages enable row level security;
alter table departures enable row level security;
alter table bookings enable row level security;
alter table participants enable row level security;
alter table rooms enable row level security;
alter table room_participants enable row level security;
alter table payments enable row level security;
alter table system_settings enable row level security;
