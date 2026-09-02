<script setup lang="ts">
import type { CreneauCoaching, DemandeCoachingPrive, HistoriqueCoachingPrive, StatutCoachingPrive } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Coaching privé — administration')

type Demande = DemandeCoachingPrive & {
  module: string
  formateur: string
  montant: number
  historique: HistoriqueCoachingPrive[]
}
type Action = 'confirmer' | 'marquer-payee' | 'planifier' | 'realisee' | 'refuser'

const { data, refresh } = await useFetch<{
  demandes: Demande[]
  statistiquesFormateurs: {
    id: string
    nom: string
    nbModules: number
    inscrits: number
    completion: number
    presence: number | null
    coachingPrive: number
  }[]
}>('/api/admin/coaching-prive')

const filtre = ref<StatutCoachingPrive | 'toutes'>('toutes')
const filtres: { valeur: StatutCoachingPrive | 'toutes'; libelle: string }[] = [
  { valeur: 'toutes', libelle: 'Toutes' },
  { valeur: 'en-attente', libelle: 'À traiter' },
  { valeur: 'confirmee-attente-paiement', libelle: 'Attente de paiement' },
  { valeur: 'payee', libelle: 'Payées' },
  { valeur: 'realisee', libelle: 'Réalisées' },
  { valeur: 'refusee', libelle: 'Refusées' },
]
const visibles = computed(() =>
  (data.value?.demandes ?? []).filter((d) => filtre.value === 'toutes' || d.statut === filtre.value),
)

/** Modale ouverte : la demande et l'action en cours. */
const modale = ref<{ demande: Demande; action: Action } | null>(null)
const creneauChoisi = ref<CreneauCoaching | null>(null)
const creneauLibre = ref('')
const lienSession = ref('')
const motif = ref('')
const commentaire = ref('')
const message = ref('')
const erreur = ref('')
const envoi = ref(false)

function ouvrir(demande: Demande, action: Action) {
  modale.value = { demande, action }
  creneauChoisi.value = demande.creneaux[0] ?? null
  creneauLibre.value = demande.creneau ?? ''
  lienSession.value = demande.lienSession ?? ''
  motif.value = ''
  commentaire.value = ''
  erreur.value = ''
}

async function agir(demande: Demande, action: Action, extra: Record<string, unknown> = {}) {
  erreur.value = ''
  envoi.value = true
  try {
    await $fetch('/api/admin/coaching-prive', { method: 'PATCH', body: { id: demande.id, action, ...extra } })
    message.value = `Demande ${demande.id} mise à jour.`
    modale.value = null
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Action impossible.'
  } finally {
    envoi.value = false
  }
}

function valider() {
  if (!modale.value) return
  const { demande, action } = modale.value
  const creneau = creneauChoisi.value ?? creneauLibre.value
  if (action === 'refuser') return agir(demande, action, { motif })
  if (action === 'planifier') return agir(demande, action, { creneau, lienSession })
  return agir(demande, action, { creneau, commentaire })
}

const TITRES: Record<Action, string> = {
  confirmer: 'Confirmer et envoyer le lien de paiement',
  'marquer-payee': 'Marquer la demande payée',
  planifier: 'Planifier la séance',
  realisee: 'Clore la séance',
  refuser: 'Refuser la demande',
}
</script>

