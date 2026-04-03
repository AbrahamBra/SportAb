# Duel 1v1 Multiplayer — Design Spec

## Problem

The current exercise picker presents 17 camera-detectable exercises in a gym-app style catalogue (category tabs + exercise buttons). This feels thin (6 push, 4 legs, 2 pull, 2 shoulders, 3 hips, 0 abs) and disconnected from the game's RPG identity.

The user wants a clear separation:
- **Solo mode** = structured training program (camera + manual exercises), driven by onboarding
- **Multiplayer mode** = always camera-based, competitive/cooperative, Mario Party-inspired

This spec covers the **MVP multiplayer feature: Duel 1v1**, the foundation for future Coop Boss Raid and Party (multi-round) modes.

## Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| MVP mode | Duel 1v1 | Simplest technically, poses realtime foundations for Coop/Party later |
| Connectivity | Remote online | Supabase Realtime for sync, WebRTC for optional video |
| Exercise selection | Host chooses from exercise cards | Fair (host picks what they know), avoids impossible exercises from random |
| Camera sharing | Opt-in toggle per player | Privacy: default OFF (skeleton only), ON sends real video via WebRTC |
| Opponent visualization (cam OFF) | Animated skeleton from keypoints | 140 bytes/frame via Realtime, ultra lightweight, visually cohesive |
| Opponent visualization (cam ON) | WebRTC peer-to-peer video | Direct connection, no server video cost, Supabase as signaling only |
| Exercise UI in lobby | Flat card grid | 17 exercises fit on one screen, no category tabs needed, game-card aesthetic |

## User Flow

```
HOME
  └─ "DUEL" button → /duel (lobby)

/duel (lobby)
  ├─ "Créer un duel" → generates 6-char room code (e.g. FLEX42)
  │   └─ Share code (copy button + Web Share API)
  └─ "Rejoindre un duel" → enter room code
      └─ Validates code → joins room

/duel/[code] (room - both players present)
  ├─ Player cards: avatar + name + level for each player
  ├─ Toggle "Partager ma caméra" (per player, default OFF)
  ├─ Host sees exercise card grid (17 camera exercises)
  │   └─ Host taps a card → card enlarges/glows
  │   └─ Guest sees host's selection in realtime
  ├─ Host selects timer: 30s / 60s / 90s / 120s (default 60s)
  ├─ Both players tap "READY"
  └─ Synced countdown 3-2-1 → redirect to battle

/duel/[code]/battle (split screen fight)
  ├─ Timer counting down (center top)
  ├─ Left half: your camera + skeleton + rep counter + combo tier
  ├─ Right half: opponent's video OR skeleton + rep counter + combo tier
  ├─ Bottom: comparative progress bar ("TU MENES +4")
  ├─ Rep juice: screen shake, particles, damage numbers, sound, haptics
  └─ Timer expires → results screen

Results screen (overlay)
  ├─ Winner announcement (most reps wins)
  ├─ Stats: your reps, their reps, time, combos
  ├─ XP awarded to both (winner gets bonus)
  ├─ Personal record check
  └─ Actions: "Revanche" / "Nouveau duel" / "Quitter"
```

## Exercise Cards Component

Replaces the current ExercisePicker in the duel lobby context. The solo mode keeps its own exercise selection (future: program-based).

### Layout
- Flat grid of cards (no category tabs for 17 exercises)
- 3 columns on mobile, 4-5 on tablet/desktop
- Each card: signal-type emoji + exercise name
- Selected card: glow effect + scale animation
- Guest sees host's selection highlighted in realtime

### Exercise Data
Uses the existing `AI_EXERCISES` config from `exercises.config.ts`:
- Push (6): pushup, close-grip-pushup, incline-pushup, dips, bench-dips, body-tricep-press
- Legs (4): squat, jump-squat, lunge, bench-jump
- Pull (2): pullup, chinup
- Shoulders (2): overhead-press, handstand-pushup
- Hips (3): glute-bridge, hip-thrust, glute-kickback
- Abs (0): excluded (torso-ratio unreliable with 2D keypoints)

Total: 17 exercises available for duels.

## Split Screen Battle UI

