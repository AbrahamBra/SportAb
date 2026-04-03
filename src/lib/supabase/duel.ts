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

// Room code generation (excluding ambiguous chars O/0/I/1)
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

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
    if (error && error.code === '23505') {
      attempts++;
      continue;
    }
    throw error;
  }
  throw new Error('Failed to generate unique room code');
}

export async function joinDuelRoom(code: string): Promise<DuelRoom> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('join_duel', { p_code: code.toUpperCase() });
  if (error) throw error;
  if (!data) throw new Error('Room not found or already full');
  return data as DuelRoom;
}

export async function getDuelRoom(code: string): Promise<DuelRoom | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('duel_rooms')
    .select()
    .eq('code', code.toUpperCase())
    .single();
  return data as DuelRoom | null;
}

export async function getDuelRoomById(roomId: string): Promise<DuelRoom | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('duel_rooms')
    .select()
    .eq('id', roomId)
    .single();
  return data as DuelRoom | null;
}

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

export async function deleteDuelRoom(roomId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('duel_rooms')
    .delete()
    .eq('id', roomId);
  if (error) throw error;
}

export async function saveDuelResult(result: Omit<DuelResult, 'id' | 'created_at'>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('duel_results').insert(result);
  if (error) throw error;
}

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
