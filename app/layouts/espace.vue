<script setup lang="ts">
/**
 * Chrome de l'espace apprenant (planche B, puis maquette du 13/11) : en-tête
 * dédié — logo, navigation « Tableau de bord · Catalogue · Mes modules ·
 * Coaching collectif · Coaching privé · Mes certificats », pastille de compte
 * (photo de profil, initiales à défaut), Déconnexion — et barre d'onglets
 * basse sous 768 px.
 *
 * L'entrée active est une pastille aux couleurs de la charte, et non plus un
 * filet souligné en encre.
 */
const auth = useAuthStore()

async function seDeconnecter() {
  await auth.deconnexion()
  await navigateTo('/')
}
const liens = [
  { libelle: 'Tableau de bord', court: 'Accueil', chemin: '/mon-espace', icone: 'ph:house' },
  { libelle: 'Catalogue', court: 'Catalogue', chemin: '/mon-espace/catalogue', icone: 'ph:squares-four' },
  { libelle: 'Mes modules', court: 'Modules', chemin: '/mon-espace/modules', icone: 'ph:play-circle' },
  { libelle: 'Coaching collectif', court: 'Sessions', chemin: '/mon-espace/sessions', icone: 'ph:calendar-dots' },
  { libelle: 'Coaching privé', court: 'Privé', chemin: '/mon-espace/coaching-prive', icone: 'ph:target' },
  { libelle: 'Mes certificats', court: 'Certificats', chemin: '/mon-espace/certificats', icone: 'ph:certificate' },
]
const ongletsMobile = [
  { libelle: 'Catalogue', chemin: '/mon-espace/catalogue', icone: 'ph:compass' },
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
      <!-- Même colonne que le site vitrine (brief du 02/11) : la gouttière de
           48 px de la planche B est abandonnée. -->
      <div class="conteneur flex items-center justify-between gap-4 py-3.5">
        <NuxtLink to="/mon-espace" aria-label="Accueil de mon espace">
          <img src="/images/brand/logo.png" alt="E-Masterclass | Big Five" class="block h-9 w-auto" width="180" height="36">
        </NuxtLink>
        <!-- Six entrées : l'écart se resserre sous 1280 px pour tenir sur une ligne. -->
        <nav aria-label="Navigation de l’espace apprenant" class="hidden items-center gap-0.5 text-[14px] font-semibold md:flex xl:gap-1.5 xl:text-[14.5px]">
          <!-- `exact-active-class` : « Tableau de bord » pointe sur /mon-espace,
               préfixe de toutes les autres entrées — il ne doit s'allumer que
               sur sa propre page. -->
          <NuxtLink
            v-for="lien in liens"
            :key="lien.chemin"
            :to="lien.chemin"
            class="rounded-full px-2.5 py-2 whitespace-nowrap text-texte hover:bg-social-nuage hover:text-encre xl:px-3"
            :active-class="lien.chemin === '/mon-espace' ? '' : 'onglet-actif'"
            exact-active-class="onglet-actif"
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

    <main class="conteneur flex-1 pt-9 pb-24 md:pb-12">
      <slot />
    </main>

    <LayoutBarreOngletsMobile :liens="ongletsMobile" jusqua="md" />
    <LayoutWhatsAppFlottant onglets-jusqua="md" />
  </div>
</template>
