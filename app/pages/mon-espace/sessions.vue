<script setup lang="ts">
import type { Formateur, SessionCoaching, Thematique } from '#shared/types'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Mes sessions de coaching')

type SessionApprenant = SessionCoaching & {
  thematique: Thematique | null
  formateur: Formateur | null
  inscrit: boolean
  ficheRequise: boolean
}

const auth = useAuthStore()
const { data: sessions, refresh } = await useFetch<SessionApprenant[]>('/api/mon-espace/sessions')

const reservation = ref<SessionApprenant | null>(null)
const notation = ref<SessionApprenant | null>(null)
const message = ref('')
const erreur = ref('')

async function reserver(reponses: { preoccupation: string; attente: string }) {
  erreur.value = ''
  try {
    await $fetch('/api/mon-espace/sessions/reserver', {
      method: 'POST',
      body: { sessionId: reservation.value!.id, ...reponses },
    })
    message.value = 'Place réservée. Vos sujets ont été transmis au formateur.'
    reservation.value = null
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Réservation impossible.'
  }
}

async function noter(valeurs: { note: number; commentaire: string }) {
  await $fetch('/api/mon-espace/notes', {
    method: 'POST',
    body: {
      formateurId: notation.value!.formateurId,
      origine: 'collective',
      ...valeurs,
    },
  })
  message.value = 'Merci, votre note a été enregistrée.'
  notation.value = null
}
</script>

<template>
  <div>
    <h1 class="text-[30px] font-medium">Mes sessions de coaching</h1>
    <p class="mt-2 max-w-[680px] text-[15px] text-texte">
      Les sessions sont organisées par thématique. Seules celles couvrant un module que vous
      possédez apparaissent ici.
    </p>

    <p
      v-if="auth.utilisateur && !auth.utilisateur.ficheCompletee"
      class="mt-5 rounded-[12px] border border-alerte bg-alerte-voile p-4 text-[14px] text-alerte"
    >
      Votre fiche apprenant n’est pas complète : la réservation reste bloquée.
      <NuxtLink to="/mon-espace/profil" class="font-bold underline">La compléter</NuxtLink>.
    </p>

    <p v-if="message" class="mt-5 rounded-[12px] border border-succes bg-succes-voile p-4 text-[14px] text-succes">
      {{ message }}
    </p>
    <p v-if="erreur" class="mt-5 rounded-[12px] border border-erreur bg-[#fdeeee] p-4 text-[14px] text-erreur">
      {{ erreur }}
    </p>

    <div class="mt-8 flex flex-col gap-3">
      <article
        v-for="session in sessions"
        :key="session.id"
        class="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-ligne-douce p-5"
      >
        <div>
          <p
            class="surtitre"
            :class="session.programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'"
          >
            {{ session.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }}
          </p>
          <h2 class="mt-2 font-title text-[19px] font-light">{{ session.thematique?.nom }}</h2>
          <p class="mt-1 text-[13px] text-discret">
            {{ formatDate(session.date) }} à {{ session.heure }} ·
            {{ formatDuree(session.dureeMinutes) }} · {{ session.formateur?.nom }} ·
            {{ session.inscrits }} / {{ session.places }} places
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <template v-if="session.statut === 'annulee'">
            <span class="rounded-full bg-[#fdeeee] px-3 py-1.5 text-[12px] font-bold text-erreur">
              Session annulée
            </span>
          </template>
          <template v-else-if="session.inscrit">
            <UiBaseButton :to="`/mon-espace/session/${session.id}`" taille="sm">
              Rejoindre la session
            </UiBaseButton>
            <UiBaseButton taille="sm" variante="contour" @click="notation = session">
              Noter le formateur
            </UiBaseButton>
          </template>
          <template v-else>
            <UiBaseButton
              taille="sm"
              :disabled="session.ficheRequise || session.inscrits >= session.places"
              @click="reservation = session"
            >
              {{ session.inscrits >= session.places ? 'Complet' : 'Réserver ma place' }}
            </UiBaseButton>
          </template>
        </div>
      </article>
    </div>

    <EspaceModaleSujets
      v-if="reservation"
      titre="Avant de réserver : vos sujets à traiter"
      :sous-titre="`${reservation.thematique?.nom} — ${formatDate(reservation.date)} · ${reservation.heure} · ${reservation.formateur?.nom}`"
      contexte="Votre principale préoccupation sur ce thème"
      @fermer="reservation = null"
      @envoyer="reserver"
    />

    <EspaceModaleNotation
      v-if="notation"
      titre="Notez votre formateur"
      :sous-titre="`${notation.thematique?.nom} — ${notation.formateur?.nom}`"
      @fermer="notation = null"
      @envoyer="noter"
    />
  </div>
</template>
