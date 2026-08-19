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

const superieur = computed(() => data.value?.role === 'admin-superieur')

const filtre = ref('')
const entrees = computed(() =>
  (data.value?.entrees ?? []).filter(
    (e) => !filtre.value || e.type === filtre.value,
  ),
)

const selection = ref<Entree | null>(null)
const brouillon = reactive<SeoFields & { slug?: string }>({})
const message = ref('')
const enregistrement = ref(false)

function ouvrir(entree: Entree) {
  selection.value = entree
  message.value = ''
  Object.assign(brouillon, {
    motClePrincipal: entree.seo.motClePrincipal ?? '',
    title: entree.seo.title ?? '',
    metaDescription: entree.seo.metaDescription ?? '',
    ogTitle: entree.seo.ogTitle ?? '',
    ogDescription: entree.seo.ogDescription ?? '',
    ogImage: entree.seo.ogImage ?? '',
    slug: entree.chemin.split('/').pop() ?? '',
    indexable: entree.seo.indexable !== false,
    canonical: entree.seo.canonical ?? '',
  })
}

/** Alerte de doublon calculée en direct sur la saisie en cours. */
const doublonTitle = computed(() =>
  (data.value?.entrees ?? []).some(
    (e) => e.id !== selection.value?.id && !!brouillon.title && e.seo.title === brouillon.title,
  ),
)
const doublonDescription = computed(() =>
  (data.value?.entrees ?? []).some(
    (e) =>
      e.id !== selection.value?.id &&
      !!brouillon.metaDescription &&
      e.seo.metaDescription === brouillon.metaDescription,
  ),
)

const slugModifie = computed(
  () => !!selection.value && brouillon.slug !== selection.value.chemin.split('/').pop(),
)

async function enregistrer() {
  if (!selection.value) return
  if (slugModifie.value) {
    // Spec SEO §3 : confirmation obligatoire avant de modifier une URL déjà publiée.
    const ok = window.confirm(
      `Modifier l’URL publiée ${selection.value.chemin} ?\nUne redirection permanente sera créée automatiquement.`,
    )
    if (!ok) return
  }

  enregistrement.value = true
  try {
    await $fetch('/api/admin/referencement', {
      method: 'PUT',
      body: { id: selection.value.id, seo: { ...brouillon }, confirmationSlug: slugModifie.value },
    })
    message.value = 'Modifications enregistrées.'
    await refresh()
  } catch (e) {
    message.value = (e as { statusMessage?: string }).statusMessage ?? 'Enregistrement impossible.'
  } finally {
    enregistrement.value = false
  }
}
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

      <aside v-if="selection" class="space-y-4">
        <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="font-title text-lg">{{ selection.libelle }}</h2>
              <p class="font-mono text-xs text-discret">{{ selection.chemin }}</p>
            </div>
            <button class="text-xs text-discret underline" @click="selection = null">Fermer</button>
          </div>

          <form class="mt-5 space-y-4" @submit.prevent="enregistrer">
            <div>
              <label class="mb-1 block text-xs text-texte" for="mc">Mot-clé principal</label>
              <input id="mc" v-model="brouillon.motClePrincipal" class="w-full rounded-lg border border-ligne px-3 py-2 text-sm">
              <p class="mt-1 text-xs text-discret">Repère interne. Aucune balise meta keywords n’est générée.</p>
            </div>

            <div>
              <label class="mb-1 block text-xs text-texte" for="t">Title Google</label>
              <input id="t" v-model="brouillon.title" class="w-full rounded-lg border border-ligne px-3 py-2 text-sm">
              <p v-if="doublonTitle" class="mt-1 text-xs text-amber-600">
                Ce Title est déjà utilisé sur une autre page.
              </p>
            </div>

            <div>
              <label class="mb-1 block text-xs text-texte" for="md">Meta description</label>
              <textarea id="md" v-model="brouillon.metaDescription" rows="3" class="w-full rounded-lg border border-ligne px-3 py-2 text-sm" />
              <p v-if="doublonDescription" class="mt-1 text-xs text-amber-600">
                Cette Meta description est déjà utilisée sur une autre page.
              </p>
            </div>

            <fieldset class="rounded-lg border border-ligne-douce p-4">
              <legend class="px-1 text-xs text-texte">Partage social</legend>
              <div class="space-y-3">
                <div>
                  <label class="mb-1 block text-xs text-texte" for="ogt">Titre Open Graph</label>
                  <input id="ogt" v-model="brouillon.ogTitle" class="w-full rounded-lg border border-ligne px-3 py-2 text-sm">
                </div>
                <div>
                  <label class="mb-1 block text-xs text-texte" for="ogd">Description Open Graph</label>
                  <textarea id="ogd" v-model="brouillon.ogDescription" rows="2" class="w-full rounded-lg border border-ligne px-3 py-2 text-sm" />
                </div>
                <div>
                  <label class="mb-1 block text-xs text-texte" for="ogi">Image Open Graph</label>
                  <input id="ogi" v-model="brouillon.ogImage" placeholder="/images/og-…" class="w-full rounded-lg border border-ligne px-3 py-2 text-sm">
                </div>
              </div>
            </fieldset>

            <!-- Champs réservés à l'administrateur supérieur (spec SEO §3 et §13). -->
            <fieldset class="rounded-lg border p-4" :class="superieur ? 'border-ligne-douce' : 'border-ligne-douce opacity-60'">
              <legend class="px-1 text-xs text-texte">
                Réservé aux administrateurs supérieurs
              </legend>
              <div class="space-y-3">
                <div>
                  <label class="mb-1 block text-xs text-texte" for="slug">Slug / URL</label>
                  <input
                    id="slug"
                    v-model="brouillon.slug"
                    :disabled="!superieur || selection.slugVerrouille"
                    class="w-full rounded-lg border border-ligne px-3 py-2 font-mono text-sm disabled:bg-fond-clair"
                  >
                  <p v-if="slugModifie" class="mt-1 text-xs text-amber-600">
                    Une redirection permanente sera créée depuis l’ancienne URL.
                  </p>
                </div>
                <label class="flex items-center gap-2 text-sm">
                  <input v-model="brouillon.indexable" type="checkbox" :disabled="!superieur">
                  Indexation autorisée
                </label>
                <div>
                  <label class="mb-1 block text-xs text-texte" for="canon">Canonical personnalisée</label>
                  <input
                    id="canon"
                    v-model="brouillon.canonical"
                    :disabled="!superieur"
                    placeholder="Laisser vide — canonical automatique"
                    class="w-full rounded-lg border border-ligne px-3 py-2 text-sm disabled:bg-fond-clair"
                  >
                </div>
              </div>
            </fieldset>

            <UiBaseButton type="submit" class="w-full" taille="sm" :disabled="enregistrement">
              {{ enregistrement ? 'Enregistrement…' : 'Enregistrer' }}
            </UiBaseButton>
            <p v-if="message" class="text-xs text-texte">{{ message }}</p>
          </form>
        </div>

        <AdminApercuGoogle
          :title="brouillon.title || selection.libelle"
          :description="brouillon.metaDescription || ''"
          :chemin="selection.chemin"
        />
      </aside>

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
