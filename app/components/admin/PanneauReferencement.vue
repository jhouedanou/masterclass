<script setup lang="ts">
import type { SeoFields } from '#shared/types'

/**
 * Panneau « Référencement et partage » (planche C, écran 24 ; spec SEO §3).
 * Ouvert depuis la liste SEO, l'éditeur de module ou l'éditeur d'article :
 * les deux points d'entrée écrivent les mêmes champs, via la même API.
 */
const props = defineProps<{
  id: string
  libelle: string
  chemin: string
  seo: SeoFields
  slugVerrouille?: boolean
  /** Titles et descriptions des autres pages, pour signaler un doublon. */
  autres?: { id: string; libelle?: string; title?: string; metaDescription?: string }[]
  /** Redirections permanentes en place : celles qui pointent vers cette page
   *  constituent l'historique de son slug. */
  redirections?: { de: string; vers: string; creeeLe: string }[]
  /** Sans en-tête ni bouton « Fermer » quand le panneau vit dans un onglet. */
  integre?: boolean
  /** État de publication de la page, affiché en rappel : une page en brouillon
   *  ne sera pas indexée quoi qu'on règle ici. */
  statut?: string
}>()
const emit = defineEmits<{ fermer: []; enregistre: [] }>()

const auth = useAuthStore()
const superieur = computed(() => auth.estAdminSuperieur)

const brouillon = reactive<SeoFields & { slug?: string }>({})
watch(
  () => [props.id, props.seo] as const,
  () => {
    Object.assign(brouillon, {
      motClePrincipal: props.seo.motClePrincipal ?? '',
      title: props.seo.title ?? '',
      metaDescription: props.seo.metaDescription ?? '',
      ogTitle: props.seo.ogTitle ?? '',
      ogDescription: props.seo.ogDescription ?? '',
      ogImage: props.seo.ogImage ?? '',
      slug: props.chemin.split('/').pop() ?? '',
      indexable: props.seo.indexable !== false,
      canonical: props.seo.canonical ?? '',
    })
  },
  { immediate: true },
)

const message = ref('')
const enregistrement = ref(false)

/** Page dont le Title est identique, pour nommer la fiche dans l'alerte. */
const doublonTitle = computed(
  () =>
    (props.autres ?? []).find(
      (e) => e.id !== props.id && !!brouillon.title?.trim() && e.title?.trim() === brouillon.title?.trim(),
    ) ?? null,
)

/** Anciennes URL redirigées vers cette page (écran 24, « Historique du slug »). */
const historiqueSlug = computed(() =>
  (props.redirections ?? []).filter((r) => r.vers === props.chemin),
)
const dateCourte = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))

const etatPublication = computed<'Brouillon' | 'Publié' | 'À venir'>(() =>
  props.statut === 'disponible' || props.statut === 'publie'
    ? 'Publié'
    : props.statut === 'annonce'
      ? 'À venir'
      : 'Brouillon',
)
const doublonDescription = computed(() =>
  (props.autres ?? []).some(
    (e) => e.id !== props.id && !!brouillon.metaDescription && e.metaDescription === brouillon.metaDescription,
  ),
)
const slugModifie = computed(() => brouillon.slug !== props.chemin.split('/').pop())

