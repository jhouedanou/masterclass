<script setup lang="ts">
import type { Module, Persona } from '#shared/types'
import type { ColonneCsv } from '~/utils/csv'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Apprenants — administration')

interface CertificatApprenant {
  numero: string
  titreModule: string
  dateDelivrance: string
  revoqueLe: string | null
  motifRevocation: string | null
}

interface ModuleAcquis {
  id: string
  titre: string
  programme: string
  thematiqueId: string
  phaseId: string | null
  formateurId: string
  origine: 'achat' | 'attribution'
  acheteLe: string
  progression: number
}

interface Apprenant {
  id: string
  nom: string
  email: string
  whatsapp: string
  pays: string
  ficheCompletee: boolean
  inscritLe: string | null
  profilPourcent: number
  modulesAcquis: ModuleAcquis[]
  accesRevoques: { moduleId: string; titre: string; revoqueLe: string | null; motif: string }[]
  chapitresVus: number
  chapitresTotal: number
  coachingPrive: { id: string; statut: string; recueLe: string; heures: number }[]
  progression: number
  certificats: CertificatApprenant[]
  persona: Persona | null
  montantPaye: number
  ville: string
  secteur: string
}

interface Choix {
  phases: { id: string; nom: string }[]
  thematiques: { id: string; nom: string }[]
  modules: { id: string; nom: string }[]
  formateurs: { id: string; nom: string }[]
  localisations: string[]
  secteurs: string[]
}

/**
 * Méga-filtre de l'écran 04 : les dimensions actives deviennent des pilules
 * retirables, les autres se choisissent dans un menu.
 *
 * La maquette en annonce treize. Onze sont servies ; « Chapitre » et
 * « Session » ne le sont pas — la liste des apprenants ne lit ni les
 * visionnages chapitre par chapitre, ni les inscriptions aux sessions. Elles
 * sont dites indisponibles sous le menu plutôt que proposées pour rien.
 */
const filtres = reactive<Record<string, string>>({})

const { data, refresh } = await useFetch<{ apprenants: Apprenant[]; choix: Choix }>(
  '/api/admin/apprenants',
  { query: computed(() => ({ ...filtres })) },
)
const apprenants = computed(() => data.value?.apprenants ?? [])
const choix = computed(() => data.value?.choix)
const { data: modules } = await useFetch<Module[]>('/api/modules')

const OUI_NON = [{ id: 'oui', nom: 'Oui' }, { id: 'non', nom: 'Non' }]

const DIMENSIONS = computed(() => [
  { cle: 'programme', libelle: 'Programme', options: [{ id: 'social-media', nom: 'Social Média' }, { id: 'entrepreneurs', nom: 'Entrepreneurs' }] },
  { cle: 'phase', libelle: 'Phase', options: choix.value?.phases ?? [] },
  { cle: 'thematique', libelle: 'Thématique', options: choix.value?.thematiques ?? [] },
  { cle: 'module', libelle: 'Module', options: choix.value?.modules ?? [] },
  { cle: 'formateur', libelle: 'Formateur', options: choix.value?.formateurs ?? [] },
  { cle: 'periode', libelle: 'Période', options: [{ id: '7', nom: '7 derniers jours' }, { id: '30', nom: '30 derniers jours' }, { id: '90', nom: '90 derniers jours' }] },
  { cle: 'localisation', libelle: 'Localisation', options: (choix.value?.localisations ?? []).map((v) => ({ id: v, nom: v })) },
  { cle: 'secteur', libelle: 'Secteur', options: (choix.value?.secteurs ?? []).map((v) => ({ id: v, nom: v })) },
  { cle: 'progression', libelle: 'Progression', options: [{ id: 'aucune', nom: 'Pas commencé' }, { id: 'encours', nom: 'En cours' }, { id: 'terminee', nom: 'Terminé' }] },
  { cle: 'profil', libelle: 'Profil', options: [{ id: 'complet', nom: 'complet (100 %)' }, { id: 'incomplet', nom: 'incomplet' }] },
  { cle: 'certificat', libelle: 'Certificat', options: OUI_NON },
  { cle: 'paiement', libelle: 'Paiement', options: OUI_NON },
  { cle: 'acces', libelle: 'Accès', options: [{ id: 'achat', nom: 'Achat' }, { id: 'attribution', nom: 'Attribution admin' }] },
  { cle: 'coaching', libelle: 'Coaching', options: OUI_NON },
])

