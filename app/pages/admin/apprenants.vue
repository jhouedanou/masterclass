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
}

/**
 * Filtres combinables de l'écran 04. Un seul objet réactif : la maquette les
 * dessine comme une bande homogène de pilules, où celles qui portent une
 * valeur passent en violet plein avec une croix.
 */
const filtre = reactive({ programme: '', profil: '', acces: '', coaching: '' })
type CleFiltre = keyof typeof filtre

const DIMENSIONS: { cle: CleFiltre; etiquette: string; options: { valeur: string; libelle: string }[] }[] = [
  {
    cle: 'programme',
    etiquette: 'Programme',
    options: [
      { valeur: '', libelle: 'Programme' },
      { valeur: 'social-media', libelle: 'Social Média' },
      { valeur: 'entrepreneurs', libelle: 'Entrepreneurs' },
    ],
  },
  {
    cle: 'profil',
    etiquette: 'Profil',
    options: [
      { valeur: '', libelle: 'Profil' },
      { valeur: 'complet', libelle: 'complet (100 %)' },
      { valeur: 'incomplet', libelle: 'incomplet' },
    ],
  },
  {
    cle: 'acces',
    etiquette: 'Accès',
    options: [
      { valeur: '', libelle: 'Accès' },
      { valeur: 'achat', libelle: 'Achat' },
      { valeur: 'attribution', libelle: 'Attribution admin' },
    ],
  },
  {
    cle: 'coaching',
    etiquette: 'Coaching',
    options: [
      { valeur: '', libelle: 'Coaching' },
      { valeur: 'oui', libelle: 'a demandé un coaching privé' },
      { valeur: 'non', libelle: 'jamais demandé' },
    ],
  },
]

function libelleValeur(cle: CleFiltre, valeur: string) {
  return DIMENSIONS.find((d) => d.cle === cle)?.options.find((o) => o.valeur === valeur)?.libelle ?? valeur
}

const { data: apprenants, refresh } = await useFetch<Apprenant[]>('/api/admin/apprenants', {
  query: computed(() => ({
    programme: filtre.programme || undefined,
    profil: filtre.profil || undefined,
    coaching: filtre.coaching || undefined,
    acces: filtre.acces || undefined,
  })),
})
const { data: modules } = await useFetch<Module[]>('/api/modules')

const selection = ref<Apprenant | null>(null)

// Arrivée depuis une demande de coaching privé : la fiche s'ouvre directement.
const route = useRoute()
watch(
  apprenants,
  (liste) => {
    const cible = typeof route.query.utilisateur === 'string' ? route.query.utilisateur : ''
    if (cible && !selection.value) selection.value = liste?.find((a) => a.id === cible) ?? null
  },
  { immediate: true },
)

/** Initiales de la pastille ronde de la fiche apprenant (écran 04). */
const initiales = computed(() =>
  (selection.value?.nom ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join(''),
)

/** « Achat (2) · Attribution (1) » : un achat et une attribution de l'équipe
 *  ne pèsent pas la même chose dans les revenus. */
const origineAcces = computed(() => {
  const acquis = selection.value?.modulesAcquis ?? []
  const achats = acquis.filter((m) => m.origine === 'achat').length
  const attributions = acquis.length - achats
  const morceaux: string[] = []
  if (achats) morceaux.push(`Achat (${achats})`)
  if (attributions) morceaux.push(`Attribution (${attributions})`)
  return morceaux.join(' · ') || '—'
})

const coachingEnAttente = computed(
  () => (selection.value?.coachingPrive ?? []).filter((d) => d.statut === 'en-attente').length,
)

// --- Attribution d'un accès gratuit (écran 13) ------------------------------

const attribution = reactive({ ouverte: false, moduleId: '', motif: '', notifier: true })
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
    Object.assign(attribution, { ouverte: false, moduleId: '', motif: '' })
    const id = selection.value!.id
    await refresh()
    selection.value = apprenants.value?.find((a) => a.id === id) ?? null
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Attribution impossible.'
  }
}

