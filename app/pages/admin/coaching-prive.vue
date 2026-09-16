<script setup lang="ts">
import type { CreneauCoaching, DemandeCoachingPrive, HistoriqueCoachingPrive } from '#shared/types'

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
    nbSessions: number
    inscrits: number
    completion: number
    presence: number | null
    coachingPrive: number
  }[]
}>('/api/admin/coaching-prive')

const filtre = ref('toutes')
const filtres: { valeur: string; libelle: string }[] = [
  { valeur: 'toutes', libelle: 'Tous statuts' },
  { valeur: 'en-attente', libelle: 'À traiter' },
  { valeur: 'en-etude', libelle: 'En étude' },
  { valeur: 'confirmee-attente-paiement', libelle: 'Attente de paiement' },
  { valeur: 'payee', libelle: 'Payées' },
  { valeur: 'realisee', libelle: 'Réalisées' },
  { valeur: 'refusee', libelle: 'Refusées' },
  { valeur: 'expiree', libelle: 'Expirées' },
]

/**
 * La maquette ne dessine une carte complète que pour les demandes qui
 * appellent une décision ; les autres se rangent en ligne-carte.
 */
const AVEC_ACTIONS: string[] = ['en-attente', 'confirmee-attente-paiement', 'payee']
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
/** Durée retenue avec le formateur : le montant en découle (heures × tarif).
 *  La maquette pose le sélecteur dans la carte : il lui faut une valeur par
 *  demande, pas une valeur partagée. */
const heures = ref(1)
const heuresParDemande = reactive<Record<string, number>>({})
watch(
  () => data.value?.demandes,
  (liste) => {
    for (const d of liste ?? []) heuresParDemande[d.id] ??= d.heures
  },
  { immediate: true },
)
const TARIF_HORAIRE = 50_000
const message = ref('')
const erreur = ref('')
const envoi = ref(false)

function ouvrir(demande: Demande, action: Action) {
  modale.value = { demande, action }
  heures.value = heuresParDemande[demande.id] ?? demande.heures
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
  if (action === 'confirmer') return agir(demande, action, { creneau, commentaire, heures: heures.value })
  return agir(demande, action, { creneau, commentaire })
}

