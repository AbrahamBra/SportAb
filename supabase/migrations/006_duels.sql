-- ============================================================
-- 006_duels.sql — Duel rooms, results, exercise records
-- ============================================================

-- Duel rooms for matchmaking and state
CREATE TABLE duel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES auth.users(id),
  guest_id UUID REFERENCES auth.users(id),
  exercise_id TEXT NOT NULL DEFAULT '',
  time_limit_secs INT NOT NULL DEFAULT 60,
  host_camera_shared BOOLEAN DEFAULT false,
  guest_camera_shared BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'waiting',
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX idx_duel_rooms_code ON duel_rooms(code);
CREATE INDEX idx_duel_rooms_expires ON duel_rooms(expires_at);

-- Duel results for history and stats
CREATE TABLE duel_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES duel_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id),
  reps INT NOT NULL DEFAULT 0,
  max_combo INT NOT NULL DEFAULT 0,
  form_score_avg REAL,
  elapsed_secs INT NOT NULL DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  xp_earned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_duel_results_player ON duel_results(player_id);
CREATE INDEX idx_duel_results_room ON duel_results(room_id);

-- Personal records per exercise (duels + solo)
CREATE TABLE user_exercise_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  exercise_id TEXT NOT NULL,
  max_reps INT NOT NULL DEFAULT 0,
  max_reps_date TIMESTAMPTZ,
  best_combo INT NOT NULL DEFAULT 0,
  total_duels INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  UNIQUE(user_id, exercise_id)
);

CREATE INDEX idx_user_exercise_records_user ON user_exercise_records(user_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE duel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_exercise_records ENABLE ROW LEVEL SECURITY;

-- duel_rooms policies
CREATE POLICY "Players can read their rooms"
  ON duel_rooms FOR SELECT
  USING (auth.uid() = host_id OR auth.uid() = guest_id);

CREATE POLICY "Anyone can find waiting rooms"
  ON duel_rooms FOR SELECT
  USING (status = 'waiting');

CREATE POLICY "Authenticated users can create rooms"
  ON duel_rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Players can update their rooms"
  ON duel_rooms FOR UPDATE
  USING (auth.uid() = host_id OR auth.uid() = guest_id);

CREATE POLICY "Host can delete waiting rooms"
  ON duel_rooms FOR DELETE
  USING (auth.uid() = host_id AND status = 'waiting');

-- duel_results policies
CREATE POLICY "Players can read their results"
  ON duel_results FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Players can insert their results"
  ON duel_results FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- user_exercise_records policies
CREATE POLICY "Users can read their own exercise records"
  ON user_exercise_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise records"
  ON user_exercise_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise records"
  ON user_exercise_records FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- Functions
-- ============================================================

-- Atomic join: prevents two guests joining the same room
CREATE FUNCTION join_duel(p_code TEXT) RETURNS duel_rooms AS $$
  UPDATE duel_rooms
  SET guest_id = auth.uid()
  WHERE code = p_code
    AND status = 'waiting'
    AND guest_id IS NULL
  RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;

-- Room code generation (excluding ambiguous chars O/0/I/1)
CREATE FUNCTION generate_room_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Atomic upsert for exercise records (avoids race conditions)
CREATE FUNCTION upsert_exercise_record(
  p_user_id UUID,
  p_exercise_id TEXT,
  p_reps INT,
  p_combo INT,
  p_won BOOLEAN
) RETURNS void AS $$
  INSERT INTO user_exercise_records (user_id, exercise_id, max_reps, max_reps_date, best_combo, total_duels, wins)
  VALUES (p_user_id, p_exercise_id, p_reps, now(), p_combo, 1, CASE WHEN p_won THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, exercise_id) DO UPDATE SET
    max_reps = GREATEST(user_exercise_records.max_reps, EXCLUDED.max_reps),
    max_reps_date = CASE WHEN EXCLUDED.max_reps > user_exercise_records.max_reps THEN now() ELSE user_exercise_records.max_reps_date END,
    best_combo = GREATEST(user_exercise_records.best_combo, EXCLUDED.best_combo),
    total_duels = user_exercise_records.total_duels + 1,
    wins = user_exercise_records.wins + CASE WHEN p_won THEN 1 ELSE 0 END;
$$ LANGUAGE sql SECURITY DEFINER;
