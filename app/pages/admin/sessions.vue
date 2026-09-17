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

// --- Filtres en pilules (écran 03) ------------------------------------------

const optionsProgrammes = [
  { valeur: '', libelle: 'Programme' },
  { valeur: 'social-media', libelle: 'Social Média' },
  { valeur: 'entrepreneurs', libelle: 'Entrepreneurs' },
]
const optionsThematiques = computed(() => [
  { valeur: '', libelle: 'Thématique' },
  ...(thematiques.value ?? []).map((t) => ({ valeur: t.id, libelle: t.nom })),
])
const optionsFormateurs = computed(() => [
  { valeur: '', libelle: 'Formateur' },
  ...(formateurs.value ?? []).map((f) => ({ valeur: f.id, libelle: f.nom })),
])
const optionsStatuts = [
  { valeur: '', libelle: 'Statut' },
  { valeur: 'planifiee', libelle: 'Planifiée' },
  { valeur: 'annulee', libelle: 'Annulée' },
  { valeur: 'terminee', libelle: 'Terminée' },
]

/** « Jeu 10/09 », première colonne du calendrier : la maquette y met le jour
 *  de la semaine puis la date en chiffres, pas le mois en toutes lettres. */
function jourEtDate(iso: string): string {
  const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
    .format(new Date(iso))
    .replace('.', '')
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} ${formatJourMois(iso)}`
}

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
    <div class="mb-[18px] flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[24px] font-light">Calendrier des sessions de coaching</h1>
      <UiBaseButton taille="sm" variante="sombre" @click="formulaireOuvert = !formulaireOuvert">
        + Créer une session
      </UiBaseButton>
    </div>

    <!-- Les quatre filtres de la maquette, en pilules, au-dessus du tableau. -->
    <div class="mb-[18px] flex flex-wrap items-center gap-2 text-[12.5px]">
      <UiFiltrePilule v-model="filtreProgramme" etiquette="Programme" :options="optionsProgrammes" />
      <UiFiltrePilule v-model="filtreThematique" etiquette="Thématique" :options="optionsThematiques" />
      <UiFiltrePilule v-model="filtreFormateur" etiquette="Formateur" :options="optionsFormateurs" />
      <UiFiltrePilule v-model="filtreStatut" etiquette="Statut" :options="optionsStatuts" />
      <span class="text-discret">
        Filtres combinables et dépendants — valeurs mises à jour selon les sélections
      </span>
    </div>

    <p v-if="message" class="mb-4 rounded-[10px] border border-succes bg-succes-voile p-3 text-[13.5px] text-succes">
      {{ message }}
    </p>

    <!-- Largeurs de colonnes de la maquette : elles font partie de la
         spécification de l'écran 03. -->
    <AdminTableauSimple
      :colonnes="['Date · Heure', 'Thématique — modules couverts', 'Formateur', 'Inscrits / Capacité', 'Statut', 'Actions']"
      :largeurs="['150px', 'calc(100% - 810px)', '200px', '130px', '110px', '220px']"
      largeur-min="1120px"
    >
      <tr
        v-for="session in sessions"
        :key="session.id"
        :class="session.statut === 'annulee' && 'bg-[#fdf6f6]'"
      >
        <td class="px-5 py-[15px] font-bold">{{ jourEtDate(session.date) }} · {{ session.heure }}</td>
        <td class="px-5 py-[15px]">
          <b :class="session.programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'">
            {{ session.programme === 'social-media' ? 'SM' : 'ENT' }}
          </b>
          · {{ session.thematique?.nom }} — modules
          {{ session.modulesCouverts.map(numeroModule).join(', ') }}
        </td>
        <td class="px-5 py-[15px]">{{ session.formateur?.nom }}</td>
        <!-- Le relevé de présence n'a pas de colonne dans la maquette : il
             s'ouvre depuis le nombre d'inscrits, inchangé au repos. -->
        <td class="px-5 py-[15px] whitespace-nowrap">
          <button
            v-if="session.statut !== 'annulee'"
            class="text-inherit hover:underline"
            :title="session.presents === null ? 'Relever la présence' : `${session.presents} présents — modifier le relevé`"
            @click="ouvrirPresence(session)"
          >
            <b :class="session.inscrits >= session.places * 0.8 && 'text-alerte'">{{ session.inscrits }}</b>
            / {{ session.places }}
          </button>
          <template v-else><b>{{ session.inscrits }}</b> / {{ session.places }}</template>
        </td>
        <td class="px-5 py-[15px]">
          <span
            class="block rounded-full px-2.5 py-1 text-center text-[11px] font-bold whitespace-nowrap"
            :class="{
              'bg-succes-voile text-succes': remplissage(session) === 'confirmee',
              'bg-alerte-voile text-alerte': ['presque-pleine', 'complete'].includes(remplissage(session)),
              'bg-[#fbe9e9] text-erreur': remplissage(session) === 'annulee',
              'bg-piste text-discret': remplissage(session) === 'terminee',
            }"
          >
            {{ LIBELLE_REMPLISSAGE[remplissage(session)] }}
          </span>
        </td>
        <!-- Actions de ligne : 12,5 px gras, sans soulignement, la
             destructrice en rouge. -->
        <td class="px-5 py-[15px]">
          <span v-if="session.statut === 'planifiee'" class="flex gap-2 text-[12.5px] font-bold">
            <button class="text-social hover:underline" @click="ouvrirModification(session)">Modifier</button>
            <button class="text-social hover:underline" @click="ouvrirReport(session)">Reporter</button>
            <button class="text-erreur hover:underline" @click="annulation = session">Annuler</button>
          </span>
          <span v-else class="text-[12.5px] text-discret">Notifiée — email + WhatsApp ✓</span>
        </td>
      </tr>
    </AdminTableauSimple>

    <!-- Règles du calendrier (rappel CDC), sous le tableau comme la maquette. -->
    <aside class="mt-5 rounded-carte border border-ligne-douce bg-white p-[22px] text-[13px] leading-[1.7] text-texte">
      <b class="text-[14px] text-encre">Règles du calendrier (rappel CDC)</b><br>
      Une session par couple thématique–formateur · 10 sessions mensuelles en Phase 1 (5 SM + 5
      ENT) · 2 h · 25 participants max · jour fixe du mois · visible uniquement des apprenants
      ayant acheté un module couvert · lien Zoom personnel généré à la demande, jamais affiché en
      clair · rappel automatique 24 h avant par email + WhatsApp.
    </aside>

    <!-- Planification : carte cerclée de violet, à 1,5 px, sous le tableau. -->
    <form
      v-if="formulaireOuvert"
      class="mt-5 rounded-carte border-[1.5px] border-social bg-white p-[26px]"
      @submit.prevent="creer"
    >
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h2 class="font-sans text-[16px] font-bold">Planifier une session</h2>
        <span class="rounded-full bg-social-voile px-2.5 py-1 text-[11px] font-bold text-social">
          Réunion Zoom créée automatiquement à la validation
        </span>
      </div>
      <p class="mt-1.5 mb-[18px] text-[12.5px] leading-[1.6] text-discret">
        Un seul compte Zoom licencié héberge les sessions successives — l’agenda empêche tout
        chevauchement. Les informations techniques Zoom ne sont jamais montrées aux apprenants :
        ils rejoignent via le bouton « Rejoindre la session » de leur espace, sans quitter la
        plateforme.
      </p>

      <div class="mb-[14px] grid gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
        <label class="flex flex-col gap-[5px] text-[12px] font-bold">
          Programme
          <input :value="programmeCreation" disabled class="w-full rounded-[10px] border-[1.5px] border-ligne px-[13px] py-[11px] text-[13px] bg-fond-clair text-discret">
        </label>
        <label class="flex flex-col gap-[5px] text-[12px] font-bold">
          Thématique
          <select v-model="creation.thematiqueId" required class="w-full rounded-[10px] border-[1.5px] border-ligne px-[13px] py-[11px] text-[13px] bg-white">
            <option value="">Choisir…</option>
            <option v-for="t in thematiques" :key="t.id" :value="t.id">
              {{ t.programme === 'social-media' ? 'SM' : 'ENT' }} · {{ t.nom }}
            </option>
          </select>
        </label>
        <div class="flex flex-col gap-[5px] text-[12px] font-bold">
          Modules éligibles
          <p class="w-full rounded-[10px] border-[1.5px] border-ligne px-[13px] py-[11px] text-[13px] bg-fond-clair" :class="modulesEligibles.length ? 'font-normal text-texte' : 'font-normal text-discret'">
            {{ modulesEligibles.length ? `${modulesEligibles.join(', ')} (auto)` : '— (auto)' }}
          </p>
        </div>
        <label class="flex flex-col gap-[5px] text-[12px] font-bold">
          Formateur
          <select v-model="creation.formateurId" required class="w-full rounded-[10px] border-[1.5px] border-ligne px-[13px] py-[11px] text-[13px] bg-white">
            <option value="">Choisir…</option>
            <option v-for="f in formateurs" :key="f.id" :value="f.id">{{ f.nom }}</option>
          </select>
        </label>
      </div>

      <label class="flex flex-col gap-[5px] text-[12px] font-bold mb-[14px]">
        Titre du coaching <span class="font-normal text-discret">(facultatif)</span>
        <input
          v-model="creation.titre"
          placeholder="Repris de la thématique si laissé vide"
          class="w-full rounded-[10px] border-[1.5px] border-ligne px-[13px] py-[11px] text-[13px]"
        >
      </label>

      <div class="mb-[14px] grid gap-[14px] sm:grid-cols-3 lg:grid-cols-6">
        <label class="flex flex-col gap-[5px] text-[12px] font-bold">
          Date
          <input v-model="creation.date" type="date" required class="w-full rounded-[10px] border-[1.5px] border-ligne px-[13px] py-[11px] text-[13px]">
        </label>
        <label class="flex flex-col gap-[5px] text-[12px] font-bold">
          Heure de début
          <input v-model="creation.heure" type="time" required class="w-full rounded-[10px] border-[1.5px] border-ligne px-[13px] py-[11px] text-[13px]">
        </label>
        <label class="flex flex-col gap-[5px] text-[12px] font-bold">
          Fuseau
          <select v-model="creation.fuseau" class="w-full rounded-[10px] border-[1.5px] border-ligne px-[13px] py-[11px] text-[13px] bg-white">
            <option value="GMT (Abidjan)">GMT (Abidjan)</option>
          </select>
        </label>
        <label class="flex flex-col gap-[5px] text-[12px] font-bold">
          Durée
          <input v-model.number="creation.dureeMinutes" type="number" min="30" step="15" required class="w-full rounded-[10px] border-[1.5px] border-ligne px-[13px] py-[11px] text-[13px] bg-fond-clair">
        </label>
        <label class="flex flex-col gap-[5px] text-[12px] font-bold">
          Capacité
          <input v-model.number="creation.places" type="number" min="1" required class="w-full rounded-[10px] border-[1.5px] border-ligne px-[13px] py-[11px] text-[13px] bg-fond-clair">
        </label>
        <label class="flex flex-col gap-[5px] text-[12px] font-bold">
          Ouverture de la salle
          <select v-model.number="creation.ouvertureSalleMinutes" class="w-full rounded-[10px] border-[1.5px] border-ligne px-[13px] py-[11px] text-[13px] bg-white">
            <option :value="15">15 min avant</option>
            <option :value="10">10 min avant</option>
            <option :value="5">5 min avant</option>
          </select>
        </label>
      </div>

      <div class="flex flex-wrap items-center gap-[18px]">
        <label class="flex items-center gap-2 text-[12.5px] font-semibold text-texte">
          <input v-model="creation.enregistrement" type="checkbox" class="size-4 accent-social">
          Activer l’enregistrement de la session
        </label>
        <p v-if="erreur" class="text-[13.5px] text-erreur">{{ erreur }}</p>
        <UiBaseButton type="submit" taille="sm" class="ml-auto">
          Valider et créer la réunion Zoom
        </UiBaseButton>
      </div>

      <p class="mt-4 border-t border-ligne-claire pt-3 text-[12px] leading-[1.6] text-discret">
        Apprenants autorisés : acheteurs des modules couverts, profil à 100 %. À la validation :
        session visible dans leur calendrier, bouton « Rejoindre » activé à l’ouverture de la
        salle · notification email + WhatsApp.
      </p>
    </form>

    <div v-if="modification" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <form class="w-full max-w-xl rounded-carte bg-white p-[26px] shadow-[0_16px_40px_rgba(23,21,28,.12)]" @submit.prevent="enregistrerModification">
        <h2 class="font-sans text-[16px] font-bold">
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
      <form class="w-full max-w-md rounded-carte bg-white p-[26px] shadow-[0_16px_40px_rgba(23,21,28,.12)]" @submit.prevent="reporter">
        <h2 class="font-sans text-[16px] font-bold">
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
      <div class="w-full max-w-md rounded-carte bg-white p-[26px] shadow-[0_16px_40px_rgba(23,21,28,.12)]">
        <h2 class="font-sans text-[16px] font-bold">
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
      <div class="w-full max-w-[460px] rounded-carte bg-white p-[26px] shadow-[0_16px_40px_rgba(23,21,28,.12)]">
        <h2 class="font-sans text-[16px] font-bold">
          Annuler la session du {{ formatDate(annulation.date) }} ?
        </h2>
        <p class="mt-2.5 mb-3.5 text-[13px] leading-[1.6] text-texte">
          Les <b>{{ annulation.inscrits }} apprenants inscrits</b> seront prévenus immédiatement par
          <b>email ET WhatsApp</b>. Cette action est journalisée dans l’historique.
        </p>
        <label class="mb-4 flex flex-col gap-1.5 text-[12.5px] font-bold text-texte">
          Motif (optionnel, inclus dans la notification)
          <textarea v-model="motif" rows="3" placeholder="Ex : indisponibilité du formateur" class="w-full rounded-[10px] border-[1.5px] border-ligne px-[13px] py-[11px] text-[13.5px] font-normal" />
        </label>
        <!-- Annuler est destructif : la maquette le peint en rouge, à parts
             égales avec le retour. -->
        <div class="flex gap-2.5">
          <UiBaseButton taille="sm" variante="danger" class="flex-1" @click="annuler">Annuler et notifier</UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" class="flex-1" @click="annulation = null">Retour</UiBaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
