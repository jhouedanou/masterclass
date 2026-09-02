<script setup lang="ts">
import type { SeoFields } from '#shared/types'

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
  role: string
}>('/api/admin/referencement')

const filtre = ref('')
const entrees = computed(() =>
  (data.value?.entrees ?? []).filter(
    (e) => !filtre.value || e.type === filtre.value,
  ),
)

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
    <h1 class="text-2xl">Référencement et partage</h1>
    <p class="mt-2 max-w-3xl text-sm text-texte">
      Gérez ici les métadonnées des pages indexables. Sitemap, canonical, redirections, données
      structurées et robots restent automatiques et ne se règlent pas page par page.
    </p>

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

    <div class="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtrer par type de page">
      <button
        v-for="option in [
          { valeur: '', libelle: 'Toutes' },
          { valeur: 'accueil', libelle: 'Accueil' },
          { valeur: 'programme', libelle: 'Programmes' },
          { valeur: 'module', libelle: 'Modules' },
          { valeur: 'formateur', libelle: 'Formateurs' },
          { valeur: 'editoriale', libelle: 'Pages éditoriales' },
          { valeur: 'article', libelle: 'Articles' },
        ]"
        :key="option.valeur"
        class="rounded-full border px-3 py-1.5 text-xs"
        :class="filtre === option.valeur ? 'border-encre bg-encre text-white' : 'border-ligne bg-white text-texte'"
        :aria-pressed="filtre === option.valeur"
        @click="filtre = option.valeur"
      >
        {{ option.libelle }}
      </button>
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
