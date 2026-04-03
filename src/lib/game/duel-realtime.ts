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
      const ids = Object.values(state)
        .flat()
        .map((p: any) => p.player_id as string);
      callbacks.onPresenceSync(ids);
    })
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[duel-realtime] channel error:', err);
      }
    });

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
