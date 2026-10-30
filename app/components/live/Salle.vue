<script setup lang="ts">
import type { AutorisationZoom } from '~/composables/useZoom'
import { dateLongueLive, dureeLive, heureLive } from '#shared/utils/live'

/**
 * Salle d'une Live Session (option B du CDC, 10.G) : le Meeting SDK de Zoom
 * dans la plateforme, comme la salle des coachings (useZoom). L'inscrit
 * entre 15 minutes avant le début, le formateur et le modérateur 30 minutes
 * avant (§4.4). Aucun lien Zoom n'est affiché à l'inscrit : seul l'hôte a un
 * lien de secours vers l'application.
 */
const props = defineProps<{ id: string; espace: 'apprenant' | 'formateur' }>()

const { data, error } = await useFetch<{
  id: string
  slug: string
  titre: string
  moduleSlug: string
  formateur: string
  debut: string
  dureeMinutes: number
  statut: string
  role: 'hote' | 'participant'
  ouverture: string
  fermeture: string
}>(() => `/api/mon-espace/live-sessions/${props.id}`)

if (!data.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: error.value?.statusMessage ?? 'Live Session introuvable',
    fatal: true,
  })
}
usePagePrivee(`Live Session · ${data.value.titre}`)

const retour = computed(() => (props.espace === 'formateur' ? '/formateur/live-sessions' : '/mon-espace'))
const zoom = useZoom()
const racine = ref<HTMLElement | null>(null)
const autorisation = ref<AutorisationZoom | null>(null)
const erreurEntree = ref('')

const maintenant = ref(Date.now())
let horloge: ReturnType<typeof setInterval> | undefined
onMounted(() => (horloge = setInterval(() => (maintenant.value = Date.now()), 1000)))
onBeforeUnmount(() => {
  clearInterval(horloge)
  void zoom.quitter()
})

const ouverture = computed(() => new Date(data.value!.ouverture).getTime())
const fermeture = computed(() => new Date(data.value!.fermeture).getTime())
const debut = computed(() => new Date(data.value!.debut).getTime())
const ouverte = computed(() => maintenant.value >= ouverture.value && maintenant.value <= fermeture.value)
const fermee = computed(() => maintenant.value > fermeture.value || data.value!.statut === 'terminee')
const enDirect = computed(() => maintenant.value >= debut.value && !fermee.value)
/** « Ouverture dans 02:14:05 » tant que la salle est fermée. */
const avantOuverture = computed(() => {
  const s = Math.max(0, Math.floor((ouverture.value - maintenant.value) / 1000))
  const j = Math.floor(s / 86400)
  const hms = [Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':')
  return j ? `${j} j ${hms}` : hms
})

async function entrer() {
  erreurEntree.value = ''
  try {
    autorisation.value = await $fetch<AutorisationZoom>('/api/zoom/signature', {
      method: 'POST',
      body: { sessionLiveId: data.value!.id },
    })
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreurEntree.value = r.data?.statusMessage ?? r.statusMessage ?? 'Entrée impossible pour le moment.'
    return
  }
  if (autorisation.value.mode === 'simulation') {
    zoom.etat.value = 'en-salle'
    return
  }
  await nextTick()
  if (racine.value) await zoom.rejoindre(racine.value, autorisation.value, { retour: retour.value })
}

async function quitter() {
  await zoom.quitter()
  await navigateTo(retour.value)
}
</script>

