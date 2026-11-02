<script setup lang="ts">
import type { Formateur, LiveSession, Module } from '#shared/types'

const route = useRoute()
const auth = useAuthStore()
const { annoncer } = useToasts()

const { data, error, refresh } = await useFetch<{
  live: LiveSession
  passee: boolean
  formateur: Formateur | null
  modules: Module[]
  inscrit: boolean
  connecte: boolean
}>(() => `/api/live-sessions/${route.params.slug}`)

if (!data.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: error.value?.statusMessage ?? 'Live Session introuvable',
    fatal: true,
  })
}

const live = computed(() => data.value!.live)
const formateur = computed(() => data.value!.formateur)

usePageSeo({
  titreAuto: `${live.value.titre} — Live Session | E-Masterclass Big Five`,
  descriptionAuto: live.value.resume || live.value.description.slice(0, 160),
  imageAuto: live.value.image || formateur.value?.photo,
  chemin: `/live-sessions/${live.value.slug}`,
})

const mailles = [
  { libelle: 'Accueil', chemin: '/' },
  { libelle: 'Live Sessions', chemin: '/live-sessions' },
  { libelle: live.value.titre },
]
useFilAriane(mailles)

const complet = computed(() => live.value.inscrits >= live.value.places)
const payante = computed(() => live.value.prixFcfa > 0)
const annulee = computed(() => live.value.statut === 'annulee')
const salle = computed(() => `/mon-espace/session/${live.value.id}`)

const envoi = ref(false)
async function inscrire() {
  if (!auth.estConnecte) {
    await navigateTo(`/connexion?suite=${encodeURIComponent(route.fullPath)}`)
    return
  }
  envoi.value = true
  try {
    await $fetch(`/api/live-sessions/${live.value.slug}/inscription`, { method: 'POST' })
    annoncer('Inscription confirmée : le lien de la salle vous a été envoyé par e-mail.', 'succes')
    await refresh()
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    annoncer(err.data?.statusMessage ?? err.statusMessage ?? 'L’inscription a échoué. Réessayez.', 'erreur')
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <div v-if="data">
    <section class="rayures-social border-b border-ligne-claire">
      <div class="conteneur py-12">
        <FilAriane :mailles="mailles" class="mb-6" />
        <UiSurtitre ton="social" taille="section">Live Session</UiSurtitre>
        <h1 class="mt-3 max-w-[900px] text-[38px] leading-tight font-medium lg:text-[42px]">{{ live.titre }}</h1>
        <p v-if="live.resume" class="mt-4 max-w-prose text-[17px] leading-relaxed text-texte">{{ live.resume }}</p>
      </div>
    </section>

    <section class="py-12">
      <div class="conteneur grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div class="max-w-prose">
          <template v-if="live.objectifs.length">
            <h2 class="font-title text-[24px] font-light">Ce que vous allez apprendre</h2>
            <ul class="mt-4 grid gap-2.5 text-[15.5px] leading-relaxed text-texte">
              <li v-for="o in live.objectifs" :key="o" class="flex gap-3">
                <Icon name="ph:check-circle" size="20" class="mt-0.5 shrink-0 text-social" />{{ o }}
              </li>
            </ul>
          </template>

          <template v-if="live.prerequis.length">
            <h2 class="mt-10 font-title text-[24px] font-light">Prérequis</h2>
            <ul class="mt-4 grid gap-2.5 text-[15.5px] leading-relaxed text-texte">
              <li v-for="p in live.prerequis" :key="p" class="flex gap-3">
                <Icon name="ph:arrow-right" size="18" class="mt-1 shrink-0 text-discret" />{{ p }}
              </li>
            </ul>
          </template>

          <p v-if="live.description" class="mt-10 text-[15.5px] leading-relaxed whitespace-pre-line text-texte">
            {{ live.description }}
          </p>

          <template v-if="formateur">
            <h2 class="mt-10 font-title text-[24px] font-light">Votre formateur</h2>
            <NuxtLink :to="`/formateurs/${formateur.slug}`" class="mt-4 flex items-center gap-4 rounded-carte border border-ligne-douce p-5 hover:border-encre">
              <img
                :src="formateur.photo"
                :alt="formateur.photoAlt || `Portrait de ${formateur.nom}`"
                class="size-16 rounded-full object-cover"
                width="64"
                height="64"
              >
              <span>
                <span class="block text-[17px] font-bold">{{ formateur.nom }}</span>
                <span class="block text-[14px] text-texte">{{ formateur.expertise }}</span>
              </span>
            </NuxtLink>
          </template>
        </div>

        <aside class="h-fit rounded-carte border border-ligne-douce bg-fond-clair p-6 lg:sticky lg:top-6">
          <dl class="grid gap-3 text-[15px]">
            <div class="flex justify-between gap-4"><dt class="text-discret">Date</dt><dd class="font-bold">{{ formatDate(live.date) }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-discret">Heure</dt><dd class="font-bold">{{ live.heure }} (Abidjan)</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-discret">Durée</dt><dd class="font-bold">{{ formatDuree(live.dureeMinutes) }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-discret">Format</dt><dd class="font-bold">Zoom, depuis la plateforme</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-discret">Places</dt><dd class="font-bold">{{ live.places - live.inscrits }} restantes</dd></div>
            <div class="flex justify-between gap-4 border-t border-ligne-claire pt-3">
              <dt class="text-discret">Prix</dt>
              <dd class="text-[20px] font-extrabold">{{ payante ? formatFcfa(live.prixFcfa) : 'Gratuit' }}</dd>
            </div>
          </dl>

          <div class="mt-6">
            <p v-if="annulee" class="rounded-[10px] bg-white p-3 text-[14px] text-erreur">Cette Live Session est annulée.</p>
            <p v-else-if="data.passee" class="rounded-[10px] bg-white p-3 text-[14px] text-texte">Cette Live Session a eu lieu.</p>
            <template v-else-if="data.inscrit">
              <p class="mb-3 text-[14px] text-succes">Vous êtes inscrit. Le lien de la salle vous a été envoyé par e-mail.</p>
              <UiBaseButton :to="salle" class="w-full">Accéder à la salle</UiBaseButton>
              <p class="mt-2 text-[12.5px] text-discret">La salle ouvre 15 minutes avant le début.</p>
            </template>
            <p v-else-if="complet" class="rounded-[10px] bg-white p-3 text-[14px] text-erreur">Complet.</p>
            <template v-else-if="payante">
              <p class="rounded-[10px] bg-white p-3 text-[14px] text-texte">
                L’inscription en ligne aux Live Sessions payantes ouvre bientôt.
              </p>
              <UiBaseButton to="/contact" variante="contour" class="mt-3 w-full">Nous contacter pour réserver</UiBaseButton>
            </template>
            <template v-else>
              <UiBaseButton class="w-full" :disabled="envoi" @click="inscrire">
                {{ auth.estConnecte ? 'Je m’inscris' : 'Se connecter pour s’inscrire' }}
              </UiBaseButton>
              <p class="mt-2 text-[12.5px] text-discret">Vous recevez le lien de la salle par e-mail.</p>
            </template>
          </div>
        </aside>
      </div>
    </section>
  </div>
</template>
