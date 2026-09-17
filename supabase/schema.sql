-- ================================================
-- PADEL AMERICANO TRACKER - SUPABASE DATABASE SCHEMA
-- ================================================

-- 1. Users Table (TEXT primary key to support Telegram string IDs)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    telegram_id BIGINT UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT,
    username TEXT,
    avatar_url TEXT,
    total_matches_played INT DEFAULT 0,
    global_average_score NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
    id TEXT PRIMARY KEY,
    creator_id TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('lobby', 'in_progress', 'completed')),
    points_per_round INT NOT NULL CHECK (points_per_round IN (13, 24, 32)),
    current_round_index INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Match Participants Table
CREATE TABLE IF NOT EXISTS public.match_participants (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    total_points INT DEFAULT 0,
    rounds_played INT DEFAULT 0,
    average_score NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_id, user_id)
);

-- 4. Rounds Table
CREATE TABLE IF NOT EXISTS public.rounds (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    round_number INT NOT NULL,
    t1_p1_id TEXT,
    t1_p2_id TEXT,
    t2_p1_id TEXT,
    t2_p2_id TEXT,
    resting_player_ids JSONB DEFAULT '[]'::jsonb,
    t1_score INT DEFAULT 0,
    t2_score INT DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('playing', 'finished')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable Realtime on tables for live match score updates & lobby sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_participants;

-- 6. Disable Row Level Security (RLS) for public access
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds DISABLE ROW LEVEL SECURITY;
