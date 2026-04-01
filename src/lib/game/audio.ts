type SoundName = 'rep' | 'warning' | 'victory' | 'defeat' | 'levelup' | 'countdown';

const audioCache = new Map<SoundName, HTMLAudioElement>();

const SOUND_URLS: Record<SoundName, string> = {
  rep: '/sounds/rep.mp3',
  warning: '/sounds/warning.mp3',
  victory: '/sounds/victory.mp3',
  defeat: '/sounds/defeat.mp3',
  levelup: '/sounds/levelup.mp3',
  countdown: '/sounds/countdown.mp3',
};

export function preloadSounds(): void {
  if (typeof window === 'undefined') return;
  for (const [name, url] of Object.entries(SOUND_URLS)) {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audioCache.set(name as SoundName, audio);
  }
}

export function playSound(name: SoundName): void {
  const audio = audioCache.get(name);
  if (!audio) return;
  const clone = audio.cloneNode() as HTMLAudioElement;
  clone.volume = name === 'rep' ? 0.6 : 0.8;
  clone.play().catch(() => {});
}
