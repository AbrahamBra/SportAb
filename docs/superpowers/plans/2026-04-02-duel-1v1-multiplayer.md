# Duel 1v1 Multiplayer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time 1v1 duel mode where two players compete on the same exercise via camera detection, with optional video sharing via WebRTC.

**Architecture:** New `/duel` route tree with Supabase Realtime broadcast channels for rep sync and skeleton streaming. WebRTC peer-to-peer for optional camera sharing. Duel engine is a new state machine independent from the existing battle engine. All data persisted via Supabase with RLS.

**Tech Stack:** SvelteKit 2 + Svelte 5, Supabase (Realtime broadcast + Presence + RPC), WebRTC, TensorFlow.js MoveNet (existing), Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-04-02-duel-1v1-multiplayer-design.md`

---

## File Map

### New files to create:
```
supabase/migrations/005_duels.sql          — DB tables, RLS, functions
src/lib/supabase/duel.ts                   — CRUD: create room, join, update, save results
src/lib/game/duel-engine.ts                — Duel state machine + XP calc
src/lib/game/duel-realtime.ts              — Supabase Realtime channel wrapper
src/lib/game/webrtc-peer.ts               — WebRTC connection setup/teardown
src/lib/components/ExerciseCards.svelte     — Flat grid of 17 exercise cards
src/lib/components/SkeletonRenderer.svelte  — Canvas: draw skeleton from keypoints
src/lib/components/OpponentView.svelte      — Skeleton OR WebRTC video display
src/lib/components/DuelProgressBar.svelte   — Comparative rep progress bar
src/lib/components/DuelResultScreen.svelte  — Victory/defeat overlay for duels
src/routes/duel/+page.svelte               — Lobby: create or join
src/routes/duel/[code]/+page.svelte        — Room: exercise pick + ready
  (room data loaded client-side in +page.svelte onMount to avoid SSR issues)
src/routes/duel/[code]/battle/+page.svelte — Split screen duel battle
```

### Existing files to modify:
```
src/routes/+page.svelte                    — Add DUEL button
src/lib/components/TabBar.svelte           — Add duel tab or hide on duel routes
src/routes/+layout.svelte                  — Hide TabBar on /duel/**/battle
```

---

## Chunk 1: Database & Data Layer

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/005_duels.sql`

- [ ] **Step 1: Create migration file with all tables, indexes, RLS, and functions**

Copy the complete SQL from the spec (sections "New Supabase Tables" + "Personal Records for Duels") into `005_duels.sql`. This includes:
- `duel_rooms` table with status enum, expires_at, camera sharing flags
- `duel_results` table with form_score_avg, max_combo
- `user_exercise_records` table with UNIQUE(user_id, exercise_id)
- All indexes (code lookup, expiry cleanup, player lookup)
- RLS enabled on all 3 tables with policies for read/write/delete
- `join_duel(p_code)` SECURITY DEFINER function for atomic guest join
- `generate_room_code()` function excluding ambiguous chars (O/0/I/1)

```sql
-- Full SQL is in the spec. Copy verbatim from:
-- docs/superpowers/specs/2026-04-02-duel-1v1-multiplayer-design.md
-- Sections: "New Supabase Tables" + "Personal Records for Duels"
```

- [ ] **Step 2: Apply migration to Supabase**

Run: `npx supabase db push` (if using CLI) or apply via Supabase Dashboard SQL editor.

- [ ] **Step 3: Verify tables exist**

Check in Supabase Dashboard: Tables > duel_rooms, duel_results, user_exercise_records should all appear with RLS enabled.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/005_duels.sql
git commit -m "feat(duel): add database migration for duel rooms, results, and exercise records"
```

---

### Task 2: Supabase CRUD Layer

**Files:**
- Create: `src/lib/supabase/duel.ts`
- Reference: `src/lib/supabase/client.ts` (existing pattern)

- [ ] **Step 1: Create duel.ts with all CRUD operations**

```typescript
import { createClient } from './client';

