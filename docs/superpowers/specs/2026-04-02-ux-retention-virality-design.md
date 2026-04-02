# UX Retention & Virality Improvements — Design Spec

**Date:** 2026-04-02
**Goal:** Improve retention (players come back daily) and acquisition/virality (players sign up and invite friends)
**Tone:** Gaming/RPG — consistent with PushQuest's boss/combat universe
**Future vision:** Recording sessions to send to a sports coach (out of scope for this lot)

---

## 1. Persistent Tab Bar with Notification Badges

### What
Fixed bottom navigation bar visible on all pages, replacing the current footer links on the home page.

### Tabs

| Icon | Label   | Route       | Badge                              |
|------|---------|-----------  |------------------------------------|
| ⚔️   | Combat  | `/`         | —                                  |
| 📋   | Programmes | `/programs` | —                               |
| 👥   | Amis    | `/friends`  | Red counter: pending challenges    |
| 🏆   | Profil  | `/profile`  | —                                  |

### Design
- Dark background, active tab highlighted with gold glow
- RPG-consistent styling (matches boss cards aesthetic)
- Badge is a red circle with white number, standard mobile pattern

### Behavior
- Present on all pages EXCEPT: `/onboarding/*`, `/battle/*`, `/auth/*`
- Active tab determined by current route
- Badge count fetched from Supabase `pending_challenges` for logged-in users, hidden for anonymous users

### Implementation
- New component: `TabBar.svelte`
- Rendered in `+layout.svelte` with conditional visibility
- Remove existing footer nav links from `+page.svelte`

---

## 2. CTA "Multiplayer Mode Locked"

### What
Prominent banner on the home page for non-authenticated users, encouraging account creation.

### Content
- Title: "MODE MULTIJOUEUR VERROUILLE" + lock icon
- Subtitle: "Connecte-toi pour debloquer : defis PvP, classement, code ami"
- Button: "REJOINDRE LA GUILDE" → navigates to `/auth/login`

### Design
- Gold border, semi-transparent dark background
- Lock icon matching the locked-boss aesthetic
- Positioned between streak/daily challenge section and boss selection

### Behavior
- Only visible when user is NOT authenticated
- Dismissable with "X" button — dismiss stored in `sessionStorage` (reappears next session)
- Disappears immediately on login

### Implementation
- New component: `MultiplayerCTA.svelte`
- Rendered conditionally in `+page.svelte` based on auth state + sessionStorage flag

---

## 3. Daily Challenge Promoted to "Mission Quotidienne"

### What
Make the daily challenge the most prominent element on the home page.

### Changes
- Moved to top of page, directly under XP bar (first content element)
- Larger card with animated pulsing glow border
- Label changed: "DEFI DU JOUR" → "MISSION QUOTIDIENNE" + lightning icon
- Countdown timer: "Expire dans Xh XXm" with clock icon
- Completed state: green/gold "ACCOMPLI" badge, glow stops

### What stays the same
- Generation mechanism (deterministic date hash in `streaks.ts`)
- Click action (launches battle with daily boss/exercise combo)

### Implementation
- Modify existing daily challenge card in `+page.svelte`
- Add countdown timer (calculate hours/minutes until midnight)
- Add CSS animations for glow effect
- Track completion state in localStorage (check if today's battle history includes the daily challenge combo)

---

## 4. Native Share After Victory

### What
Share button on the victory screen to spread results via native mobile share or clipboard fallback.

### Share content
- Text: "Je viens de vaincre {bossName} en {reps} reps sur PushQuest ! Ose me defier"
- URL: App URL (Vercel production URL)

### Design
- Button: "PARTAGER TA VICTOIRE" — secondary style, same row as other post-victory actions
- Skull emoji or share icon

### Behavior
- Mobile: `navigator.share({ text, url })` — opens native share sheet
- Desktop fallback: copies text + URL to clipboard, shows toast "Copie !"
- `navigator.share` availability checked at runtime

### Implementation
- Add share button to `VictoryScreen.svelte`
- Utility function `shareVictory(bossName, reps)` handling share vs clipboard

---

## 5. RPG-Themed Empty States

### What
Replace flat/generic empty state messages with motivating RPG-themed copy.

### Messages

| Context | Current | New |
|---------|---------|-----|
| 0 streak | "— 0" | "Ta flamme est eteinte. Un combat suffit pour la rallumer" + fire icon |
| 0 friends | "Aucun ami pour l'instant..." | "Aucun allie dans ta guilde. Partage ton code pour recruter !" + copy friend code button |
| 0 pending challenges | "Aucun defi en attente..." | "Aucun rival a l'horizon. Defie un ami apres ton prochain combat" + sword icon |
| 0 battle history | (none) | "Aucune bataille enregistree. Ton premier boss t'attend." |

### Implementation
- Update text strings in `+page.svelte` (home), `/friends/+page.svelte`, `/profile/+page.svelte`
- Add copy-friend-code button to friends empty state (reuse `FriendCodeDisplay` logic)

---

## 6. Friend Code Visible in Profile

### What
Display the user's friend code on the profile page for quick access.

### Design
- Section below the stats grid, above battle history
- Shows the 6-character code in large monospace gold font
- "COPIER" button next to it (same as in `/friends`)

### Behavior
- Only visible for authenticated users
- Copy button copies code to clipboard with toast confirmation

### Implementation
- Add friend code section to `/profile/+page.svelte`
- Reuse `FriendCodeDisplay.svelte` component or extract shared logic

---

## 7. Pending Challenge Toast on App Launch

### What
Notification toast at app launch when the user has pending challenges.

### Content
- Text: "{X} guerrier(s) te defie(nt) !" with sword icon
- Clickable: navigates to `/friends` (challenges tab)

### Design
- RPG-styled toast, dark with gold border, appears at top of screen
- Auto-dismisses after 4 seconds
- Can be manually dismissed by tapping

### Behavior
- Only shown for authenticated users
- Only shown when pending challenges count > 0
- Shown once per session (tracked in sessionStorage)
- Fetches pending count on layout mount

### Implementation
- New component: `ChallengeToast.svelte`
- Rendered in `+layout.svelte` after auth state is resolved
- Uses same Supabase query as tab bar badge (share the store)

---

## Architecture Notes

### Shared State
- Pending challenges count is used by both TabBar badge and ChallengeToast
- Create a Svelte store `challengeStore` that fetches once and is consumed by both components
- Only active for authenticated users

### File Changes Summary

| File | Action |
|------|--------|
| `src/lib/components/TabBar.svelte` | NEW — persistent bottom nav |
| `src/lib/components/MultiplayerCTA.svelte` | NEW — signup banner |
| `src/lib/components/ChallengeToast.svelte` | NEW — launch notification |
| `src/lib/stores/challenges.ts` | NEW — shared pending challenges store |
| `src/routes/+layout.svelte` | EDIT — add TabBar + ChallengeToast, conditional rendering |
| `src/routes/+page.svelte` | EDIT — add CTA, promote daily challenge, update empty states, remove footer nav |
| `src/routes/battle/+page.svelte` or `VictoryScreen.svelte` | EDIT — add share button |
| `src/routes/profile/+page.svelte` | EDIT — add friend code section |
| `src/routes/friends/+page.svelte` | EDIT — update empty states |

### What's NOT in scope
- Screenshot/image card for sharing (future lot)
- Coach recording feature (future vision)
- Push notifications (requires service worker work, separate effort)
- Profile editing (name, avatar — separate feature)
