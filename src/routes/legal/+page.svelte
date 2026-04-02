<script lang="ts">
  import BackgroundFX from '$lib/components/BackgroundFX.svelte';
  import DiamondIcon from '$lib/components/icons/DiamondIcon.svelte';

  let tab = $state<'privacy' | 'terms'>('privacy');
</script>

<BackgroundFX />

<div class="relative z-10 flex flex-col min-h-screen px-6 pt-10 pb-10 max-w-[520px] mx-auto">

  <!-- Back -->
  <a href="/"
    class="font-mono text-[0.6rem] tracking-[3px] text-dim/60 hover:text-primary/70 transition-colors uppercase mb-6"
    style="animation: fadeInDown 0.5s ease-out both">
    ← RETOUR
  </a>

  <!-- Tabs -->
  <div class="flex gap-2 mb-8" style="animation: fadeInUp 0.5s 0.1s ease-out both">
    <button
      class="flex-1 py-2.5 font-bold text-[0.7rem] tracking-[3px] uppercase rounded-lg transition-all -skew-x-3
        {tab === 'privacy' ? 'bg-primary/20 border border-primary/40 text-primary' : 'bg-surface/60 border border-white/[0.06] text-dim/50 hover:text-dim/80'}"
      onclick={() => tab = 'privacy'}>
      <span class="inline-block skew-x-3">Confidentialite</span>
    </button>
    <button
      class="flex-1 py-2.5 font-bold text-[0.7rem] tracking-[3px] uppercase rounded-lg transition-all -skew-x-3
        {tab === 'terms' ? 'bg-primary/20 border border-primary/40 text-primary' : 'bg-surface/60 border border-white/[0.06] text-dim/50 hover:text-dim/80'}"
      onclick={() => tab = 'terms'}>
      <span class="inline-block skew-x-3">CGU</span>
    </button>
  </div>

  {#if tab === 'privacy'}
    <div class="prose-dark" style="animation: fadeInUp 0.3s ease-out both">
      <h1 class="text-xl font-black tracking-[3px] uppercase italic mb-4"
        style="text-shadow: 0 0 15px color-mix(in srgb, var(--color-primary) 50%, transparent)">
        Politique de confidentialite
      </h1>
      <p class="text-[0.7rem] text-dim/50 font-mono mb-6">Derniere mise a jour : avril 2026</p>

      <section class="mb-6">
        <h2 class="text-sm font-bold tracking-[2px] uppercase text-white/90 mb-2"><DiamondIcon /> Donnees collectees</h2>
        <p class="text-[0.75rem] text-dim/70 leading-relaxed">
          PushQuest collecte uniquement les donnees necessaires au fonctionnement de l'application :
        </p>
        <ul class="text-[0.75rem] text-dim/70 leading-relaxed mt-2 space-y-1 list-disc list-inside">
          <li>Adresse email (pour l'authentification)</li>
          <li>Nom d'affichage (personnalisable)</li>
          <li>Donnees de progression (XP, niveaux, historique de combats)</li>
          <li>Code ami (genere automatiquement)</li>
        </ul>
      </section>

      <section class="mb-6">
        <h2 class="text-sm font-bold tracking-[2px] uppercase text-white/90 mb-2"><DiamondIcon /> Camera</h2>
        <p class="text-[0.75rem] text-dim/70 leading-relaxed">
          L'acces a la camera est utilise uniquement pour la detection de mouvements en temps reel via l'IA (TensorFlow.js).
          Le flux video n'est jamais enregistre, stocke, ni transmis a un serveur. Tout le traitement se fait localement sur ton appareil.
        </p>
      </section>

      <section class="mb-6">
        <h2 class="text-sm font-bold tracking-[2px] uppercase text-white/90 mb-2"><DiamondIcon /> Stockage</h2>
        <p class="text-[0.75rem] text-dim/70 leading-relaxed">
          Les donnees sont stockees dans Supabase (PostgreSQL heberge en Europe).
          Les donnees de session temporaires sont stockees localement sur ton appareil (localStorage).
        </p>
      </section>

      <section class="mb-6">
        <h2 class="text-sm font-bold tracking-[2px] uppercase text-white/90 mb-2"><DiamondIcon /> Partage</h2>
        <p class="text-[0.75rem] text-dim/70 leading-relaxed">
          Tes donnees ne sont jamais vendues ni partagees avec des tiers.
          Seuls tes amis dans l'app peuvent voir ton nom, niveau et scores dans le classement.
        </p>
      </section>

      <section class="mb-6">
        <h2 class="text-sm font-bold tracking-[2px] uppercase text-white/90 mb-2"><DiamondIcon /> Tes droits</h2>
        <p class="text-[0.75rem] text-dim/70 leading-relaxed">
          Tu peux demander la suppression de ton compte et de toutes tes donnees a tout moment
          en nous contactant. Conformement au RGPD, tu disposes d'un droit d'acces, de rectification et de suppression.
        </p>
      </section>

      <section>
        <h2 class="text-sm font-bold tracking-[2px] uppercase text-white/90 mb-2"><DiamondIcon /> Contact</h2>
        <p class="text-[0.75rem] text-dim/70 leading-relaxed">
          Pour toute question : contact@pushquest.app
        </p>
      </section>
    </div>

  {:else}
    <div class="prose-dark" style="animation: fadeInUp 0.3s ease-out both">
      <h1 class="text-xl font-black tracking-[3px] uppercase italic mb-4"
        style="text-shadow: 0 0 15px color-mix(in srgb, var(--color-primary) 50%, transparent)">
        Conditions Generales d'Utilisation
      </h1>
      <p class="text-[0.7rem] text-dim/50 font-mono mb-6">Derniere mise a jour : avril 2026</p>

      <section class="mb-6">
        <h2 class="text-sm font-bold tracking-[2px] uppercase text-white/90 mb-2"><DiamondIcon /> Objet</h2>
        <p class="text-[0.75rem] text-dim/70 leading-relaxed">
          PushQuest est une application de fitness gamifiee. L'utilisation de l'app implique l'acceptation des presentes conditions.
        </p>
      </section>

      <section class="mb-6">
        <h2 class="text-sm font-bold tracking-[2px] uppercase text-white/90 mb-2"><DiamondIcon /> Sante et securite</h2>
        <p class="text-[0.75rem] text-dim/70 leading-relaxed">
          PushQuest ne remplace pas un avis medical. Consulte un professionnel de sante avant de commencer
          tout programme d'exercice. L'application ne peut etre tenue responsable de blessures liees a l'utilisation.
          La detection IA est approximative et ne garantit pas une forme parfaite.
        </p>
      </section>

      <section class="mb-6">
        <h2 class="text-sm font-bold tracking-[2px] uppercase text-white/90 mb-2"><DiamondIcon /> Compte utilisateur</h2>
        <p class="text-[0.75rem] text-dim/70 leading-relaxed">
          Tu es responsable de la securite de ton compte. L'utilisation de l'app est personnelle et non transferable.
          Nous nous reservons le droit de suspendre tout compte utilise de maniere abusive.
        </p>
      </section>

      <section class="mb-6">
        <h2 class="text-sm font-bold tracking-[2px] uppercase text-white/90 mb-2"><DiamondIcon /> Propriete intellectuelle</h2>
        <p class="text-[0.75rem] text-dim/70 leading-relaxed">
          Le contenu de PushQuest (code, design, sprites, sons) est protege par le droit d'auteur.
          Les sprites de boss sont utilises sous licence de leurs createurs respectifs.
        </p>
      </section>

      <section>
        <h2 class="text-sm font-bold tracking-[2px] uppercase text-white/90 mb-2"><DiamondIcon /> Modifications</h2>
        <p class="text-[0.75rem] text-dim/70 leading-relaxed">
          Nous pouvons modifier ces conditions a tout moment. Les utilisateurs seront informes des changements majeurs.
        </p>
      </section>
    </div>
  {/if}
</div>
