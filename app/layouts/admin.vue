<script setup lang="ts">
import type { SectionAdmin } from '#shared/types'

const auth = useAuthStore()

async function seDeconnecter() {
  await auth.deconnexion()
  await navigateTo('/')
}

/**
 * Une section non autorisée est masquée, pas seulement désactivée — c'est la
 * règle posée par la planche C. `section: null` marque les écrans ouverts à
 * tout compte d'administration.
 */
interface Lien {
  libelle: string
  chemin: string
  icone: string
  /** `null` = ouvert à tout compte d'administration. */
  section: SectionAdmin | null
  restreint?: boolean
}

/**
 * Ordre de la planche C, écran 01 : une liste plate, du pilotage éditorial vers
 * l'administration. Les regroupements par intertitres qui existaient ici ne
 * figurent pas dans la maquette.
 */
const tousLesLiens: Lien[] = [
  { libelle: 'Vue d’ensemble', chemin: '/admin', icone: 'ph:gauge', section: null },
  { libelle: 'CMS Site vitrine', chemin: '/admin/cms', icone: 'ph:layout', section: 'cms-site-vitrine' },
  { libelle: 'Blog', chemin: '/admin/blog', icone: 'ph:article', section: 'blog' },
  { libelle: 'Référencement (SEO)', chemin: '/admin/referencement', icone: 'ph:magnifying-glass', section: 'referencement-contenu' },
  { libelle: 'Programmes & phases', chemin: '/admin/programmes', icone: 'ph:tree-structure', section: 'modules-chapitres' },
  { libelle: 'Fiches commerciales', chemin: '/admin/fiches', icone: 'ph:megaphone', section: 'fiches-commerciales' },
  { libelle: 'Modules & chapitres', chemin: '/admin/contenus', icone: 'ph:stack', section: 'modules-chapitres' },
  { libelle: 'Formateurs', chemin: '/admin/formateurs', icone: 'ph:users-three', section: 'formateurs' },
  { libelle: 'Calendrier des sessions', chemin: '/admin/sessions', icone: 'ph:calendar-dots', section: 'calendrier-sessions' },
  { libelle: 'Coaching privé', chemin: '/admin/coaching-prive', icone: 'ph:target', section: 'coaching-prive' },
  { libelle: 'Apprenants', chemin: '/admin/apprenants', icone: 'ph:student', section: null },
  { libelle: 'Candidatures formateurs', chemin: '/admin/candidatures', icone: 'ph:user-plus', section: 'candidatures-formateurs' },
  { libelle: 'Statistiques', chemin: '/admin/coaching-prive#statistiques', icone: 'ph:chart-bar', section: 'statistiques-performance' },
  { libelle: 'Performances', chemin: '/admin/performances', icone: 'ph:chart-line-up', section: 'performances-marketing' },
  { libelle: 'Revenus', chemin: '/admin/revenus', icone: 'ph:currency-circle-dollar', section: 'statistiques-performance' },
  { libelle: 'Historique & versions', chemin: '/admin/historique', icone: 'ph:clock-counter-clockwise', section: 'historique-versions' },
  // « Tracking & pixels » et « Administration des accès » sont deux volets de
  // Paramètres (écran 20) : ils n'ont plus d'entrée de premier niveau.
  { libelle: 'Paramètres', chemin: '/admin/parametres', icone: 'ph:sliders', section: null },
  { libelle: 'Transactions & paiements', chemin: '/admin/transactions', icone: 'ph:lock-key', section: 'transactions-paiements', restreint: true },
]

const liens = computed(() => tousLesLiens.filter((l) => !l.section || auth.voitSection(l.section)))

/**
 * Rail tablette (écran 17) : la maquette n'y garde que cinq entrées de
 * navigation, plus « Transactions & paiements » poussé en bas par son verrou.
 * La phase 1 y repliait les dix-huit liens, ce que la maquette ne montre nulle
 * part.
 */
const CHEMINS_RAIL = ['/admin', '/admin/contenus', '/admin/sessions', '/admin/apprenants', '/admin/performances']
const liensRail = computed(() => liens.value.filter((l) => CHEMINS_RAIL.includes(l.chemin)))
const lienRestreint = computed(() => liens.value.find((l) => l.restreint))

/**
 * Badge « Coaching privé 3 » de l'écran 01 : les demandes en attente. Lu en
 * différé, pour ne pas retarder l'affichage du gabarit ; absent, le badge ne
 * s'affiche pas.
 */
const { data: attente } = useFetch<{ enAttente: number }>('/api/admin/coaching-prive/attente', {
  lazy: true,
  server: false,
})
const badges = computed<Record<string, number>>(() => ({
  '/admin/coaching-prive': attente.value?.enAttente ?? 0,
}))

/** Pied de barre latérale, sur deux lignes : « Prénom N. — Admin principal »
 *  puis « Accès complet » (écran 01). */