// Types
export interface DuelRoom {
  id: string;
  code: string;
  host_id: string;
  guest_id: string | null;
  exercise_id: string;
  time_limit_secs: number;
  host_camera_shared: boolean;
  guest_camera_shared: boolean;
  status: 'waiting' | 'ready' | 'active' | 'finished';
  started_at: string | null;
  created_at: string;
  expires_at: string;
}

export interface DuelResult {
  id: string;
  room_id: string;
  player_id: string;
  reps: number;
  max_combo: number;
  form_score_avg: number | null;
  elapsed_secs: number;
  is_winner: boolean;
  xp_earned: number;
  created_at: string;
}

export interface UserExerciseRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  max_reps: number;
  max_reps_date: string | null;
  best_combo: number;
  total_duels: number;
  wins: number;
}

// Room code generation (client-side, with server fallback via generate_room_code())
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Create a new duel room (host)
export async function createDuelRoom(hostId: string): Promise<DuelRoom> {
  const supabase = createClient();
  let attempts = 0;
  while (attempts < 3) {
    const code = generateCode();
    const { data, error } = await supabase
      .from('duel_rooms')
      .insert({ host_id: hostId, code })
      .select()
      .single();
    if (data) return data as DuelRoom;
    if (error && error.code === '23505') { // unique violation
      attempts++;
      continue;
    }
    throw error;
  }
  throw new Error('Failed to generate unique room code');
}

// Join a duel room (guest) via atomic RPC
export async function joinDuelRoom(code: string): Promise<DuelRoom> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('join_duel', { p_code: code.toUpperCase() });
  if (error) throw error;
  if (!data) throw new Error('Room not found or already full');
  return data as DuelRoom;
}

// Get room by code
export async function getDuelRoom(code: string): Promise<DuelRoom | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('duel_rooms')
    .select()
    .eq('code', code.toUpperCase())
    .single();
  return data as DuelRoom | null;
}

// Update room fields (exercise, timer, camera, status)
export async function updateDuelRoom(
  roomId: string,
  updates: Partial<Pick<DuelRoom, 'exercise_id' | 'time_limit_secs' | 'host_camera_shared' | 'guest_camera_shared' | 'status' | 'started_at'>>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('duel_rooms')
    .update(updates)
    .eq('id', roomId);
  if (error) throw error;
}

// Delete a waiting room (host cancel)
export async function deleteDuelRoom(roomId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('duel_rooms')
    .delete()
    .eq('id', roomId);
  if (error) throw error;
}

// Save duel result for one player
export async function saveDuelResult(result: Omit<DuelResult, 'id' | 'created_at'>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('duel_results').insert(result);
  if (error) throw error;
}

// Upsert exercise record after duel (uses RPC to avoid race conditions)
// Add this RPC to the migration:
//   CREATE FUNCTION upsert_exercise_record(
//     p_user_id UUID, p_exercise_id TEXT, p_reps INT, p_combo INT, p_won BOOLEAN
//   ) RETURNS void AS $$
//     INSERT INTO user_exercise_records (user_id, exercise_id, max_reps, max_reps_date, best_combo, total_duels, wins)
//     VALUES (p_user_id, p_exercise_id, p_reps, now(), p_combo, 1, CASE WHEN p_won THEN 1 ELSE 0 END)
//     ON CONFLICT (user_id, exercise_id) DO UPDATE SET
//       max_reps = GREATEST(user_exercise_records.max_reps, EXCLUDED.max_reps),
//       max_reps_date = CASE WHEN EXCLUDED.max_reps > user_exercise_records.max_reps THEN now() ELSE user_exercise_records.max_reps_date END,
//       best_combo = GREATEST(user_exercise_records.best_combo, EXCLUDED.best_combo),
//       total_duels = user_exercise_records.total_duels + 1,
//       wins = user_exercise_records.wins + CASE WHEN p_won THEN 1 ELSE 0 END;
//   $$ LANGUAGE sql SECURITY DEFINER;
export async function updateExerciseRecord(
  userId: string,
  exerciseId: string,
  reps: number,
  combo: number,
  won: boolean
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('upsert_exercise_record', {
    p_user_id: userId,
    p_exercise_id: exerciseId,
    p_reps: reps,
    p_combo: combo,
    p_won: won,
  });
  if (error) throw error;
}

