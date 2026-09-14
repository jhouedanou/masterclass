<script setup lang="ts">
import type { DemandeCoachingPrive, HistoriqueCoachingPrive, ProgrammeSlug } from '#shared/types'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Mes demandes de coaching privé')

type Demande = DemandeCoachingPrive & {
  module: string
  formateur: { id: string; nom: string; photo: string } | null
  montant: number
  historique: HistoriqueCoachingPrive[]
  notee: boolean
}

const route = useRoute()
const achat = useAchatStore()
const { data, refresh } = await useFetch<{
  demandes: Demande[]
  formateursDisponibles: { id: string; nom: string; expertise: string; photo: string; tarifHeure: number }[]
  modulesPossedes: { id: string; titre: string; formateurId: string; programme: ProgrammeSlug }[]
}>('/api/mon-espace/coaching-prive')

// Arrivée depuis une fiche formateur ou le tableau de bord : le formulaire s'ouvre.
const formateurInitial = typeof route.query.formateur === 'string' ? route.query.formateur : undefined
const nouvelle = ref(Boolean(formateurInitial) || route.query.nouvelle === '1')
const notation = ref<Demande | null>(null)
const sujets = ref<Demande | null>(null)
const autreCreneau = ref<Demande | null>(null)
const creneauSouhaite = reactive({ date: '', debut: '18:00', fin: '19:00', message: '' })
const message = ref('')
const erreur = ref('')
const envoi = ref(false)

/** Demande à créneau proposé : la carte « Tarif proposé » (planche B, écran 10). */
const proposee = computed(() => data.value?.demandes.find((d) => d.statut === 'confirmee-attente-paiement') ?? null)
const annulable = (d: Demande) => d.statut === 'en-attente' || d.statut === 'en-etude' || d.statut === 'confirmee-attente-paiement'

async function envoyer(payload: Record<string, unknown>) {
  erreur.value = ''
  envoi.value = true
  try {
    await $fetch('/api/mon-espace/coaching-prive', { method: 'POST', body: payload })
    message.value = 'Demande envoyée. L’équipe la traite sous 48 h ouvrées.'
    nouvelle.value = false
    await refresh()
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreur.value = r.data?.statusMessage ?? r.statusMessage ?? 'Envoi impossible.'
  } finally {
    envoi.value = false
  }
}

/** « Accepter et payer » : la séance passe par le tunnel de paiement FeexPay. */
async function accepterEtPayer(d: Demande) {
  achat.definirSeance({
    demandeId: d.id,
    titre: `Coaching privé — ${d.formateur?.nom ?? ''}`,
    prixFcfa: d.montantFcfa ?? d.montant,
    heures: d.heures,
    creneau: d.creneau ?? '',
    formateur: d.formateur?.nom ?? '',
  })
  await navigateTo('/achat/paiement')
}