/** Pilules actives : « Programme : Social Média ✕ ». */
const pilules = computed(() =>
  DIMENSIONS.value
    .filter((d) => filtres[d.cle])
    .map((d) => ({
      cle: d.cle,
      texte: `${d.libelle} : ${d.options.find((o) => o.id === filtres[d.cle])?.nom ?? filtres[d.cle]}`,
    })),
)
const disponibles = computed(() => DIMENSIONS.value.filter((d) => !filtres[d.cle]))
const menuOuvert = ref(false)
const dimensionChoisie = ref('')
const optionsDimension = computed(() => DIMENSIONS.value.find((d) => d.cle === dimensionChoisie.value)?.options ?? [])

function poser(cle: string, valeur: string) {
  if (valeur) filtres[cle] = valeur
  dimensionChoisie.value = ''
  menuOuvert.value = false
}
function retirer(cle: string) {
  delete filtres[cle]
}

const selection = ref<Apprenant | null>(null)
/** Le détail — accès, coaching, attestations, attribution — se découvre par le
 *  bouton « Historique » de la fiche ; la maquette n'en montre que le bouton. */
const historiqueOuvert = ref(false)
watch(selection, () => { historiqueOuvert.value = false })

// Arrivée depuis une demande de coaching privé : la fiche s'ouvre directement.
const route = useRoute()
watch(
  apprenants,
  (liste) => {
    const cible = typeof route.query.utilisateur === 'string' ? route.query.utilisateur : ''
    if (cible && !selection.value) selection.value = liste.find((a) => a.id === cible) ?? null
  },
  { immediate: true },
)
const attribution = reactive({ moduleId: '', motif: '', notifier: true })
const message = ref('')
const erreur = ref('')

async function attribuer() {
  erreur.value = ''
  try {
    await $fetch('/api/admin/attribution', {
      method: 'POST',
      body: {
        utilisateurId: selection.value!.id,
        moduleId: attribution.moduleId,
        motif: attribution.motif,
      },
    })
    message.value = `Accès attribué à ${selection.value!.nom} — marqué « Attribution admin », apprenant notifié.`
    attribution.moduleId = ''
    attribution.motif = ''
    await refresh()
    selection.value = null
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Attribution impossible.'
  }
}

/** Numéro dont le motif de révocation est en cours de saisie. */
const revocation = reactive({ numero: '', motif: '' })

// --- Révocation d'un accès (écran 13) ---------------------------------------

/** Deux temps : le clic découvre le champ de motif, la confirmation agit. */
const revocationAcces = reactive({ moduleId: '', motif: '' })

async function agirSurAcces(moduleId: string, action: 'revoquer' | 'retablir') {
  erreur.value = ''
  const id = selection.value!.id
  try {
    await $fetch('/api/admin/acces-apprenant', {
      method: 'POST',
      body: {
        utilisateurId: id,
        moduleId,
        action,
        motif: action === 'revoquer' ? revocationAcces.motif : undefined,
      },
    })
    message.value =
      action === 'revoquer'
        ? 'Accès révoqué — l’apprenant en a été informé, l’action est journalisée.'
        : 'Accès rétabli — l’apprenant en a été informé.'
    revocationAcces.moduleId = ''
    revocationAcces.motif = ''
    await refresh()
    selection.value = apprenants.value.find((a) => a.id === id) ?? null
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Action impossible.'
  }
}

// --- Ajout d'un apprenant (écran 13) ----------------------------------------