<template>
  <div v-if="data" class="sur-sombre flex min-h-screen flex-col bg-encre text-white">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-encre-800 px-4 py-3 lg:px-6">
      <div class="min-w-0">
        <p class="text-[11.5px] font-bold tracking-[0.12em] text-live-pastel uppercase">Live Session</p>
        <p class="truncate font-title text-[17px] font-light">{{ data.titre }}</p>
        <p class="text-[12.5px] text-nuit-discret">
          {{ data.formateur }} · {{ dateLongueLive(data.debut) }} · {{ heureLive(data.debut) }} GMT · {{ dureeLive(data.dureeMinutes) }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span
          class="rounded-full px-3 py-1.5 font-mono text-[12px] font-bold"
          :class="enDirect ? 'bg-[#3a1f22] text-live-pastel' : 'bg-encre-800 text-nuit-clair'"
        >
          <template v-if="fermee">TERMINÉE</template>
          <template v-else-if="enDirect">● EN DIRECT</template>
          <template v-else>À VENIR</template>
        </span>
        <NuxtLink :to="retour" class="text-[13.5px] text-nuit-clair hover:text-white">← Retour</NuxtLink>
      </div>
    </header>

    <div
      v-if="zoom.etat.value === 'inactif' || zoom.etat.value === 'erreur' || zoom.etat.value === 'termine'"
      class="grid flex-1 place-items-center p-6"
    >
      <div class="w-full max-w-lg rounded-carte bg-encre-800 p-8 text-center">
        <p class="font-title text-[24px] font-light">
          {{ data.role === 'hote' ? 'Animer la session' : 'Rejoindre la session' }}
        </p>
        <p class="mt-3 text-[14px] leading-relaxed text-nuit-clair">
          <template v-if="fermee">Cette session est terminée. Le quiz et le support vous attendent dans votre espace.</template>
          <template v-else-if="ouverte">
            La salle est ouverte. Vous ne quittez pas la plateforme ;
            <template v-if="data.role === 'participant'">votre micro reste coupé pendant la formation, les questions-réponses ont lieu aux moments indiqués.</template>
            <template v-else>micro et caméra vous seront demandés à l’entrée.</template>
          </template>
          <template v-else>
            La salle ouvre {{ data.role === 'hote' ? '30' : '15' }} minutes avant le début.
            <span class="mt-2 block font-mono text-[22px] text-white" aria-live="off">{{ avantOuverture }}</span>
          </template>
        </p>
        <p v-if="erreurEntree" class="mt-3 text-[13.5px] text-live-pastel" role="alert">{{ erreurEntree }}</p>
        <p v-if="zoom.etat.value === 'erreur'" class="mt-3 text-[13.5px] text-live-pastel" role="alert">{{ zoom.message.value }}</p>
        <UiBaseButton v-if="!fermee" class="mt-6" variante="live" taille="lg" :disabled="!ouverte" @click="entrer">
          {{ data.role === 'hote' ? 'Animer sur Zoom' : 'Entrer dans la salle' }}
        </UiBaseButton>
        <UiBaseButton v-else class="mt-6" variante="blanc" taille="lg" :to="retour">Retour à mon espace</UiBaseButton>
        <p v-if="data.role === 'hote'" class="mt-6 text-[12.5px] text-nuit-discret">
          Un problème de connexion ?
          <a v-if="autorisation?.lienSecours" :href="autorisation.lienSecours" target="_blank" rel="noopener" class="underline">Ouvrir dans l’application Zoom</a>
          <span v-else>Le lien de secours vers l’application Zoom apparaît une fois l’entrée autorisée.</span>
        </p>
        <p v-else class="mt-6 text-[12.5px] text-nuit-discret">
          Un problème de connexion ? Rechargez la page, ou utilisez Chrome, Edge, Safari ou Firefox à jour.
        </p>
      </div>
    </div>

    <div v-else class="flex flex-1 flex-col p-4 lg:p-6">
      <p v-if="zoom.etat.value === 'verification' || zoom.etat.value === 'connexion'" class="mb-3 text-[13px] text-nuit-clair">
        {{ zoom.etat.value === 'verification' ? 'Vérification de la compatibilité de votre navigateur…' : 'Connexion à la salle…' }}
        {{ zoom.message.value }}
      </p>
      <div
        ref="racine"
        class="relative mx-auto min-h-[320px] w-full max-w-[1100px] overflow-hidden rounded-carte bg-black"
        :class="autorisation?.mode === 'live' ? 'aspect-16/9' : ''"
      >
        <div v-if="autorisation?.mode === 'simulation'" class="grid aspect-16/9 place-items-center text-[14px] text-nuit-clair">
          <span>{{ data.formateur }} — formateur 🎙</span>
          <p class="absolute top-3 left-3 rounded bg-black/50 px-2 py-1 text-[11px] text-white/70">Salle simulée (ZOOM_MODE=simulation)</p>
        </div>
      </div>
      <div class="mt-3 text-center">
        <button type="button" class="rounded-full bg-erreur px-4 py-2 text-[13px] font-bold" @click="quitter">Quitter</button>
      </div>
    </div>
  </div>
</template>
