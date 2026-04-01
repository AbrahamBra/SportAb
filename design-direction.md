# Design Direction — PushQuest

## Elements a garder
- Palette dark gaming : noir #08080F, rouge #E63946, gold #FFD166
- Boss cards avec HP/difficulte visible
- Battle HUD : HP bar + timer + rep counter
- Rep counter pop animation gold au centre
- Stars background sur l'ecran d'accueil (a enrichir avec grid)

## References choisies
- VisionYou (projet interne) : skewed cards, grid pattern bg, neon glows, monospace stats, blur orbs, brackets decoratifs, backdrop-blur glassmorphism
- Dark Souls UI : ambiance sombre, typography imposante, feedback de damage
- Fortnite Battle Pass UI : progression tiers, reward reveal

## Direction visuelle (validee)
- Palette : noir #08080F + rouge #E63946 + gold #FFD166 + white. Pas de cyan (distinguer de VisionYou)
- Typographie : Inter pour body, Oswald/Arial Black pour display. font-mono pour stats (HP, XP, timer, reps)
- Layout : mobile-first max-w-lg, bottom safe area
- Effets :
  - Skewed cards (skew-x-[-6deg] subtil) avec border-left accent rouge
  - Grid pattern background subtil (white/2% lines)
  - Red + gold blur orbs dans le background
  - Neon text-shadow rouge sur les titres, gold sur les rewards
  - Brackets decoratifs CSS sur le battle HUD
  - Backdrop-blur glassmorphism sur les overlays
  - Monospace font pour tous les chiffres/stats
- Ambiance : "VisionYou meets Dark Souls" — futuriste, agressif, gamifie

## Contraintes
- Pas de cyan (c'est l'identite VisionYou, pas PushQuest)
- Rouge = danger/combat, Gold = recompense/progression
- Lisibilite a 3-6 pieds pendant les exercices (gros chiffres)
- Audio-first feedback pendant les battles

## Validation
- Date : 2026-04-01
- Confirme par l'utilisateur : oui
