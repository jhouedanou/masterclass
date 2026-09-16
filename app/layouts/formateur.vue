<script setup lang="ts">
/**
 * Chrome de l'espace formateur (planche D, écran 01) : en-tête dédié — logo,
 * mention « Espace formateur », navigation « Vue d'ensemble · Mes modules ·
 * Coaching collectif · Coaching privé (N) · Revenus », pastille d'initiales et
 * Déconnexion — et barre d'onglets basse sous 1024 px (écran 07).
 *
 * « Mon profil » ne figure pas dans la navigation : il s'atteint par le menu
 * de l'avatar, comme côté apprenant.
 */
const auth = useAuthStore()

async function seDeconnecter() {
  await auth.deconnexion()
  await navigateTo('/')
}

// Pastille « Coaching privé 2 » : les séances payées restant à animer. Une
// erreur ici ne doit pas priver le formateur de sa navigation, d'où les zéros
// par défaut.
const { data: aTraiter } = await useFetch<{
  coachingPrive: number
  sujetsALire: number
  nouvellesNotes: number
}>('/api/formateur/a-traiter', {
  default: () => ({ coachingPrive: 0, sujetsALire: 0, nouvellesNotes: 0 }),
})

const compteurPrive = computed(() => aTraiter.value.coachingPrive)

const liens = computed(() => [
  { libelle: 'Vue d’ensemble', chemin: '/formateur' },
  { libelle: 'Mes modules', chemin: '/formateur/modules' },
  { libelle: 'Coaching collectif', chemin: '/formateur/sessions' },
  { libelle: 'Coaching privé', chemin: '/formateur/coaching-prive', compteur: compteurPrive.value },
  { libelle: 'Revenus', chemin: '/formateur/revenus' },
])

const ongletsMobile = computed(() => [
  { libelle: 'Accueil', chemin: '/formateur', icone: 'ph:squares-four' },
  { libelle: 'Modules', chemin: '/formateur/modules', icone: 'ph:stack' },
  { libelle: 'Sessions', chemin: '/formateur/sessions', icone: 'ph:calendar-dots' },
  { libelle: 'Privé', chemin: '/formateur/coaching-prive', icone: 'ph:target', compteur: compteurPrive.value },
  { libelle: 'Revenus', chemin: '/formateur/revenus', icone: 'ph:currency-circle-dollar' },
])

const initiales = computed(
  () => `${auth.utilisateur?.prenom?.[0] ?? ''}${auth.utilisateur?.nom?.[0] ?? ''}`.toUpperCase(),
)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-fond-clair">
    <header class="border-b border-ligne-claire bg-white">
      <div class="conteneur flex items-center justify-between gap-4 py-3.5">
        <div class="flex items-center gap-3.5">
          <NuxtLink to="/formateur" aria-label="Accueil de l’espace formateur">
            <img src="/images/brand/logo.png" alt="E-Masterclass | Big Five" class="block h-9 w-auto" width="180" height="36">
          </NuxtLink>
          <span class="surtitre-menu hidden border-l border-ligne-claire pl-3.5 tracking-[0.14em] text-discret-clair sm:inline">
            Espace formateur
          </span>
        </div>

        <nav aria-label="Navigation de l’espace formateur" class="hidden items-center gap-5 text-[14.5px] font-semibold whitespace-nowrap lg:flex xl:gap-6.5">
          <NuxtLink
            v-for="lien in liens"
            :key="lien.chemin"
            :to="lien.chemin"
            class="flex items-center gap-1.5 border-b-2 border-transparent pb-[3px] text-texte hover:text-encre"
            active-class="border-encre text-encre"
          >
            {{ lien.libelle }}
            <span
              v-if="lien.compteur"
              class="rounded-full bg-social px-[7px] py-[2px] text-[10.5px] font-bold text-white"
            >
              {{ lien.compteur }}
            </span>
          </NuxtLink>
        </nav>

        <div class="flex items-center gap-2.5">
          <!-- La maquette n'ouvre pas de menu sur l'avatar ; il reste le seul
               chemin vers le profil, la barre latérale ne le listant plus. -->
          <NuxtLink
            to="/formateur/profil"
            class="grid size-9 place-items-center rounded-full bg-social text-[13px] font-extrabold text-white"
            :aria-label="`Profil de ${auth.utilisateur?.prenom ?? ''}`"
          >
            {{ initiales }}
          </NuxtLink>
          <span class="hidden text-[14px] text-texte md:inline">{{ auth.utilisateur?.prenom }}</span>
          <button type="button" class="text-[13px] text-discret hover:text-encre" @click="seDeconnecter">
            Déconnexion
          </button>
        </div>
      </div>
    </header>

    <main class="conteneur min-w-0 flex-1 py-8 pb-24 lg:pb-8">
      <slot />
    </main>

    <LayoutBarreOngletsMobile :liens="ongletsMobile" />
  </div>
</template>
