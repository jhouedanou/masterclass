<script setup lang="ts">
/**
 * Chrome de l'espace apprenant (planche B) : en-tête dédié — logo, navigation
 * « Mes modules · Coaching collectif · Coaching privé · Mes certificats »,
 * pastille de compte (photo de profil, initiales à défaut), Déconnexion — et
 * barre d'onglets basse sous 1024 px.
 */
const auth = useAuthStore()

async function seDeconnecter() {
  await auth.deconnexion()
  await navigateTo('/')
}
const liens = [
  { libelle: 'Mes modules', court: 'Modules', chemin: '/mon-espace/modules', icone: 'ph:play-circle' },
  { libelle: 'Coaching collectif', court: 'Sessions', chemin: '/mon-espace/sessions', icone: 'ph:calendar-dots' },
  { libelle: 'Coaching privé', court: 'Privé', chemin: '/mon-espace/coaching-prive', icone: 'ph:target' },
  { libelle: 'Mes certificats', court: 'Certificats', chemin: '/mon-espace/certificats', icone: 'ph:certificate' },
]
const ongletsMobile = [
  { libelle: 'Modules', chemin: '/mon-espace/modules', icone: 'ph:squares-four' },
  { libelle: 'Sessions', chemin: '/mon-espace/sessions', icone: 'ph:calendar-dots' },
  { libelle: 'Certificats', chemin: '/mon-espace/certificats', icone: 'ph:graduation-cap' },
  { libelle: 'Profil', chemin: '/mon-espace/profil', icone: 'ph:user' },
]
const initiales = computed(
  () => `${auth.utilisateur?.prenom?.[0] ?? ''}${auth.utilisateur?.nom?.[0] ?? ''}`.toUpperCase(),
)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-fond-clair">
    <header class="border-b border-ligne-claire bg-white">
      <div class="conteneur flex items-center justify-between gap-4 py-3.5">
        <NuxtLink to="/mon-espace" aria-label="Accueil de mon espace">
          <img src="/images/brand/logo.png" alt="E-Masterclass | Big Five" class="block h-9 w-auto" width="180" height="36">
        </NuxtLink>
        <nav aria-label="Navigation de l’espace apprenant" class="hidden items-center gap-7 text-[14.5px] font-semibold md:flex">
          <NuxtLink
            v-for="lien in liens"
            :key="lien.chemin"
            :to="lien.chemin"
            class="border-b-2 border-transparent pb-[3px] text-texte hover:text-encre"
            active-class="border-encre text-encre"
          >
            <!-- Tablette (planche B, écran 14) : « Modules · Sessions · Certificats » -->
            <span class="lg:hidden">{{ lien.court }}</span>
            <span class="hidden lg:inline">{{ lien.libelle }}</span>
          </NuxtLink>
        </nav>
        <div class="flex items-center gap-3">
          <NuxtLink to="/mon-espace/profil" :aria-label="`Profil de ${auth.utilisateur?.prenom ?? ''}`">
            <UiAvatar :photo="auth.utilisateur?.photo" :initiales="initiales" />
          </NuxtLink>
          <span class="hidden text-[14px] text-texte md:inline">{{ auth.utilisateur?.prenom }}</span>
          <button type="button" class="text-[13px] text-discret hover:text-encre" @click="seDeconnecter">
            Déconnexion
          </button>
        </div>
      </div>
    </header>

    <main class="conteneur flex-1 py-8 pb-24 md:pb-8">
      <slot />
    </main>

    <LayoutBarreOngletsMobile :liens="ongletsMobile" jusqua="md" />
  </div>
</template>