```
┌──────────────────────────────────────┐
│            ⏱️ 0:47  VS              │
├──────────────────┬───────────────────┤
│   TOI            │   ADVERSAIRE      │
│                  │                   │
│  [camera feed    │  [their video OR  │
│   + skeleton     │   animated        │
│   overlay]       │   skeleton]       │
│                  │                   │
│   REPS: 23       │   REPS: 19       │
│   🔥 ON FIRE     │   ⚡ COMBO x4     │
│                  │                   │
├──────────────────┴───────────────────┤
│  ████████████░░░░  TU MENES (+4)    │
└──────────────────────────────────────┘
```

### Your Side (left)
- Camera feed with skeleton overlay (same as current solo battle)
- Rep counter with combo tier text
- Form score bar (bottom of your half)

### Opponent Side (right)
- **Camera OFF (default)**: Animated skeleton rendered from received keypoints. Skeleton moves in realtime as opponent exercises. Rep counter + combo tier.
- **Camera ON**: WebRTC video feed (mirrored) with skeleton overlay. Rep counter + combo tier.

### Shared Elements
- Center top: countdown timer + "VS" badge
- Bottom: comparative progress bar showing who leads and by how many reps
- Animations on each rep: screen shake (subtle), particles, combo effects

### Responsive Behavior
- Portrait mobile: vertical split (you on top, opponent on bottom)
- Landscape / tablet: horizontal split (side by side)

## Technical Architecture

### New Supabase Tables

```sql
-- Duel rooms for matchmaking and state
CREATE TABLE duel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,           -- 6-char alphanumeric join code
  host_id UUID NOT NULL REFERENCES auth.users(id),
  guest_id UUID REFERENCES auth.users(id),
  exercise_id TEXT NOT NULL DEFAULT '',
  time_limit_secs INT NOT NULL DEFAULT 60,
  host_camera_shared BOOLEAN DEFAULT false,
  guest_camera_shared BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'waiting',
    -- waiting: host created, waiting for guest
    -- ready: both players ready
    -- active: battle in progress
    -- finished: battle complete
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '15 minutes')
);

-- Index for code lookups
CREATE INDEX idx_duel_rooms_code ON duel_rooms(code);
-- Index for cleanup of expired rooms
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

-- RLS policies
ALTER TABLE duel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_results ENABLE ROW LEVEL SECURITY;

-- Players can read rooms they're in
CREATE POLICY "Players can read their rooms"
  ON duel_rooms FOR SELECT
  USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- Anyone authenticated can find waiting rooms by code (needed for joining)
CREATE POLICY "Anyone can find waiting rooms"
  ON duel_rooms FOR SELECT
  USING (status = 'waiting');

-- Anyone can create a room
CREATE POLICY "Authenticated users can create rooms"
  ON duel_rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Players in the room can update it
CREATE POLICY "Players can update their rooms"
  ON duel_rooms FOR UPDATE
  USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- Host can cancel a waiting room
CREATE POLICY "Host can delete waiting rooms"
  ON duel_rooms FOR DELETE
  USING (auth.uid() = host_id AND status = 'waiting');

-- Players can read their own results
CREATE POLICY "Players can read their results"
  ON duel_results FOR SELECT
  USING (auth.uid() = player_id);

-- Players can insert their own results
CREATE POLICY "Players can insert their results"
  ON duel_results FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Atomic join function to prevent race conditions
CREATE FUNCTION join_duel(p_code TEXT) RETURNS duel_rooms AS $$
  UPDATE duel_rooms
  SET guest_id = auth.uid()
  WHERE code = p_code
    AND status = 'waiting'
    AND guest_id IS NULL
  RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;

-- Room code generation with collision retry
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
```

**Note on room joins**: Guests join via the `join_duel(code)` RPC function, which atomically claims the guest slot using an `UPDATE ... WHERE guest_id IS NULL` guard (row-level atomic in Postgres). The function is `SECURITY DEFINER` — `auth.uid()` still resolves correctly because Supabase sets `request.jwt.claims` per-request, which is available in definer context. This prevents two guests from joining the same room simultaneously.

**Note on room cleanup**: Expired `waiting` rooms are cleaned up server-side using the Supabase service role key via a scheduled Edge Function or pg_cron. Client-side, hosts can cancel their own waiting rooms via the DELETE policy.

### Supabase Realtime Channel

Channel name: `duel:{room_uuid}` (uses the room UUID, not the short code, to prevent brute-force channel eavesdropping)

