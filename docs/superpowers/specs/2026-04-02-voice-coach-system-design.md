# Voice Coach System — Design Specification

**Date:** 2026-04-02
**Status:** Draft
**Scope:** Customizable TTS voice companion for PushQuest RPG fitness app

---

## Overview

A persistent voice companion system that narrates the entire PushQuest experience. Users choose or create a vocal persona (coach, boss, waifu, drill sergeant...) that speaks throughout combat, navigation, streaks, and milestones. Voice packs are generated from a persona prompt using Claude API (text) + ElevenLabs (audio), cached locally for offline play, with real-time dynamic lines for premium subscribers.

## Goals

1. **Retention** — A personalized voice companion creates emotional attachment and daily comeback motivation
2. **Expression** — Users pick the coach personality that resonates with them (or create their own)
3. **Monetization** — Premium personas, custom creation, and dynamic lines drive subscription value

## Architecture Decision

**Approach: TTS Cloud-First (ElevenLabs)**

- Cloud TTS via ElevenLabs API for best-in-class voice quality and emotion control
- Abstracted behind a `TTSProvider` interface for future provider swaps
- Hybrid delivery: pre-generated packs (~100 lines) for offline + real-time dynamic lines for contextual moments
- Claude API generates the text content from persona prompts; ElevenLabs generates the audio

**Why not self-hosted TTS:** GPU infrastructure is overkill for an early-stage app. Cloud TTS costs ~$0.60-1.80/user/month, well within subscription margins.

**Why not free TTS (Edge TTS):** Voice quality IS the product. A mediocre voice kills the experience and first impression. ElevenLabs delivers near-human quality with emotional range.

---

## 1. Data Model

### Tables

**`voice_personas`**
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| name | text | Display name ("Sergent Hardcore") |
| description | text | Short description for the picker UI |
| prompt | text | Persona instructions for text generation |
| voice_id | text | ElevenLabs voice ID |
| emotion_presets | jsonb | Emotion settings per trigger category |
| tier | text | "free" or "premium" |
| user_id | uuid | null = catalogue persona, otherwise custom |
| avatar_url | text | Icon/avatar for the picker card |
| created_at | timestamptz | Creation timestamp |

**`voice_lines`**
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| persona_id | uuid | FK to voice_personas |
| trigger | text | Trigger key (e.g., "combo_x10", "home_greeting") |
| text | text | The spoken text |
| audio_url | text | Path in Supabase Storage |
| duration_ms | int | Audio duration for scheduling |
| is_dynamic | boolean | true = template with variables |
| created_at | timestamptz | default now(), for cache invalidation |

**`user_voice_settings`**
| Column | Type | Description |
|---|---|---|
| user_id | uuid | FK to auth.users, primary key |
| active_persona_id | uuid | FK to voice_personas |
| volume | float | 0.0 to 1.0, default 0.8 |
| enabled | boolean | Global voice toggle |

### Storage

- Supabase Storage bucket: `voice-packs/`
- Structure: `voice-packs/{personaId}/{trigger}.mp3`
- Format: MP3 128kbps, mono
- Pack size estimate: 5-15 MB per persona (100 lines x 50-150 KB)

### Row Level Security Policies

**`voice_personas`:**
- SELECT: all authenticated users (catalogue + own custom)
- INSERT: authenticated where `user_id = auth.uid()`
- UPDATE/DELETE: only where `user_id = auth.uid()`

**`voice_lines`:**
- SELECT: all authenticated users (catalogue lines are public; custom lines readable by persona owner via join)
- INSERT/UPDATE/DELETE: only via Edge Functions (service role)

**`user_voice_settings`:**
- All operations: `user_id = auth.uid()` only

### Client Cache

- IndexedDB store: `voice-cache`
- Key: `{personaId}/{trigger}` → audio Blob
- Full pack downloaded on persona equip, persists across sessions
- **Eviction policy:** Keep active persona + 2 most recently used. Evict oldest packs when total cache exceeds 50 MB. Track last-used timestamp per persona in IndexedDB metadata.

---

## 2. Voice Line Triggers

### Pre-generated Lines (~100 per persona)

