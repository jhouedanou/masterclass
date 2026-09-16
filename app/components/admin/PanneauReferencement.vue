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

// Écran 24 : filets de 1,5 px, chemise 12/14, étiquettes 12,5 px en gras.
const champ =
  'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-3 text-[13.5px] focus:border-social focus:outline-none'
const etiquette = 'mb-1.5 block text-[12.5px] font-bold'
const encartAlerte =
  'rounded-[10px] border border-alerte-bordure bg-alerte-voile px-3.5 py-[11px] text-[12px] leading-[1.5] text-alerte-fonce'

/** Les trois états que l'écran 24 rappelle, chacun sous sa pastille. */
const REGLES = [
  {
    etat: 'Brouillon',
    pastille: 'bg-alerte-voile text-alerte',
    texte: 'Non accessible publiquement, non indexable, absent du sitemap.',
  },
  {
    etat: 'Publié',
    pastille: 'bg-succes-voile text-succes',
    texte: 'Indexable si l’option est activée, présent dans le sitemap, canonical automatique.',
  },
  {
    etat: 'À venir',
    pastille: 'bg-social-voile text-social',
    texte:
      'Fiche commerciale publiable seule ; indexation désactivée par défaut, activable par un administrateur supérieur si la page comporte un titre, une description, un public et une promesse.',
  },
]

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
  <div class="flex flex-col gap-4">
    <!-- Carte « contenu » de l'écran 24 : les champs que tout administrateur
         de contenu peut écrire. -->
    <div class="rounded-[14px] border border-ligne-douce bg-white p-[22px]">
      <div v-if="!integre" class="mb-3.5 flex items-start justify-between gap-3">
        <div>
          <h2 class="font-sans text-[15px] font-bold">{{ libelle }}</h2>
          <p class="font-mono text-[11px] text-discret">{{ chemin }}</p>
        </div>
        <button class="text-[12.5px] font-bold text-discret" @click="emit('fermer')">Fermer</button>
      </div>
      <p v-if="!integre" class="mb-3.5 text-[12.5px] text-discret">
        Champs éditables par les administrateurs de contenu.
      </p>

      <form class="flex flex-col gap-3" @submit.prevent="enregistrer">
        <label class="block" :for="`mc-${id}`">
          <span :class="etiquette">Mot-clé principal</span>
          <input :id="`mc-${id}`" v-model="brouillon.motClePrincipal" :class="champ">
          <span class="mt-1.5 block text-[11.5px] font-normal text-discret">
            Repère interne. Il n’est jamais transmis comme balise de mots-clés.
          </span>
        </label>

        <label class="block" :for="`t-${id}`">
          <span :class="etiquette">Title Google</span>
          <input :id="`t-${id}`" v-model="brouillon.title" :class="champ">
        </label>
        <p v-if="doublonTitle" :class="encartAlerte">
          ⚠ Un Title identique existe sur la fiche « {{ doublonTitle.libelle ?? doublonTitle.title }} ».
          Différenciez les deux pages.
        </p>

        <label class="block" :for="`md-${id}`">
          <span :class="etiquette">Meta description</span>
          <textarea :id="`md-${id}`" v-model="brouillon.metaDescription" rows="3" :class="champ" />
        </label>
        <p v-if="doublonDescription" :class="encartAlerte">
          ⚠ Cette Meta description est déjà utilisée sur une autre page.
        </p>

        <AdminApercuGoogle
          :title="brouillon.title || libelle"
          :description="brouillon.metaDescription || ''"
          :chemin="chemin"
        />

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block" :for="`ogt-${id}`">
            <span :class="etiquette">Titre Open Graph</span>
            <input :id="`ogt-${id}`" v-model="brouillon.ogTitle" :class="champ">
          </label>
          <label class="block" :for="`ogd-${id}`">
            <span :class="etiquette">Description Open Graph</span>
            <input :id="`ogd-${id}`" v-model="brouillon.ogDescription" :class="champ">
          </label>
        </div>

        <div class="rounded-[12px] border-[1.5px] border-dashed border-ligne-pointillee p-3.5">
          <p class="text-[12.5px] leading-[1.6] text-texte">
            <b>Image Open Graph</b> — 1200×630. Sans image dédiée, l’image principale de la page est
            reprise. Aperçu WhatsApp, Facebook et LinkedIn.
          </p>
          <label class="mt-2.5 block" :for="`ogi-${id}`">
            <span class="sr-only">Chemin de l’image Open Graph</span>
            <input :id="`ogi-${id}`" v-model="brouillon.ogImage" placeholder="/images/og-…" :class="champ">
          </label>
        </div>

        <p class="text-[12px] leading-[1.6] text-discret">
          Sans personnalisation : le Title reprend « [Titre de la page] | E-Masterclass Big Five »,
          la Meta description est générée depuis le résumé éditorial puis reste modifiable,
          l’Open Graph reprend le Title, la description et l’image principale.
        </p>

        <UiBaseButton type="submit" class="w-full" taille="sm" :disabled="enregistrement">
          {{ enregistrement ? 'Enregistrement…' : 'Enregistrer le référencement' }}
        </UiBaseButton>
        <p v-if="message" class="text-[12px] text-texte">{{ message }}</p>
      </form>
    </div>

    <!-- Champs réservés à l'administrateur supérieur (spec SEO §3 et §13) :
         la maquette cercle cette carte de violet pour la distinguer. -->
    <div class="rounded-[14px] border-[1.5px] border-social bg-white p-6" :class="!superieur && 'opacity-60'">
      <div class="flex items-center justify-between gap-3">
        <h3 class="font-sans text-[15px] font-bold">Réservé aux administrateurs supérieurs</h3>
        <span class="text-[12px]" aria-hidden="true">🔒</span>
      </div>
      <p class="mt-1.5 mb-4 text-[12.5px] text-discret">Invisible pour les administrateurs de contenu.</p>

      <div class="flex flex-col gap-3">
        <label class="block" :for="`slug-${id}`">
          <span :class="etiquette">Slug / URL</span>
          <input
            :id="`slug-${id}`"
            v-model="brouillon.slug"
            :disabled="!superieur || slugVerrouille"
            :class="[champ, 'font-mono text-[13px] disabled:bg-fond-clair']"
          >
        </label>
        <p v-if="slugModifie" :class="encartAlerte">
          Une redirection permanente sera créée depuis l’ancienne URL.
        </p>
        <p v-else-if="!slugVerrouille" class="rounded-[10px] border border-erreur-bordure bg-erreur-voile px-3.5 py-[11px] text-[12px] leading-[1.5] text-erreur-fonce">
          Cette URL est déjà publiée. Toute modification demande une confirmation : une redirection
          permanente est créée automatiquement et le sitemap, la canonical et les liens internes
          sont mis à jour.
        </p>

        <label class="flex items-center justify-between gap-3 rounded-[12px] border border-ligne-douce px-4 py-3.5 text-[13px]">
          <span>
            <b>Indexation autorisée</b>
            <span class="block text-[11.5px] font-normal text-discret">La page entre dans le sitemap.</span>
          </span>
          <input v-model="brouillon.indexable" type="checkbox" :disabled="!superieur" class="size-4 shrink-0 accent-whatsapp">
        </label>

        <label class="block" :for="`canon-${id}`">
          <span :class="etiquette">Canonical personnalisée</span>
          <input
            :id="`canon-${id}`"
            v-model="brouillon.canonical"
            :disabled="!superieur"
            placeholder="Cas exceptionnel uniquement"
            :class="[champ, 'font-mono text-[13px] disabled:bg-fond-clair']"
          >
          <span class="mt-1.5 block text-[11.5px] font-normal text-discret">
            Par défaut, la canonical reprend l’URL publique finale de la page.
          </span>
        </label>

        <div class="rounded-[12px] border border-ligne-douce px-4 py-3.5 text-[12.5px] leading-[1.7] text-texte">
          <b class="mb-1.5 block">Historique du slug</b>
          <template v-if="historiqueSlug.length">
            <p v-for="r in historiqueSlug" :key="r.de">
              <span class="font-mono">{{ r.de }}</span> → modifié le {{ dateCourte(r.creeeLe) }} —
              redirection active
            </p>
          </template>
          <p v-else class="text-discret">Aucun changement d’URL depuis la publication.</p>
        </div>
      </div>
    </div>

    <!-- Statut de publication et indexation (écran 24) -->
    <div class="rounded-[14px] border border-ligne-douce bg-white p-6">
      <h3 class="font-sans text-[15px] font-bold">Statut de publication et indexation</h3>
      <dl class="mt-3.5 flex flex-col gap-2.5 text-[12.5px] leading-[1.6] text-texte">
        <div
          v-for="regle in REGLES"
          :key="regle.etat"
          class="flex items-start gap-2.5"
          :class="regle.etat !== etatPublication && 'opacity-60'"
        >
          <dt class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap" :class="regle.pastille">
            {{ regle.etat }}<span v-if="regle.etat === etatPublication" class="sr-only"> (état actuel)</span>
          </dt>
          <dd>{{ regle.texte }}</dd>
        </div>
      </dl>
      <div class="mt-4 border-t border-ligne-claire pt-3.5 text-[12.5px] leading-[1.7] text-texte">
        <b class="mb-1.5 block">Contrôles avant publication</b>
        Title et Meta description exigés sur les pages prioritaires · alerte en cas de doublon ·
        aperçu affiché sans blocage sur un nombre fixe de caractères.
      </div>
    </div>

    <div class="rounded-[14px] bg-encre p-6 text-white">
      <h3 class="font-sans text-[15px] font-bold text-white">Règles globales — automatiques</h3>
      <p class="mt-3 text-[12.5px] leading-[1.8] text-gris-perle">
        Sitemap XML généré et mis à jour à chaque publication, dépublication ou changement d’URL ·
        sitemap déclaré dans robots.txt et soumis à la Search Console · données structurées JSON-LD
        générées depuis le contenu visible · image sociale par défaut au niveau global,
        surchargeable par page · aucune balise de mots-clés.
      </p>
    </div>
  </div>
</template>
