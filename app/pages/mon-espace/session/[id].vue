<script setup lang="ts">
import type { Formateur, SessionCoaching, Thematique } from '#shared/types'

definePageMeta({ layout: false, middleware: 'auth' })

const route = useRoute()
const auth = useAuthStore()

const { data: sessions } = await useFetch<
  (SessionCoaching & { thematique: Thematique | null; formateur: Formateur | null; inscrit: boolean })[]
>('/api/mon-espace/sessions')

const session = computed(() => sessions.value?.find((s) => s.id === route.params.id))

if (!session.value?.inscrit) {
  throw createError({
    statusCode: 403,
    statusMessage: 'Vous devez avoir réservé votre place pour rejoindre cette session',
    fatal: true,
  })
}

usePagePrivee('Session de coaching')
</script>

<template>
  <div v-if="session" class="min-h-screen bg-encre text-white">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-encre-800 px-6 py-4">
      <NuxtLink to="/mon-espace/sessions" class="text-[13.5px] text-[#b9b4c4] hover:text-white">
        ← Retour à mes sessions
      </NuxtLink>
      <div class="text-center">
        <p class="font-title text-[17px] font-light">{{ session.thematique?.nom }}</p>
        <p class="text-[12.5px] text-[#8f8a9c]">
          Coaching collectif · {{ session.formateur?.nom }} ·
          {{ formatDate(session.date) }} · {{ session.heure }}
        </p>
      </div>
      <span class="rounded-full bg-[#3a1f22] px-3 py-1.5 text-[12px] font-bold text-[#ff6b6b]">
        ● Salle ouverte
      </span>
    </header>

    <div class="grid gap-6 p-6 xl:grid-cols-[1.6fr_1fr]">
      <div class="grid aspect-16/9 w-full place-items-center rounded-carte bg-black">
        <div class="px-6 text-center text-[13.5px] text-[#8f8a9c]">
          <p>Zoom Meeting SDK à intégrer — Component View sur ordinateur, Client View sur mobile.</p>
          <p class="mt-2">
            Le jeton d’autorisation est généré côté serveur ; les clés Zoom ne sont jamais exposées
            au navigateur. L’apprenant ne quitte pas la plateforme.
          </p>
        </div>
      </div>

      <aside class="rounded-carte bg-encre-800 p-5">
        <h2 class="font-title text-[17px] font-light">Participants</h2>
        <ul class="mt-3 space-y-2 text-[13.5px] text-[#b9b4c4]">
          <li>{{ session.formateur?.nom }} — formateur</li>
          <li>{{ auth.utilisateur?.prenom }} {{ auth.utilisateur?.nom }} — vous</li>
          <li>+ {{ Math.max(session.inscrits - 1, 0) }} autres inscrits</li>
        </ul>

        <h2 class="mt-6 font-title text-[17px] font-light">Ressources du module</h2>
        <p class="mt-2 text-[13px] text-[#8f8a9c]">
          Les ressources téléchargeables seront listées ici une fois l’hébergement des fichiers
          branché.
        </p>

        <p class="mt-6 text-[12px] text-[#8f8a9c]">
          Un problème de connexion ? L’ouverture dans l’application Zoom reste une solution de
          secours, à activer côté serveur.
        </p>
      </aside>
    </div>
  </div>
</template>