async function enregistrer() {
  if (slugModifie.value) {
    // Spec SEO §3 : confirmation obligatoire avant de modifier une URL déjà publiée.
    const ok = window.confirm(
      `Modifier l’URL publiée ${props.chemin} ?\nUne redirection permanente sera créée automatiquement.`,
    )
    if (!ok) return
  }
  enregistrement.value = true
  message.value = ''
  try {
    await $fetch('/api/admin/referencement', {
      method: 'PUT',
      body: { id: props.id, seo: { ...brouillon }, confirmationSlug: slugModifie.value },
    })
    message.value = 'Modifications enregistrées.'
    emit('enregistre')
  } catch (e) {
    message.value = (e as { statusMessage?: string }).statusMessage ?? 'Enregistrement impossible.'
  } finally {
    enregistrement.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
      <div v-if="!integre" class="flex items-start justify-between gap-3">
        <div>
          <h2 class="font-title text-lg">{{ libelle }}</h2>
          <p class="font-mono text-xs text-discret">{{ chemin }}</p>
        </div>
        <button class="text-xs text-discret underline" @click="emit('fermer')">Fermer</button>
      </div>

      <form class="space-y-4" :class="integre ? '' : 'mt-5'" @submit.prevent="enregistrer">
        <div>
          <label class="mb-1 block text-xs text-texte" :for="`mc-${id}`">Mot-clé principal</label>
          <input :id="`mc-${id}`" v-model="brouillon.motClePrincipal" class="w-full rounded-lg border border-ligne px-3 py-2 text-sm">
          <p class="mt-1 text-xs text-discret">Repère interne. Il n’est jamais transmis comme balise de mots-clés.</p>
        </div>

        <div>
          <label class="mb-1 block text-xs text-texte" :for="`t-${id}`">Title Google</label>
          <input :id="`t-${id}`" v-model="brouillon.title" class="w-full rounded-lg border border-ligne px-3 py-2 text-sm">
          <p v-if="doublonTitle" class="mt-1 text-xs text-alerte">
            ⚠ Un Title identique existe sur la fiche « {{ doublonTitle.libelle ?? doublonTitle.title }} ». Différenciez les deux pages.
          </p>
        </div>

        <div>
          <label class="mb-1 block text-xs text-texte" :for="`md-${id}`">Meta description</label>
          <textarea :id="`md-${id}`" v-model="brouillon.metaDescription" rows="3" class="w-full rounded-lg border border-ligne px-3 py-2 text-sm" />
          <p v-if="doublonDescription" class="mt-1 text-xs text-amber-600">Cette Meta description est déjà utilisée sur une autre page.</p>
        </div>

        <fieldset class="rounded-lg border border-ligne-douce p-4">
          <legend class="px-1 text-xs text-texte">Partage social</legend>
          <div class="space-y-3">
            <div>
              <label class="mb-1 block text-xs text-texte" :for="`ogt-${id}`">Titre Open Graph</label>
              <input :id="`ogt-${id}`" v-model="brouillon.ogTitle" class="w-full rounded-lg border border-ligne px-3 py-2 text-sm">
            </div>
            <div>
              <label class="mb-1 block text-xs text-texte" :for="`ogd-${id}`">Description Open Graph</label>
              <textarea :id="`ogd-${id}`" v-model="brouillon.ogDescription" rows="2" class="w-full rounded-lg border border-ligne px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="mb-1 block text-xs text-texte" :for="`ogi-${id}`">Image Open Graph</label>
              <input :id="`ogi-${id}`" v-model="brouillon.ogImage" placeholder="/images/og-…" class="w-full rounded-lg border border-ligne px-3 py-2 text-sm">
            </div>
          </div>
        </fieldset>

        <!-- Champs réservés à l'administrateur supérieur (spec SEO §3 et §13). -->
        <fieldset class="rounded-lg border p-4" :class="superieur ? 'border-ligne-douce' : 'border-ligne-douce opacity-60'">
          <legend class="px-1 text-xs text-texte">Réservé aux administrateurs supérieurs 🔒</legend>
          <p class="mb-3 text-xs text-discret">Invisible pour les administrateurs de contenu.</p>
          <div class="space-y-3">
            <div>
              <label class="mb-1 block text-xs text-texte" :for="`slug-${id}`">Slug / URL</label>
              <input
                :id="`slug-${id}`"
                v-model="brouillon.slug"
                :disabled="!superieur || slugVerrouille"
                class="w-full rounded-lg border border-ligne px-3 py-2 font-mono text-sm disabled:bg-fond-clair"
              >
              <p v-if="slugModifie" class="mt-1 text-xs text-alerte">Une redirection permanente sera créée depuis l’ancienne URL.</p>
              <p v-else-if="!slugVerrouille" class="mt-1 text-xs text-discret">
                Cette URL est déjà publiée. Toute modification demande une confirmation : une redirection
                permanente est créée automatiquement et le sitemap, la canonical et les liens internes sont mis à jour.
              </p>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input v-model="brouillon.indexable" type="checkbox" :disabled="!superieur">
              Indexation autorisée
              <span class="text-xs text-discret">La page entre dans le sitemap.</span>
            </label>
            <div>
              <label class="mb-1 block text-xs text-texte" :for="`canon-${id}`">Canonical personnalisée</label>
              <input
                :id="`canon-${id}`"
                v-model="brouillon.canonical"
                :disabled="!superieur"
                placeholder="Laisser vide — canonical automatique"
                class="w-full rounded-lg border border-ligne px-3 py-2 text-sm disabled:bg-fond-clair"
              >
              <p class="mt-1 text-xs text-discret">Par défaut, la canonical reprend l’URL publique finale de la page.</p>
            </div>
            <div>
              <p class="text-xs text-texte">Historique du slug</p>
              <ul v-if="historiqueSlug.length" class="mt-1 space-y-1 text-xs text-discret">
                <li v-for="r in historiqueSlug" :key="r.de">
                  <span class="font-mono">{{ r.de }}</span> → modifié le {{ dateCourte(r.creeeLe) }} — redirection active
                </li>
              </ul>
              <p v-else class="mt-1 text-xs text-discret">Aucun changement d’URL depuis la publication.</p>
            </div>
          </div>
        </fieldset>

        <!-- Statut de publication et indexation (écran 24) -->
        <div class="rounded-lg border border-ligne-douce bg-fond-clair p-4 text-xs">
          <p class="text-texte">Statut de publication et indexation</p>
          <dl class="mt-2 space-y-1.5">
            <div
              v-for="regle in [
                { etat: 'Brouillon', texte: 'Non accessible publiquement, non indexable, absent du sitemap.' },
                { etat: 'Publié', texte: 'Indexable si l’option est activée, présent dans le sitemap, canonical automatique.' },
                { etat: 'À venir', texte: 'Fiche commerciale publiable seule ; indexation désactivée par défaut, activable par un administrateur supérieur si la page comporte un titre, une description, un public et une promesse.' },
              ]"
              :key="regle.etat"
              class="flex gap-2"
              :class="regle.etat === etatPublication ? 'text-encre' : 'text-discret'"
            >
              <dt class="w-[64px] shrink-0 font-bold">
                {{ regle.etat }}<span v-if="regle.etat === etatPublication" class="sr-only"> (état actuel)</span>
              </dt>
              <dd>{{ regle.texte }}</dd>
            </div>
          </dl>
          <p class="mt-3 text-texte">Contrôles avant publication</p>
          <p class="mt-1 text-discret">
            Title et Meta description exigés sur les pages prioritaires · alerte en cas de doublon · aperçu
            affiché sans blocage sur un nombre fixe de caractères.
          </p>
          <p class="mt-3 text-texte">Règles globales — automatiques</p>
          <p class="mt-1 text-discret">
            Sitemap XML généré et mis à jour à chaque publication, dépublication ou changement d’URL · sitemap
            déclaré dans robots.txt et soumis à la Search Console · données structurées JSON-LD générées depuis
            le contenu visible · image sociale par défaut au niveau global, surchargeable par page · aucune
            balise de mots-clés.
          </p>
        </div>

        <UiBaseButton type="submit" class="w-full" taille="sm" :disabled="enregistrement">
          {{ enregistrement ? 'Enregistrement…' : 'Enregistrer le référencement' }}
        </UiBaseButton>
        <p v-if="message" class="text-xs text-texte">{{ message }}</p>
      </form>
    </div>

    <AdminApercuGoogle
      :title="brouillon.title || libelle"
      :description="brouillon.metaDescription || ''"
      :chemin="chemin"
    />
  </div>
</template>