const identite = computed(() => {
  const u = auth.utilisateur
  const initiale = u?.nom?.[0] ? ` ${u.nom[0]}.` : ''
  return `${u?.prenom ?? ''}${initiale} — ${auth.estAdminSuperieur ? 'Admin principal' : 'Admin de contenu'}`
})
const perimetre = computed(() => {
  if (auth.estAdminSuperieur) return 'Accès complet'
  const n = auth.utilisateur?.sectionsAutorisees?.length ?? 0
  return `${n} section${n > 1 ? 's' : ''}`
})
</script>

<template>
  <div class="flex min-h-screen bg-fond-cadre">
    <!-- Barre latérale (écran 01) : 250 px, logo en pastille blanche coiffé du
         surtitre, puis la liste plate des sections. La maquette ne pose aucune
         icône à ce palier. -->
    <aside class="sur-sombre hidden w-[250px] shrink-0 flex-col overflow-y-auto bg-encre py-[22px] text-nuit-clair lg:flex">
      <div class="border-b border-nuit-filet px-5 pb-[18px]">
        <NuxtLink to="/" class="block rounded-[8px] bg-white px-2.5 py-1.5">
          <img src="/images/brand/logo.png" alt="E-Masterclass Big Five" class="h-[26px] w-full object-contain" width="180" height="26">
        </NuxtLink>
        <p class="surtitre-menu mt-2 text-discret-clair">Dashboard Admin</p>
      </div>

      <nav aria-label="Navigation d’administration" class="flex flex-col gap-0.5 px-3 py-3.5 text-[13.5px] font-semibold">
        <NuxtLink
          v-for="lien in liens"
          :key="lien.chemin"
          :to="lien.chemin"
          class="flex items-center gap-2 rounded-[8px] px-3 py-2.5 hover:bg-encre-800 hover:text-white"
          :class="lien.restreint ? 'text-discret' : 'text-gris-perle'"
          active-class="bg-social text-white"
        >
          <span class="flex-1">{{ lien.libelle }}</span>
          <span
            v-if="badges[lien.chemin]"
            class="rounded-full bg-social px-1.5 py-0.5 text-[10.5px] font-bold text-white"
          >{{ badges[lien.chemin] }}</span>
          <span v-if="lien.restreint" aria-hidden="true" class="text-[12px]">🔒</span>
        </NuxtLink>
      </nav>

      <div class="mt-auto border-t border-nuit-filet px-5 py-4 text-[12px] text-discret-clair">
        <p>{{ identite }}</p>
        <p class="text-discret">{{ perimetre }}</p>
        <button class="mt-2 text-discret hover:text-white" @click="seDeconnecter">Se déconnecter</button>
      </div>
    </aside>

    <!-- Tablette (écran 17) : la barre latérale se replie en une colonne
         d'icônes de 64 px, vignette de marque en tête, verrou en pied. -->
    <aside class="sur-sombre hidden w-16 shrink-0 flex-col items-center gap-1.5 overflow-y-auto bg-encre py-4 text-nuit-clair md:flex lg:hidden">
      <NuxtLink to="/" class="mb-2.5 rounded-[8px] bg-white p-[5px]" aria-label="Accueil du site">
        <img src="/images/brand/pattern-vignette.png" alt="" class="size-[26px] rounded-[4px] object-cover" width="26" height="26" loading="lazy">
      </NuxtLink>
      <NuxtLink
        v-for="lien in liensRail"
        :key="lien.chemin"
        :to="lien.chemin"
        :title="lien.libelle"
        :aria-label="lien.libelle"
        class="grid size-10 place-items-center rounded-[8px] text-discret-clair hover:bg-encre-800 hover:text-white"
        active-class="bg-social text-white"
      >
        <Icon :name="lien.icone" size="18" />
      </NuxtLink>
      <NuxtLink
        v-if="lienRestreint"
        :to="lienRestreint.chemin"
        :title="lienRestreint.libelle"
        :aria-label="lienRestreint.libelle"
        class="mt-auto grid size-10 place-items-center rounded-[8px] text-discret hover:bg-encre-800 hover:text-white"
        active-class="bg-social text-white"
      >
        <Icon name="ph:lock-simple" size="16" />
      </NuxtLink>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Téléphone seulement : la maquette ne dessine pas de barre d'en-tête,
           mais sous 768 px il n'existe ni barre latérale ni rail. -->
      <header class="flex h-14 items-center justify-between gap-3 border-b border-ligne-claire bg-white px-4 md:hidden">
        <div class="flex min-w-0 items-center gap-2">
          <LayoutMenuMobileAdmin :liens="liens" />
          <p class="truncate font-title text-[17px] font-light">Dashboard Admin</p>
        </div>
        <button class="text-[13px] text-discret hover:text-encre" @click="seDeconnecter">
          Se déconnecter
        </button>
      </header>
      <main class="min-w-0 flex-1 p-4 md:px-6 md:py-[22px] lg:px-9 lg:py-[30px]">
        <slot />
      </main>
    </div>
  </div>
</template>