async function proposerAutreCreneau() {
  if (!autreCreneau.value) return
  erreur.value = ''
  try {
    await $fetch(`/api/mon-espace/coaching-prive/${autreCreneau.value.id}/proposer-creneau`, {
      method: 'POST',
      body: { creneau: { date: creneauSouhaite.date, debut: creneauSouhaite.debut, fin: creneauSouhaite.fin }, message: creneauSouhaite.message },
    })
    message.value = 'Votre souhait est transmis : l’équipe revient vers vous avec une nouvelle proposition.'
    autreCreneau.value = null
    await refresh()
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreur.value = r.data?.statusMessage ?? r.statusMessage ?? 'Envoi impossible.'
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

/** Étape obligatoire avant d'entrer dans la salle (écran 08b, coaching privé). */
async function rejoindre(reponses: { preoccupation: string; attente: string }) {
  const d = sujets.value!
  await $fetch('/api/mon-espace/coaching-prive/sujets', {
    method: 'POST',
    body: { demandeId: d.id, ...reponses },
  }).catch(() => undefined)
  sujets.value = null
  await navigateTo(`/mon-espace/session/prive-${d.id}`)
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

const aujourdHui = new Date().toISOString().slice(0, 10)
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-[30px] font-medium">Mes demandes de coaching privé</h1>
        <p class="mt-2 max-w-[720px] text-[15px] text-texte">
          Traitées par l’équipe sous 48 h ouvrées. Tarif fixe : 50 000 FCFA / heure. Le paiement
          n’intervient qu’après votre accord sur le créneau proposé.
        </p>
      </div>
      <UiBaseButton :disabled="!data.modulesPossedes.length" @click="nouvelle = true">
        Demander un coaching privé
      </UiBaseButton>
    </div>

    <p v-if="!data.modulesPossedes.length" class="mt-5 rounded-[12px] border border-alerte bg-alerte-voile p-4 text-[14px] text-alerte">
      Le coaching privé porte sur un module que vous possédez.
      <NuxtLink to="/modules" class="font-bold underline">Découvrir les modules</NuxtLink>.
    </p>
    <p v-if="message" class="mt-5 rounded-[12px] border border-succes bg-succes-voile p-4 text-[14px] text-succes" role="status">{{ message }}</p>
    <p v-if="erreur && !nouvelle" class="mt-5 rounded-[12px] border border-erreur bg-[#fdeeee] p-4 text-[14px] text-erreur" role="alert">{{ erreur }}</p>

    <!-- Tarif proposé -->
    <section v-if="proposee" class="mt-8 rounded-[14px] border border-social bg-social-voile p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="font-title text-[21px] font-light">{{ proposee.formateur?.nom }} — {{ proposee.module }}</h2>
          <p class="mt-1 text-[13.5px] text-texte">
            Demande du {{ formatDate(proposee.recueLe) }} · « {{ proposee.besoins.split('\n')[0] }} » · Proposition :
          </p>
          <p class="mt-2 text-[16px] font-bold text-encre">
            {{ proposee.heures }} h ({{ formatFcfa(proposee.montantFcfa ?? proposee.montant) }}) · {{ proposee.creneau }}
          </p>
        </div>
        <span class="surtitre text-social">Tarif proposé</span>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <UiBaseButton @click="accepterEtPayer(proposee)">Accepter et payer</UiBaseButton>
        <UiBaseButton variante="contour" @click="autreCreneau = proposee">Proposer un autre créneau</UiBaseButton>
      </div>
    </section>

    <!-- Les 6 statuts -->
    <section class="mt-8">
      <p class="surtitre text-discret">Les 6 statuts d’une demande</p>
      <ol class="mt-3 flex flex-wrap gap-2 text-[12.5px]">
        <li v-for="s in STATUTS_COACHING_PRIVE" :key="s.statut" class="rounded-full border border-ligne px-3 py-1.5 text-texte">
          <b>{{ s.numero }}</b> · {{ s.libelle }}
        </li>
      </ol>
    </section>

    <!-- Séances confirmées / en cours -->
    <div class="mt-8 flex flex-col gap-4">
      <article
        v-for="d in data.demandes.filter((x) => x.statut === 'payee')"
        :key="d.id"
        class="rounded-[14px] border border-succes bg-white p-6"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex min-w-[260px] flex-1 items-start gap-4">
            <img v-if="d.formateur" :src="d.formateur.photo" alt="" class="size-12 rounded-full bg-fond-voile object-cover">
            <div>
              <h2 class="font-title text-[19px] font-light">{{ d.formateur?.nom ?? 'Formateur' }}</h2>
              <p class="mt-0.5 text-[13px] text-discret">{{ d.module }} · {{ d.heures }} h · {{ formatFcfa(d.montantFcfa ?? d.montant) }}</p>
              <p v-if="d.creneau" class="mt-1 text-[14px] font-bold text-succes">{{ d.creneau }}</p>
            </div>
          </div>
          <span class="rounded-full px-3 py-1.5 text-[12px] font-bold" :class="CLASSES_COACHING_PRIVE[d.statut]">
            {{ LIBELLES_COACHING_PRIVE[d.statut] }}
          </span>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <UiBaseButton taille="sm" @click="sujets = d">Rejoindre la session</UiBaseButton>
        </div>
      </article>
    </div>

    <!-- Historique de vos demandes -->
    <section class="mt-10">
      <p class="surtitre text-discret">Historique de vos demandes</p>
      <div class="mt-3 overflow-x-auto rounded-[14px] border border-ligne-douce bg-white">
        <table class="w-full text-[14px]">
          <thead class="bg-fond-clair text-left text-[12px] tracking-[0.06em] text-discret uppercase">
            <tr>
              <th class="px-4 py-3 font-bold">Date</th>
              <th class="px-4 py-3 font-bold">Formateur — module</th>
              <th class="px-4 py-3 font-bold">Heures</th>
              <th class="px-4 py-3 font-bold">Statut</th>
              <th class="px-4 py-3"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ligne-claire">
            <tr v-for="d in data.demandes" :key="d.id">
              <td class="whitespace-nowrap px-4 py-3">{{ formatDate(d.recueLe) }}</td>
              <td class="px-4 py-3">
                <span class="font-bold text-encre">{{ d.formateur?.nom }}</span>
                <span class="text-discret"> — {{ d.module }}</span>
                <details v-if="d.historique.length" class="mt-1 text-[12.5px] text-discret">
                  <summary class="cursor-pointer">Suivi daté</summary>
                  <EspaceHistoriqueStatuts class="mt-2" :entrees="d.historique" />
                </details>
              </td>
              <td class="whitespace-nowrap px-4 py-3">{{ d.heures }} h</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2.5 py-1 text-[12px] font-bold" :class="CLASSES_COACHING_PRIVE[d.statut]">
                  {{ LIBELLES_COACHING_PRIVE[d.statut] }}<template v-if="d.statut === 'realisee'"> ✓</template>
                </span>
                <p v-if="d.motifRefus" class="mt-1 text-[12.5px] text-erreur">Motif : {{ d.motifRefus }}</p>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right">
                <UiBaseButton v-if="d.statut === 'realisee' && !d.notee" taille="sm" variante="contour" @click="notation = d">
                  Noter le formateur
                </UiBaseButton>
                <span v-else-if="d.statut === 'realisee'" class="text-[12.5px] text-discret">Notée ✓</span>
                <button v-else-if="annulable(d)" type="button" class="text-[12.5px] text-discret underline" @click="annuler(d)">
                  Retirer
                </button>
              </td>
            </tr>
            <tr v-if="!data.demandes.length">
              <td colspan="5" class="px-4 py-6 text-center text-discret">Aucune demande pour l’instant.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

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

    <EspaceModaleSujets
      v-if="sujets"
      prive
      titre="Confirmez vos sujets avant d’entrer"
      :sous-titre="`Coaching privé — ${sujets.creneau ?? ''} · ${sujets.heures} h · ${sujets.formateur?.nom ?? ''}`"
      contexte="Préoccupations / sujets à traiter"
      :valeur-initiale="sujets.besoins"
      @fermer="sujets = null"
      @envoyer="rejoindre"
    />

    <div v-if="autreCreneau" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <form class="w-full max-w-md rounded-carte bg-white p-6" @submit.prevent="proposerAutreCreneau">
        <h2 class="font-title text-[21px] font-light">Proposer un autre créneau</h2>
        <p class="mt-1 text-[13.5px] text-discret">{{ autreCreneau.formateur?.nom }} · {{ autreCreneau.heures }} h</p>
        <div class="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
          <input v-model="creneauSouhaite.date" type="date" required :min="aujourdHui" class="rounded-[10px] border border-ligne px-3 py-2 text-[14px]">
          <input v-model="creneauSouhaite.debut" type="time" required class="rounded-[10px] border border-ligne px-2 py-2 text-[14px]">
          <input v-model="creneauSouhaite.fin" type="time" required class="rounded-[10px] border border-ligne px-2 py-2 text-[14px]">
        </div>
        <textarea v-model="creneauSouhaite.message" rows="2" placeholder="Un mot pour l’équipe (optionnel)" class="mt-3 w-full rounded-[10px] border border-ligne px-3 py-2 text-[14px]" />
        <div class="mt-4 flex flex-wrap gap-2">
          <UiBaseButton type="submit" taille="sm">Envoyer</UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="autreCreneau = null">Annuler</UiBaseButton>
        </div>
      </form>
    </div>

    <EspaceModaleNotation
      v-if="notation"
      titre="Notez votre formateur"
      :sous-titre="`Coaching privé du ${notation.creneau ?? formatDate(notation.recueLe)} — ${notation.formateur?.nom} · ${notation.module}`"
      @fermer="notation = null"
      @envoyer="noter"
    />
  </div>
</template>