**Combat (40 lines):**
- `battle_start` (x3 variants)
- `rep_milestone_10`, `rep_milestone_25`, `rep_milestone_50` (x2 each)
- `combo_x3`, `combo_x5`, `combo_x10`, `combo_x15` (x2 each)
- `boss_50pct`, `boss_25pct`, `boss_10pct` (x2 each)
- `boss_attack` (x3 — boss attacks the player)
- `perfect_form` (x2 — good exercise form detected)
- `near_death` (x2 — boss at 1-2 HP remaining)
- `victory` (x3 variants)
- `defeat` (x3 variants)
- `flee` (x2)

*Variant storage: multiple rows share the same `trigger` key. VoiceManager picks randomly among matching rows.*

**Navigation (15 lines):**
- `home_greeting` (x3 — varies by time of day context)
- `battle_select` (x2)
- `exercise_picker` (x2)
- `profile_open` (x2)
- `settings_open` (x1)
- `app_launch` (x3)
- `app_idle_nudge` (x2)

**Streaks (10 lines):**
- `streak_continue` (x2)
- `streak_broken` (x2)
- `streak_milestone_7` (x2)
- `streak_milestone_30` (x2)
- `streak_milestone_100` (x2)

**Daily Challenge (8 lines):**
- `daily_available` (x2)
- `daily_complete` (x2)
- `daily_reminder` (x2)
- `daily_missed` (x2)

**Motivation (15 lines):**
- `comeback_after_break` (x3 — user returns after 2+ days)
- `level_up` (x3)
- `new_boss_unlocked` (x2)
- `personal_record` (x2)
- `first_battle_ever` (x2)
- `onboarding_welcome` (x3)

**Ambient/Filler (10 lines):**
- `idle_chatter` (x5 — random lines when navigating)
- `loading_patience` (x2)
- `error_encouragement` (x3)

### Dynamic Templates (~10, premium only)

Templates with `{variable}` placeholders resolved at runtime:
- `victory_stats`: "{name}, {reps} reps en {time} secondes, {reaction}!"
- `combo_dynamic`: "{reps} d'affillee, {reaction}!"
- `streak_dynamic`: "{days} jours consecutifs {name}, {reaction}!"
- `level_up_dynamic`: "Niveau {level}! {boss_name} t'attend, {reaction}."
- `daily_complete_dynamic`: "Challenge du jour termine en {time}, {reaction}!"
- `personal_record_dynamic`: "Nouveau record {name}: {reps} {exercise} en {time}!"
- `greeting_dynamic`: "{greeting} {name}, {context_message}"
- `defeat_dynamic`: "Seulement {reps} reps? {taunt}"
- `milestone_dynamic`: "{reps} reps au total depuis que tu as commence, {reaction}!"
- `comeback_dynamic`: "{days} jours sans entrainement {name}, {reaction}"

---

## 3. Generation Pipeline

### Pack Generation Flow (async, ~2-5 minutes)

```
1. User selects/creates persona → client calls Edge Function "generate-voice-pack"
2. Edge Function receives: personaId, persona prompt, voice_id, trigger list
3. For each trigger:
   a. Call Claude API with persona prompt + trigger context
      → Generates appropriate text for this persona & trigger
      → Example: Persona "Drill Sergeant" + trigger "combo_x10"
        → "DIX D'AFFILÉE ! T'es une machine de guerre ou quoi ?!"
   b. Call ElevenLabs API with text + voice_id + emotion settings
      → Receives .mp3 audio
   c. Upload .mp3 to Supabase Storage
   d. Insert row in voice_lines table
4. Mark persona as "ready" → notify client via Supabase Realtime
```

**Failure handling:** Track generation progress per-line. If some lines fail (ElevenLabs timeout, rate limit), mark persona as "ready" with gaps (partial packs are usable). Queue failed lines for background retry (max 3 attempts with exponential backoff). User can see which lines failed and manually trigger regeneration.

**Catalogue pack generation:** Catalogue packs are pre-generated via a one-time admin script (`scripts/generate-catalogue-packs.ts`) using the service role key. This is run manually or via CI, not through the premium-gated Edge Function.

### Text Generation Prompt Structure

