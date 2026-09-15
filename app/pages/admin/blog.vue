<script setup lang="ts">
import type { Article, Formateur } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Blog — administration')

type ArticleAdmin = Article & { auteur: Formateur | null }

const { data: articles } = await useFetch<ArticleAdmin[]>('/api/admin/articles')

const onglet = ref<'tous' | 'publie' | 'brouillon'>('tous')
const categorie = ref('')
const recherche = ref('')

const categories = computed(() =>
  [...new Set((articles.value ?? []).map((a) => a.categorie))].sort(),
)

const visibles = computed(() =>
  (articles.value ?? [])
    .filter((a) => onglet.value === 'tous' || a.statut === onglet.value)
    .filter((a) => !categorie.value || a.categorie === categorie.value)
    .filter((a) => {
      const q = recherche.value.trim().toLowerCase()
      return !q || a.titre.toLowerCase().includes(q) || a.slug.includes(q)
    }),
)

const compte = (statut: string) => (articles.value ?? []).filter((a) => a.statut === statut).length

const ONGLETS = [
  { cle: 'tous', libelle: 'Tous' },
  { cle: 'publie', libelle: 'Publiés' },
  { cle: 'brouillon', libelle: 'Brouillons' },
] as const

/**
 * Un article publié mais non indexable ne remontera jamais dans une recherche.
 * Ce n'est pas forcément une erreur — un article de service, une page de
 * remerciement — mais cela ne doit pas passer inaperçu.
 */
function indexation(a: ArticleAdmin) {
  if (a.statut !== 'publie') return { texte: 'Hors ligne', classe: 'text-discret' }
  if (a.seo?.indexable === false) return { texte: 'Non indexable', classe: 'text-alerte' }
  if (!a.seo?.metaDescription) return { texte: 'Description à écrire', classe: 'text-alerte' }
  return { texte: 'Indexable', classe: 'text-succes' }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">Blog — {{ articles?.length ?? 0 }} articles</h1>
      <UiBaseButton taille="sm" to="/admin/article/nouveau">+ Nouvel article</UiBaseButton>
    </div>
    <p class="mt-2 max-w-[760px] text-[13.5px] text-discret">
      Les brouillons ne sont ni accessibles publiquement, ni indexables, ni présents dans le plan de
      site. Le référencement de chaque article se règle depuis son éditeur ou depuis la liste SEO.
    </p>

    <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-2" role="group">
        <button
          v-for="o in ONGLETS"
          :key="o.cle"
          class="rounded-full border px-4 py-2 text-[13px] font-bold"
          :class="onglet === o.cle ? 'border-social bg-social text-white' : 'border-ligne bg-white text-texte'"
          :aria-pressed="onglet === o.cle"
          @click="onglet = o.cle"
        >
          {{ o.libelle }}
          <span class="font-normal">
            ({{ o.cle === 'tous' ? (articles ?? []).length : compte(o.cle) }})
          </span>
        </button>
      </div>
      <div class="flex flex-wrap gap-2 text-[13px]">
        <select v-model="categorie" class="rounded-full border border-ligne bg-white px-3.5 py-2">
          <option value="">Toutes catégories</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
        <input
          v-model="recherche"
          type="search"
          placeholder="Rechercher un titre"
          class="w-[220px] max-w-full rounded-full border border-ligne px-3.5 py-2 focus:border-social focus:outline-none"
        >
      </div>
    </div>

    <AdminTableauSimple
      class="mt-4"
      :colonnes="['Titre', 'Catégorie', 'Auteur', 'Publié le', 'Statut', 'Indexation', 'Actions']"
    >
      <tr v-for="article in visibles" :key="article.id">
        <td class="px-4 py-3">
          <p class="font-bold">{{ article.titre }}</p>
          <p class="font-mono text-[11.5px] text-discret">
            /blog/{{ article.slug }}<span v-if="article.aLaUne"> · à la une</span>
          </p>
        </td>
        <td class="px-4 py-3">{{ article.categorie }}</td>
        <td class="px-4 py-3">{{ article.auteur?.nom }}</td>
        <td class="px-4 py-3 whitespace-nowrap">
          {{ article.publieLe ? formatDate(article.publieLe) : '—' }}
        </td>
        <td class="px-4 py-3">
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
            :class="article.statut === 'publie' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte'"
          >
            {{ article.statut === 'publie' ? 'Publié' : 'Brouillon' }}
          </span>
        </td>
        <td class="px-4 py-3 text-[12.5px]" :class="indexation(article).classe">
          {{ indexation(article).texte }}
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <NuxtLink :to="`/admin/article/${article.id}`" class="text-[12.5px] underline">Modifier</NuxtLink>
          <NuxtLink
            v-if="article.statut === 'publie'"
            :to="`/blog/${article.slug}`"
            target="_blank"
            class="ml-3 text-[12.5px] underline"
          >
            Voir
          </NuxtLink>
        </td>
      </tr>
      <tr v-if="!visibles.length">
        <td colspan="7" class="px-4 py-8 text-center text-discret">Aucun article dans ce filtre.</td>
      </tr>
    </AdminTableauSimple>
  </div>
</template>