/** Numéro dont le motif de révocation est en cours de saisie. */
const revocation = reactive({ numero: '', motif: '' })

// --- Révocation d'un accès (écran 13) ---------------------------------------

/** Deux temps : le clic découvre le champ de motif, la confirmation agit. */
const revocationAcces = reactive({ moduleId: '', motif: '' })

/** L'écran 04 ne montre qu'un bouton « Historique » : les accès, les
 *  attestations et les demandes de coaching s'y regroupent. */
const historiqueOuvert = ref(false)

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
    selection.value = apprenants.value?.find((a) => a.id === id) ?? null
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Action impossible.'
  }
}

// --- Ajout d'un apprenant (écran 13) ----------------------------------------

/** La maquette demande un seul champ « Nom complet » ; l'API attend un prénom
 *  et un nom, découpés ici. */
function decouperNom(complet: string): { prenom: string; nom: string } {
  const parties = complet.trim().split(/\s+/)
  if (parties.length < 2) return { prenom: '', nom: complet.trim() }
  return { prenom: parties[0] ?? '', nom: parties.slice(1).join(' ') }
}

const AJOUT_VIDE = {
  ouvert: false,
  nomComplet: '',
  email: '',
  whatsapp: '',
  attribuerEnsuite: true,
  moduleId: '',
  motif: '',
}
const ajout = reactive({ ...AJOUT_VIDE })
const lienDefinition = ref('')
const erreurAjout = ref('')
const ajoutEnCours = ref(false)

async function ajouterApprenant() {
  erreurAjout.value = ''
  lienDefinition.value = ''
  ajoutEnCours.value = true
  const { prenom, nom } = decouperNom(ajout.nomComplet)
  try {
    const r = await $fetch<{ lienDefinition?: string; moduleAttribue?: string }>(
      '/api/admin/apprenants',
      {
        method: 'POST',
        body: {
          prenom,
          nom,
          email: ajout.email,
          whatsapp: ajout.whatsapp,
          moduleId: ajout.attribuerEnsuite ? ajout.moduleId : '',
          motif: ajout.attribuerEnsuite ? ajout.motif : '',
        },
      },
    )
    message.value = r.moduleAttribue
      ? `Compte créé, accès à « ${r.moduleAttribue} » attribué.`
      : 'Compte créé.'
    // Aucun envoi n'est branché : le lien est rendu à l'écran pour être
    // transmis à la main.
    lienDefinition.value = r.lienDefinition ?? ''
    Object.assign(ajout, AJOUT_VIDE)
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
    apprenants.value ?? [],
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
    selection.value = apprenants.value?.find((a) => a.id === id) ?? null
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Action impossible.'
  }
}

/**
 * Le `<colgroup>` d'un tableau n'accepte pas l'unité `fr` de la maquette :
 * `1.4fr 1fr` sur 330 px de colonnes fixes se réécrit en parts calculées.
 */
const LARGE_1_4FR = 'calc((100% - 330px) * 0.5833)'
const LARGE_1FR = 'calc((100% - 330px) * 0.4167)'