```
System: You are writing voice lines for a fitness RPG game character.
The character is: {persona.prompt}
Voice personality: {persona.emotion_presets}

Generate a single short voice line (max 15 words) for this trigger:
Trigger: {trigger}
Context: {trigger_description}

Rules:
- Stay in character at all times
- Keep it punchy and energetic
- Max 15 words
- Language: {persona.language_preference} (French, English, or Mix)
- No stage directions or annotations
```

### Dynamic Line Generation (real-time, premium)

```
1. Client triggers contextual event (e.g., victory with stats)
2. Client calls Edge Function "generate-dynamic-line"
   body: { personaId, template: "victory_stats", vars: { name: "Abraham", reps: 32, time: "45" } }
3. Edge Function:
   a. Resolves template with vars
   b. Calls Claude API to make it match persona style
   c. Calls ElevenLabs → streams audio
4. Client plays audio + caches in IndexedDB for reuse
```

**Latency strategy:** Dynamic lines take 2-5 seconds (Claude + ElevenLabs). For time-critical moments like victory, play the pre-generated `victory` line immediately, then queue the dynamic `victory_stats` line as a follow-up 3-4 seconds later. For non-urgent triggers (greeting, streak), the delay is acceptable. Max latency budget: 5 seconds — if exceeded, skip and fall back to pre-generated variant.

### Moderation

Custom persona prompts pass through Claude API classification before generation:
- **Allow:** Trash talk, insults (motivational), humor, roleplay personas, adult language
- **Flag for review:** Borderline content (ambiguous insults, edgy humor) → stored in `moderation_queue` for manual review during early launch; auto-allowed after confidence threshold is tuned
- **Reject:** Hate speech targeting protected groups, illegal content, real person impersonation, sexual content involving minors
- **User-facing error on rejection:** "This persona description was rejected for violating our content policy. Please modify and try again."
- Cost: ~$0.001 per check

---

## 4. Client Architecture

### VoiceManager Module

```typescript
// src/lib/game/voice-manager.ts

interface VoiceManager {
  // Lifecycle
  init(personaId: string): Promise<void>       // Load pack from cache or download
  setPersona(personaId: string): Promise<void>  // Switch active persona
  destroy(): void                               // Cleanup audio resources

  // Playback
  play(trigger: string): void                   // Play pre-generated line (random variant)
  playDynamic(template: string, vars: Record<string, string>): Promise<void>

  // State
  isReady(): boolean
  getActivePersona(): VoicePersona | null
  getVolume(): number
  setVolume(v: number): void
  setEnabled(enabled: boolean): void
}
```

### Audio Priority System

When multiple triggers fire close together, priority prevents overlap:

| Priority | Triggers | Behavior |
|---|---|---|
| 1 (highest) | victory, defeat, level_up | Interrupts anything playing |
| 2 | combo_x10+, boss_50pct, boss_25pct, boss_10pct | Interrupts priority 3 only |
| 3 | rep_milestones, combo_x3/x5, boss_attack | Queued, skipped if another P3 playing |
| 4 (lowest) | navigation, idle, ambient | Skipped if anything else playing |

### TTSProvider Interface (Server-Side Only)

The `TTSProvider` and its implementations live in the **Edge Functions** (`supabase/functions/_shared/`), NOT in client-side code. API keys never leave the server.

```typescript
// supabase/functions/_shared/tts-provider.ts

interface TTSProvider {
  generateLine(text: string, voiceId: string, emotion?: string): Promise<Blob>
  streamLine(text: string, voiceId: string, emotion?: string): Promise<ReadableStream>
  getAvailableVoices(): Promise<Voice[]>
}

// supabase/functions/_shared/elevenlabs-provider.ts
class ElevenLabsProvider implements TTSProvider { ... }
```

### Integration Points

The VoiceManager hooks into existing code at these locations:

