<script setup lang="ts">
import type { SeoFields } from '#shared/types'
import type { ColonneCsv } from '~/utils/csv'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Référencement et partage')

interface Entree {
  id: string
  type: 'accueil' | 'programme' | 'module' | 'formateur' | 'editoriale' | 'article'
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
    sitemap: { chemin: string; urls: number }
    robots: { chemin: string; sitemapDeclare: boolean }
    pagesExclues: number
    redirections: number
    searchConsole: 'Connectée' | 'À connecter'
    erreurs404: number | null
  }
  role: string
}>('/api/admin/referencement')

const filtre = ref('')
const recherche = ref('')

/** Une page sans Title ou sans Meta se réfère sur des valeurs de repli :
 *  elle sera indexée, mais sur un texte que personne n'a écrit. */
const incomplete = (e: Entree) => !e.seo.title?.trim() || !e.seo.metaDescription?.trim()
const publiee = (e: Entree) => e.statut === 'publie' || e.statut === 'disponible'

/** Onglets de l'écran 23 : « Pages du site » regroupe l'accueil et les pages
 *  éditoriales, « À compléter » les pages où un champ manque. */
const FILTRES: { valeur: string; libelle: string; retient: (e: Entree) => boolean }[] = [
  { valeur: '', libelle: 'Toutes', retient: () => true },
  { valeur: 'site', libelle: 'Pages du site', retient: (e) => e.type === 'accueil' || e.type === 'editoriale' },
  { valeur: 'programme', libelle: 'Programmes', retient: (e) => e.type === 'programme' },
  { valeur: 'module', libelle: 'Modules', retient: (e) => e.type === 'module' },
  { valeur: 'formateur', libelle: 'Formateurs', retient: (e) => e.type === 'formateur' },
  { valeur: 'article', libelle: 'Articles de blog', retient: (e) => e.type === 'article' },
  { valeur: 'a-completer', libelle: 'À compléter', retient: incomplete },
]

const entrees = computed(() => {
  const retient = FILTRES.find((f) => f.valeur === filtre.value)?.retient ?? (() => true)
  return (data.value?.entrees ?? []).filter(retient).filter((e) => {
    const q = recherche.value.trim().toLowerCase()
    return !q || e.libelle.toLowerCase().includes(q) || e.chemin.toLowerCase().includes(q)
  })
})

const compte = (valeur: string) => {
  const retient = FILTRES.find((f) => f.valeur === valeur)?.retient ?? (() => true)
  return (data.value?.entrees ?? []).filter(retient).length
}

/** Type affiché dans la colonne : « Module · Social Média », « Page du site »… */
function libelleType(e: Entree) {
  switch (e.type) {
    case 'accueil':
    case 'editoriale':
      return 'Page du site'
    case 'programme':
      return 'Programme'
    case 'module':
      return 'Module'
    case 'formateur':
      return 'Formateur'
    case 'article':
      return 'Article de blog'
  }
}

/** Indexation : « Autorisée » pour une page publiée et indexable, « Bloquée »
 *  quand un Title ou une Meta manque sur une page publiée, « Désactivée » quand
 *  l'indexation est refusée ou que la page n'est pas publiée. */
function indexation(e: Entree): 'Autorisée' | 'Bloquée' | 'Désactivée' {
  if (e.seo.indexable === false || !publiee(e)) return 'Désactivée'
  if (incomplete(e)) return 'Bloquée'
  return 'Autorisée'
}

function exporter() {
  exporterCsv(
    `referencement-${new Date().toISOString().slice(0, 10)}`,
    [
      { cle: 'libelle', libelle: 'Page' },
      { cle: (e) => libelleType(e), libelle: 'Type' },
      { cle: 'chemin', libelle: 'URL' },
      { cle: 'statut', libelle: 'Statut' },
      { cle: (e) => e.seo.title ?? '', libelle: 'Title' },
      { cle: (e) => e.seo.metaDescription ?? '', libelle: 'Meta description' },
      { cle: (e) => indexation(e), libelle: 'Indexation' },
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
    libelle: e.libelle,
    title: e.seo.title,
    metaDescription: e.seo.metaDescription,
  })),
)

const ATTENTE = '—'

