<script setup lang="ts">
import type { Formateur, SessionCoaching, Thematique } from '#shared/types'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Vos sessions de coaching')

type Etat = 'verrou-profil' | 'reserver' | 'inscrit' | 'rejoindre' | 'complet-attente' | 'reportee' | 'annulee' | 'passee'

type SessionApprenant = SessionCoaching & {
  thematique: Thematique | null
  formateur: Formateur | null
  inscrit: boolean
  present: boolean | null
  enListeAttente: boolean
  ficheRequise: boolean
  completionProfil: number
  etat: Etat
  passee: boolean
  ouvertureSalle: string
  heureFin: string
}

const { data: sessions, refresh } = await useFetch<SessionApprenant[]>('/api/mon-espace/sessions')

const completion = computed(() => sessions.value?.[0]?.completionProfil ?? 100)
const aVenir = computed(() => (sessions.value ?? []).filter((s) => !s.passee))
const passees = computed(() => (sessions.value ?? []).filter((s) => s.passee))

const reservation = ref<SessionApprenant | null>(null)
const notation = ref<SessionApprenant | null>(null)
const message = ref('')
const erreur = ref('')

const MOIS = (date: string) =>
  new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(`${date}T00:00:00`)).replace('.', '').toUpperCase()
const JOUR = (date: string) => new Date(`${date}T00:00:00`).getDate()
const JOUR_COURT = (date: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${date}T00:00:00`)).replace(/\./g, '')
const MOIS_LONG = (date: string) =>
  new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(`${date}T00:00:00`))

async function reserver(reponses: { preoccupation: string; attente: string }) {
  erreur.value = ''
  try {
    await $fetch('/api/mon-espace/sessions/reserver', {
      method: 'POST',
      body: { sessionId: reservation.value!.id, ...reponses },
    })
    message.value = 'Place réservée. Vos sujets ont été transmis au formateur — rappel prévu.'
    reservation.value = null
    await refresh()
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreur.value = r.data?.statusMessage ?? r.statusMessage ?? 'Réservation impossible.'
  }
}

async function listeAttente(session: SessionApprenant) {
  erreur.value = ''
  try {
    await $fetch('/api/mon-espace/sessions/liste-attente', { method: 'POST', body: { sessionId: session.id } })
    message.value = 'Vous êtes sur la liste d’attente : nous vous prévenons dès qu’une place se libère.'
    await refresh()
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreur.value = r.data?.statusMessage ?? r.statusMessage ?? 'Inscription impossible.'
  }
}

async function noter(valeurs: { note: number; commentaire: string }) {
  await $fetch('/api/mon-espace/notes', {
    method: 'POST',
    body: { formateurId: notation.value!.formateurId, origine: 'collective', ...valeurs },
  })
  message.value = 'Merci, votre note a été enregistrée.'
  notation.value = null
}
</script>

<template>
  <div>
    <h1 class="text-[30px] font-medium">Vos sessions de coaching</h1>
    <p class="mt-2 max-w-[720px] text-[15px] text-texte">
      Une session de coaching collectif de 2 h par module et par mois, animée par le formateur du
      module. 25 places par session.
    </p>

    <EspaceVerrouProfil :completion="completion" bouton="Réserver ma place" class="mt-5" />

    <p v-if="message" class="mt-5 rounded-[12px] border border-succes bg-succes-voile p-4 text-[14px] text-succes" role="status">
      {{ message }}
    </p>
    <p v-if="erreur" class="mt-5 rounded-[12px] border border-erreur bg-[#fdeeee] p-4 text-[14px] text-erreur" role="alert">
      {{ erreur }}
    </p>

    <div class="mt-8 flex flex-col gap-3">
      <article
        v-for="session in [...aVenir, ...passees]"
        :key="session.id"
        class="flex flex-wrap items-center gap-4 rounded-[14px] border bg-white p-5"
        :class="session.passee ? 'border-ligne-claire opacity-80' : 'border-ligne-douce'"
      >
        <!-- Pastille date « 10 / SEPT » -->
        <div
          class="grid w-16 shrink-0 place-items-center rounded-[12px] py-2 text-center"
          :class="session.programme === 'social-media' ? 'bg-social-voile text-social' : 'bg-entrepreneurs-voile text-entrepreneurs'"
        >
          <span class="font-title text-[26px] leading-none font-light">{{ JOUR(session.date) }}</span>
          <span class="mt-1 text-[11px] font-bold tracking-[0.08em]">{{ MOIS(session.date) }}</span>
        </div>

        <div class="min-w-[220px] flex-1">
          <h2 class="font-title text-[19px] font-light">
            {{ session.titre ?? session.thematique?.nom }} — session {{ session.passee ? `d’${MOIS_LONG(session.date)}` : 'mensuelle' }}
          </h2>
          <p class="mt-1 text-[13px] text-discret">
            {{ session.formateur?.nom }} ·
            <template v-if="session.passee && session.present">Vous avez participé ✓ · compte pour votre certificat</template>
            <template v-else>
              {{ session.heure }}–{{ session.heureFin }} GMT · Zoom · {{ session.inscrits }}/{{ session.places }} inscrits
            </template>
          </p>
          <p v-if="session.etat === 'reportee' && session.reporteeDe" class="mt-1 text-[12.5px] text-alerte">
            Initialement prévue le {{ formatDate(session.reporteeDe) }}.
          </p>
        </div>

        <!-- Les 6 états du bouton -->
        <div class="flex flex-wrap gap-2">
          <span v-if="session.etat === 'passee'" class="rounded-full bg-fond-voile px-3 py-1.5 text-[12px] font-bold text-discret">
            Session passée
          </span>
          <UiBaseButton
            v-if="session.etat === 'passee' && session.inscrit"
            taille="sm"
            variante="contour"
            @click="notation = session"
          >
            Noter le formateur
          </UiBaseButton>
          <span v-else-if="session.etat === 'annulee'" class="rounded-full bg-[#fdeeee] px-3 py-1.5 text-[12px] font-bold text-erreur">
            Session annulée
          </span>
          <span v-else-if="session.etat === 'reportee'" class="rounded-full bg-alerte-voile px-3 py-1.5 text-[12px] font-bold text-alerte">
            Reportée — nouvelle date
          </span>
          <UiBaseButton v-else-if="session.etat === 'rejoindre'" :to="`/mon-espace/session/${session.id}`" taille="sm">
            Rejoindre la session →
          </UiBaseButton>
          <span v-else-if="session.etat === 'inscrit'" class="rounded-full bg-succes-voile px-3 py-1.5 text-[12px] font-bold text-succes">
            ✓ Inscrit · rappel prévu
          </span>
          <UiBaseButton v-else-if="session.etat === 'verrou-profil'" taille="sm" variante="contour" to="/mon-espace/profil">
            🔒 Complétez votre profil
          </UiBaseButton>
          <UiBaseButton
            v-else-if="session.etat === 'complet-attente'"
            taille="sm"
            variante="contour"
            :disabled="session.enListeAttente"
            @click="listeAttente(session)"
          >
            {{ session.enListeAttente ? 'Sur liste d’attente ✓' : 'Complet — liste d’attente' }}
          </UiBaseButton>
          <UiBaseButton v-else taille="sm" @click="reservation = session">Réserver ma place</UiBaseButton>
        </div>
      </article>
      <p v-if="!sessions?.length" class="rounded-[14px] border border-dashed border-ligne p-8 text-center text-[14px] text-discret">
        Aucune session pour vos modules pour l’instant.
      </p>
    </div>

    <p class="mt-6 text-[12.5px] text-discret">
      Rappels automatiques : email + WhatsApp à J-1 et H-1. Le lien Zoom s’active 15 minutes avant le début.
    </p>

    <EspaceModaleSujets
      v-if="reservation"
      titre="Avant de réserver : vos sujets à traiter"
      :sous-titre="`${reservation.thematique?.nom} — ${JOUR_COURT(reservation.date)} · ${reservation.heure.replace(':', 'h')} · ${reservation.formateur?.nom}`"
      contexte="Votre principale préoccupation sur ce thème"
      @fermer="reservation = null"
      @envoyer="reserver"
    />

    <EspaceModaleNotation
      v-if="notation"
      titre="Notez votre formateur"
      :sous-titre="`Coaching collectif du ${formatDate(notation.date)} — ${notation.formateur?.nom} · ${notation.thematique?.nom}`"
      @fermer="notation = null"
      @envoyer="noter"
    />
  </div>
</template>