| File | Hook Point | Trigger |
|---|---|---|
| `src/routes/+page.svelte` | onMount | `home_greeting`, `daily_available` |
| `src/routes/battle/+page.svelte` | handleRep() | `rep_milestone_*`, `combo_x*` |
| `src/routes/battle/+page.svelte` | boss HP checks | `boss_50pct`, `boss_25pct`, `boss_10pct` |
| `src/routes/battle/+page.svelte` | boss attack timer | `boss_attack` |
| `src/routes/battle/+page.svelte` | victory/defeat | `victory`, `defeat` |
| `src/lib/components/VictoryScreen.svelte` | onMount | `victory_stats` (dynamic) |
| `src/lib/components/DefeatScreen.svelte` | onMount | `defeat` |
| `src/routes/battle/+page.svelte` | endBattle('victory') — level comparison after XP add (~line 385) | `level_up`, `new_boss_unlocked` |
| `src/routes/battle/+page.svelte` | after updateStreak() call (~line 360) | `streak_*` |

### Offline Behavior

- Pre-generated pack in IndexedDB → fully offline
- Dynamic lines → fallback to random pre-generated variant of same trigger category
- No persona active → silent mode, zero errors, no impact on gameplay
- Pack download interrupted → resume on next app launch, partial pack still usable

### Audio Routing

VoiceManager shares the existing Web Audio API `AudioContext` from `audio.ts` to avoid iOS multi-context issues. Voice output routes through a dedicated `GainNode` (voice gain) separate from SFX gain, both feeding into a master output node. When a voice line plays, SFX volume ducks to 40% for the duration of the line to prevent cacophony during combat.

### Browser Autoplay Policy

Navigation voice lines (`home_greeting`, `app_launch`) may be blocked by autoplay policies on first load. VoiceManager handles this by: (a) attempting playback and catching rejection silently, (b) deferring blocked lines until the first user interaction on the page (click/tap). Combat voice lines are never affected since the user is already interacting via exercise detection.

---

## 5. Personas: Catalogue & Custom Creation

### Launch Catalogue (5 personas)

| # | Name | Personality | Tier | Voice Type |
|---|---|---|---|---|
| 1 | Sergent Hardcore | Military drill instructor, motivational insults, never satisfied | Free | Male, deep, aggressive |
| 2 | Coach Zen | Calm, encouraging, warm, mindfulness-inspired | Free | Male/Female, soft, warm |
| 3 | Demon Lord | Arrogant RPG boss, challenges and taunts the player | Free | Male, deep, echo, menacing |
| 4 | Waifu Sensei | Kawaii encouragements, enthusiastic, mix FR/JP expressions | Premium | Female, soft, enthusiastic |
| 5 | Trash Talker | Pure provocation, dark humor, sarcastic comebacks | Premium | Male/Female, snarky, fast |

Catalogue personas are pre-generated once and served via CDN. No generation cost per user.

### Custom Coach Creator (Premium)

**Step 1 — Name:** Free text input for coach name

**Step 2 — Personality:** Guided prompt builder
- Tone slider: Aggressive ←→ Gentle
- Humor slider: Serious ←→ Absurd
- Style picker: Military / Anime / Sporty / Demonic / Robot / Custom text
- Language preference: Francais / English / Mix
- Optional free text: "Anything specific?" (max 200 chars)

**Step 3 — Voice:** Pick from ~10 ElevenLabs base voices
- Previews available for each voice
- Labeled by gender, pitch, energy

**Step 4 — Preview:** Generate 3 sample lines on-the-fly
- User can regenerate samples until satisfied
- "Generate my coach" button → starts full pack generation

### Limits

| Feature | Free | Premium |
|---|---|---|
| Catalogue personas | 3 | All 5+ (grows over time) |
| Custom personas | 0 | Up to 5 |
| Dynamic lines | No | Yes (max 20/day) |
| Voice preview | No | Yes |
| Regenerate lines | No | Yes (10/month) |
| Line variants | 2 per trigger | All variants (random selection) |

---

## 6. New UI Screens

### Voice Coach Picker

- Accessible from: Profile page, Home page shortcut, Settings
- Grid of persona cards (2 columns)
- Each card: avatar icon, name, short description, Free/Premium badge
- Tap card → expanded view with "Preview" (plays sample) and "Equip" buttons
- Premium locked cards show lock icon + "Premium" overlay
- "Create My Coach" CTA button at bottom (premium)
- Currently equipped persona has glowing border

### Custom Coach Creator

- Multi-step form (4 steps with progress indicator)
- Step transitions with slide animation
- Final step shows generation progress bar with fun messages:
  - "Your coach is warming up..."
  - "Learning {count} battle cries..."
  - "Almost ready to yell at you..."