Broadcast events (no persistence, low latency):

| Event | Payload | Direction |
|-------|---------|-----------|
| `player_joined` | `{ player_id, username, level, avatar }` | guest → host |
| `exercise_selected` | `{ exercise_id }` | host → guest |
| `settings_updated` | `{ time_limit_secs }` | host → guest |
| `camera_toggle` | `{ player_id, shared: boolean }` | both ways |
| `player_ready` | `{ player_id }` | both ways |
| `countdown_start` | `{ start_at: timestamp }` | host → guest |
| `rep_update` | `{ player_id, reps, combo_tier }` | both ways, each rep |
| `keypoints` | `{ player_id, points: [x,y,score][] }` | both ways, each frame (if skeleton sharing) |
| `battle_end` | `{ player_id, final_reps }` | both ways |

### WebRTC Signaling (camera sharing)

When a player toggles camera ON, WebRTC peer connection is established:

1. Player A sends `webrtc_offer` via Supabase Realtime channel with SDP offer
2. Player B receives, creates answer, sends `webrtc_answer` with SDP answer
3. Both exchange `ice_candidate` events for NAT traversal
4. Direct peer-to-peer video stream established

Supabase Realtime events for signaling:

| Event | Payload |
|-------|---------|
| `webrtc_offer` | `{ player_id, sdp }` |
| `webrtc_answer` | `{ player_id, sdp }` |
| `ice_candidate` | `{ player_id, candidate }` |

STUN server: Google's free STUN (`stun:stun.l.google.com:19302`).
No TURN server for MVP (works for ~85% of connections; add TURN in V2 if needed).

**WebRTC fallback**: If peer connection fails to establish within 5 seconds, automatically revert to skeleton-only mode and show a toast: "Connexion vidéo impossible, mode squelette activé". The camera toggle reverts to OFF on the failed side.

### Skeleton Streaming (camera OFF default)

When camera is OFF but player is exercising, their pose keypoints are broadcast:
- Source: MoveNet detector already produces 17 keypoints per frame
- Send: every 3rd frame (~20fps) via `keypoints` broadcast event
- Payload: `{ player_id, points: [[x, y, score], ...] }` — ~140 bytes per message
- Render: opponent's client draws an animated skeleton from received keypoints
- Latency: Supabase Realtime broadcast is ~50-100ms, acceptable for visualization

### New Routes & Components

```
src/routes/duel/
  +page.svelte              — lobby: create or join a duel
  [code]/
    +page.svelte            — room: exercise cards, settings, ready check
    +page.ts                — load room data, validate code
    battle/
      +page.svelte          — split screen duel battle

src/lib/components/
  ExerciseCards.svelte       — flat grid of exercise cards (lobby use)
  DuelBattleView.svelte      — split screen battle layout
  OpponentView.svelte        — skeleton renderer OR WebRTC video
  SkeletonRenderer.svelte    — draws animated skeleton from keypoints
  ProgressBar.svelte         — comparative progress bar

src/lib/game/
  duel-engine.ts             — duel state machine (extends battle-engine concepts)
  duel-realtime.ts           — Supabase Realtime channel management
  webrtc-peer.ts             — WebRTC connection setup and teardown

src/lib/supabase/
  duel.ts                    — CRUD operations for duel_rooms and duel_results
```

### Duel Engine State Machine

```
IDLE → WAITING → ROOM_READY → COUNTDOWN → ACTIVE → FINISHED
                                                      ↓
                                                   REMATCH → COUNTDOWN
```

States:
- **IDLE**: no duel active
- **WAITING**: host created room, waiting for guest
- **ROOM_READY**: both players present, exercise selected, settings confirmed
- **COUNTDOWN**: synced 3-2-1 countdown
- **ACTIVE**: battle in progress, reps being counted and broadcast
- **FINISHED**: timer expired, results calculated
- **REMATCH**: either player proposes rematch, both must accept (like READY check). Same exercise and timer settings carry over unless host changes them. Room status transitions: `finished` → `ready` → `countdown` → `active`

### Sync & Conflict Resolution

