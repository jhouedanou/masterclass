<script setup lang="ts">
import type { Article, Formateur } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Blog — administration')

type ArticleAdmin = Article & { auteur: Formateur | null }

const { data: articles } = await useFetch<ArticleAdmin[]>('/api/admin/articles')

const onglet = ref<'tous' | 'publie' | 'brouillon'>('tous')
const categorie = ref('')
const auteur = ref('')

const auteurs = computed(() =>
  [...new Map((articles.value ?? []).filter((a) => a.auteur).map((a) => [a.auteur!.id, a.auteur!.nom])).entries()]
    .map(([id, nom]) => ({ id, nom }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
)

const categories = computed(() =>
  [...new Set((articles.value ?? []).map((a) => a.categorie))].sort(),
)

const visibles = computed(() =>
  (articles.value ?? [])
    .filter((a) => onglet.value === 'tous' || a.statut === onglet.value)
    .filter((a) => !categorie.value || a.categorie === categorie.value)
    .filter((a) => !auteur.value || a.auteurId === auteur.value),
)

const compte = (statut: string) => (articles.value ?? []).filter((a) => a.statut === statut).length

/** « Tous (14) · Publiés (11) · Brouillons (3) » — compteurs sur l'ensemble,
 *  pas sur le filtre courant. */
const ONGLETS = computed(() => [
  { cle: 'tous', libelle: 'Tous', compteur: (articles.value ?? []).length },
  { cle: 'publie', libelle: 'Publiés', compteur: compte('publie') },
  { cle: 'brouillon', libelle: 'Brouillons', compteur: compte('brouillon') },
])

/**
 * Un article publié mais non indexable ne remontera jamais dans une recherche.
 * Ce n'est pas forcément une erreur — un article de service, une page de
 * remerciement — mais cela ne doit pas passer inaperçu.
 */
function indexation(a: ArticleAdmin) {
  if (a.statut !== 'publie' || a.seo?.indexable === false) {
    return { texte: 'Désactivée', classe: 'text-discret' }
  }
  if (!a.seo?.metaDescription) return { texte: 'Bloquée', classe: 'text-alerte' }
  return { texte: 'Autorisée', classe: 'text-succes' }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="font-title text-[24px] font-light">Blog — articles</h1>
      <UiBaseButton taille="sm" variante="sombre" to="/admin/article/nouveau">+ Nouvel article</UiBaseButton>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <UiOnglets
        :onglets="ONGLETS"
        :model-value="onglet"
        @update:model-value="onglet = $event as typeof onglet"
      />
      <UiFiltrePilule
        v-model="categorie"
        etiquette="Filtrer par catégorie"
        :options="[{ valeur: '', libelle: 'Catégorie : toutes' }, ...categories.map((c) => ({ valeur: c, libelle: c }))]"
      />
      <UiFiltrePilule
        v-model="auteur"
        etiquette="Filtrer par auteur"
        :options="[{ valeur: '', libelle: 'Auteur : tous' }, ...auteurs.map((a) => ({ valeur: a.id, libelle: a.nom }))]"
      />
    </div>

    <AdminTableauSimple
      class="mt-4"
      :colonnes="['Article', 'Catégorie', 'Auteur', 'Statut', 'Indexation']"
      :largeurs="['auto', '150px', '120px', '110px', '90px']"
      largeur-min="760px"
    >
      <tr v-for="article in visibles" :key="article.id">
        <td class="px-4 py-3.5">
          <!-- Le titre est le point d'entrée de l'éditeur : la maquette ne
               montre pas de colonne d'actions. -->
          <NuxtLink :to="`/admin/article/${article.id}`" class="font-bold text-inherit hover:underline">
            {{ article.titre }}
          </NuxtLink>
          <p class="font-mono text-[11px] text-discret">
            <template v-if="article.slug">/blog/{{ article.slug }}</template>
            <template v-else>slug à définir</template>
            <span v-if="article.aLaUne"> · à la une</span>
          </p>
        </td>
        <td class="px-4 py-3.5 text-[12px]">{{ article.categorie }}</td>
        <td class="px-4 py-3.5 text-[12px]">{{ article.auteur?.nom }}</td>
        <td class="px-4 py-3.5">
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
            :class="article.statut === 'publie' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte'"
          >
            {{ article.statut === 'publie' ? 'Publié' : 'Brouillon' }}
          </span>
        </td>
        <!-- Valeur de sens : gras dans sa couleur, jamais en pastille. -->
        <td class="px-4 py-3.5 text-[12px] font-bold" :class="indexation(article).classe">
          {{ indexation(article).texte }}
        </td>
      </tr>
      <tr v-if="!visibles.length">
        <td colspan="5" class="px-4 py-8 text-center text-discret">Aucun article dans ce filtre.</td>
      </tr>
    </AdminTableauSimple>

    <p class="mt-3.5 rounded-[12px] border border-ligne-douce bg-white px-5 py-4 text-[12.5px] leading-[1.6] text-texte">
      Un brouillon n’est ni accessible publiquement, ni indexable, ni présent dans le sitemap. À la
      publication, l’article entre dans le sitemap et devient indexable si l’option est activée.
    </p>
  </div>
</template>