const ajout = reactive({
  ouvert: false,
  prenom: '',
  nom: '',
  email: '',
  whatsapp: '',
  moduleId: '',
  motif: '',
})
const lienDefinition = ref('')
const erreurAjout = ref('')
const ajoutEnCours = ref(false)

async function ajouterApprenant() {
  erreurAjout.value = ''
  lienDefinition.value = ''
  ajoutEnCours.value = true
  try {
    const r = await $fetch<{ lienDefinition?: string; moduleAttribue?: string }>(
      '/api/admin/apprenants',
      { method: 'POST', body: { ...ajout } },
    )
    message.value = r.moduleAttribue
      ? `Compte créé, accès à « ${r.moduleAttribue} » attribué.`
      : 'Compte créé.'
    // Aucun envoi n'est branché : le lien est rendu à l'écran pour être
    // transmis à la main.
    lienDefinition.value = r.lienDefinition ?? ''
    Object.assign(ajout, {
      ouvert: false,
      prenom: '',
      nom: '',
      email: '',
      whatsapp: '',
      moduleId: '',
      motif: '',
    })
    await refresh()
  } catch (e) {
    erreurAjout.value = (e as { statusMessage?: string }).statusMessage ?? 'La création a échoué.'
  } finally {
    ajoutEnCours.value = false
  }
}

// --- Export CSV -------------------------------------------------------------

/** L'export suit les filtres actifs : ce qui est à l'écran est ce qui part. */
function exporter() {
  exporterCsv(
    `apprenants-${new Date().toISOString().slice(0, 10)}`,
    [
      { cle: 'nom', libelle: 'Nom' },
      { cle: 'email', libelle: 'E-mail' },
      { cle: 'whatsapp', libelle: 'WhatsApp' },
      { cle: 'pays', libelle: 'Pays' },
      { cle: (a) => a.inscritLe?.slice(0, 10) ?? '', libelle: 'Inscrit le' },
      { cle: (a) => a.modulesAcquis.length, libelle: 'Modules' },
      { cle: (a) => a.modulesAcquis.map((m) => m.titre).join(' | '), libelle: 'Titres des modules' },
      { cle: (a) => `${a.chapitresVus}/${a.chapitresTotal}`, libelle: 'Chapitres vus' },
      { cle: 'progression', libelle: 'Progression (%)' },
      { cle: 'profilPourcent', libelle: 'Profil (%)' },
      { cle: (a) => a.coachingPrive.length, libelle: 'Demandes de coaching privé' },
      { cle: (a) => a.certificats.length, libelle: 'Attestations' },
      { cle: 'montantPaye', libelle: 'Montant payé (FCFA)' },
    ] satisfies ColonneCsv<Apprenant>[],
    apprenants.value,
  )
}

const STATUTS_COACHING: Record<string, string> = {
  'en-attente': 'Envoyée',
  'en-etude': 'En étude',
  'creneau-propose': 'Créneau proposé',
  confirmee: 'Confirmée',
  planifiee: 'Planifiée',
  realisee: 'Réalisée',
  refusee: 'Refusée',
  expiree: 'Expirée',
}

