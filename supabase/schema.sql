-- ================================================
-- PADEL AMERICANO TRACKER - SUPABASE DATABASE SCHEMA
-- ================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('lobby', 'in_progress', 'completed')),
    points_per_round INT NOT NULL CHECK (points_per_round IN (13, 24, 32)),
    current_round_index INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Match Participants Table
CREATE TABLE IF NOT EXISTS public.match_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    total_points INT DEFAULT 0,
    rounds_played INT DEFAULT 0,
    average_score NUMERIC(5,2) DEFAULT 0.00,
    UNIQUE(match_id, user_id)
);

-- 4. Rounds Table
CREATE TABLE IF NOT EXISTS public.rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    t1_p1_id UUID REFERENCES public.users(id),
    t1_p2_id UUID REFERENCES public.users(id),
    t2_p1_id UUID REFERENCES public.users(id),
    t2_p2_id UUID REFERENCES public.users(id),
    resting_player_ids JSONB DEFAULT '[]'::jsonb,
    t1_score INT DEFAULT 0,
    t2_score INT DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('playing', 'finished')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable Realtime on tables for live match score updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_participants;

-- 6. Row Level Security (RLS) - Allow public read/write for tournament app
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to users" ON public.users;
DROP POLICY IF EXISTS "Allow public access to matches" ON public.matches;
DROP POLICY IF EXISTS "Allow public access to match_participants" ON public.match_participants;
DROP POLICY IF EXISTS "Allow public access to rounds" ON public.rounds;

CREATE POLICY "Allow public access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to matches" ON public.matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to match_participants" ON public.match_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to rounds" ON public.rounds FOR ALL USING (true) WITH CHECK (true);
