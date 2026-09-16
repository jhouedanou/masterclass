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

/** Habillage de l'écran 24. */
const champ =
  'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-2.5 text-[13.5px] focus:border-social focus:outline-none disabled:bg-fond-clair disabled:text-discret'
const etiquette = 'mb-1.5 block text-[12.5px] font-bold'
const encadreAlerte =
  'rounded-[10px] border border-alerte-bordure bg-alerte-pale px-3.5 py-2.5 text-[12px] text-alerte-fonce'
const encadreErreur =
  'rounded-[10px] border border-erreur-bordure bg-erreur-voile px-3.5 py-2.5 text-[12px] text-erreur-fonce'

const REGLES = [
  { etat: 'Brouillon', pastille: 'bg-alerte-voile text-alerte', texte: 'Non accessible publiquement, non indexable, absent du sitemap.' },
  { etat: 'Publié', pastille: 'bg-succes-voile text-succes', texte: 'Indexable si l’option est activée, présent dans le sitemap, canonical automatique.' },
  { etat: 'À venir', pastille: 'bg-social-voile text-social', texte: 'Fiche commerciale publiable seule ; indexation désactivée par défaut, activable par un administrateur supérieur si la page comporte un titre, une description, un public et une promesse.' },
]
</script>

<template>
  <!--
    Écran 24 : deux colonnes. À gauche, le titre, le sélecteur de page et une
    carte de champs unique qui contient l'aperçu Google. À droite, trois cartes
    distinctes — droits avancés, statut de publication, et les règles globales
    sur fond sombre.
  -->
  <form class="grid items-start gap-5 lg:grid-cols-[1fr_360px]" @submit.prevent="enregistrer">
    <div>
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="font-title text-[22px] font-light">Référencement et partage</h1>
        <span class="rounded-full border border-ligne bg-white px-3.5 py-[7px] text-[12px] font-semibold">
          {{ libelle }}
        </span>
        <button v-if="!integre" type="button" class="ml-auto text-[12px] text-discret underline" @click="emit('fermer')">
          Fermer
        </button>
      </div>
      <p class="mt-1.5 text-[11.5px] text-discret">Champs éditables par les administrateurs de contenu.</p>

      <div class="mt-3 flex flex-col gap-3.5 rounded-[14px] border border-ligne-douce bg-white p-5">
        <label class="block">
          <span :class="etiquette">Mot-clé principal</span>
          <input :id="`mc-${id}`" v-model="brouillon.motClePrincipal" :class="champ">
          <span class="mt-1.5 block text-[11.5px] text-discret">
            Repère interne. Il n’est jamais transmis comme balise de mots-clés.
          </span>
        </label>

        <label class="block">
          <span :class="etiquette">Title Google</span>
          <input :id="`t-${id}`" v-model="brouillon.title" :class="champ">
        </label>
        <p v-if="doublonTitle" :class="encadreAlerte">
          ⚠ Un Title identique existe sur la fiche «&nbsp;{{ doublonTitle.libelle ?? doublonTitle.title }}&nbsp;».
          Différenciez les deux pages.
        </p>

        <label class="block">
          <span :class="etiquette">Meta description</span>
          <textarea :id="`md-${id}`" v-model="brouillon.metaDescription" rows="3" :class="champ" />
        </label>
        <p v-if="doublonDescription" :class="encadreAlerte">
          Cette Meta description est déjà utilisée sur une autre page.
        </p>

        <AdminApercuGoogle
          :title="brouillon.title || libelle"
          :description="brouillon.metaDescription || ''"
          :chemin="chemin"
        />

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span :class="etiquette">Titre Open Graph</span>
            <input :id="`ogt-${id}`" v-model="brouillon.ogTitle" :class="champ">
          </label>
          <label class="block">
            <span :class="etiquette">Description Open Graph</span>
            <input :id="`ogd-${id}`" v-model="brouillon.ogDescription" :class="champ">
          </label>
        </div>

        <!-- Image sociale : rangée pointillée, vignette à gauche, champ et
             bouton à droite (écran 24). -->
        <div class="flex flex-wrap items-center gap-3 rounded-[12px] border-[1.5px] border-dashed border-ligne-pointillee p-3.5">
          <span class="h-[54px] w-24 shrink-0 overflow-hidden rounded-[8px] bg-fond-voile">
            <img v-if="brouillon.ogImage" :src="brouillon.ogImage" alt="" class="size-full object-cover">
          </span>
          <span class="min-w-[200px] flex-1 text-[12px] leading-[1.5] text-texte">
            <b>Image Open Graph</b> — 1200×630. Sans image dédiée, l’image principale de la page est
            reprise. Aperçu WhatsApp, Facebook et LinkedIn.
          </span>
          <label class="w-full sm:w-[220px]">
            <span class="sr-only">Chemin de l’image Open Graph</span>
            <input :id="`ogi-${id}`" v-model="brouillon.ogImage" placeholder="/images/og-…" :class="champ">
          </label>
        </div>

        <p class="text-[11.5px] leading-[1.6] text-discret">
          Sans personnalisation : le Title reprend «&nbsp;[Titre de la page] | E-Masterclass Big
          Five&nbsp;», la Meta description est générée depuis le résumé éditorial puis reste
          modifiable, l’Open Graph reprend le Title, la description et l’image principale.
        </p>

        <div>
          <UiBaseButton type="submit" taille="sm" :disabled="enregistrement">
            {{ enregistrement ? 'Enregistrement…' : 'Enregistrer le référencement' }}
          </UiBaseButton>
          <p v-if="message" class="mt-2 text-[12.5px] text-succes">{{ message }}</p>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <!-- Droits avancés : carte bordée de violet, jamais fondue dans le reste. -->
      <section class="rounded-[14px] border-[1.5px] border-social bg-white p-5" :class="!superieur && 'opacity-60'">
        <div class="flex items-center justify-between gap-2">
          <b class="text-[14px]">Réservé aux administrateurs supérieurs</b>
          <span aria-hidden="true">🔒</span>
        </div>
        <p class="mt-1 text-[11.5px] text-discret">Invisible pour les administrateurs de contenu.</p>

        <div class="mt-3.5 flex flex-col gap-3.5">
          <label class="block">
            <span :class="etiquette">Slug / URL</span>
            <input
              :id="`slug-${id}`"
              v-model="brouillon.slug"
              :disabled="!superieur || slugVerrouille"
              :class="[champ, 'font-mono']"
            >
          </label>
          <p v-if="slugModifie" :class="encadreErreur">
            Une redirection permanente sera créée depuis l’ancienne URL.
          </p>
          <p v-else-if="!slugVerrouille" :class="encadreErreur">
            Cette URL est déjà publiée. Toute modification demande une confirmation : une
            redirection permanente est créée automatiquement et le sitemap, la canonical et les
            liens internes sont mis à jour.
          </p>

          <div class="rounded-[12px] border border-ligne-douce px-4 py-3.5">
            <!-- `indexable` peut arriver indéfini d'une page jamais réglée ;
                 l'interrupteur, lui, veut un booléen net. -->
            <UiInterrupteur
              :model-value="brouillon.indexable === true"
              @update:model-value="brouillon.indexable = $event"
              libelle="Indexation autorisée"
              description="La page entre dans le sitemap."
              :disabled="!superieur"
            />
          </div>

          <label class="block">
            <span :class="etiquette">Canonical personnalisée</span>
            <input
              :id="`canon-${id}`"
              v-model="brouillon.canonical"
              :disabled="!superieur"
              placeholder="Cas exceptionnel uniquement"
              :class="champ"
            >
            <span class="mt-1.5 block text-[11.5px] text-discret">
              Par défaut, la canonical reprend l’URL publique finale de la page.
            </span>
          </label>

          <div class="rounded-[12px] border border-ligne-douce px-4 py-3.5 text-[12px]">
            <b class="block">Historique du slug</b>
            <ul v-if="historiqueSlug.length" class="mt-1 space-y-1 text-discret">
              <li v-for="r in historiqueSlug" :key="r.de">
                <span class="font-mono">{{ r.de }}</span> → modifié le {{ dateCourte(r.creeeLe) }}
                — redirection active
              </li>
            </ul>
            <p v-else class="mt-1 text-discret">Aucun changement d’URL depuis la publication.</p>
          </div>
        </div>
      </section>

      <section class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <b class="text-[14px]">Statut de publication et indexation</b>
        <div class="mt-3 flex flex-col gap-2.5 text-[12px] leading-[1.5]">
          <div
            v-for="regle in REGLES"
            :key="regle.etat"
            class="flex gap-2.5"
            :class="regle.etat === etatPublication ? 'text-texte' : 'text-discret'"
          >
            <span class="shrink-0 rounded-full px-2.5 py-[3px] text-[11px] font-bold" :class="regle.pastille">
              {{ regle.etat }}
            </span>
            <span>{{ regle.texte }}</span>
          </div>
        </div>
        <div class="mt-3.5 border-t border-ligne-claire pt-3.5 text-[12px] leading-[1.5]">
          <b>Contrôles avant publication</b>
          <p class="mt-1 text-discret">
            Title et Meta description exigés sur les pages prioritaires · alerte en cas de doublon ·
            aperçu affiché sans blocage sur un nombre fixe de caractères.
          </p>
        </div>
      </section>

      <!-- Règles globales : carte sombre dans la maquette. -->
      <section class="sur-sombre rounded-[14px] bg-encre p-5 text-white">
        <b class="text-[14px]">Règles globales — automatiques</b>
        <p class="mt-2 text-[12px] leading-[1.6] text-gris-perle">
          Sitemap XML généré et mis à jour à chaque publication, dépublication ou changement d’URL ·
          sitemap déclaré dans robots.txt et soumis à la Search Console · données structurées JSON-LD
          générées depuis le contenu visible · image sociale par défaut au niveau global,
          surchargeable par page · aucune balise de mots-clés.
        </p>
      </section>
    </div>
  </form>
</template>
