<script setup lang="ts">
import type { SeoFields } from '#shared/types'
import type { ColonneCsv } from '~/utils/csv'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Référencement et partage')

interface Entree {
  id: string
  type: string
  libelle: string
  chemin: string
  statut: string
  seo: SeoFields
  slugVerrouille: boolean
}

const { data, refresh } = await useFetch<{
  entrees: Entree[]
  doublons: { titles: { valeur: string; chemins: string[] }[]; descriptions: { valeur: string; chemins: string[] }[] }
  manquants: string[]
  redirections: { de: string; vers: string; creeeLe: string }[]
  technique: {
    sitemap: { chemin: string; automatique: boolean }
    robots: { chemin: string; automatique: boolean }
    pagesExclues: number
    redirections: number
    searchConsole: string | null
  }
  role: string
}>('/api/admin/referencement')

const filtre = ref('')
const recherche = ref('')

const entrees = computed(() =>
  (data.value?.entrees ?? [])
    .filter((e) => !filtre.value || e.type === filtre.value)
    .filter((e) => {
      const q = recherche.value.trim().toLowerCase()
      return !q || e.libelle.toLowerCase().includes(q) || e.chemin.toLowerCase().includes(q)
    }),
)

const TYPES = [
  { valeur: '', libelle: 'Toutes' },
  { valeur: 'accueil', libelle: 'Accueil' },
  { valeur: 'programme', libelle: 'Programmes' },
  { valeur: 'module', libelle: 'Modules' },
  { valeur: 'formateur', libelle: 'Formateurs' },
  { valeur: 'editoriale', libelle: 'Pages éditoriales' },
  { valeur: 'article', libelle: 'Articles' },
]

const compte = (type: string) =>
  type ? (data.value?.entrees ?? []).filter((e) => e.type === type).length : (data.value?.entrees ?? []).length

/** Une page sans titre ni description se réfère sur des valeurs de repli :
 *  elle sera indexée, mais sur un texte que personne n'a écrit. */
const aCompleter = computed(
  () => (data.value?.entrees ?? []).filter((e) => !e.seo.title || !e.seo.metaDescription).length,
)

function exporter() {
  exporterCsv(
    `referencement-${new Date().toISOString().slice(0, 10)}`,
    [
      { cle: 'libelle', libelle: 'Page' },
      { cle: 'type', libelle: 'Type' },
      { cle: 'chemin', libelle: 'URL' },
      { cle: 'statut', libelle: 'Statut' },
      { cle: (e) => e.seo.title ?? '', libelle: 'Title' },
      { cle: (e) => e.seo.metaDescription ?? '', libelle: 'Meta description' },
      { cle: (e) => (e.seo.indexable === false ? 'noindex' : 'index'), libelle: 'Indexation' },
      { cle: (e) => e.seo.canonical ?? '', libelle: 'Canonique' },
    ] satisfies ColonneCsv<Entree>[],
    entrees.value,
  )
}

const selection = ref<Entree | null>(null)

function ouvrir(entree: Entree) {
  selection.value = entree
}