- On completion: auto-equip + play welcome line

### Settings Addition

- New "Voice Coach" section in settings:
  - Toggle: Voice ON/OFF
  - Slider: Voice volume (independent from SFX)
  - Current coach display (tap to open picker)
  - "Manage Custom Coaches" (premium, shows list with delete option)

---

## 7. Infrastructure & Costs

### Supabase Edge Functions

| Function | Purpose | Auth Required |
|---|---|---|
| `generate-voice-pack` | Full pack generation (Claude + ElevenLabs) | Premium |
| `generate-dynamic-line` | Single real-time line | Premium |
| `moderate-persona-prompt` | Filters custom prompts | Premium |

### Rate Limits & Guards

- Pack generation: 1 concurrent per user, queued if busy
- Dynamic lines: max 20 per day per user
- Custom personas: max 5 per user
- Line regeneration: max 10 per month per user
- Prompt moderation: blocks hate speech, illegal content, real person impersonation
- ElevenLabs rate limits: handled with exponential backoff in Edge Functions

### Cost Projections (per 1000 premium users/month)

| Item | Estimate |
|---|---|
| ElevenLabs — pack generation | $500-1,500 |
| ElevenLabs — dynamic lines | $50-200 |
| Claude API — text generation | $20-50 |
| Claude API — moderation | $5-10 |
| Supabase Storage | $5-15 |
| **Total** | **$580-1,775** |
| **Per user** | **$0.58-1.78** |

At a $5-10/month subscription, voice coach feature alone justifies ~15-35% of the subscription cost.

### Scaling Notes

- Catalogue packs generated once, served from CDN (zero marginal cost)
- IndexedDB cache means repeat plays cost nothing
- Dynamic line caching reduces API calls over time
- If volume grows past 10k premium users, evaluate self-hosted TTS (XTTS-v2) to reduce costs

---

## 8. File Changes Summary

### New Files

| File | Purpose |
|---|---|
| `src/lib/game/voice-manager.ts` | Core VoiceManager module |
| `src/lib/voice/voice-cache.ts` | IndexedDB cache layer with LRU eviction |
| `src/lib/stores/voiceStore.ts` | Svelte store for voice state |
| `src/routes/voice/+page.svelte` | Voice Coach Picker screen |
| `src/routes/voice/create/+page.svelte` | Custom Coach Creator |
| `src/routes/settings/+page.svelte` | Settings page (new — does not exist yet) |
| `src/lib/components/VoicePersonaCard.svelte` | Persona card component |
| `src/lib/components/VoicePreview.svelte` | Audio preview player |
| `supabase/migrations/007_voice_system.sql` | DB migration (after existing 006_duels) |
| `supabase/functions/_shared/tts-provider.ts` | TTSProvider interface (server-side) |
| `supabase/functions/_shared/elevenlabs-provider.ts` | ElevenLabs implementation (server-side) |
| `supabase/functions/generate-voice-pack/index.ts` | Pack generation function |
| `supabase/functions/generate-dynamic-line/index.ts` | Dynamic line function |
| `supabase/functions/moderate-persona-prompt/index.ts` | Prompt moderation function |
| `scripts/generate-catalogue-packs.ts` | Admin script for catalogue pack generation |

### Modified Files

| File | Change |
|---|---|
| `src/routes/battle/+page.svelte` | Add VoiceManager trigger calls at combat events |
| `src/routes/+page.svelte` | Add greeting/daily triggers on mount |
| `src/lib/components/VictoryScreen.svelte` | Add victory voice trigger |
| `src/lib/components/DefeatScreen.svelte` | Add defeat voice trigger |
| `src/lib/game/audio.ts` | Add voice GainNode chain, SFX ducking, shared AudioContext export |
| `src/routes/profile/+page.svelte` | Add "Voice Coach" shortcut |

---

## 9. Out of Scope

- Sprite/mob customization (future feature)
- Voice cloning from user's own voice (future, requires consent UX)
- Multiplayer voice (duel taunts) — depends on duel system implementation
- Music generation — separate concern
- Real-time voice chat between players