- **Rep counting**: each player counts their own reps locally (camera detection). Reps are broadcast but never overridden by the other player.
- **Timer**: host is authoritative for battle end. Host broadcasts `countdown_start` with a `start_at` timestamp. Both clients compute elapsed locally. When the host's timer expires, host broadcasts `battle_end` which is authoritative — both clients end the battle on receiving it. This avoids clock drift issues between devices.
- **Results**: on `battle_end`, each player broadcasts their final rep count. Both clients compute the winner independently. Results are written to `duel_results` by each player for their own row.
- **Disconnection**: if a player disconnects mid-battle, their last known rep count is used. Opponent wins by default if disconnect lasts > 10 seconds. Presence tracking via Supabase Realtime `presence` feature with payload `{ player_id, online: true }` and 10-second timeout threshold.
- **Exercise validation**: the `countdown_start` event includes `exercise_id`. Guest verifies it matches the room's selected exercise before starting. The READY button is disabled until the host has selected an exercise (client-side check: `exercise_id !== ''`).

### Room Lifecycle & Cleanup

- Rooms expire after 15 minutes if never started (`expires_at` column)
- Finished rooms are kept for history (referenced by `duel_results`)
- Periodic cleanup: Supabase cron or Edge Function deletes expired `waiting` rooms
- Room codes: 6 uppercase alphanumeric characters (excluding ambiguous chars O/0/I/1), generated via `generate_room_code()` with INSERT retry on unique constraint violation (up to 3 attempts)

## XP & Rewards

- **Winner**: `base_xp (50) + reps * 2 + win_bonus (25)`
- **Loser**: `base_xp (50) + reps * 2` (no penalty, still rewarded for effort)
- **Draw**: both get `base_xp + reps * 2 + draw_bonus (10)`
- XP feeds into the existing leveling system
- Duel results contribute to existing personal records (most reps per exercise)

## Personal Records for Duels

The existing `user_records` system is keyed on `(user_id, boss_id)`, which doesn't apply to duels (no boss). Duel personal records are tracked per exercise:

```sql
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

ALTER TABLE user_exercise_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own exercise records"
  ON user_exercise_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own exercise records"
  ON user_exercise_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise records"
  ON user_exercise_records FOR UPDATE
  USING (auth.uid() = user_id);
```

Updated after each duel. Also used for solo boss battles to track per-exercise bests across all contexts.

## Known Limitations & Anti-Cheat

For MVP (casual play between friends), the following limitations are accepted:

- **Rep counts are self-reported**: each player counts reps locally via TensorFlow.js and broadcasts the count. A modified client could report fake reps. This is acceptable for friend duels.
- **No server-side verification**: there is no backend validation of rep counts or keypoint plausibility.
- **Future mitigations** (V2+): server-side plausibility checks (max ~2 reps/second cap), keypoint consistency validation (ensure skeleton data matches claimed reps), reputation system for flagging suspicious players.

## PWA Considerations

PushQuest is a PWA. Mobile browsers (especially iOS Safari) aggressively suspend background tabs:

- **Screen Wake Lock API**: the battle screen acquires a wake lock to prevent the screen from turning off during a duel. Released on battle end or navigation away.
- **Visibility change handler**: if the tab is backgrounded during battle, attempt to reconnect to Supabase Realtime on `visibilitychange` event. If reconnection takes > 5 seconds, forfeit the player (same as disconnect).
- **Notification on opponent disconnect**: if the opponent's tab is suspended and presence times out, show a toast and pause the timer for up to 10 seconds before declaring a forfeit.

## Future Modes (out of scope, informed by this architecture)

### Coop Boss Raid
- Same room/channel architecture
- 2-4 players' reps combined to defeat a high-HP boss
- Exercise determined by boss weakness
- Shared boss HP bar instead of comparative progress

### Party Mode (multi-round)
- Series of 3-5 rounds, each with a different exercise
- Exercise selected by roulette animation (random from pool)
- Points accumulated across rounds
- Winner = most total points

### Roulette Option
- Added to lobby as alternative to host-picks
- "Aléatoire" button triggers synced roulette animation
- Both players see the same spin result

## What Changes for Existing Code

| Area | Change |
|------|--------|
| Home page (`/`) | Add "DUEL" button in navigation |
| ExercisePicker.svelte | Untouched — stays for solo boss battles |
| Battle engine | Duel engine is new, reuses concepts but doesn't extend |
| Supabase schema | New migration: `005_duels.sql` |
| Navigation | Add duel entry point |

The existing solo battle flow (`/battle`) is completely untouched.