async function agirSurAttestation(numero: string, action: 'revoquer' | 'retablir') {
  erreur.value = ''
  try {
    await $fetch('/api/admin/certificats', {
      method: 'POST',
      body: { numero, action, motif: action === 'revoquer' ? revocation.motif : undefined },
    })
    message.value =
      action === 'revoquer'
        ? `Attestation ${numero} révoquée — la page publique de vérification la déclare non valable.`
        : `Attestation ${numero} rétablie.`
    revocation.numero = ''
    revocation.motif = ''
    const id = selection.value!.id
    await refresh()
    selection.value = apprenants.value.find((a) => a.id === id) ?? null
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Action impossible.'
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="font-title text-[24px] font-light">
        Apprenants — {{ apprenants.length }} comptes actifs
      </h1>
      <div class="flex flex-wrap gap-2.5">
        <UiBaseButton taille="sm" variante="contour" @click="exporter">⬇ Exporter la base en CSV</UiBaseButton>
        <UiBaseButton taille="sm" @click="ajout.ouvert = !ajout.ouvert">
          {{ ajout.ouvert ? 'Annuler' : '+ Ajouter un apprenant' }}
        </UiBaseButton>
      </div>
    </div>
    <p class="mt-1.5 text-[11.5px] text-discret">
      L’export respecte les filtres actifs (ici : {{ pilules.length }} filtre{{ pilules.length > 1 ? 's' : '' }})
      — colonnes : identité, contact, programme, progression, paiements, certificats. Action journalisée.
    </p>

    <form
      v-if="ajout.ouvert"
      class="mt-5 rounded-[14px] border border-ligne-douce bg-white p-5"
      @submit.prevent="ajouterApprenant"
    >
      <h2 class="font-title text-[18px] font-light">Nouvel apprenant</h2>
      <p class="mt-1 text-[12.5px] text-discret">
        Le compte naît sans mot de passe utilisable : l’apprenant le choisit par un lien valable
        trois jours. Aucun envoi n’étant encore branché, le lien s’affiche ici pour être transmis.
      </p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Prénom</span>
          <input v-model="ajout.prenom" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Nom</span>
          <input v-model="ajout.nom" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">E-mail</span>
          <input v-model="ajout.email" type="email" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">WhatsApp <span class="font-normal text-discret">(facultatif)</span></span>
          <input v-model="ajout.whatsapp" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Attribuer un accès <span class="font-normal text-discret">(facultatif)</span></span>
          <select v-model="ajout.moduleId" class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
            <option value="">Aucun</option>
            <option v-for="m in modules" :key="m.id" :value="m.id">{{ m.titre }}</option>
          </select>
        </label>
        <label v-if="ajout.moduleId" class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Motif de l’attribution</span>
          <input v-model="ajout.motif" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
        </label>
      </div>
      <p v-if="erreurAjout" class="mt-3 text-[13.5px] text-erreur">{{ erreurAjout }}</p>
      <UiBaseButton type="submit" taille="sm" class="mt-4" :disabled="ajoutEnCours">
        {{ ajoutEnCours ? 'Création…' : 'Créer le compte' }}
      </UiBaseButton>
    </form>

    <p v-if="lienDefinition" class="mt-4 rounded-[10px] border border-alerte bg-alerte-voile p-3 text-[13px] text-alerte">
      Lien de définition du mot de passe, à transmettre à l’apprenant (valable 72 h) :
      <span class="mt-1 block font-mono text-[12px] break-all">{{ lienDefinition }}</span>
    </p>

    <p v-if="message" class="mt-4 rounded-[10px] border border-succes bg-succes-voile p-3 text-[13.5px] text-succes">
      {{ message }}
    </p>

    <div class="mt-4 flex flex-wrap items-center gap-2 text-[12.5px]">
      <button
        v-for="p in pilules"
        :key="p.cle"
        class="rounded-full bg-social px-3.5 py-[7px] font-bold text-white"
        @click="retirer(p.cle)"
      >
        {{ p.texte }} ✕
      </button>

      <div class="relative">
        <button
          class="rounded-full border-[1.5px] border-ligne bg-white px-3.5 py-[7px] font-semibold text-texte"
          :aria-expanded="menuOuvert"
          @click="menuOuvert = !menuOuvert"
        >
          + {{ disponibles.map((d) => d.libelle).join(' · ') }} ▾
        </button>

        <div
          v-if="menuOuvert"
          class="absolute z-20 mt-2 flex w-[320px] flex-col gap-2 rounded-[12px] border border-ligne bg-white p-3 shadow-[0_16px_40px_rgba(23,21,28,.12)]"
        >
          <label class="block">
            <span class="mb-1 block text-[11.5px] font-bold text-discret">Dimension</span>
            <select v-model="dimensionChoisie" class="w-full rounded-[10px] border border-ligne px-3 py-2 text-[13px]">
              <option value="">Choisir…</option>
              <option v-for="d in disponibles" :key="d.cle" :value="d.cle">{{ d.libelle }}</option>
            </select>
          </label>
          <label v-if="dimensionChoisie" class="block">
            <span class="mb-1 block text-[11.5px] font-bold text-discret">Valeur</span>
            <select
              class="w-full rounded-[10px] border border-ligne px-3 py-2 text-[13px]"
              @change="poser(dimensionChoisie, ($event.target as HTMLSelectElement).value)"
            >
              <option value="">Choisir…</option>
              <option v-for="o in optionsDimension" :key="o.id" :value="o.id">{{ o.nom }}</option>
            </select>
          </label>
          <p class="text-[11.5px] leading-[1.5] text-discret">
            « Chapitre » et « Session » ne sont pas encore filtrables : cette liste ne lit ni les
            visionnages chapitre par chapitre, ni les inscriptions aux sessions de coaching.
          </p>
        </div>
      </div>
    </div>

    <div class="mt-4 grid items-start gap-5 md:grid-cols-2 lg:grid-cols-[1fr_440px]">
      <!-- Cinq colonnes à largeurs fixes, comme la maquette : l'identité, une
           barre de progression, puis trois valeurs en texte coloré. -->
      <AdminTableauSimple
        :colonnes="['Apprenant', 'Progression', 'Profil', 'Certificat', 'Coaching']"
        :largeurs="['1.4fr', '1fr', '110px', '110px', '110px']"
        largeur-min="560px"
      >
        <tr
          v-for="apprenant in apprenants"
          :key="apprenant.id"
          class="cursor-pointer align-middle"
          :class="selection?.id === apprenant.id && 'bg-social-neige'"
          @click="selection = apprenant"
        >
          <td class="px-5 py-3.5" :class="selection?.id === apprenant.id && 'border-l-[3px] border-social'">
            <b>{{ apprenant.nom }}</b>
            <span class="block truncate text-[12px] text-discret">
              {{ apprenant.email }}<template v-if="apprenant.whatsapp"> · {{ apprenant.whatsapp }}</template>
            </span>
          </td>
          <td class="px-5 py-3.5">
            <span class="flex items-center gap-2">
              <span class="h-1.5 flex-1 rounded-full bg-piste">
                <span
                  class="block h-full rounded-full"
                  :class="apprenant.progression === 100 ? 'bg-whatsapp' : 'bg-social'"
                  :style="{ width: `${apprenant.progression}%` }"
                />
              </span>
              {{ apprenant.chapitresVus }}/{{ apprenant.chapitresTotal }}
            </span>
          </td>
          <td class="px-5 py-3.5 font-bold" :class="apprenant.profilPourcent === 100 ? 'text-succes' : 'text-alerte'">
            {{ apprenant.profilPourcent }} %
          </td>
          <td class="px-5 py-3.5" :class="apprenant.certificats.length ? 'font-bold text-succes' : 'text-discret'">
            {{ apprenant.certificats.length ? 'Générée' : '—' }}
          </td>
          <td
            class="px-5 py-3.5"
            :class="apprenant.profilPourcent === 100 ? 'font-bold text-succes' : 'text-discret'"
          >
            {{ apprenant.coachingPrive.length ? 'Présent' : apprenant.profilPourcent === 100 ? 'Éligible' : 'Inscrit' }}
          </td>
        </tr>
        <tr v-if="!apprenants.length">
          <td colspan="5" class="px-5 py-8 text-center text-discret">Aucun apprenant dans ce filtre.</td>
        </tr>
      </AdminTableauSimple>

      <aside v-if="selection" class="h-fit rounded-[14px] border border-ligne-douce bg-white p-6">
        <div class="mb-4 flex items-center gap-3.5">
          <span class="grid size-[52px] shrink-0 place-items-center rounded-full bg-social text-[17px] font-extrabold text-white">
            {{ selection.nom.split(' ').map((m) => m[0]).slice(0, 2).join('') }}
          </span>
          <span class="min-w-0">
            <b class="block text-[17px]">{{ selection.nom }}</b>
            <span class="block truncate text-[12.5px] text-discret">
              Inscrit le {{ selection.inscritLe ? formatDate(selection.inscritLe) : '—' }}<template
                v-if="selection.ville || selection.pays"
              > · {{ [selection.ville, selection.pays].filter(Boolean).join(', ') }}</template>
            </span>
          </span>
        </div>

        <section v-if="selection.persona" class="mb-3.5 rounded-[12px] border border-social-bordure-tendre bg-social-nuage p-4">
          <p class="surtitre-menu mb-2.5 text-social">Fiche persona — contexte pour le coach</p>
          <div class="flex flex-col gap-[7px] text-[13px]">
            <div class="flex justify-between gap-3"><span class="text-discret">Âge</span><b>{{ selection.persona.age }} ans</b></div>
            <div class="flex justify-between gap-3"><span class="text-discret">Secteur</span><b>{{ selection.persona.secteur }}</b></div>
            <div class="flex justify-between gap-3"><span class="text-discret">Expérience</span><b>{{ selection.persona.experience }}</b></div>
            <div class="flex justify-between gap-3"><span class="text-discret">Réseaux gérés</span><b>{{ selection.persona.reseaux }}</b></div>
            <div class="flex justify-between gap-4"><span class="text-discret">Objectif</span><b class="text-right">{{ selection.persona.objectif }}</b></div>
          </div>
          <p v-if="selection.profilPourcent < 100" class="mt-3 rounded-[8px] bg-alerte-voile px-3 py-2.5 text-[12px] text-alerte">
            Profil à {{ selection.profilPourcent }} % — participation aux sessions de coaching
            bloquée tant que non complété.
          </p>
        </section>

        <div class="flex flex-col gap-2 text-[13px]">
          <div class="flex justify-between gap-3">
            <span class="text-discret">Modules achetés</span>
            <b>{{ selection.modulesAcquis.length }} · {{ formatFcfa(selection.montantPaye) }}</b>
          </div>
          <div class="flex justify-between gap-3">
            <span class="text-discret">Origine des accès</span>
            <b>
              <template v-if="selection.modulesAcquis.filter((m) => m.origine === 'achat').length">
                Achat ({{ selection.modulesAcquis.filter((m) => m.origine === 'achat').length }})
              </template>
              <template v-if="selection.modulesAcquis.filter((m) => m.origine === 'attribution').length">
                Attribution ({{ selection.modulesAcquis.filter((m) => m.origine === 'attribution').length }})
              </template>
              <template v-if="!selection.modulesAcquis.length">—</template>
            </b>
          </div>
          <div class="flex justify-between gap-3">
            <span class="text-discret">Certificats</span>
            <b>{{ selection.certificats.length }} générée{{ selection.certificats.length > 1 ? 's' : '' }}</b>
          </div>
          <div class="flex justify-between gap-3">
            <span class="text-discret">Coaching privé</span>
            <b :class="selection.coachingPrive.some((d) => d.statut === 'en-attente') && 'text-alerte'">
              {{ selection.coachingPrive.length }} demande{{ selection.coachingPrive.length > 1 ? 's' : '' }}
              <template v-if="selection.coachingPrive.some((d) => d.statut === 'en-attente')">en attente</template>
            </b>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2 text-[12.5px] font-bold">
          <button
            class="rounded-full border-[1.5px] border-encre px-4 py-2.5 text-encre"
            @click="attribution.moduleId = attribution.moduleId || (modules?.[0]?.id ?? ''); historiqueOuvert = true"
          >
            Attribuer un accès à un module
          </button>
          <button
            class="rounded-full border-[1.5px] border-ligne px-4 py-2.5 text-texte"
            @click="historiqueOuvert = !historiqueOuvert"
          >
            Historique
          </button>
        </div>
        <p class="mt-2.5 text-[11.5px] leading-[1.5] text-discret">
          «&nbsp;Attribuer un accès&nbsp;» offre gratuitement une formation à cet apprenant — il est
          notifié par email + WhatsApp dès l’attribution.
        </p>

        <div v-if="historiqueOuvert">
        <!-- Origine des accès : un achat et une attribution de l'équipe ne
             pèsent pas la même chose dans les revenus. -->
        <section class="mt-5 rounded-[12px] border border-ligne-claire p-4">
          <p class="text-[14px] font-bold">Accès et origine</p>
          <ul v-if="selection.modulesAcquis.length" class="mt-3 space-y-2">
            <li
              v-for="m in selection.modulesAcquis"
              :key="m.id"
              class="rounded-[10px] border border-ligne-claire p-3 text-[13px]"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-bold text-encre">{{ m.titre }}</p>
                  <p class="mt-0.5 text-[12px] text-discret">
                    <span
                      class="mr-1.5 rounded-full px-2 py-0.5 font-bold"
                      :class="m.origine === 'attribution' ? 'bg-alerte-voile text-alerte' : 'bg-succes-voile text-succes'"
                    >
                      {{ m.origine === 'attribution' ? 'Attribution admin' : 'Achat' }}
                    </span>
                    le {{ formatDate(m.acheteLe) }} · {{ m.progression }} %
                  </p>
                </div>
                <button
                  v-if="revocationAcces.moduleId !== m.id"
                  class="rounded-[8px] border border-erreur px-3 py-1.5 text-[12.5px] text-erreur hover:bg-[#fdeeee]"
                  @click="revocationAcces.moduleId = m.id; revocationAcces.motif = ''"
                >
                  Révoquer
                </button>
              </div>

              <form
                v-if="revocationAcces.moduleId === m.id"
                class="mt-2"
                @submit.prevent="agirSurAcces(m.id, 'revoquer')"
              >
                <p class="text-[12.5px] text-discret">
                  L’accès n’est pas effacé : il est daté et motivé, l’apprenant en est informé et
                  l’action est journalisée.
                </p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <input
                    v-model="revocationAcces.motif"
                    required
                    placeholder="Motif (journalisé, obligatoire)"
                    class="min-w-[200px] flex-1 rounded-[10px] border border-ligne px-3 py-2 text-[13px]"
                  >
                  <UiBaseButton type="submit" class="!py-2 !text-[13px]">Confirmer</UiBaseButton>
                  <button
                    type="button"
                    class="text-[12.5px] text-discret hover:underline"
                    @click="revocationAcces.moduleId = ''"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </li>
          </ul>
          <p v-else class="mt-2 text-[13px] text-discret">Aucun accès actif.</p>

          <ul v-if="selection.accesRevoques.length" class="mt-3 space-y-2">
            <li
              v-for="a in selection.accesRevoques"
              :key="a.moduleId"
              class="rounded-[10px] border border-dashed border-ligne p-3 text-[13px]"
            >
              <p class="font-bold text-discret">{{ a.titre }}</p>
              <p class="mt-0.5 text-[12.5px] text-erreur">
                Révoqué{{ a.revoqueLe ? ` le ${formatDate(a.revoqueLe)}` : '' }} — {{ a.motif }}
              </p>
              <button class="mt-1.5 text-[12.5px] underline" @click="agirSurAcces(a.moduleId, 'retablir')">
                Rétablir
              </button>
            </li>
          </ul>
        </section>

        <section v-if="selection.coachingPrive.length" class="mt-5 rounded-[12px] border border-ligne-claire p-4">
          <p class="text-[14px] font-bold">Coaching privé</p>
          <ul class="mt-2 space-y-1.5 text-[13px]">
            <li v-for="d in selection.coachingPrive" :key="d.id" class="flex flex-wrap justify-between gap-2">
              <span class="text-texte">{{ formatDate(d.recueLe) }} · {{ d.heures }} h</span>
              <span class="text-discret">{{ STATUTS_COACHING[d.statut] ?? d.statut }}</span>
            </li>
          </ul>
          <NuxtLink to="/admin/coaching-prive" class="mt-2 inline-block text-[12.5px] text-social underline">
            Ouvrir les demandes →
          </NuxtLink>
        </section>

        <section v-if="selection.certificats.length" class="mt-5 rounded-[12px] border border-ligne-claire p-4">
          <p class="text-[14px] font-bold">Attestations délivrées</p>
          <p class="mt-1 text-[12.5px] text-discret">
            Révoquer n’efface pas le document — il a pu être imprimé — mais la page publique de
            vérification le déclare non valable. Motif obligatoire, action journalisée.
          </p>

          <ul class="mt-3 space-y-2">
            <li
              v-for="attestation in selection.certificats"
              :key="attestation.numero"
              class="rounded-[10px] border border-ligne-claire p-3 text-[13px]"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p class="font-mono text-[12.5px]">{{ attestation.numero }}</p>
                  <p class="text-discret">
                    {{ attestation.titreModule }} · délivrée le {{ formatDate(attestation.dateDelivrance) }}
                  </p>
                </div>
                <button
                  v-if="attestation.revoqueLe"
                  class="rounded-[8px] border border-ligne px-3 py-1.5 text-[12.5px] hover:bg-brume"
                  @click="agirSurAttestation(attestation.numero, 'retablir')"
                >
                  Rétablir
                </button>
                <button
                  v-else-if="revocation.numero !== attestation.numero"
                  class="rounded-[8px] border border-erreur px-3 py-1.5 text-[12.5px] text-erreur hover:bg-[#fdeeee]"
                  @click="revocation.numero = attestation.numero; revocation.motif = ''"
                >
                  Révoquer
                </button>
              </div>

              <p v-if="attestation.revoqueLe" class="mt-2 text-[12.5px] text-erreur">
                Révoquée le {{ formatDate(attestation.revoqueLe) }} — {{ attestation.motifRevocation }}
              </p>

              <form
                v-if="revocation.numero === attestation.numero"
                class="mt-2 flex flex-wrap gap-2"
                @submit.prevent="agirSurAttestation(attestation.numero, 'revoquer')"
              >
                <input
                  v-model="revocation.motif"
                  required
                  placeholder="Motif (journalisé, obligatoire)"
                  class="min-w-[200px] flex-1 rounded-[10px] border border-ligne px-3 py-2 text-[13px]"
                >
                <UiBaseButton type="submit" class="!py-2 !text-[13px]">Confirmer</UiBaseButton>
                <button
                  type="button"
                  class="text-[12.5px] text-discret hover:underline"
                  @click="revocation.numero = ''"
                >
                  Annuler
                </button>
              </form>
            </li>
          </ul>
        </section>

        <section class="mt-5 rounded-[12px] border border-ligne-claire p-4">
          <p class="font-bold text-[14px]">Attribuer un accès gratuit</p>
          <p class="mt-1 text-[12.5px] text-discret">
            L’accès attribué est marqué « Attribution admin », distinct d’un achat. Motif obligatoire,
            action journalisée, apprenant notifié.
          </p>
          <form class="mt-3 space-y-3" @submit.prevent="attribuer">
            <select v-model="attribution.moduleId" required class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
              <option value="">Choisir un module…</option>
              <option v-for="m in modules" :key="m.id" :value="m.id">{{ m.titre }}</option>
            </select>
            <input
              v-model="attribution.motif"
              required
              placeholder="Motif (journalisé, obligatoire)"
              class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]"
            >
            <label class="flex items-center gap-2 text-[13px] text-texte">
              <input v-model="attribution.notifier" type="checkbox">
              Notifier l’apprenant par e-mail et WhatsApp
            </label>
            <p v-if="erreur" class="text-[13px] text-erreur">{{ erreur }}</p>
            <UiBaseButton type="submit" taille="sm">Attribuer et notifier</UiBaseButton>
          </form>
        </section>
        </div>
      </aside>

      <aside v-else class="h-fit rounded-[14px] border border-dashed border-ligne bg-white p-10 text-center text-[13.5px] text-discret">
        Sélectionnez un apprenant pour ouvrir sa fiche.
      </aside>
    </div>
  </div>
</template>