const CHAMP = 'w-full rounded-[10px] border-[1.5px] border-ligne px-[13px] py-3 text-[13.5px] font-normal'
const ETIQUETTE = 'flex flex-col gap-1.5 text-[12.5px] font-bold text-texte'
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="font-title text-[24px] font-light">
        Apprenants — {{ apprenants?.length ?? 0 }} comptes actifs
      </h1>
      <div class="flex flex-wrap gap-2.5">
        <UiBaseButton taille="sm" variante="contour" @click="exporter">
          ⬇ Exporter la base en CSV
        </UiBaseButton>
        <UiBaseButton taille="sm" @click="ajout.ouvert = true">+ Ajouter un apprenant</UiBaseButton>
      </div>
    </div>
    <p class="mt-2.5 mb-3.5 text-[11.5px] text-discret">
      L’export respecte les filtres actifs — colonnes : identité, contact, programme, progression,
      paiements, certificats. Action journalisée.
    </p>

    <!-- Un filtre posé se dessine en violet plein avec sa croix ; les autres
         restent des pilules blanches à ouvrir. -->
    <div class="mb-4 flex flex-wrap gap-2 text-[12.5px]">
      <template v-for="d in DIMENSIONS" :key="d.cle">
        <button
          v-if="filtre[d.cle]"
          class="rounded-full bg-social px-3.5 py-[7px] font-bold text-white"
          @click="filtre[d.cle] = ''"
        >
          {{ d.etiquette }} : {{ libelleValeur(d.cle, filtre[d.cle]) }} ✕
        </button>
        <UiFiltrePilule v-else v-model="filtre[d.cle]" :etiquette="d.etiquette" :options="d.options" />
      </template>
    </div>

    <p v-if="lienDefinition" class="mb-4 rounded-[10px] border border-alerte bg-alerte-voile p-3 text-[13px] text-alerte">
      Lien de définition du mot de passe, à transmettre à l’apprenant (valable 72 h) :
      <span class="mt-1 block font-mono text-[12px] break-all">{{ lienDefinition }}</span>
    </p>
    <p v-if="message" class="mb-4 rounded-[10px] border border-succes bg-succes-voile p-3 text-[13.5px] text-succes">
      {{ message }}
    </p>
    <p v-if="erreur" class="mb-4 rounded-[10px] border border-erreur bg-erreur-voile p-3 text-[13.5px] text-erreur">
      {{ erreur }}
    </p>

    <div class="grid items-start gap-5 lg:grid-cols-[1fr_440px]">
      <!-- Largeurs de colonnes de la maquette, écran 04. -->
      <AdminTableauSimple
        :colonnes="['Apprenant', 'Progression', 'Profil', 'Certificat', 'Coaching']"
        :largeurs="[LARGE_1_4FR, LARGE_1FR, '110px', '110px', '110px']"
        largeur-min="700px"
      >
        <tr
          v-for="apprenant in apprenants"
          :key="apprenant.id"
          :class="selection?.id === apprenant.id && 'bg-social-neige'"
        >
          <!-- La ligne sélectionnée porte un filet violet de 3 px à gauche. -->
          <td
            class="border-l-[3px] px-5 py-3.5"
            :class="selection?.id === apprenant.id ? 'border-social' : 'border-transparent'"
          >
            <button class="block w-full text-left" @click="selection = apprenant">
              <b>{{ apprenant.nom }}</b>
              <span class="block text-[12px] text-discret">
                {{ apprenant.email }} · {{ apprenant.whatsapp }}
              </span>
            </button>
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
          <!-- Valeur chiffrée : gras dans la couleur du sens, sans pastille. -->
          <td
            class="px-5 py-3.5 font-bold"
            :class="apprenant.profilPourcent === 100 ? 'text-succes' : 'text-alerte'"
          >
            {{ apprenant.profilPourcent }} %
          </td>
          <td class="px-5 py-3.5">
            <b v-if="apprenant.certificats.length" class="text-succes">Générée</b>
            <span v-else class="text-discret">—</span>
          </td>
          <td class="px-5 py-3.5">
            <b v-if="apprenant.coachingPrive.length" class="text-social">
              {{ apprenant.coachingPrive.length }} demande{{ apprenant.coachingPrive.length > 1 ? 's' : '' }}
            </b>
            <span v-else class="text-discret">—</span>
          </td>
        </tr>
      </AdminTableauSimple>

      <!-- Fiche apprenant : contexte de coaching, puis les deux actions. -->
      <aside v-if="selection" class="h-fit rounded-bloc border border-ligne-douce bg-white p-6">
        <div class="mb-4 flex items-center gap-3.5">
          <span class="grid size-[52px] shrink-0 place-items-center rounded-full bg-social text-[17px] font-extrabold text-white">
            {{ initiales }}
          </span>
          <div class="min-w-0">
            <b class="text-[17px]">{{ selection.nom }}</b>
            <p class="text-[12.5px] text-discret">
              Inscrit le {{ selection.inscritLe ? formatDate(selection.inscritLe) : '—' }} ·
              {{ selection.pays }}
            </p>
          </div>
          <button class="ml-auto shrink-0 text-[12.5px] font-bold text-discret" @click="selection = null">
            Fermer
          </button>
        </div>

        <section v-if="selection.persona" class="mb-3.5 rounded-champ border border-social-bordure-tendre bg-social-nuage p-4">
          <p class="surtitre mb-2.5 text-social">Fiche persona — contexte pour le coach</p>
          <dl class="flex flex-col gap-[7px] text-[13px]">
            <div class="flex justify-between gap-4">
              <dt class="text-discret">Âge</dt><dd class="font-bold">{{ selection.persona.age }} ans</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-discret">Secteur</dt><dd class="font-bold">{{ selection.persona.secteur }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-discret">Expérience</dt><dd class="font-bold">{{ selection.persona.experience }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-discret">Réseaux gérés</dt><dd class="font-bold">{{ selection.persona.reseaux }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-discret">Objectif</dt>
              <dd class="text-right font-bold">{{ selection.persona.objectif }}</dd>
            </div>
          </dl>
          <p
            v-if="selection.profilPourcent < 100"
            class="mt-3 rounded-[8px] bg-alerte-voile px-[11px] py-[9px] text-[12px] text-alerte"
          >
            Profil à {{ selection.profilPourcent }} % — participation aux sessions de coaching
            bloquée tant que non complété.
          </p>
        </section>

        <dl class="flex flex-col gap-2 text-[13px]">
          <div class="flex justify-between gap-4">
            <dt class="text-discret">Modules achetés</dt>
            <dd class="font-bold">
              {{ selection.modulesAcquis.length }} · {{ formatFcfa(selection.montantPaye) }}
            </dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-discret">Origine des accès</dt>
            <dd class="font-bold">{{ origineAcces }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-discret">Certificats</dt>
            <dd class="font-bold">{{ selection.certificats.length }} générée(s)</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-discret">Coaching privé</dt>
            <dd class="font-bold" :class="coachingEnAttente > 0 && 'text-alerte'">
              <template v-if="coachingEnAttente">{{ coachingEnAttente }} demande(s) en attente</template>
              <template v-else>{{ selection.coachingPrive.length }} demande(s)</template>
            </dd>
          </div>
        </dl>

        <div class="mt-4 flex flex-wrap gap-2 text-[12.5px] font-bold">
          <button
            class="rounded-full border-[1.5px] border-encre px-4 py-[9px] text-encre"
            @click="attribution.ouverte = true"
          >
            Attribuer un accès à un module
          </button>
          <button
            class="rounded-full border-[1.5px] border-ligne px-4 py-[9px] text-texte"
            @click="historiqueOuvert = true"
          >
            Historique
          </button>
        </div>
        <p class="mt-2.5 text-[11.5px] leading-[1.5] text-discret">
          « Attribuer un accès » ouvre une fenêtre pour offrir gratuitement une formation à cet
          apprenant — il est notifié par email + WhatsApp dès l’attribution.
        </p>
      </aside>

      <aside v-else class="h-fit rounded-bloc border border-dashed border-ligne bg-white p-10 text-center text-[13.5px] text-discret">
        Sélectionnez un apprenant pour ouvrir sa fiche.
      </aside>
    </div>

    <!-- Écran 13 · Ajouter un apprenant -->
    <div v-if="ajout.ouvert" class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-encre/50 p-4">
      <form
        class="my-6 w-full max-w-[460px] rounded-carte bg-white p-7 shadow-[0_16px_40px_rgba(23,21,28,.12)]"
        @submit.prevent="ajouterApprenant"
      >
        <b class="text-[16px]">Ajouter un apprenant</b>
        <p class="mt-1.5 mb-4 text-[12.5px] text-discret">
          Crée le compte manuellement (hors inscription en ligne) — préalable à toute attribution
          d’accès.
        </p>
        <div class="flex flex-col gap-3">
          <label :class="ETIQUETTE">
            Nom complet
            <input v-model="ajout.nomComplet" required :class="CHAMP">
          </label>
          <label :class="ETIQUETTE">
            Email
            <input v-model="ajout.email" type="email" required :class="CHAMP">
          </label>
          <label :class="ETIQUETTE">
            Numéro WhatsApp
            <input v-model="ajout.whatsapp" :class="CHAMP">
          </label>
          <label class="flex items-center gap-2.5 text-[12.5px] font-semibold text-texte">
            <input v-model="ajout.attribuerEnsuite" type="checkbox" class="size-4 accent-social">
            Attribuer un accès à un module juste après la création
          </label>
          <template v-if="ajout.attribuerEnsuite">
            <label :class="ETIQUETTE">
              Module
              <select v-model="ajout.moduleId" :class="CHAMP">
                <option value="">Aucun pour l’instant</option>
                <option v-for="m in modules" :key="m.id" :value="m.id">{{ m.titre }}</option>
              </select>
            </label>
            <label v-if="ajout.moduleId" :class="ETIQUETTE">
              Motif (journalisé, obligatoire)
              <input v-model="ajout.motif" required :class="CHAMP">
            </label>
          </template>
          <p v-if="erreurAjout" class="text-[13px] text-erreur">{{ erreurAjout }}</p>
          <div class="flex gap-2.5">
            <UiBaseButton type="submit" taille="sm" class="flex-1" :disabled="ajoutEnCours">
              {{ ajoutEnCours ? 'Création…' : 'Créer le compte' }}
            </UiBaseButton>
            <UiBaseButton taille="sm" variante="contour" class="flex-1" @click="ajout.ouvert = false">
              Annuler
            </UiBaseButton>
          </div>
          <p class="text-[11.5px] leading-[1.5] text-discret">
            L’apprenant reçoit un email + WhatsApp d’invitation pour définir son mot de passe et
            compléter son profil. Compte marqué « Création admin » dans l’historique.
          </p>
        </div>
      </form>
    </div>

    <!-- Écran 13 · Attribuer un accès gratuit -->
    <div v-if="attribution.ouverte && selection" class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-encre/50 p-4">
      <form
        class="my-6 w-full max-w-[460px] rounded-carte bg-white p-7 shadow-[0_16px_40px_rgba(23,21,28,.12)]"
        @submit.prevent="attribuer"
      >
        <b class="text-[16px]">Attribuer un accès gratuit</b>
        <p class="mt-1.5 mb-4 text-[12.5px] text-discret">
          {{ selection.nom }} · l’accès attribué est marqué « Attribution admin » dans l’historique,
          distinct d’un achat.
        </p>
        <div class="flex flex-col gap-3">
          <label :class="ETIQUETTE">
            Module
            <select v-model="attribution.moduleId" required :class="CHAMP">
              <option value="">Choisir…</option>
              <option v-for="m in modules" :key="m.id" :value="m.id">{{ m.titre }}</option>
            </select>
          </label>
          <label :class="ETIQUETTE">
            Motif (journalisé, obligatoire)
            <input
              v-model="attribution.motif"
              required
              placeholder="Ex : lot concours communauté, geste commercial…"
              :class="CHAMP"
            >
          </label>
          <label class="flex items-center gap-2.5 text-[12.5px] font-semibold text-texte">
            <input v-model="attribution.notifier" type="checkbox" class="size-4 accent-social">
            Notifier l’apprenant par email + WhatsApp dès l’attribution
          </label>
          <div class="flex gap-2.5">
            <UiBaseButton type="submit" taille="sm" variante="sombre" class="flex-1">
              Attribuer et notifier
            </UiBaseButton>
            <UiBaseButton taille="sm" variante="contour" class="flex-1" @click="attribution.ouverte = false">
              Annuler
            </UiBaseButton>
          </div>
          <p class="border-t border-ligne-claire pt-3 text-[12px] leading-[1.6] text-texte">
            <b class="text-erreur">Révocation :</b> possible uniquement sur les accès attribués
            (jamais sur un achat), depuis l’historique. Confirmation en 2 étapes + motif obligatoire
            + notification à l’apprenant.
          </p>
        </div>
      </form>
    </div>

    <!-- Historique : accès, attestations et demandes de coaching de l'apprenant -->
    <div v-if="historiqueOuvert && selection" class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-encre/50 p-4">
      <div class="my-6 w-full max-w-xl rounded-carte bg-white p-[26px] shadow-[0_16px_40px_rgba(23,21,28,.12)]">
        <div class="flex items-start justify-between gap-4">
          <b class="text-[16px]">Historique — {{ selection.nom }}</b>
          <button class="text-[12.5px] font-bold text-discret" @click="historiqueOuvert = false">
            Fermer
          </button>
        </div>

        <section class="mt-4">
          <p class="font-sans text-[13.5px] font-bold">Accès et origine</p>
          <ul v-if="selection.modulesAcquis.length" class="mt-2.5 flex flex-col gap-2">
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
                  v-if="m.origine === 'attribution' && revocationAcces.moduleId !== m.id"
                  class="text-[12.5px] font-bold text-erreur"
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
                  <UiBaseButton type="submit" taille="sm">Confirmer</UiBaseButton>
                  <button
                    type="button"
                    class="text-[12.5px] text-discret"
                    @click="revocationAcces.moduleId = ''"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </li>
          </ul>
          <p v-else class="mt-2 text-[13px] text-discret">Aucun accès actif.</p>

          <ul v-if="selection.accesRevoques.length" class="mt-2.5 flex flex-col gap-2">
            <li
              v-for="a in selection.accesRevoques"
              :key="a.moduleId"
              class="rounded-[10px] border border-dashed border-ligne p-3 text-[13px]"
            >
              <p class="font-bold text-discret">{{ a.titre }}</p>
              <p class="mt-0.5 text-[12.5px] text-erreur">
                Révoqué{{ a.revoqueLe ? ` le ${formatDate(a.revoqueLe)}` : '' }} — {{ a.motif }}
              </p>
              <button class="mt-1.5 text-[12.5px] font-bold" @click="agirSurAcces(a.moduleId, 'retablir')">
                Rétablir
              </button>
            </li>
          </ul>
        </section>

        <section v-if="selection.certificats.length" class="mt-5">
          <p class="font-sans text-[13.5px] font-bold">Attestations délivrées</p>
          <p class="mt-1 text-[12.5px] text-discret">
            Révoquer n’efface pas le document — il a pu être imprimé — mais la page publique de
            vérification le déclare non valable. Motif obligatoire, action journalisée.
          </p>
          <ul class="mt-2.5 flex flex-col gap-2">
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
                  class="text-[12.5px] font-bold"
                  @click="agirSurAttestation(attestation.numero, 'retablir')"
                >
                  Rétablir
                </button>
                <button
                  v-else-if="revocation.numero !== attestation.numero"
                  class="text-[12.5px] font-bold text-erreur"
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
                <UiBaseButton type="submit" taille="sm">Confirmer</UiBaseButton>
                <button type="button" class="text-[12.5px] text-discret" @click="revocation.numero = ''">
                  Annuler
                </button>
              </form>
            </li>
          </ul>
        </section>

        <section v-if="selection.coachingPrive.length" class="mt-5">
          <p class="font-sans text-[13.5px] font-bold">Coaching privé</p>
          <ul class="mt-2 flex flex-col gap-1.5 text-[13px]">
            <li v-for="d in selection.coachingPrive" :key="d.id" class="flex flex-wrap justify-between gap-2">
              <span class="text-texte">{{ formatDate(d.recueLe) }} · {{ d.heures }} h</span>
              <span class="text-discret">{{ STATUTS_COACHING[d.statut] ?? d.statut }}</span>
            </li>
          </ul>
          <NuxtLink to="/admin/coaching-prive" class="mt-2 inline-block text-[12.5px] font-bold">
            Ouvrir les demandes →
          </NuxtLink>
        </section>
      </div>
    </div>
  </div>
</template>
