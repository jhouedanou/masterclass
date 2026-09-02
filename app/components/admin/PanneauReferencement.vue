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
  autres?: { id: string; title?: string; metaDescription?: string }[]
  /** Sans en-tête ni bouton « Fermer » quand le panneau vit dans un onglet. */
  integre?: boolean
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

const doublonTitle = computed(() =>
  (props.autres ?? []).some((e) => e.id !== props.id && !!brouillon.title && e.title === brouillon.title),
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
          <p class="mt-1 text-xs text-discret">Repère interne. Aucune balise meta keywords n’est générée.</p>
        </div>

        <div>
          <label class="mb-1 block text-xs text-texte" :for="`t-${id}`">Title Google</label>
          <input :id="`t-${id}`" v-model="brouillon.title" class="w-full rounded-lg border border-ligne px-3 py-2 text-sm">
          <p v-if="doublonTitle" class="mt-1 text-xs text-amber-600">Ce Title est déjà utilisé sur une autre page.</p>
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
          <legend class="px-1 text-xs text-texte">Réservé aux administrateurs supérieurs</legend>
          <div class="space-y-3">
            <div>
              <label class="mb-1 block text-xs text-texte" :for="`slug-${id}`">Slug / URL</label>
              <input
                :id="`slug-${id}`"
                v-model="brouillon.slug"
                :disabled="!superieur || slugVerrouille"
                class="w-full rounded-lg border border-ligne px-3 py-2 font-mono text-sm disabled:bg-fond-clair"
              >
              <p v-if="slugModifie" class="mt-1 text-xs text-amber-600">Une redirection permanente sera créée depuis l’ancienne URL.</p>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input v-model="brouillon.indexable" type="checkbox" :disabled="!superieur">
              Indexation autorisée
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
            </div>
          </div>
        </fieldset>

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