<template>
  <div v-if="data">
    <h1 class="font-title text-[26px] font-light">Demandes de coaching privé</h1>
    <p class="mt-2 text-[12.5px] text-discret">
      Tarif fixe : 50 000 FCFA / h. Aucun paiement n’est demandé avant confirmation du créneau.
      Chaque action est journalisée et l’apprenant est prévenu par e-mail et WhatsApp.
    </p>

    <div class="mt-4 flex flex-wrap gap-2">
      <button
        v-for="f in filtres"
        :key="f.valeur"
        class="rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold"
        :class="filtre === f.valeur ? 'border-encre bg-encre text-white' : 'border-ligne text-texte'"
        @click="filtre = f.valeur"
      >
        {{ f.libelle }}
      </button>
    </div>

    <p v-if="message" class="mt-4 rounded-[12px] border border-succes bg-succes-voile p-3 text-[13.5px] text-succes">{{ message }}</p>
    <p v-if="erreur && !modale" class="mt-4 rounded-[12px] border border-erreur bg-[#fdeeee] p-3 text-[13.5px] text-erreur">{{ erreur }}</p>

    <div class="mt-5 flex flex-col gap-4">
      <article
        v-for="demande in visibles"
        :key="demande.id"
        class="rounded-[14px] border bg-white p-6"
        :class="demande.statut === 'payee' ? 'border-succes' : 'border-ligne-douce'"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-[280px] flex-1">
            <h2 class="font-title text-[19px] font-light">
              {{ demande.apprenant }} — {{ demande.module }}
            </h2>
            <p class="mt-1 text-[12.5px] text-discret">
              {{ demande.id }} · reçue le {{ formatDate(demande.recueLe) }} · formateur : {{ demande.formateur }}
            </p>
            <p class="mt-2 whitespace-pre-line text-[13.5px] text-texte">{{ demande.besoins }}</p>
            <p class="mt-1 text-[13.5px] text-texte">
              <span class="text-discret">Créneaux proposés :</span>
              <template v-if="demande.creneaux.length">{{ demande.creneaux.map(formatCreneau).join(' · ') }}</template>
              <template v-else>—</template>
              <span v-if="demande.disponibilites !== '—'" class="text-discret"> · {{ demande.disponibilites }}</span>
            </p>
            <p v-if="demande.creneau" class="mt-1 text-[13px] text-succes">Créneau retenu : {{ demande.creneau }}</p>
            <p v-if="demande.lienSession" class="mt-1 text-[13px] text-texte">
              Lien de session : <a :href="demande.lienSession" class="underline" target="_blank" rel="noopener">{{ demande.lienSession }}</a>
            </p>
            <p v-if="demande.motifRefus" class="mt-1 text-[13px] text-erreur">Motif du refus : {{ demande.motifRefus }}</p>
          </div>
          <div class="text-right">
            <span class="inline-block rounded-full px-3 py-1.5 text-[12px] font-bold" :class="CLASSES_COACHING_PRIVE[demande.statut]">
              {{ LIBELLES_COACHING_PRIVE[demande.statut] }}
            </span>
            <p class="mt-2 text-[13px] text-texte">{{ demande.heures }} h — {{ formatFcfa(demande.montant) }}</p>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <template v-if="demande.statut === 'en-attente'">
            <UiBaseButton taille="sm" @click="ouvrir(demande, 'confirmer')">Confirmer + envoyer le lien de paiement</UiBaseButton>
            <UiBaseButton taille="sm" variante="contour" @click="ouvrir(demande, 'refuser')">Refuser</UiBaseButton>
          </template>
          <template v-else-if="demande.statut === 'confirmee-attente-paiement'">
            <UiBaseButton taille="sm" @click="agir(demande, 'marquer-payee')">Marquer payée</UiBaseButton>
            <UiBaseButton taille="sm" variante="contour" @click="ouvrir(demande, 'refuser')">Refuser</UiBaseButton>
          </template>
          <template v-else-if="demande.statut === 'payee'">
            <UiBaseButton taille="sm" variante="sombre" @click="ouvrir(demande, 'planifier')">
              {{ demande.lienSession ? 'Modifier la séance' : 'Planifier + générer le lien de session' }}
            </UiBaseButton>
            <UiBaseButton v-if="demande.lienSession" taille="sm" variante="contour" @click="agir(demande, 'realisee')">Marquer réalisée</UiBaseButton>
          </template>
          <UiBaseButton taille="sm" variante="contour" :to="`/admin/apprenants?utilisateur=${demande.utilisateurId}`">
            Voir la fiche apprenant
          </UiBaseButton>
        </div>

        <details class="mt-4">
          <summary class="cursor-pointer text-[12.5px] text-discret">Suivi ({{ demande.historique.length }})</summary>
          <EspaceHistoriqueStatuts class="mt-3" :entrees="demande.historique" />
        </details>
      </article>
      <p v-if="!visibles.length" class="text-[13.5px] text-discret">Aucune demande dans ce filtre.</p>
    </div>

    <h2 class="mt-10 font-title text-[19px] font-light">Statistiques par formateur</h2>
    <p class="mt-1 text-[12.5px] text-discret">
      Vue consolidée : chaque formateur ne voit que ses propres chiffres dans son espace.
    </p>
    <AdminTableauSimple
      class="mt-3"
      :colonnes="['Formateur', 'Modules', 'Inscrits', 'Complétion', 'Présence sessions', 'Coaching privé']"
    >
      <tr v-for="f in data.statistiquesFormateurs" :key="f.id">
        <td class="px-4 py-3 font-bold">{{ f.nom }}</td>
        <td class="px-4 py-3">{{ f.nbModules }}</td>
        <td class="px-4 py-3">{{ f.inscrits }}</td>
        <td class="px-4 py-3">{{ f.completion }} %</td>
        <td class="px-4 py-3">{{ f.presence === null ? '—' : `${f.presence} %` }}</td>
        <td class="px-4 py-3">{{ f.coachingPrive }}</td>
      </tr>
    </AdminTableauSimple>

    <div v-if="modale" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <div class="w-full max-w-lg rounded-carte bg-white p-6">
        <h2 class="font-title text-[21px] font-light">{{ TITRES[modale.action] }}</h2>
        <p class="mt-1 text-[13.5px] text-discret">{{ modale.demande.apprenant }} — {{ modale.demande.module }} · {{ modale.demande.formateur }}</p>

        <form class="mt-5 space-y-4" @submit.prevent="valider">
          <fieldset v-if="modale.action !== 'refuser'">
            <legend class="mb-2 text-[13px] font-bold text-texte">Créneau retenu</legend>
            <label v-for="(c, i) in modale.demande.creneaux" :key="i" class="mb-1.5 flex items-center gap-2 text-[14px]">
              <input v-model="creneauChoisi" type="radio" :value="c" class="accent-social">
              {{ formatCreneau(c) }}
            </label>
            <label class="mt-2 block">
              <span class="mb-1 block text-[12.5px] text-discret">Ou un autre créneau convenu avec le formateur</span>
              <input v-model="creneauLibre" class="w-full rounded-[10px] border border-ligne px-3 py-2 text-[14px]" placeholder="Samedi 12/09, 10h – 12h" @input="creneauChoisi = null">
            </label>
          </fieldset>

          <label v-if="modale.action === 'planifier'" class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Lien de la séance (Zoom) *</span>
            <input v-model="lienSession" type="url" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]" placeholder="https://zoom.us/j/…">
          </label>

          <label v-if="modale.action === 'refuser'" class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Motif communiqué à l’apprenant *</span>
            <textarea v-model="motif" rows="3" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]" />
          </label>

          <label v-else class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Commentaire (optionnel, visible de l’apprenant)</span>
            <input v-model="commentaire" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>

          <p v-if="erreur" class="text-[13.5px] text-erreur">{{ erreur }}</p>

          <div class="flex flex-wrap gap-2">
            <UiBaseButton type="submit" taille="sm" :disabled="envoi">Valider</UiBaseButton>
            <UiBaseButton taille="sm" variante="contour" @click="modale = null">Annuler</UiBaseButton>
          </div>
        </form>

        <p class="mt-4 text-[12px] text-discret">
          <template v-if="modale.action === 'confirmer'">L’apprenant reçoit la confirmation du créneau et le lien de paiement FeexPay.</template>
          <template v-else-if="modale.action === 'planifier'">L’apprenant et le formateur reçoivent la date, l’heure et le lien de la séance.</template>
          <template v-else-if="modale.action === 'refuser'">Le motif est transmis tel quel à l’apprenant.</template>
        </p>
      </div>
    </div>
  </div>
</template>
