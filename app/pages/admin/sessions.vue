<script setup lang="ts">
import type { Formateur, Module, SessionCoaching, Thematique } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Calendrier des sessions — administration')

type SessionAdmin = SessionCoaching & {
  thematique: Thematique | null
  formateur: Formateur | null
  modulesCouverts: number[]
}

const filtreProgramme = ref('')
const filtreStatut = ref('')
const filtreThematique = ref('')
const filtreFormateur = ref('')

const { data: sessions, refresh } = await useFetch<SessionAdmin[]>('/api/admin/sessions', {
  query: computed(() => ({
    programme: filtreProgramme.value || undefined,
    statut: filtreStatut.value || undefined,
    thematique: filtreThematique.value || undefined,
    formateur: filtreFormateur.value || undefined,
  })),
})
const { data: thematiques } = await useFetch<Thematique[]>('/api/thematiques')
const { data: formateurs } = await useFetch<Formateur[]>('/api/formateurs')
const { data: modules } = await useFetch<Module[]>('/api/modules')

/** « Modules éligibles — 04, 05, 06 (auto) » : déduits de la thématique choisie. */
const modulesEligibles = computed(() =>
  (modules.value ?? [])
    .filter((m) => m.thematiqueId === creation.thematiqueId)
    .sort((a, b) => a.numero - b.numero)
    .map((m) => numeroModule(m.numero)),
)
const programmeCreation = computed(() => {
  const t = thematiques.value?.find((x) => x.id === creation.thematiqueId)
  return t ? (t.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs') : '—'
})

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

// --- Report (écran 03 : action « Reporter ») --------------------------------

const report = ref<SessionAdmin | null>(null)
const nouvelleDate = reactive({ date: '', heure: '' })
const erreurReport = ref('')

function ouvrirReport(session: SessionAdmin) {
  report.value = session
  erreurReport.value = ''
  Object.assign(nouvelleDate, { date: session.date, heure: session.heure })
}

async function reporter() {
  if (!report.value) return
  erreurReport.value = ''
  try {
    const r = await $fetch<{ notifies: number }>('/api/admin/sessions', {
      method: 'PATCH',
      body: { id: report.value.id, action: 'reporter', date: nouvelleDate.date, heure: nouvelleDate.heure },
    })
    message.value = `Séance reportée — ${r.notifies} apprenant(s) notifié(s) par email et WhatsApp.`
    report.value = null
    await refresh()
  } catch (e) {
    erreurReport.value = (e as { statusMessage?: string }).statusMessage ?? 'Le report a échoué.'
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

const DEFAUTS = {
  thematiqueId: '',
  formateurId: '',
  date: '',
  heure: '19:00',
  fuseau: 'GMT (Abidjan)',
  titre: '',
  dureeMinutes: 120,
  places: 25,
  ouvertureSalleMinutes: 15,
  enregistrement: false,
}
const creation = reactive({ ...DEFAUTS })
const formulaireOuvert = ref(false)
const erreur = ref('')

// --- Modification d'une séance existante ------------------------------------

const modification = ref<SessionAdmin | null>(null)
const retouche = reactive({
  formateurId: '',
  titre: '',
  dureeMinutes: 120,
  places: 25,
  ouvertureSalleMinutes: 15,
  enregistrement: false,
  date: '',
  heure: '',
})
const erreurModification = ref('')

function ouvrirModification(session: SessionAdmin) {
  modification.value = session
  erreurModification.value = ''
  Object.assign(retouche, {
    formateurId: session.formateurId,
    titre: session.titre ?? '',
    dureeMinutes: session.dureeMinutes,
    places: session.places,
    ouvertureSalleMinutes: session.ouvertureSalleMinutes,
    enregistrement: session.enregistrement,
    date: session.date,
    heure: session.heure,
  })
}

async function enregistrerModification() {
  if (!modification.value) return
  erreurModification.value = ''
  const session = modification.value
  try {
    await $fetch('/api/admin/sessions', {
      method: 'PATCH',
      body: {
        id: session.id,
        action: 'modifier',
        formateurId: retouche.formateurId,
        titre: retouche.titre,
        dureeMinutes: retouche.dureeMinutes,
        places: retouche.places,
        ouvertureSalleMinutes: retouche.ouvertureSalleMinutes,
        enregistrement: retouche.enregistrement,
      },
    })
    // Le report est une action distincte : il garde trace de la date d'origine
    // et prévient les inscrits, ce qu'une modification de réglages ne fait pas.
    if (retouche.date !== session.date || retouche.heure !== session.heure) {
      const r = await $fetch<{ notifies: number }>('/api/admin/sessions', {
        method: 'PATCH',
        body: { id: session.id, action: 'reporter', date: retouche.date, heure: retouche.heure },
      })
      message.value = `Séance reportée — ${r.notifies} apprenant(s) notifié(s) par e-mail et WhatsApp.`
    } else {
      message.value = 'Séance modifiée.'
    }
    modification.value = null
    await refresh()
  } catch (e) {
    erreurModification.value =
      (e as { statusMessage?: string }).statusMessage ?? 'La modification a échoué.'
  }
}

/** Au-delà de 80 % de remplissage, la maquette prévient avant que ce soit
 *  complet : c'est le moment d'ouvrir une seconde séance. */
function remplissage(session: SessionAdmin) {
  if (session.statut === 'annulee') return 'annulee'
  if (session.statut === 'terminee') return 'terminee'
  if (session.inscrits >= session.places) return 'complete'
  if (session.inscrits >= session.places * 0.8) return 'presque-pleine'
  return 'confirmee'
}

const LIBELLE_REMPLISSAGE: Record<string, string> = {
  annulee: 'Annulée',
  terminee: 'Terminée',
  complete: 'Complète',
  'presque-pleine': 'Presque pleine',
  confirmee: 'Confirmée',
}

async function creer() {
  erreur.value = ''
  try {
    await $fetch('/api/admin/sessions', { method: 'POST', body: creation })
    formulaireOuvert.value = false
    Object.assign(creation, DEFAUTS)
    message.value = 'Session créée. La réunion Zoom a été générée ; le formateur et les inscrits y entrent depuis la plateforme.'
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

    <!-- Règles du calendrier (rappel CDC), écran 03 -->
    <aside class="mt-4 rounded-[12px] border border-ligne-douce bg-white p-4">
      <p class="text-[13.5px] font-bold text-encre">Règles du calendrier (rappel CDC)</p>
      <p class="mt-1 max-w-[900px] text-[12.5px] text-texte">
        Une session par couple thématique–formateur · 10 sessions mensuelles en Phase 1 (5 SM + 5
        ENT) · 2 h · 25 participants max · jour fixe du mois · visible uniquement des apprenants
        ayant acheté un module couvert · lien Zoom personnel généré à la demande, jamais affiché en
        clair · rappel automatique 24 h avant par email + WhatsApp.
      </p>
    </aside>

    <p v-if="message" class="mt-4 rounded-[10px] border border-succes bg-succes-voile p-3 text-[13.5px] text-succes">
      {{ message }}
    </p>

    <form
      v-if="formulaireOuvert"
      class="mt-5 grid gap-4 rounded-[14px] border border-ligne-douce bg-white p-6 sm:grid-cols-2 lg:grid-cols-4"
      @submit.prevent="creer"
    >
      <div class="sm:col-span-2 xl:col-span-4">
        <h2 class="font-title text-[19px] font-light">Planifier une session</h2>
        <p class="mt-1 text-[12.5px] text-discret">Réunion Zoom créée automatiquement à la validation</p>
      </div>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Programme</span>
        <input :value="programmeCreation" disabled class="w-full rounded-[10px] border border-ligne bg-fond-voile px-3 py-2.5 text-[14px] text-discret">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Thématique</span>
        <select v-model="creation.thematiqueId" required class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
          <option value="">Choisir…</option>
          <option v-for="t in thematiques" :key="t.id" :value="t.id">
            {{ t.programme === 'social-media' ? 'SM' : 'ENT' }} · {{ t.nom }}
          </option>
        </select>
      </label>
      <div class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Modules éligibles</span>
        <p class="rounded-[10px] border border-ligne bg-fond-voile px-3 py-2.5 text-[14px]" :class="modulesEligibles.length ? 'text-texte' : 'text-discret'">
          {{ modulesEligibles.length ? `${modulesEligibles.join(', ')} (auto)` : '— (auto)' }}
        </p>
      </div>
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
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Heure de début</span>
        <input v-model="creation.heure" type="time" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Fuseau</span>
        <select v-model="creation.fuseau" class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
          <option value="GMT (Abidjan)">GMT (Abidjan)</option>
        </select>
      </label>
      <label class="block sm:col-span-2">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">
          Titre du coaching <span class="font-normal text-discret">(facultatif)</span>
        </span>
        <input
          v-model="creation.titre"
          placeholder="Repris de la thématique si laissé vide"
          class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]"
        >
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Durée</span>
        <input v-model.number="creation.dureeMinutes" type="number" min="30" step="15" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Capacité</span>
        <input v-model.number="creation.places" type="number" min="1" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Ouverture de la salle</span>
        <select v-model.number="creation.ouvertureSalleMinutes" class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
          <option :value="15">15 min avant</option>
          <option :value="10">10 min avant</option>
          <option :value="5">5 min avant</option>
        </select>
      </label>
      <label class="flex items-center gap-2.5 self-end pb-2.5 text-[13.5px]">
        <input v-model="creation.enregistrement" type="checkbox">
        Activer l’enregistrement de la session
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
      <select v-model="filtreThematique" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Toutes thématiques</option>
        <option v-for="t in thematiques" :key="t.id" :value="t.id">{{ t.nom }}</option>
      </select>
      <select v-model="filtreFormateur" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous formateurs</option>
        <option v-for="f in formateurs" :key="f.id" :value="f.id">{{ f.nom }}</option>
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
      :colonnes="['Date · Heure', 'Thématique — modules couverts', 'Formateur', 'Inscrits / Capacité', 'Présence', 'Statut', 'Actions']"
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
              'bg-succes-voile text-succes': remplissage(session) === 'confirmee',
              'bg-alerte-voile text-alerte': ['presque-pleine', 'complete'].includes(remplissage(session)),
              'bg-[#fdeeee] text-erreur': remplissage(session) === 'annulee',
              'bg-fond-voile text-discret': remplissage(session) === 'terminee',
            }"
          >
            {{ LIBELLE_REMPLISSAGE[remplissage(session)] }}
          </span>
        </td>
        <td class="px-4 py-3 whitespace-nowrap">
          <template v-if="session.statut === 'planifiee'">
            <button class="text-[12.5px] underline" @click="ouvrirModification(session)">Modifier</button>
            <button class="ml-3 text-[12.5px] underline" @click="ouvrirReport(session)">Reporter</button>
            <button class="ml-3 text-[12.5px] text-erreur underline" @click="annulation = session">Annuler</button>
          </template>
          <span v-else class="text-[12px] text-discret">Notifiée — email + WhatsApp ✓</span>
        </td>
      </tr>
    </AdminTableauSimple>

    <div v-if="modification" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <form class="w-full max-w-xl rounded-carte bg-white p-6" @submit.prevent="enregistrerModification">
        <h2 class="font-title text-[21px] font-light">
          Modifier la séance du {{ formatDate(modification.date) }}
        </h2>
        <p class="mt-2 text-[13px] text-discret">
          {{ modification.thematique?.nom }} · {{ modification.inscrits }} inscrit(s).
          Changer la date ou l’heure vaut report : les inscrits en sont prévenus.
        </p>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <label class="block sm:col-span-2">
            <span class="mb-1.5 block text-[13px] font-bold">Titre</span>
            <input v-model="retouche.titre" placeholder="Repris de la thématique si laissé vide" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold">Formateur</span>
            <select v-model="retouche.formateurId" class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
              <option v-for="f in formateurs" :key="f.id" :value="f.id">{{ f.nom }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold">Durée (minutes)</span>
            <input v-model.number="retouche.dureeMinutes" type="number" min="30" step="15" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold">Date</span>
            <input v-model="retouche.date" type="date" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold">Heure</span>
            <input v-model="retouche.heure" type="time" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold">Capacité</span>
            <input
              v-model.number="retouche.places"
              type="number"
              :min="modification.inscrits || 1"
              class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]"
            >
            <span class="mt-1 block text-[12px] text-discret">
              Pas en dessous des {{ modification.inscrits }} déjà inscrits.
            </span>
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold">Ouverture de la salle</span>
            <select v-model.number="retouche.ouvertureSalleMinutes" class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
              <option :value="15">15 minutes avant</option>
              <option :value="10">10 minutes avant</option>
              <option :value="5">5 minutes avant</option>
            </select>
          </label>
          <label class="flex items-center gap-2.5 text-[13.5px] sm:col-span-2">
            <input v-model="retouche.enregistrement" type="checkbox">
            Enregistrer la séance
          </label>
        </div>

        <p v-if="erreurModification" class="mt-3 text-[13.5px] text-erreur">{{ erreurModification }}</p>

        <div class="mt-5 flex flex-wrap gap-2">
          <UiBaseButton type="submit" taille="sm">Enregistrer</UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="modification = null">Retour</UiBaseButton>
        </div>
      </form>
    </div>

    <!-- Report : date et heure seulement, les inscrits sont prévenus -->
    <div v-if="report" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <form class="w-full max-w-md rounded-carte bg-white p-6" @submit.prevent="reporter">
        <h2 class="font-title text-[21px] font-light">
          Reporter la session du {{ formatDate(report.date) }} ?
        </h2>
        <p class="mt-2 text-[13.5px] text-texte">
          Les <b>{{ report.inscrits }} apprenants inscrits</b> seront prévenus de la nouvelle date par
          <b>email ET WhatsApp</b>. La réunion Zoom est déplacée avec la séance.
        </p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold">Nouvelle date</span>
            <input v-model="nouvelleDate.date" type="date" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold">Heure de début</span>
            <input v-model="nouvelleDate.heure" type="time" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
        </div>
        <p v-if="erreurReport" class="mt-3 text-[13.5px] text-erreur">{{ erreurReport }}</p>
        <div class="mt-5 flex flex-wrap gap-2">
          <UiBaseButton type="submit" taille="sm">Reporter et notifier</UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="report = null">Retour</UiBaseButton>
        </div>
      </form>
    </div>

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
          <b>email ET WhatsApp</b>. Cette action est journalisée dans l’historique.
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