const filtreFormateur = ref('')
const optionsFormateurs = computed(() => [
  { valeur: '', libelle: 'Tous les formateurs' },
  ...(data.value?.statistiquesFormateurs ?? []).map((f) => ({ valeur: f.id, libelle: f.nom })),
])
const statistiquesVisibles = computed(() =>
  (data.value?.statistiquesFormateurs ?? []).filter(
    (f) => !filtreFormateur.value || f.id === filtreFormateur.value,
  ),
)

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
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[22px] font-light">Demandes de coaching privé</h1>
      <UiFiltrePilule v-model="filtre" etiquette="Statut" :options="filtres" />
    </div>

    <p v-if="message" class="mb-4 rounded-[12px] border border-succes bg-succes-voile p-3 text-[13.5px] text-succes">{{ message }}</p>
    <p v-if="erreur && !modale" class="mb-4 rounded-[12px] border border-erreur bg-erreur-voile p-3 text-[13.5px] text-erreur">{{ erreur }}</p>

    <div class="flex flex-col gap-3">
      <template v-for="demande in visibles" :key="demande.id">
        <!-- Carte de décision : titre dans la carte, en Mulish gras 15 px. -->
        <article
          v-if="AVEC_ACTIONS.includes(demande.statut)"
          class="rounded-bloc border bg-white p-5"
          :class="demande.statut === 'payee' ? 'border-[1.5px] border-entrepreneurs' : 'border-ligne-douce'"
        >
          <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
            <b class="text-[15px]">{{ demande.apprenant }} — {{ demande.module }}</b>
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
              :class="CLASSES_COACHING_PRIVE[demande.statut]"
            >
              {{ LIBELLES_COACHING_PRIVE[demande.statut] }}
              <template v-if="demande.statut === 'en-attente'">
                · reçue {{ formatRelatif(demande.recueLe) }}
              </template>
              <template v-else>
                — {{ demande.heures }} h · {{ formatFcfa(demande.montant) }}
              </template>
            </span>
          </div>

          <p class="mb-1.5 text-[13px] leading-[1.6] text-texte">
            <b>Besoins :</b> {{ demande.besoins }}
          </p>
          <p class="mb-3.5 text-[13px] text-texte">
            <b>Disponibilités :</b>
            <template v-if="demande.creneaux.length">
              {{ demande.creneaux.map(formatCreneau).join(' · ') }}
            </template>
            <template v-else>—</template>
            <span v-if="demande.disponibilites !== '—'"> · {{ demande.disponibilites }}</span>
          </p>
          <p v-if="demande.creneau" class="mb-2 text-[13px] text-texte">
            Créneau retenu : <b>{{ demande.creneau }}</b>
          </p>
          <p v-if="demande.lienSession" class="mb-2 text-[13px] text-texte">
            Lien de session :
            <a :href="demande.lienSession" target="_blank" rel="noopener">{{ demande.lienSession }}</a>
          </p>

          <div class="flex flex-wrap items-center gap-2.5">
            <template v-if="demande.statut === 'en-attente'">
              <label class="flex items-center gap-2 text-[12.5px] font-bold">
                Heures
                <select
                  v-model.number="heuresParDemande[demande.id]"
                  class="rounded-[8px] border-[1.5px] border-ligne px-3 py-2.5 text-[13px] font-normal"
                >
                  <option v-for="h in [1, 2, 3]" :key="h" :value="h">
                    {{ h }} h — {{ formatFcfa(h * TARIF_HORAIRE) }}
                  </option>
                </select>
              </label>
              <span class="text-[11.5px] text-discret">Tarif fixe : 50 000 FCFA / h</span>
              <UiBaseButton taille="sm" variante="sombre" @click="ouvrir(demande, 'confirmer')">
                Confirmer + envoyer le lien de paiement
              </UiBaseButton>
              <UiBaseButton taille="sm" variante="contour" @click="ouvrir(demande, 'refuser')">
                Annuler
              </UiBaseButton>
            </template>
            <template v-else-if="demande.statut === 'confirmee-attente-paiement'">
              <UiBaseButton taille="sm" variante="sombre" @click="agir(demande, 'marquer-payee')">
                Marquer payée
              </UiBaseButton>
              <UiBaseButton taille="sm" variante="contour" @click="ouvrir(demande, 'refuser')">
                Annuler
              </UiBaseButton>
            </template>
            <template v-else>
              <UiBaseButton taille="sm" variante="entrepreneurs" @click="ouvrir(demande, 'planifier')">
                {{ demande.lienSession ? 'Modifier la séance' : 'Générer le lien de session' }}
              </UiBaseButton>
              <UiBaseButton v-if="demande.lienSession" taille="sm" variante="contour" @click="agir(demande, 'realisee')">
                Marquer réalisée
              </UiBaseButton>
            </template>
            <NuxtLink
              :to="`/admin/apprenants?utilisateur=${demande.utilisateurId}`"
              class="text-[12.5px] font-bold"
            >
              Voir la fiche apprenant
            </NuxtLink>
          </div>

          <p class="mt-2.5 text-[11.5px] leading-[1.6] text-discret">
            <template v-if="demande.statut === 'payee'">
              Crée l’événement dans l’agenda Google — invités : apprenant + formateur choisi — avec
              date, heure, thématique et problématique · notifications programmées · email de
              confirmation envoyé automatiquement aux participants.
            </template>
            <template v-else>
              Rappel automatique à l’équipe si aucune réponse sous 48 h. Aucun paiement demandé
              avant confirmation.
            </template>
          </p>
        </article>

        <!-- Ligne-carte : padding 16/20, la demande close ne porte plus d'action. -->
        <article
          v-else
          class="flex flex-wrap items-center justify-between gap-3 rounded-bloc border border-ligne-douce bg-white px-5 py-4 text-[13.5px]"
        >
          <span><b>{{ demande.apprenant }}</b> — {{ demande.module }}</span>
          <span class="flex items-center gap-2.5">
            <span v-if="demande.motifRefus" class="text-[12.5px] text-discret">{{ demande.motifRefus }}</span>
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
              :class="CLASSES_COACHING_PRIVE[demande.statut]"
            >{{ LIBELLES_COACHING_PRIVE[demande.statut] }}</span>
          </span>
        </article>
      </template>
      <p v-if="!visibles.length" class="text-[13.5px] text-discret">Aucune demande dans ce filtre.</p>
    </div>

    <!-- Écran 06 · Statistiques par formateur -->
    <div class="mt-10 mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id="statistiques" class="scroll-mt-6 font-title text-[22px] font-light">
          Statistiques par formateur
        </h2>
        <p class="mt-1 text-[12.5px] text-discret">
          Vue admin consolidée — chaque formateur retrouve ses propres chiffres dans son dashboard.
          Filtres : période · programme · thématique · module · session.
        </p>
      </div>
      <UiFiltrePilule v-model="filtreFormateur" etiquette="Formateur" :options="optionsFormateurs" />
    </div>
    <AdminTableauSimple
      :colonnes="['Formateur', 'Inscrits', 'Complétion', 'Présence sessions', 'Coaching privé']"
      :largeurs="['calc(100% - 370px)', '90px', '90px', '100px', '90px']"
      largeur-min="560px"
    >
      <tr v-for="f in statistiquesVisibles" :key="f.id">
        <!-- Modules et sessions sont la sous-ligne du nom, pas une colonne. -->
        <td class="px-[18px] py-3.5">
          <b>{{ f.nom }}</b>
          <span class="block text-[11.5px] text-discret">
            {{ f.nbModules }} module{{ f.nbModules > 1 ? 's' : '' }} ·
            {{ f.nbSessions }} session{{ f.nbSessions > 1 ? 's' : '' }}
          </span>
        </td>
        <td class="px-[18px] py-3.5 font-bold">{{ f.inscrits }}</td>
        <td class="px-[18px] py-3.5 font-bold">{{ f.completion }} %</td>
        <td class="px-[18px] py-3.5 font-bold">{{ f.presence === null ? '—' : `${f.presence} %` }}</td>
        <td class="px-[18px] py-3.5 font-bold">{{ f.coachingPrive }}</td>
      </tr>
    </AdminTableauSimple>

    <div v-if="modale" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <div class="w-full max-w-lg rounded-carte bg-white p-[26px] shadow-[0_16px_40px_rgba(23,21,28,.12)]">
        <h2 class="font-sans text-[16px] font-bold">{{ TITRES[modale.action] }}</h2>
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

          <fieldset v-if="modale.action === 'confirmer'">
            <legend class="mb-2 text-[13px] font-bold text-texte">Durée retenue</legend>
            <div class="flex flex-wrap gap-2">
              <label v-for="h in [1, 2, 3]" :key="h" class="flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[14px]" :class="heures === h ? 'border-social bg-social-voile' : 'border-ligne'">
                <input v-model.number="heures" type="radio" :value="h" class="accent-social">
                {{ h }} h
              </label>
            </div>
            <p class="mt-2 text-[13px] text-texte">
              Montant proposé : <b>{{ formatFcfa(heures * TARIF_HORAIRE) }}</b>
              <span class="text-discret"> — {{ heures }} × {{ formatFcfa(TARIF_HORAIRE) }} / h</span>
            </p>
          </fieldset>

          <label v-if="modale.action === 'planifier'" class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">
              Lien de la séance <span class="font-normal text-discret">(facultatif)</span>
            </span>
            <input v-model="lienSession" type="url" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]" placeholder="Laissez vide : la réunion Zoom est générée">
            <span class="mt-1 block text-[12.5px] text-discret">
              Laissé vide, le lien est généré avec la réunion Zoom et l’événement Google Agenda,
              rappels compris. Un lien fourni à la main reste accepté en secours.
            </span>
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
          <template v-else-if="modale.action === 'planifier'">
            L’apprenant et le formateur reçoivent la date, l’heure et le lien de la séance, puis un
            rappel 48 h avant.
          </template>
          <template v-else-if="modale.action === 'refuser'">Le motif est transmis tel quel à l’apprenant.</template>
        </p>
      </div>
    </div>
  </div>
</template>
