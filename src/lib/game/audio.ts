type SoundName = 'rep' | 'warning' | 'victory' | 'defeat' | 'levelup' | 'countdown';

const SOUND_URLS: Record<SoundName, string> = {
  rep: '/sounds/rep.wav',
  warning: '/sounds/warning.wav',
  victory: '/sounds/victory.wav',
  defeat: '/sounds/defeat.wav',
  levelup: '/sounds/levelup.wav',
  countdown: '/sounds/countdown.wav',
};

const VOLUMES: Record<SoundName, number> = {
  rep: 0.6,
  warning: 0.8,
  victory: 0.8,
  defeat: 0.8,
  levelup: 0.8,
  countdown: 0.8,
};

// ── Web Audio API state ──────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
const bufferCache = new Map<SoundName, AudioBuffer>();
let webAudioSupported = true;

// ── HTMLAudio fallback state ─────────────────────────────────────────
const htmlAudioCache = new Map<SoundName, HTMLAudioElement>();

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (audioCtx) return audioCtx;

  try {
    const AudioCtxClass = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) {
      webAudioSupported = false;
      return null;
    }
    audioCtx = new AudioCtxClass();
    return audioCtx;
  } catch {
    webAudioSupported = false;
    return null;
  }
}

/** Ensure the AudioContext is running (required after iOS user-gesture gate). */
async function ensureContextResumed(): Promise<void> {
  if (audioCtx && audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {
      // Silently ignore — context may resume on a later gesture.
    }
  }
}

// ── Preload ──────────────────────────────────────────────────────────

export function preloadSounds(): void {
  if (typeof window === 'undefined') return;

  const ctx = getAudioContext();

  if (ctx && webAudioSupported) {
    // Decode all WAV files into AudioBuffers in parallel.
    const names = Object.keys(SOUND_URLS) as SoundName[];
    for (const name of names) {
      fetch(SOUND_URLS[name])
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then((raw) => ctx.decodeAudioData(raw))
        .then((buffer) => {
          bufferCache.set(name, buffer);
        })
        .catch(() => {
          // Individual sound failed — fall through to HTMLAudio on play.
        });
    }
  }

  // Always populate the HTMLAudio cache as a fallback path.
  for (const [name, url] of Object.entries(SOUND_URLS)) {
    const audio = new Audio(url);
    audio.preload = 'auto';
    htmlAudioCache.set(name as SoundName, audio);
  }
}

// ── Playback via Web Audio API ───────────────────────────────────────

function playBufferSource(name: SoundName, playbackRate: number): boolean {
  const ctx = getAudioContext();
  const buffer = bufferCache.get(name);
  if (!ctx || !buffer) return false;

  // Fire-and-forget resume for iOS.
  void ensureContextResumed();

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;

  const gain = ctx.createGain();
  gain.gain.value = VOLUMES[name];

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(0);
  return true;
}

// ── Fallback via HTMLAudioElement ─────────────────────────────────────

function playHtmlAudio(name: SoundName, playbackRate: number): void {
  const audio = htmlAudioCache.get(name);
  if (!audio) return;
  const clone = audio.cloneNode() as HTMLAudioElement;
  clone.volume = VOLUMES[name];
  if (playbackRate !== 1) {
    clone.preservesPitch = false;
    clone.playbackRate = playbackRate;
  }
  clone.play().catch(() => {});
}

// ── Public API ───────────────────────────────────────────────────────

export function playSound(name: SoundName): void {
  if (!playBufferSource(name, 1)) {
    playHtmlAudio(name, 1);
  }
}

/**
 * Play a sound with random pitch variation for variety.
 * pitchRange: [min, max] multiplier (e.g. [0.85, 1.15])
 */
export function playSoundPitched(
  name: SoundName,
  pitchRange: [number, number] = [0.85, 1.15],
): void {
  const rate = pitchRange[0] + Math.random() * (pitchRange[1] - pitchRange[0]);
  if (!playBufferSource(name, rate)) {
    playHtmlAudio(name, rate);
  }
}

/**
 * Trigger haptic vibration on mobile (Android).
 * Does nothing on unsupported devices.
 */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
