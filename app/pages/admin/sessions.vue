<script setup lang="ts">
import type { Formateur, SessionCoaching, Thematique } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Calendrier des sessions — administration')

type SessionAdmin = SessionCoaching & {
  thematique: Thematique | null
  formateur: Formateur | null
  modulesCouverts: number[]
}

const filtreProgramme = ref('')
const filtreStatut = ref('')

const { data: sessions, refresh } = await useFetch<SessionAdmin[]>('/api/admin/sessions', {
  query: computed(() => ({
    programme: filtreProgramme.value || undefined,
    statut: filtreStatut.value || undefined,
  })),
})
const { data: thematiques } = await useFetch<Thematique[]>('/api/thematiques')
const { data: formateurs } = await useFetch<Formateur[]>('/api/formateurs')

const annulation = ref<SessionAdmin | null>(null)
const motif = ref('')
const message = ref('')

// --- Relevé de présence -----------------------------------------------------

const presence = ref<SessionAdmin | null>(null)
const nbPresents = ref(0)
const erreurPresence = ref('')

function ouvrirPresence(session: SessionAdmin) {
  presence.value = session
  nbPresents.value = session.presents ?? session.inscrits
  erreurPresence.value = ''
}

async function enregistrerPresence(valeur: number | null) {
  if (!presence.value) return
  erreurPresence.value = ''
  try {
    await $fetch('/api/admin/presence', {
      method: 'POST',
      body: { id: presence.value.id, presents: valeur },
    })
    presence.value = null
    await refresh()
  } catch (e) {
    erreurPresence.value =
      (e as { statusMessage?: string }).statusMessage ?? 'L’enregistrement a échoué.'
  }
}

async function annuler() {
  if (!annulation.value) return
  const r = await $fetch<{ notifies: number }>('/api/admin/sessions', {
    method: 'PATCH',
    body: { id: annulation.value.id, action: 'annuler', motif: motif.value },
  })
  message.value = `Session annulée — ${r.notifies} apprenant(s) notifié(s) par e-mail et WhatsApp.`
  annulation.value = null
  motif.value = ''
  await refresh()
}

const creation = reactive({ thematiqueId: '', formateurId: '', date: '', heure: '19:00' })
const formulaireOuvert = ref(false)
const erreur = ref('')

