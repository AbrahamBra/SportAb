import { createClient } from '$lib/supabase/client';
import { getStreaks } from '$lib/game/streaks';
import { getRecords } from '$lib/game/records';

/**
 * Sync localStorage data to Supabase on login.
 * Strategy: MAX(local, remote) for XP, INSERT with idempotency for battles.
 */
export async function syncOnLogin(supabase: ReturnType<typeof createClient>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // 1. Sync XP — use MAX strategy
  const localXP = parseInt(localStorage.getItem('pushquest_xp') ?? '0', 10);
  const { data: dbUser } = await supabase.from('users').select('xp, current_streak, best_streak').eq('id', user.id).single();
  const remoteXP = dbUser?.xp ?? 0;
  const finalXP = Math.max(localXP, remoteXP);

  if (finalXP !== remoteXP) {
    await supabase.from('users').update({ xp: finalXP }).eq('id', user.id);
  }
  localStorage.setItem('pushquest_xp', String(finalXP));

  // 2. Sync battle history — push unsynced local battles
  try {
    const history: Array<{ bossId: string; exerciseType?: string; result: string; reps: number; date: string; synced?: boolean }> =
      JSON.parse(localStorage.getItem('pushquest_history') ?? '[]');

    const unsynced = history.filter(b => !b.synced);
    for (const b of unsynced) {
      const idempKey = `${user.id}-${b.bossId}-${b.date}`;
      await supabase.from('battles').upsert({
        idempotency_key: idempKey,
        user_id: user.id,
        boss_id: b.bossId,
        result: b.result,
        exercise_type: b.exerciseType ?? 'pushup',
        reps_completed: b.reps,
        played_at: b.date,
      }, { onConflict: 'idempotency_key' });
      b.synced = true;
    }
    localStorage.setItem('pushquest_history', JSON.stringify(history));
  } catch {}

  // 3. Sync streaks — use MAX strategy
  try {
    const localStreaks = getStreaks();
    const remoteStreak = dbUser?.current_streak ?? 0;
    const remoteBest = dbUser?.best_streak ?? 0;
    const finalStreak = Math.max(localStreaks.currentStreak, remoteStreak);
    const finalBest = Math.max(localStreaks.bestStreak, remoteBest);

    if (finalStreak !== remoteStreak || finalBest !== remoteBest) {
      await supabase.from('users').update({
        current_streak: finalStreak,
        best_streak: finalBest,
        last_active_date: localStreaks.lastActiveDate || null,
      }).eq('id', user.id);
    }
  } catch {}

  // 4. Sync personal records
  try {
    const localRecords = getRecords();
    for (const [bossId, record] of Object.entries(localRecords)) {
      await supabase.from('user_records').upsert({
        user_id: user.id,
        boss_id: bossId,
        best_reps: record.bestReps,
        best_time_secs: record.bestTimeSecs === Infinity ? null : record.bestTimeSecs,
        updated_at: record.date,
      }, { onConflict: 'user_id,boss_id' });
    }
  } catch {}
}

/**
 * Save a single battle to Supabase (called after each battle end).
 */
export async function saveBattleToSupabase(
  supabase: ReturnType<typeof createClient>,
  battle: {
    bossId: string;
    exerciseType: string;
    result: string;
    reps: number;
    xpEarned: number;
    timeElapsedSecs: number;
    formScoreAvg?: number;
  }
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const date = new Date().toISOString();
  const idempKey = `${user.id}-${battle.bossId}-${date}`;

  await supabase.from('battles').upsert({
    idempotency_key: idempKey,
    user_id: user.id,
    boss_id: battle.bossId,
    result: battle.result,
    exercise_type: battle.exerciseType,
    reps_completed: battle.reps,
    xp_earned: battle.xpEarned,
    time_elapsed_secs: battle.timeElapsedSecs,
    form_score_avg: battle.formScoreAvg ?? null,
    played_at: date,
  }, { onConflict: 'idempotency_key' });

  // Update user XP + streaks
  const currentXP = parseInt(localStorage.getItem('pushquest_xp') ?? '0', 10);
  const streaks = getStreaks();
  await supabase.from('users').update({
    xp: currentXP,
    current_streak: streaks.currentStreak,
    best_streak: streaks.bestStreak,
    last_active_date: streaks.lastActiveDate || null,
  }).eq('id', user.id);
}
