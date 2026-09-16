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
const pastille = 'rounded-full px-2.5 py-1 text-[11px] font-bold'
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">Référencement (SEO)</h1>
      <input
        v-model="recherche"
        type="search"
        placeholder="Rechercher une page…"
        class="w-[260px] max-w-full rounded-full border border-ligne px-3.5 py-2 text-[13px] focus:border-social focus:outline-none"
      >
    </div>
    <p class="mt-2 max-w-3xl text-[13.5px] text-discret">
      Chaque page publiée apparaît ici dès sa création. Le panneau « Référencement et partage »
      s’ouvre depuis cette liste ou depuis l’onglet du même nom dans l’éditeur de la page — les deux
      modifient les mêmes champs.
    </p>

    <div v-if="data?.manquants.length || data?.doublons.titles.length || data?.doublons.descriptions.length"
         class="mt-5 rounded-[14px] border border-alerte bg-alerte-voile p-5 text-[13px] text-alerte">
      <p class="font-bold">Contrôles</p>
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

    <UiOnglets
      v-model="filtre"
      class="mt-5"
      :onglets="FILTRES.map((f) => ({ cle: f.valeur, libelle: f.libelle, compteur: compte(f.valeur), alerte: f.valeur === 'a-completer' && compte(f.valeur) > 0 }))"
    />

    <div class="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-[1fr_460px]">
      <div>
        <AdminTableauSimple :colonnes="['Page', 'Type', 'Title', 'Meta', 'Indexation', 'Action']">
          <tr v-for="entree in entrees" :key="entree.id" :class="selection?.id === entree.id && 'bg-fond-clair'">
            <td class="px-4 py-3">
              <p class="font-medium">{{ entree.libelle }}</p>
              <p class="font-mono text-[11.5px] text-discret">
                {{ publiee(entree) || entree.statut === 'annonce' ? entree.chemin : 'brouillon — slug à définir' }}
              </p>
            </td>
            <td class="px-4 py-3 text-[12.5px]">{{ libelleType(entree) }}</td>
            <td class="px-4 py-3 text-center">
              <span v-if="!publiee(entree) && !entree.seo.title" class="text-discret">—</span>
              <span v-else-if="entree.seo.title?.trim()" class="text-succes">✓</span>
              <span v-else class="text-[12px] font-bold text-alerte">Manquant</span>
            </td>
            <td class="px-4 py-3 text-center">
              <span v-if="!publiee(entree) && !entree.seo.metaDescription" class="text-discret">—</span>
              <span v-else-if="entree.seo.metaDescription?.trim()" class="text-succes">✓</span>
              <span v-else class="text-[12px] font-bold text-alerte">Manquante</span>
            </td>
            <td class="px-4 py-3">
              <span
                :class="[pastille, {
                  'bg-succes-voile text-succes': indexation(entree) === 'Autorisée',
                  'bg-[#fdeeee] text-erreur': indexation(entree) === 'Bloquée',
                  'bg-fond-voile text-discret': indexation(entree) === 'Désactivée',
                }]"
              >{{ indexation(entree) }}</span>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                class="text-[12.5px] underline"
                :class="incomplete(entree) ? 'font-bold text-alerte' : 'text-social'"
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

        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <UiBaseButton taille="sm" variante="contour" @click="exporter">Exporter la liste</UiBaseButton>
          <p class="text-[12.5px] text-discret">
            Les pages du tunnel d’achat, des dashboards et des espaces privés ne figurent pas ici :
            elles sont en noindex permanent et hors sitemap.
          </p>
        </div>

        <!-- Encarts pédagogiques de l'écran 23 -->
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <section class="rounded-[14px] border border-ligne-douce bg-white p-5 text-[13px]">
            <h2 class="font-title text-[17px] font-light">Où modifier le référencement</h2>
            <dl class="mt-3 space-y-2">
              <div>
                <dt class="font-bold">Depuis cette liste</dt>
                <dd class="text-texte">« Modifier » ouvre le panneau Référencement et partage de la page choisie, sans passer par son éditeur.</dd>
              </div>
              <div>
                <dt class="font-bold">Depuis l’éditeur</dt>
                <dd class="text-texte">L’onglet « Référencement et partage » est présent dans l’éditeur d’un module, d’un formateur, d’une page éditoriale et d’un article de blog.</dd>
              </div>
            </dl>
            <p class="mt-3 text-[12.5px] text-discret">
              Les deux chemins écrivent les mêmes champs : une modification faite dans l’éditeur
              d’article apparaît immédiatement dans cette liste, et inversement.
            </p>
          </section>
          <section class="rounded-[14px] border border-ligne-douce bg-white p-5 text-[13px]">
            <h2 class="font-title text-[17px] font-light">Qui peut modifier quoi</h2>
            <dl class="mt-3 space-y-2">
              <div>
                <dt class="font-bold">Contenu</dt>
                <dd class="text-texte">Mot-clé principal, Title, meta description, Open Graph, images et textes alternatifs.</dd>
              </div>
              <div>
                <dt class="font-bold">Avancé 🔒</dt>
                <dd class="text-texte">Slug d’une page publiée, autorisation d’indexation, canonical personnalisée.</dd>
              </div>
            </dl>
            <p class="mt-3 text-[12.5px] text-discret">
              Les deux droits se cochent à la création du compte administrateur (écran 07).
            </p>
          </section>
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
        <aside v-else class="rounded-[14px] border border-dashed border-ligne bg-white p-10 text-center text-[13px] text-discret">
          Sélectionnez une page pour éditer son référencement.
        </aside>

        <!-- État technique : ce que l'application maîtrise est affirmé, ce qui
             dépend d'un compte tiers est lu dans les réglages. -->
        <section v-if="data" class="rounded-[14px] border border-ligne-douce bg-white p-5 text-[13px]">
          <h2 class="font-title text-[17px] font-light">État technique</h2>
          <dl class="mt-3 space-y-2">
            <div class="flex justify-between gap-3">
              <dt class="text-discret">Sitemap XML</dt>
              <dd><a :href="data.technique.sitemap.chemin" target="_blank" class="underline">{{ data.technique.sitemap.urls }} URL</a> · à jour</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-discret">robots.txt</dt>
              <dd><a :href="data.technique.robots.chemin" target="_blank" class="underline">Sitemap déclaré</a></dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-discret">Search Console</dt>
              <dd :class="data.technique.searchConsole === 'Connectée' ? 'text-succes' : 'text-alerte'">
                <NuxtLink v-if="data.technique.searchConsole !== 'Connectée'" to="/admin/tracking" class="underline">À connecter</NuxtLink>
                <template v-else>Connectée</template>
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-discret">Redirections actives</dt>
              <dd>{{ data.technique.redirections }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-discret">Erreurs 404 (30 j)</dt>
              <dd>{{ data.technique.erreurs404 ?? ATTENTE }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  </div>
</template>