async function creer() {
  erreur.value = ''
  try {
    await $fetch('/api/admin/sessions', { method: 'POST', body: creation })
    formulaireOuvert.value = false
    message.value = 'Session créée. La réunion Zoom est générée à la validation (à brancher).'
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Création impossible.'
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">Calendrier des sessions de coaching</h1>
      <UiBaseButton taille="sm" @click="formulaireOuvert = !formulaireOuvert">
        + Créer une session
      </UiBaseButton>
    </div>

    <p class="mt-2 max-w-[900px] text-[12.5px] text-discret">
      Une session par couple thématique–formateur · 2 h · 25 participants maximum · visible
      uniquement des apprenants ayant acheté un module couvert · lien Zoom généré à la demande,
      jamais affiché en clair · rappel automatique 24 h avant par e-mail et WhatsApp.
    </p>

    <p v-if="message" class="mt-4 rounded-[10px] border border-succes bg-succes-voile p-3 text-[13.5px] text-succes">
      {{ message }}
    </p>

    <form
      v-if="formulaireOuvert"
      class="mt-5 grid gap-4 rounded-[14px] border border-ligne-douce bg-white p-6 sm:grid-cols-2 xl:grid-cols-4"
      @submit.prevent="creer"
    >
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Thématique</span>
        <select v-model="creation.thematiqueId" required class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
          <option value="">Choisir…</option>
          <option v-for="t in thematiques" :key="t.id" :value="t.id">
            {{ t.programme === 'social-media' ? 'SM' : 'ENT' }} · {{ t.nom }}
          </option>
        </select>
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Formateur</span>
        <select v-model="creation.formateurId" required class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
          <option value="">Choisir…</option>
          <option v-for="f in formateurs" :key="f.id" :value="f.id">{{ f.nom }}</option>
        </select>
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Date</span>
        <input v-model="creation.date" type="date" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Heure (GMT Abidjan)</span>
        <input v-model="creation.heure" type="time" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
      </label>
      <div class="sm:col-span-2 xl:col-span-4">
        <p v-if="erreur" class="mb-3 text-[13.5px] text-erreur">{{ erreur }}</p>
        <UiBaseButton type="submit" taille="sm">Valider et créer la réunion Zoom</UiBaseButton>
      </div>
    </form>

    <div class="mt-5 flex flex-wrap gap-2 text-[13px]">
      <select v-model="filtreProgramme" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous programmes</option>
        <option value="social-media">Social Média</option>
        <option value="entrepreneurs">Entrepreneurs</option>
      </select>
      <select v-model="filtreStatut" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous statuts</option>
        <option value="planifiee">Planifiée</option>
        <option value="annulee">Annulée</option>
        <option value="terminee">Terminée</option>
      </select>
    </div>

    <AdminTableauSimple
      class="mt-4"
      :colonnes="['Date · Heure', 'Thématique — modules couverts', 'Formateur', 'Inscrits', 'Présence', 'Statut', 'Actions']"
    >
      <tr v-for="session in sessions" :key="session.id">
        <td class="px-4 py-3 font-bold">{{ formatDate(session.date) }} · {{ session.heure }}</td>
        <td class="px-4 py-3">
          <span class="mr-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold" :class="session.programme === 'social-media' ? 'bg-social-voile text-social' : 'bg-entrepreneurs-voile text-entrepreneurs'">
            {{ session.programme === 'social-media' ? 'SM' : 'ENT' }}
          </span>
          {{ session.thematique?.nom }} — modules
          {{ session.modulesCouverts.map(numeroModule).join(', ') }}
        </td>
        <td class="px-4 py-3">{{ session.formateur?.nom }}</td>
        <td class="px-4 py-3">{{ session.inscrits }} / {{ session.places }}</td>
        <td class="px-4 py-3">
          <button
            v-if="session.statut !== 'annulee'"
            class="text-[12.5px] underline"
            @click="ouvrirPresence(session)"
          >
            <template v-if="session.presents === null">Relever</template>
            <template v-else>
              {{ session.presents }} présents ·
              {{ session.inscrits ? Math.round((session.presents / session.inscrits) * 100) : 0 }} %
            </template>
          </button>
          <span v-else class="text-[12px] text-discret">—</span>
        </td>
        <td class="px-4 py-3">
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
            :class="{
              'bg-succes-voile text-succes': session.statut === 'planifiee' && session.inscrits < session.places,
              'bg-alerte-voile text-alerte': session.statut === 'planifiee' && session.inscrits >= session.places,
              'bg-[#fdeeee] text-erreur': session.statut === 'annulee',
              'bg-fond-voile text-discret': session.statut === 'terminee',
            }"
          >
            {{
              session.statut === 'annulee'
                ? 'Annulée'
                : session.statut === 'terminee'
                  ? 'Terminée'
                  : session.inscrits >= session.places
                    ? 'Complète'
                    : 'Confirmée'
            }}
          </span>
        </td>
        <td class="px-4 py-3">
          <button
            v-if="session.statut === 'planifiee'"
            class="text-[12.5px] text-erreur underline"
            @click="annulation = session"
          >
            Annuler
          </button>
          <span v-else class="text-[12px] text-discret">Notifiée — e-mail + WhatsApp ✓</span>
        </td>
      </tr>
    </AdminTableauSimple>

    <div v-if="presence" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <div class="w-full max-w-md rounded-carte bg-white p-6">
        <h2 class="font-title text-[21px] font-light">
          Présence — séance du {{ formatDate(presence.date) }}
        </h2>
        <p class="mt-2 text-[13.5px] text-texte">
          {{ presence.inscrits }} inscrits. Ce relevé est la seule source du taux de présence
          affiché aux formateurs : tant qu’il est vide, ils voient « — ».
        </p>

        <label class="mt-4 block">
          <span class="mb-1.5 block text-[13px] font-bold">Nombre de présents</span>
          <input
            v-model.number="nbPresents"
            type="number"
            min="0"
            :max="presence.inscrits"
            class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[15px] focus:border-social focus:outline-none"
          >
        </label>

        <p v-if="erreurPresence" class="mt-3 text-[13.5px] text-erreur">{{ erreurPresence }}</p>

        <div class="mt-5 flex flex-wrap gap-2">
          <UiBaseButton taille="sm" @click="enregistrerPresence(nbPresents)">Enregistrer</UiBaseButton>
          <UiBaseButton
            v-if="presence.presents !== null"
            taille="sm"
            variante="contour"
            @click="enregistrerPresence(null)"
          >
            Effacer le relevé
          </UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="presence = null">Annuler</UiBaseButton>
        </div>
      </div>
    </div>

    <div v-if="annulation" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <div class="w-full max-w-lg rounded-carte bg-white p-6">
        <h2 class="font-title text-[21px] font-light">
          Annuler la session du {{ formatDate(annulation.date) }} ?
        </h2>
        <p class="mt-3 text-[14px] text-texte">
          Les <b>{{ annulation.inscrits }} apprenants inscrits</b> seront prévenus immédiatement par
          <b>e-mail ET WhatsApp</b>. Cette action est journalisée dans l’historique.
        </p>
        <label class="mt-4 block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">
            Motif (optionnel, inclus dans la notification)
          </span>
          <textarea v-model="motif" rows="3" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]" />
        </label>
        <div class="mt-5 flex flex-wrap gap-2">
          <UiBaseButton taille="sm" variante="sombre" @click="annuler">Annuler et notifier</UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="annulation = null">Retour</UiBaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
