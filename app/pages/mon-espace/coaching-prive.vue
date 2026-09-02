<script setup lang="ts">
import type { DemandeCoachingPrive, HistoriqueCoachingPrive, ProgrammeSlug } from '#shared/types'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Mon coaching privé')

type Demande = DemandeCoachingPrive & {
  module: string
  formateur: { id: string; nom: string; photo: string } | null
  montant: number
  historique: HistoriqueCoachingPrive[]
  notee: boolean
}

const route = useRoute()
const { data, refresh } = await useFetch<{
  demandes: Demande[]
  formateursDisponibles: { id: string; nom: string; expertise: string; photo: string; tarifHeure: number }[]
  modulesPossedes: { id: string; titre: string; formateurId: string; programme: ProgrammeSlug }[]
}>('/api/mon-espace/coaching-prive')

// Arrivée depuis une fiche formateur : le formulaire s'ouvre sur lui.
const formateurInitial = typeof route.query.formateur === 'string' ? route.query.formateur : undefined
const nouvelle = ref(Boolean(formateurInitial))
const notation = ref<Demande | null>(null)
const message = ref('')
const erreur = ref('')
const envoi = ref(false)

const annulable = (d: Demande) => d.statut === 'en-attente' || d.statut === 'confirmee-attente-paiement'

async function envoyer(payload: Record<string, unknown>) {
  erreur.value = ''
  envoi.value = true
  try {
    await $fetch('/api/mon-espace/coaching-prive', { method: 'POST', body: payload })
    message.value = 'Demande envoyée. L’équipe revient vers vous sous 48 h pour confirmer le créneau.'
    nouvelle.value = false
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Envoi impossible.'
  } finally {
    envoi.value = false
  }
}

async function annuler(d: Demande) {
  if (!confirm('Retirer cette demande ?')) return
  try {
    await $fetch(`/api/mon-espace/coaching-prive/${d.id}/annuler`, { method: 'POST' })
    message.value = 'Demande retirée.'
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Annulation impossible.'
  }
}

async function noter(valeurs: { note: number; commentaire: string }) {
  await $fetch('/api/mon-espace/notes', {
    method: 'POST',
    body: { formateurId: notation.value!.formateurId, origine: 'privee', ...valeurs },
  })
  message.value = 'Merci, votre note a été enregistrée.'
  notation.value = null
  await refresh()
}
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-[30px] font-medium">Mon coaching privé</h1>
        <p class="mt-2 max-w-[680px] text-[15px] text-texte">
          Un accompagnement individuel avec le formateur de votre choix, 50 000 FCFA par heure,
          réservé et payé séparément des sessions collectives incluses avec vos modules.
        </p>
      </div>
      <UiBaseButton :disabled="!data.modulesPossedes.length" @click="nouvelle = true">
        Nouvelle demande
      </UiBaseButton>
    </div>

    <p v-if="!data.modulesPossedes.length" class="mt-5 rounded-[12px] border border-alerte bg-alerte-voile p-4 text-[14px] text-alerte">
      Le coaching privé porte sur un module que vous possédez.
      <NuxtLink to="/modules" class="font-bold underline">Découvrir les modules</NuxtLink>.
    </p>
    <p v-if="message" class="mt-5 rounded-[12px] border border-succes bg-succes-voile p-4 text-[14px] text-succes">{{ message }}</p>
    <p v-if="erreur && !nouvelle" class="mt-5 rounded-[12px] border border-erreur bg-[#fdeeee] p-4 text-[14px] text-erreur">{{ erreur }}</p>

    <p v-if="!data.demandes.length" class="mt-8 text-[14px] text-discret">
      Aucune demande pour l’instant.
    </p>

    <div class="mt-8 flex flex-col gap-4">
      <article
        v-for="d in data.demandes"
        :key="d.id"
        class="rounded-[14px] border bg-white p-6"
        :class="d.statut === 'payee' ? 'border-succes' : 'border-ligne-douce'"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex min-w-[260px] flex-1 items-start gap-4">
            <img v-if="d.formateur" :src="d.formateur.photo" alt="" class="size-12 rounded-full bg-fond-voile object-cover">
            <div>
              <h2 class="font-title text-[19px] font-light">{{ d.formateur?.nom ?? 'Formateur' }}</h2>
              <p class="mt-0.5 text-[13px] text-discret">{{ d.module }} · {{ d.heures }} h · {{ formatFcfa(d.montant) }}</p>
              <p class="mt-2 whitespace-pre-line text-[13.5px] text-texte">{{ d.besoins }}</p>
            </div>
          </div>
          <span class="rounded-full px-3 py-1.5 text-[12px] font-bold" :class="CLASSES_COACHING_PRIVE[d.statut]">
            {{ LIBELLES_COACHING_PRIVE[d.statut] }}
          </span>
        </div>

        <div class="mt-4 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div>
            <p class="surtitre text-discret">Créneaux</p>
            <p v-if="d.creneau" class="mt-2 text-[14px] font-bold text-succes">Retenu : {{ d.creneau }}</p>
            <ul v-else class="mt-2 space-y-1 text-[13.5px] text-texte">
              <li v-for="(c, i) in d.creneaux" :key="i">{{ formatCreneau(c) }}</li>
            </ul>
            <p v-if="d.disponibilites && d.disponibilites !== '—'" class="mt-1 text-[12.5px] text-discret">
              {{ d.disponibilites }}
            </p>
            <p v-if="d.motifRefus" class="mt-2 text-[13px] text-erreur">Motif : {{ d.motifRefus }}</p>
          </div>
          <div>
            <p class="surtitre text-discret">Suivi</p>
            <EspaceHistoriqueStatuts class="mt-3" :entrees="d.historique" />
          </div>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <UiBaseButton v-if="d.statut === 'payee' && d.lienSession" taille="sm" :href="d.lienSession">
            Rejoindre la séance
          </UiBaseButton>
          <UiBaseButton v-if="d.statut === 'realisee' && !d.notee" taille="sm" variante="contour" @click="notation = d">
            Noter le formateur
          </UiBaseButton>
          <span v-if="d.statut === 'realisee' && d.notee" class="self-center text-[13px] text-discret">Séance notée ✓</span>
          <UiBaseButton v-if="annulable(d)" taille="sm" variante="contour" @click="annuler(d)">
            Retirer la demande
          </UiBaseButton>
        </div>
      </article>
    </div>

    <EspaceModaleDemandeCoaching
      v-if="nouvelle"
      :formateurs="data.formateursDisponibles"
      :modules="data.modulesPossedes"
      :formateur-initial="formateurInitial"
      :erreur="erreur"
      :envoi="envoi"
      @fermer="nouvelle = false; erreur = ''"
      @envoyer="envoyer"
    />

    <EspaceModaleNotation
      v-if="notation"
      titre="Notez votre séance de coaching"
      :sous-titre="`${notation.formateur?.nom} — ${notation.module}`"
      @fermer="notation = null"
      @envoyer="noter"
    />
  </div>
</template>
