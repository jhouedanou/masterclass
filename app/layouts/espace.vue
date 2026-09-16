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
const menuCompte = ref(false)
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
            class="text-texte hover:text-encre"
            active-class="text-social"
          >
            <!-- Tablette (planche B, écran 14) : « Modules · Sessions · Certificats » -->
            <span class="lg:hidden">{{ lien.court }}</span>
            <span class="hidden lg:inline">{{ lien.libelle }}</span>
          </NuxtLink>
        </nav>
        <div class="relative flex items-center gap-3">
          <button
            type="button"
            class="rounded-full"
            :aria-expanded="menuCompte"
            aria-haspopup="menu"
            :aria-label="`Compte de ${auth.utilisateur?.prenom ?? ''}`"
            @click="menuCompte = !menuCompte"
          >
            <UiAvatar :photo="auth.utilisateur?.photo" :initiales="initiales" />
          </button>
          <span class="hidden text-[14px] text-texte md:inline">{{ auth.utilisateur?.prenom }}</span>
          <!-- Icône seule : le libellé part dans `aria-label` et `title`, sans quoi
               le bouton n'aurait plus de nom accessible. -->
          <button
            type="button"
            class="hidden size-9 place-items-center rounded-full text-discret hover:bg-fond-clair hover:text-encre md:grid"
            aria-label="Déconnexion"
            title="Déconnexion"
            @click="seDeconnecter"
          >
            <Icon name="ph:sign-out" size="20" />
          </button>
          <div
            v-if="menuCompte"
            role="menu"
            class="absolute top-11 right-0 z-30 w-56 rounded-[12px] border border-ligne bg-white p-1.5 text-[14px] shadow-[0_12px_32px_rgba(23,21,28,.12)]"
            @click="menuCompte = false"
          >
            <NuxtLink to="/mon-espace" role="menuitem" class="block rounded-[8px] px-3 py-2 hover:bg-fond-clair">Tableau de bord</NuxtLink>
            <NuxtLink to="/mon-espace/profil" role="menuitem" class="block rounded-[8px] px-3 py-2 hover:bg-fond-clair">Profil apprenant</NuxtLink>
            <NuxtLink to="/mon-espace/parametres" role="menuitem" class="block rounded-[8px] px-3 py-2 hover:bg-fond-clair">Paramètres du compte</NuxtLink>
            <button type="button" role="menuitem" class="block w-full rounded-[8px] px-3 py-2 text-left hover:bg-fond-clair md:hidden" @click="seDeconnecter">
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="conteneur flex-1 py-8 pb-24 md:pb-8">
      <slot />
    </main>

    <LayoutBarreOngletsMobile :liens="ongletsMobile" jusqua="md" />
    <LayoutTheFooter class="hidden lg:block" />
  </div>
</template>
