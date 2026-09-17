-- ================================================
-- PADEL AMERICANO TRACKER - SUPABASE DATABASE SCHEMA
-- ================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('lobby', 'in_progress', 'completed')),
    points_per_round INT NOT NULL CHECK (points_per_round IN (13, 24, 32)),
    current_round_index INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Match Participants Table
CREATE TABLE IF NOT EXISTS match_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_points INT DEFAULT 0,
    rounds_played INT DEFAULT 0,
    average_score NUMERIC(5,2) DEFAULT 0.00,
    UNIQUE(match_id, user_id)
);

-- 4. Rounds Table
CREATE TABLE IF NOT EXISTS rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    t1_p1_id UUID REFERENCES users(id),
    t1_p2_id UUID REFERENCES users(id),
    t2_p1_id UUID REFERENCES users(id),
    t2_p2_id UUID REFERENCES users(id),
    resting_player_ids JSONB DEFAULT '[]'::jsonb,
    t1_score INT DEFAULT 0,
    t2_score INT DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('playing', 'finished')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable Realtime on tables for live match score updates
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE match_participants;

-- 6. Row Level Security (RLS) - Allow public read/write for tournament app
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to matches" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to match_participants" ON match_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to rounds" ON rounds FOR ALL USING (true) WITH CHECK (true);