const autres = computed(() =>
  (data.value?.entrees ?? []).map((e) => ({
    id: e.id,
    title: e.seo.title,
    metaDescription: e.seo.metaDescription,
  })),
)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">Référencement (SEO)</h1>
      <UiBaseButton taille="sm" variante="contour" @click="exporter">Exporter en CSV</UiBaseButton>
    </div>
    <p class="mt-2 max-w-3xl text-[13.5px] text-discret">
      Toutes les pages indexables, existantes et nouvelles. Plan de site, canonique, redirections,
      données structurées et robots restent automatiques et ne se règlent pas page par page.
    </p>

    <!-- État technique : ce que l'application maîtrise est affirmé, ce qui
         dépend d'un compte tiers est laissé à vérifier. -->
    <div v-if="data" class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[12px] border border-ligne-douce bg-white p-4">
        <p class="text-[12.5px] text-discret">Plan de site</p>
        <p class="mt-1 text-[13.5px] text-succes">Automatique</p>
        <a :href="data.technique.sitemap.chemin" target="_blank" class="mt-1 block font-mono text-[12px] underline">
          {{ data.technique.sitemap.chemin }}
        </a>
      </div>
      <div class="rounded-[12px] border border-ligne-douce bg-white p-4">
        <p class="text-[12.5px] text-discret">robots.txt</p>
        <p class="mt-1 text-[13.5px] text-succes">Automatique</p>
        <a :href="data.technique.robots.chemin" target="_blank" class="mt-1 block font-mono text-[12px] underline">
          {{ data.technique.robots.chemin }}
        </a>
      </div>
      <div class="rounded-[12px] border border-ligne-douce bg-white p-4">
        <p class="text-[12.5px] text-discret">Redirections</p>
        <p class="mt-1 text-[13.5px]">{{ data.technique.redirections }} en place</p>
        <p class="mt-1 text-[12px] text-discret">{{ data.technique.pagesExclues }} page(s) en noindex</p>
      </div>
      <div class="rounded-[12px] border border-ligne-douce bg-white p-4">
        <p class="text-[12.5px] text-discret">Search Console</p>
        <p class="mt-1 text-[13.5px] text-alerte">À vérifier chez Google</p>
        <NuxtLink to="/admin/tracking" class="mt-1 block text-[12px] underline">
          Renseigner la vérification →
        </NuxtLink>
      </div>
    </div>

    <div v-if="data?.manquants.length || data?.doublons.titles.length || data?.doublons.descriptions.length"
         class="mt-6 rounded-[14px] border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
      <p class="font-title font-medium">Contrôles</p>
      <ul class="mt-2 list-disc space-y-1 pl-5">
        <li v-for="chemin in data?.manquants" :key="chemin">
          {{ chemin }} — Title ou Meta description obligatoire avant publication.
        </li>
        <li v-for="d in data?.doublons.titles" :key="d.valeur">
          Title dupliqué sur : {{ d.chemins.join(', ') }}
        </li>
        <li v-for="d in data?.doublons.descriptions" :key="d.valeur">
          Meta description dupliquée sur : {{ d.chemins.join(', ') }}
        </li>
      </ul>
    </div>

    <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrer par type de page">
        <button
          v-for="option in TYPES"
          :key="option.valeur"
          class="rounded-full border px-3 py-1.5 text-[12.5px]"
          :class="filtre === option.valeur ? 'border-encre bg-encre text-white' : 'border-ligne bg-white text-texte'"
          :aria-pressed="filtre === option.valeur"
          @click="filtre = option.valeur"
        >
          {{ option.libelle }} <span class="opacity-70">({{ compte(option.valeur) }})</span>
        </button>
        <span
          v-if="aCompleter"
          class="rounded-full border border-alerte bg-alerte-voile px-3 py-1.5 text-[12.5px] font-bold text-alerte"
        >
          À compléter ({{ aCompleter }})
        </span>
      </div>
      <input
        v-model="recherche"
        type="search"
        placeholder="Rechercher une page ou une URL"
        class="w-[260px] max-w-full rounded-full border border-ligne px-3.5 py-2 text-[13px] focus:border-social focus:outline-none"
      >
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-[1fr_460px]">
      <AdminTableauSimple :colonnes="['Page', 'URL', 'Title', 'Indexation', '']">
        <tr v-for="entree in entrees" :key="entree.id" :class="selection?.id === entree.id && 'bg-fond-clair'">
          <td class="px-4 py-3">
            <p class="font-medium">{{ entree.libelle }}</p>
            <p class="text-xs text-discret">{{ entree.type }} · {{ entree.statut }}</p>
          </td>
          <td class="px-4 py-3 font-mono text-xs text-texte">{{ entree.chemin }}</td>
          <td class="px-4 py-3">
            <span v-if="entree.seo.title" class="text-xs">{{ entree.seo.title }}</span>
            <span v-else class="text-xs text-amber-600">automatique</span>
          </td>
          <td class="px-4 py-3">
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-bold"
              :class="entree.seo.indexable === false ? 'bg-alerte-voile text-alerte' : 'bg-succes-voile text-succes'"
            >{{ entree.seo.indexable === false ? 'noindex' : 'index' }}</span>
          </td>
          <td class="px-4 py-3 text-right">
            <button class="text-xs underline" @click="ouvrir(entree)">Éditer</button>
          </td>
        </tr>
      </AdminTableauSimple>

      <AdminPanneauReferencement
        v-if="selection"
        :key="selection.id"
        :id="selection.id"
        :libelle="selection.libelle"
        :chemin="selection.chemin"
        :seo="selection.seo"
        :slug-verrouille="selection.slugVerrouille"
        :statut="selection.statut"
        :autres="autres"
        @fermer="selection = null"
        @enregistre="refresh()"
      />

      <aside v-else class="rounded-[14px] border border-dashed border-ligne bg-white p-10 text-center text-sm text-discret">
        Sélectionnez une page pour éditer son référencement.
      </aside>
    </div>

    <section v-if="data?.redirections.length" class="mt-8">
      <h2 class="text-lg">Redirections créées</h2>
      <AdminTableauSimple class="mt-3" :colonnes="['Ancienne URL', 'Nouvelle URL', 'Créée le']">
        <tr v-for="r in data.redirections" :key="r.de">
          <td class="px-4 py-3 font-mono text-xs">{{ r.de }}</td>
          <td class="px-4 py-3 font-mono text-xs">{{ r.vers }}</td>
          <td class="px-4 py-3 text-xs">{{ formatDate(r.creeeLe) }}</td>
        </tr>
      </AdminTableauSimple>
    </section>
  </div>
</template>