/**
 * Largeurs de l'écran 23 : `1.6fr 1.1fr 92px 92px 120px 120px`. Les quatre
 * colonnes fixes prennent 424 px ; les deux premières se partagent le reste
 * dans le rapport 1,6 / 1,1, ce qu'un `colgroup` exprime en `calc`.
 */
const LARGEURS = [
  'calc((100% - 424px) * 0.593)',
  'calc((100% - 424px) * 0.407)',
  '92px',
  '92px',
  '120px',
  '120px',
]
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="font-title text-[24px] font-light">Référencement (SEO)</h1>
      <label class="inline-flex items-center rounded-full border border-ligne bg-white px-3.5 py-2">
        <span class="sr-only">Rechercher une page</span>
        <input
          v-model="recherche"
          type="search"
          placeholder="Rechercher une page…"
          class="w-[220px] max-w-full bg-transparent text-[12px] font-semibold focus:outline-none"
        >
      </label>
    </div>
    <p class="mt-1.5 max-w-3xl text-[13px] text-discret">
      Chaque page publiée apparaît ici dès sa création. Le panneau « Référencement et partage »
      s’ouvre depuis cette liste ou depuis l’onglet du même nom dans l’éditeur de la page — les deux
      modifient les mêmes champs.
    </p>

    <div class="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_420px]">
      <div>
        <UiOnglets
          v-model="filtre"
          :onglets="FILTRES.map((f) => ({ cle: f.valeur, libelle: f.libelle, compteur: compte(f.valeur), alerte: f.valeur === 'a-completer' && compte(f.valeur) > 0 }))"
        />

        <AdminTableauSimple
          class="mt-4"
          :colonnes="['Page', 'Type', 'Title', 'Meta', 'Indexation', 'Action']"
          :largeurs="LARGEURS"
          largeur-min="860px"
        >
          <!-- Une page dont un champ manque est mise en lumière ambre : c'est
               la seule ligne teintée de la maquette. -->
          <tr
            v-for="entree in entrees"
            :key="entree.id"
            :class="incomplete(entree) ? 'bg-alerte-neige' : selection?.id === entree.id && 'bg-fond-clair'"
          >
            <td class="px-4 py-3.5">
              <p class="font-bold">{{ entree.libelle }}</p>
              <p class="font-mono text-[11px] text-discret">
                {{ publiee(entree) || entree.statut === 'annonce' ? entree.chemin : 'brouillon — slug à définir' }}
              </p>
            </td>
            <td class="px-4 py-3.5 text-[12px] text-texte">{{ libelleType(entree) }}</td>
            <td class="px-4 py-3.5 text-[12px] font-bold">
              <span v-if="!publiee(entree) && !entree.seo.title" class="text-alerte">—</span>
              <span v-else-if="entree.seo.title?.trim()" class="text-succes">✓</span>
              <span v-else class="text-alerte">Manquant</span>
            </td>
            <td class="px-4 py-3.5 text-[12px] font-bold">
              <span v-if="!publiee(entree) && !entree.seo.metaDescription" class="text-alerte">—</span>
              <span v-else-if="entree.seo.metaDescription?.trim()" class="text-succes">✓</span>
              <span v-else class="text-alerte">Manquante</span>
            </td>
            <!-- Valeur de sens : gras dans sa couleur, jamais en pastille. -->
            <td
              class="px-4 py-3.5 text-[12px] font-bold"
              :class="{
                'text-succes': indexation(entree) === 'Autorisée',
                'text-alerte': indexation(entree) === 'Bloquée',
                'text-discret': indexation(entree) === 'Désactivée',
              }"
            >
              {{ indexation(entree) }}
            </td>
            <td class="px-4 py-3.5">
              <button
                class="text-[12.5px] font-bold"
                :class="incomplete(entree) ? 'text-alerte' : 'text-social'"
                @click="ouvrir(entree)"
              >
                {{ incomplete(entree) ? 'Compléter' : 'Modifier' }}
              </button>
            </td>
          </tr>
          <tr v-if="!entrees.length">
            <td colspan="6" class="px-4 py-6 text-center text-[13px] text-discret">Aucune page dans ce filtre.</td>
          </tr>
        </AdminTableauSimple>

        <div class="mt-3.5 flex flex-wrap items-center gap-3 text-[12.5px] text-discret">
          <button class="rounded-full border border-ligne bg-white px-3.5 py-2 font-semibold text-encre" @click="exporter">
            Exporter la liste
          </button>
          <span>
            Les pages du tunnel d’achat, des dashboards et des espaces privés ne figurent pas ici :
            elles sont en <b>noindex</b> permanent et hors sitemap.
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-4">
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
          :redirections="data?.redirections ?? []"
          @fermer="selection = null"
          @enregistre="refresh()"
        />

        <!-- Encarts pédagogiques de l'écran 23, en colonne à droite de la liste. -->
        <template v-else>
          <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
            <h2 class="font-sans text-[15px] font-bold">Où modifier le référencement</h2>
            <div class="mt-3.5 flex flex-col gap-3 text-[12.5px] leading-[1.6] text-texte">
              <div class="rounded-[12px] border border-ligne-douce p-3.5">
                <b class="mb-1 block">Depuis cette liste</b>
                « Modifier » ouvre le panneau Référencement et partage de la page choisie, sans
                passer par son éditeur.
              </div>
              <div class="rounded-[12px] border border-ligne-douce p-3.5">
                <b class="mb-1 block">Depuis l’éditeur</b>
                L’onglet « Référencement et partage » est présent dans l’éditeur d’un module, d’un
                formateur, d’une page éditoriale et d’un article de blog.
              </div>
              <div class="rounded-[12px] border-[1.5px] border-social bg-social-nuage p-3.5">
                Les deux chemins écrivent les mêmes champs : une modification faite dans l’éditeur
                d’article apparaît immédiatement dans cette liste, et inversement.
              </div>
            </div>
          </section>

          <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
            <h2 class="font-sans text-[15px] font-bold">Qui peut modifier quoi</h2>
            <div class="mt-3.5 flex flex-col gap-2.5 text-[12.5px] leading-[1.6] text-texte">
              <div class="flex items-start gap-2.5">
                <span class="shrink-0 rounded-full bg-social-voile px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-social">Contenu</span>
                <span>Mot-clé principal, Title, meta description, Open Graph, images et textes alternatifs.</span>
              </div>
              <div class="flex items-start gap-2.5">
                <span class="shrink-0 rounded-full bg-alerte-voile px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-alerte">Avancé 🔒</span>
                <span>Slug d’une page publiée, autorisation d’indexation, canonical personnalisée.</span>
              </div>
              <p class="text-[12px] text-discret">
                Les deux droits se cochent à la création du compte administrateur (écran 07).
              </p>
            </div>
          </section>
        </template>

        <!-- État technique : ce que l'application maîtrise est affirmé, ce qui
             dépend d'un compte tiers est lu dans les réglages. La maquette le
             peint sur fond encre, seule carte sombre de l'écran. -->
        <section v-if="data" class="rounded-[14px] bg-encre p-6 text-white">
          <h2 class="font-sans text-[15px] font-bold text-white">État technique</h2>
          <dl class="mt-3 flex flex-col gap-[9px] text-[12.5px] leading-[1.6] text-gris-perle">
            <div class="flex justify-between gap-3">
              <dt>Sitemap XML</dt>
              <dd class="font-bold text-succes-vif">
                <a :href="data.technique.sitemap.chemin" target="_blank" class="text-inherit hover:underline">
                  {{ data.technique.sitemap.urls }} URL
                </a> · à jour
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt>robots.txt</dt>
              <dd class="font-bold text-succes-vif">
                <a :href="data.technique.robots.chemin" target="_blank" class="text-inherit hover:underline">Sitemap déclaré</a>
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt>Search Console</dt>
              <dd class="font-bold" :class="data.technique.searchConsole === 'Connectée' ? 'text-succes-vif' : 'text-[#f0b46a]'">
                <NuxtLink v-if="data.technique.searchConsole !== 'Connectée'" to="/admin/tracking" class="text-inherit hover:underline">
                  À connecter
                </NuxtLink>
                <template v-else>Connectée</template>
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt>Redirections actives</dt>
              <dd class="font-bold text-white">{{ data.technique.redirections }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt>Erreurs 404 (30 j)</dt>
              <dd class="font-bold" :class="data.technique.erreurs404 ? 'text-[#f0b46a]' : 'text-white'">
                {{ data.technique.erreurs404 ?? ATTENTE }}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  </div>
</template>