// Get duel history for a player
export async function getDuelHistory(playerId: string, limit = 20): Promise<DuelResult[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('duel_results')
    .select()
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as DuelResult[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase/duel.ts
git commit -m "feat(duel): add Supabase CRUD layer for rooms, results, and records"
```

---

### Task 3: Duel Engine (State Machine)

**Files:**
- Create: `src/lib/game/duel-engine.ts`
- Reference: `src/lib/game/battle-engine.ts` (existing pattern)

- [ ] **Step 1: Create duel-engine.ts**

```typescript
export type DuelStatus = 'idle' | 'waiting' | 'room_ready' | 'countdown' | 'active' | 'finished' | 'rematch';

export interface DuelState {
  status: DuelStatus;
  myReps: number;
  opponentReps: number;
  myCombo: number;
  myMaxCombo: number;
  opponentCombo: number;
  timeElapsedSecs: number;
  timeLimitSecs: number;
  exerciseId: string;
  result: 'pending' | 'victory' | 'defeat' | 'draw';
  xpEarned: number;
  isNewRecord: boolean;
}

export interface DuelEngine {
  setStatus(status: DuelStatus): void;
  setExercise(exerciseId: string): void;
  setTimeLimit(secs: number): void;
  addMyRep(): void;
  updateOpponentReps(reps: number, combo: number): void;
  tick(): void;
  endBattle(): void;
  reset(): void;
  getState(): DuelState;
}

const COMBO_WINDOW_MS = 3000;
const BASE_XP = 50;
const WIN_BONUS = 25;
const DRAW_BONUS = 10;

export function createDuelEngine(timeLimitSecs: number = 60): DuelEngine {
  let status: DuelStatus = 'idle';
  let myReps = 0;
  let opponentReps = 0;
  let myCombo = 0;
  let myMaxCombo = 0;
  let opponentCombo = 0;
  let timeElapsedSecs = 0;
  let timeLimitSecsVal = timeLimitSecs;
  let exerciseId = '';
  let result: DuelState['result'] = 'pending';
  let lastRepTime = 0;

  function calcXP(): number {
    if (result === 'pending') return 0;
    const base = BASE_XP + myReps * 2;
    if (result === 'victory') return base + WIN_BONUS;
    if (result === 'draw') return base + DRAW_BONUS;
    return base; // defeat
  }

  function determineResult(): DuelState['result'] {
    if (myReps > opponentReps) return 'victory';
    if (myReps < opponentReps) return 'defeat';
    return 'draw';
  }

  return {
    setStatus(s: DuelStatus) { status = s; },
    setExercise(id: string) { exerciseId = id; },
    setTimeLimit(secs: number) { timeLimitSecsVal = secs; },

    addMyRep() {
      if (status !== 'active') return;
      myReps++;
      const now = Date.now();
      if (now - lastRepTime < COMBO_WINDOW_MS) {
        myCombo++;
      } else {
        myCombo = 1;
      }
      lastRepTime = now;
      if (myCombo > myMaxCombo) myMaxCombo = myCombo;
    },

    updateOpponentReps(reps: number, combo: number) {
      opponentReps = reps;
      opponentCombo = combo;
    },

    tick() {
      if (status !== 'active') return;
      timeElapsedSecs++;
    },

    endBattle() {
      if (status !== 'active') return;
      status = 'finished';
      result = determineResult();
    },

    reset() {
      myReps = 0;
      opponentReps = 0;
      myCombo = 0;
      myMaxCombo = 0;
      opponentCombo = 0;
      timeElapsedSecs = 0;
      result = 'pending';
      lastRepTime = 0;
      status = 'room_ready';
    },

    getState(): DuelState {
      return {
        status,
        myReps,
        opponentReps,
        myCombo,
        myMaxCombo,
        opponentCombo,
        timeElapsedSecs,
        timeLimitSecs: timeLimitSecsVal,
        exerciseId,
        result,
        xpEarned: calcXP(),
        isNewRecord: false, // set externally after checking records
      };
    },
  };
}

// Combo tier labels (reuse from battle page pattern)
export function getComboTier(combo: number): string {
  if (combo >= 15) return 'LEGENDARY';
  if (combo >= 10) return 'UNSTOPPABLE';
  if (combo >= 5) return 'ON FIRE';
  if (combo >= 3) return 'COMBO';
  return '';
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/game/duel-engine.ts
git commit -m "feat(duel): add duel engine state machine with combo tracking and XP"
```

---

## Chunk 2: Realtime & Networking

### Task 4: Supabase Realtime Channel Wrapper

**Files:**
- Create: `src/lib/game/duel-realtime.ts`
- Reference: `src/lib/supabase/client.ts`

- [ ] **Step 1: Create duel-realtime.ts**

```typescript
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export type DuelEvent =
  | { type: 'player_joined'; player_id: string; username: string; level: number }
  | { type: 'exercise_selected'; exercise_id: string }
  | { type: 'settings_updated'; time_limit_secs: number }
  | { type: 'camera_toggle'; player_id: string; shared: boolean }
  | { type: 'player_ready'; player_id: string }
  | { type: 'countdown_start'; start_at: string; exercise_id: string }
  | { type: 'rep_update'; player_id: string; reps: number; combo_tier: number }
  | { type: 'keypoints'; player_id: string; points: number[][] }
  | { type: 'battle_end'; player_id: string; final_reps: number }
  | { type: 'rematch_request'; player_id: string }
  | { type: 'webrtc_offer'; player_id: string; sdp: string }
  | { type: 'webrtc_answer'; player_id: string; sdp: string }
  | { type: 'ice_candidate'; player_id: string; candidate: string };

export interface DuelRealtimeCallbacks {
  onEvent: (event: DuelEvent) => void;
  onPresenceSync: (presentIds: string[]) => void;
}

export interface DuelRealtime {
  send(event: DuelEvent): void;
  trackPresence(playerId: string): void;
  destroy(): void;
}

export function createDuelRealtime(
  supabase: SupabaseClient,
  roomId: string,
  callbacks: DuelRealtimeCallbacks
): DuelRealtime {
  const channelName = `duel:${roomId}`;

  const channel: RealtimeChannel = supabase
    .channel(channelName, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'duel_event' }, (payload) => {
      callbacks.onEvent(payload.payload as DuelEvent);
    })
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const ids = Object.values(state).flat().map((p: any) => p.player_id as string);
      callbacks.onPresenceSync(ids);
    })
    .subscribe();

  return {
    send(event: DuelEvent) {
      channel.send({ type: 'broadcast', event: 'duel_event', payload: event });
    },

    trackPresence(playerId: string) {
      channel.track({ player_id: playerId });
    },

    destroy() {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/game/duel-realtime.ts
git commit -m "feat(duel): add Supabase Realtime channel wrapper with broadcast and presence"
```

---

### Task 5: WebRTC Peer Connection

**Files:**
- Create: `src/lib/game/webrtc-peer.ts`

- [ ] **Step 1: Create webrtc-peer.ts**

```typescript
const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const CONNECTION_TIMEOUT_MS = 5000;

export interface WebRTCPeer {
  createOffer(): Promise<string>;
  handleAnswer(sdp: string): Promise<void>;
  handleOffer(sdp: string): Promise<string>;
  addIceCandidate(candidate: string): Promise<void>;
  getRemoteStream(): MediaStream | null;
  setLocalStream(stream: MediaStream): void;
  onIceCandidate: ((candidate: string) => void) | null;
  onRemoteStream: ((stream: MediaStream) => void) | null;
  onConnectionFailed: (() => void) | null;
  destroy(): void;
}

export function createWebRTCPeer(): WebRTCPeer {
  const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
  let remoteStream: MediaStream | null = null;
  let connectionTimer: ReturnType<typeof setTimeout> | null = null;

  const peer: WebRTCPeer = {
    onIceCandidate: null,
    onRemoteStream: null,
    onConnectionFailed: null,

    setLocalStream(stream: MediaStream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    },

    async createOffer(): Promise<string> {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      startConnectionTimer();
      return JSON.stringify(offer);
    },

    async handleAnswer(sdp: string): Promise<void> {
      const answer = JSON.parse(sdp) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(answer);
    },

    async handleOffer(sdp: string): Promise<string> {
      const offer = JSON.parse(sdp) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      startConnectionTimer();
      return JSON.stringify(answer);
    },

    async addIceCandidate(candidate: string): Promise<void> {
      const c = JSON.parse(candidate) as RTCIceCandidateInit;
      await pc.addIceCandidate(c);
    },

    getRemoteStream(): MediaStream | null {
      return remoteStream;
    },

    destroy() {
      if (connectionTimer) clearTimeout(connectionTimer);
      pc.close();
      remoteStream = null;
    },
  };

  // ICE candidate handler
  pc.onicecandidate = (event) => {
    if (event.candidate && peer.onIceCandidate) {
      peer.onIceCandidate(JSON.stringify(event.candidate));
    }
  };

  // Remote stream handler
  pc.ontrack = (event) => {
    remoteStream = event.streams[0] ?? new MediaStream([event.track]);
    if (connectionTimer) {
      clearTimeout(connectionTimer);
      connectionTimer = null;
    }
    if (peer.onRemoteStream) peer.onRemoteStream(remoteStream);
  };

  // Connection state
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      if (peer.onConnectionFailed) peer.onConnectionFailed();
    }
  };

  function startConnectionTimer() {
    if (connectionTimer) clearTimeout(connectionTimer);
    connectionTimer = setTimeout(() => {
      if (!remoteStream && peer.onConnectionFailed) {
        peer.onConnectionFailed();
      }
    }, CONNECTION_TIMEOUT_MS);
  }

  return peer;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/game/webrtc-peer.ts
git commit -m "feat(duel): add WebRTC peer connection with STUN and fallback timeout"
```

---

## Chunk 3: UI Components

### Task 6: Exercise Cards Component

**Files:**
- Create: `src/lib/components/ExerciseCards.svelte`
- Reference: `src/lib/ai/exercises.config.ts` (EXERCISES data)

- [ ] **Step 1: Create ExerciseCards.svelte**

A flat grid of all 17 AI-detectable exercises as game-style cards. No category tabs. Host selects, guest sees selection in realtime.

Props:
- `selected: string` — currently selected exercise ID
- `onSelect: (id: string) => void` — callback when host taps a card
- `readonly: boolean` — true for guest (can't tap)

The component imports `EXERCISES` from `exercises.config.ts` and renders each entry as a card with:
- Signal type emoji (elbow-angle = muscle, knee-angle = leg, etc.)
- Exercise name
- Selected state: scale + glow ring animation
- Grid: 3 columns, gap-3, with game-card styling (dark bg, border, rounded)

Use existing app color scheme: dark backgrounds with red/orange accents (matching the RPG theme).

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/ExerciseCards.svelte
git commit -m "feat(duel): add ExerciseCards component with flat grid layout"
```

---

### Task 7: Skeleton Renderer

**Files:**
- Create: `src/lib/components/SkeletonRenderer.svelte`
- Reference: `src/lib/components/CameraDetection.svelte` (skeleton drawing logic)

- [ ] **Step 1: Create SkeletonRenderer.svelte**

A canvas component that draws an animated skeleton from received MoveNet keypoints. Extract the skeleton drawing logic from CameraDetection.svelte (the `drawSkeleton` and `drawKeypoint` functions) into this reusable component.

Props:
- `keypoints: number[][]` — array of [x, y, score] from remote player
- `width: number`
- `height: number`

The canvas renders at the given dimensions, drawing:
- Joint circles (red with white outline, same style as CameraDetection)
- Bone connections between joints (same POSE_CONNECTIONS)
- Smoothed interpolation between frames for fluid motion (lerp with factor 0.3)

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/SkeletonRenderer.svelte
git commit -m "feat(duel): add SkeletonRenderer component for remote player visualization"
```

---

### Task 8: Opponent View Component

**Files:**
- Create: `src/lib/components/OpponentView.svelte`

- [ ] **Step 1: Create OpponentView.svelte**

Composite component that shows either:
- **Skeleton mode** (default): SkeletonRenderer with dark background
- **Video mode**: `<video>` element with WebRTC remote stream + skeleton overlay

Props:
- `mode: 'skeleton' | 'video'`
- `keypoints: number[][] | null`
- `remoteStream: MediaStream | null`
- `reps: number`
- `comboTier: string`
- `username: string`

Layout:
- Full container with relative positioning
- Video/skeleton fills the container
- Username label top-left
- Rep counter bottom-center (large font)
- Combo tier text centered, animated on change

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/OpponentView.svelte
git commit -m "feat(duel): add OpponentView with skeleton/video modes"
```

---

### Task 9: Duel Progress Bar

**Files:**
- Create: `src/lib/components/DuelProgressBar.svelte`

- [ ] **Step 1: Create DuelProgressBar.svelte**

Horizontal bar showing comparative rep progress.

Props:
- `myReps: number`
- `opponentReps: number`

Visual: two-tone bar. Left portion (your color, e.g. red) represents your reps as proportion of total. Right portion (opponent color, e.g. blue) represents theirs. Center text shows the lead: "TU MENES +4" or "IL MENE +2" or "EGALITE". Animated transitions on rep changes.

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/DuelProgressBar.svelte
git commit -m "feat(duel): add comparative progress bar component"
```

---

### Task 10: Duel Result Screen

**Files:**
- Create: `src/lib/components/DuelResultScreen.svelte`
- Reference: `src/lib/components/VictoryScreen.svelte` (existing pattern)

- [ ] **Step 1: Create DuelResultScreen.svelte**

Full-screen overlay shown at battle end. Adapts based on result.

Props:
- `result: 'victory' | 'defeat' | 'draw'`
- `myReps: number`
- `opponentReps: number`
- `myMaxCombo: number`
- `opponentMaxCombo: number`
- `xpEarned: number`
- `isNewRecord: boolean`
- `onRematch: () => void`
- `onNewDuel: () => void`
- `onQuit: () => void`

Layout:
- Result title with animation (VICTOIRE! / DEFAITE / EGALITE)
- Side-by-side stats comparison
- XP earned bar
- New record badge (if applicable)
- Three action buttons: Revanche, Nouveau Duel, Quitter

Match the existing VictoryScreen/DefeatScreen aesthetic with dark overlay and glow effects.

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/DuelResultScreen.svelte
git commit -m "feat(duel): add duel result screen with stats and actions"
```

---

## Chunk 4: Pages

### Task 11: Duel Lobby Page

**Files:**
- Create: `src/routes/duel/+page.svelte`

- [ ] **Step 1: Create lobby page**

Two main actions:
1. **"Creer un Duel"** button — calls `createDuelRoom(userId)`, navigates to `/duel/{code}`
2. **"Rejoindre"** — input field for 6-char code, calls `joinDuelRoom(code)`, navigates to `/duel/{code}`

Layout:
- Centered content, dark theme matching app
- Large title "DUEL"
- Create button (primary, red/orange accent)
- Divider "— OU —"
- Join code input (6 chars, uppercase, auto-focus) + Join button
- Error messages for invalid/full rooms
- Back button to home

Auth guard: redirect to `/auth/login` if not authenticated (check via `$page.data.session`).

- [ ] **Step 2: Commit**

```bash
git add src/routes/duel/+page.svelte
git commit -m "feat(duel): add lobby page with create and join room"
```

---

### Task 12: Duel Room Page

**Files:**
- Create: `src/routes/duel/[code]/+page.ts`
- Create: `src/routes/duel/[code]/+page.svelte`

- [ ] **Step 1: Create page loader (+page.svelte handles loading client-side)**

No separate `+page.ts` needed. The room page loads data client-side on mount using `onMount` + `getDuelRoom(params.code)`. This avoids SSR issues with `createBrowserClient` (which requires browser globals). The room code comes from `$page.params.code`. Show a loading spinner while fetching, redirect to `/duel` if room not found.

This matches the existing pattern where real-time pages handle their own data fetching client-side.

- [ ] **Step 2: Create room page (+page.svelte)**

Main sections:
1. **Player cards** — show host (always visible) + guest (appears when joined). Avatar, name, level.
2. **Exercise Cards** — ExerciseCards component. Host can select, guest sees selection readonly.
3. **Timer selector** — host picks: 30s / 60s / 90s / 120s buttons (default 60s highlighted).
4. **Camera toggle** — "Partager ma camera" switch per player.
5. **Room code display** — large code + copy button + Web Share API button.
6. **Ready button** — disabled until exercise selected. Both must tap. Shows check when ready.
7. **Countdown overlay** — 3-2-1-GO! full screen when both ready.

Realtime integration:
- On mount: `createDuelRealtime(supabase, room.id, callbacks)` + `trackPresence(userId)` (supabase client from `createClient()`, created once in component)
- Listen for all lobby events (player_joined, exercise_selected, settings_updated, camera_toggle, player_ready, countdown_start)
- On countdown_start: show countdown overlay, then `goto('/duel/${code}/battle')` at GO

Store room state in reactive Svelte 5 `$state()`. The duel engine uses closures (same pattern as existing `createBattle`), so wrap `engine.getState()` in a reactive `$state` variable that gets updated on each tick/event callback.

- [ ] **Step 3: Commit**

```bash
git add src/routes/duel/[code]/+page.ts src/routes/duel/[code]/+page.svelte
git commit -m "feat(duel): add room page with exercise selection, settings, and ready check"
```

---

### Task 13: Duel Battle Page (Main Feature)

**Files:**
- Create: `src/routes/duel/[code]/battle/+page.svelte`
- Reference: `src/routes/battle/+page.svelte` (existing battle page for patterns)

- [ ] **Step 1: Create split-screen battle page**

This is the core feature. The page orchestrates:

**Layout (portrait mobile):**
```
┌────────────────────┐
│    ⏱ 0:47  VS     │  ← timer bar
├────────────────────┤
│  YOUR CAMERA       │  ← CameraDetection component (top half)
│  + skeleton        │
│  REPS: 23 🔥       │
│  [FormScoreBar]    │  ← reuse existing FormScoreBar.svelte
├────────────────────┤
│  OPPONENT          │  ← OpponentView component (bottom half)
│  skeleton/video    │
│  REPS: 19 ⚡       │
├────────────────────┤
│ ████████░░ +4 LEAD │  ← DuelProgressBar
└────────────────────┘
```

**Initialization flow:**
1. Load room data from URL params (code from route)
2. Initialize `createDuelEngine(timeLimitSecs)`
3. Initialize `createDuelRealtime(roomId, callbacks)`
4. Initialize CameraDetection with the room's exerciseId
5. Set engine status to 'active'
6. Start 1-second tick interval
7. If camera sharing: initialize WebRTC via `createWebRTCPeer()`

**During battle:**
- CameraDetection `onRep` → `engine.addMyRep()` + broadcast `rep_update`
- CameraDetection pose keypoints → broadcast `keypoints` (every 3rd frame)
- Receive `rep_update` → `engine.updateOpponentReps()`
- Receive `keypoints` → update OpponentView
- Receive `battle_end` (from host) → `engine.endBattle()` → show DuelResultScreen
- If host: when timer reaches 0, broadcast `battle_end` + `engine.endBattle()`
- 1-second tick → `engine.tick()`

**Juice effects (reuse from existing battle page):**
- Screen shake on rep
- Combo tier text animations
- Sound effects (existing audio.ts)
- Haptic feedback (existing pattern)

**PWA & Disconnect Handling:**
- Acquire Screen Wake Lock on mount: `navigator.wakeLock.request('screen')`. Release on unmount or battle end. Wrap in try/catch (not supported on all browsers).
- On `visibilitychange` to 'hidden': do nothing (realtime stays connected in background on most browsers). On 'visible': verify channel is connected, reconnect if needed.
- Presence tracking: both players call `trackPresence(userId)` on mount. The `onPresenceSync` callback receives the list of online player IDs. If the opponent's ID disappears:
  1. Show toast: "Adversaire deconnecte..."
  2. Start a 10-second forfeit timer
  3. If opponent reconnects within 10s: cancel timer, resume
  4. If 10s elapse: end battle, declare victory for remaining player
- Timer pause during disconnect: the tick interval continues but the battle timer display shows "EN PAUSE" while waiting for opponent.

**Cleanup on unmount:**
- Destroy realtime channel
- Destroy WebRTC peer
- Release wake lock
- Clear tick interval
- Save results to Supabase

- [ ] **Step 2: Wire up result saving**

On battle end:
1. `saveDuelResult()` with own stats
2. `updateExerciseRecord()` for personal records
3. Add XP via existing progression system (`addXP()` from progression-engine.ts)
4. Show DuelResultScreen overlay

- [ ] **Step 3: Handle rematch flow**

DuelResultScreen "Revanche" button:
1. Broadcast `rematch_request`
2. Wait for opponent's `rematch_request`
3. When both received: reset engine, restart countdown, new battle

- [ ] **Step 4: Commit**

```bash
git add src/routes/duel/[code]/battle/+page.svelte
git commit -m "feat(duel): add split-screen battle page with realtime sync and juice effects"
```

---

## Chunk 5: Integration & Polish

### Task 14: Home Page Integration

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add DUEL button to home page**

Add a prominent "DUEL" button in the main action area of the home page. Position it alongside or near the existing battle/session buttons. Use the same card/button style but with a distinct VS/duel icon.

```svelte
<a href="/duel" class="...duel button styles...">
  ⚔️ DUEL 1v1
</a>
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat(duel): add DUEL button to home page"
```

---

### Task 15: Navigation Updates

**Files:**
- Modify: `src/routes/+layout.svelte`
- Modify: `src/lib/components/TabBar.svelte`

- [ ] **Step 1: Hide TabBar on duel battle routes**

In `+layout.svelte`, add `/duel/` battle routes to the TabBar hide list (same as `/battle` and `/session/battle`):

```typescript
// Existing hide logic — add duel battle pattern
const hideTabBar = pathname.startsWith('/duel/') && pathname.includes('/battle');
```

- [ ] **Step 2: Optionally add Duel to TabBar**

If the TabBar has room, add a "Duel" entry. Otherwise, the home page button is sufficient.

- [ ] **Step 3: Commit**

```bash
git add src/routes/+layout.svelte src/lib/components/TabBar.svelte
git commit -m "feat(duel): hide tab bar during duel battles"
```

---

### Task 16: End-to-End Test

- [ ] **Step 1: Manual test in two browser tabs**

Open two browser tabs (or two devices), both logged in with different accounts:
1. Tab 1: Go to `/duel`, create a room, note the code
2. Tab 2: Go to `/duel`, enter the code, join
3. Tab 1: Select an exercise (pushups), set timer to 30s
4. Tab 2: Verify exercise selection appears
5. Both: Toggle camera sharing ON
6. Both: Tap READY
7. Verify: countdown appears on both
8. Both: Do exercise reps in front of camera
9. Verify: rep counts update on both sides in realtime
10. Verify: skeleton/video of opponent is visible
11. Timer expires → verify results screen shows on both
12. Check Supabase: duel_rooms and duel_results have data

- [ ] **Step 2: Test edge cases**

- Close one tab mid-battle → verify opponent sees disconnect and wins
- Try joining a full room → verify error message
- Try starting without selecting exercise → verify READY is disabled
- Test with camera sharing OFF → verify skeleton mode works

- [ ] **Step 3: Final commit with any fixes**

```bash
git add -A
git commit -m "feat(duel): polish and edge case fixes from manual testing"
```

---

## Summary

| Chunk | Tasks | What it delivers |
|-------|-------|-----------------|
| 1: Database & Data | 1-3 | Migration, CRUD layer, duel engine |
| 2: Networking | 4-5 | Realtime channels, WebRTC |
| 3: UI Components | 6-10 | Exercise cards, skeleton renderer, opponent view, progress bar, result screen |
| 4: Pages | 11-13 | Lobby, room, battle (core feature) |
| 5: Integration | 14-16 | Home button, navigation, testing |

**Total: 16 tasks, ~50 steps**

Each chunk produces a commit-worthy unit. Chunks 1-2 are pure logic (no UI), testable independently. Chunk 3 produces reusable components. Chunk 4 wires everything together. Chunk 5 integrates into the existing app.
