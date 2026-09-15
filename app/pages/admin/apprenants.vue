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

const filtreProgramme = ref('')
const filtreProfil = ref('')
const filtreCoaching = ref('')
const filtreAcces = ref('')

const { data: apprenants, refresh } = await useFetch<Apprenant[]>('/api/admin/apprenants', {
  query: computed(() => ({
    programme: filtreProgramme.value || undefined,
    profil: filtreProfil.value || undefined,
    coaching: filtreCoaching.value || undefined,
    acces: filtreAcces.value || undefined,
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
    selection.value = apprenants.value?.find((a) => a.id === id) ?? null
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
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">
        Apprenants — {{ apprenants?.length ?? 0 }} comptes actifs
      </h1>
      <div class="flex flex-wrap gap-2">
        <UiBaseButton taille="sm" variante="contour" @click="exporter">Exporter en CSV</UiBaseButton>
        <UiBaseButton taille="sm" @click="ajout.ouvert = !ajout.ouvert">
          {{ ajout.ouvert ? 'Annuler' : '+ Ajouter un apprenant' }}
        </UiBaseButton>
      </div>
    </div>
    <p class="mt-2 text-[12.5px] text-discret">
      L’export reprend exactement ce que les filtres laissent à l’écran — identité, contact,
      modules, progression, paiements, attestations.
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

    <div class="mt-5 flex flex-wrap gap-2 text-[13px]">
      <select v-model="filtreProgramme" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous programmes</option>
        <option value="social-media">Social Média</option>
        <option value="entrepreneurs">Entrepreneurs</option>
      </select>
      <select v-model="filtreProfil" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous profils</option>
        <option value="complet">Profil complet (100 %)</option>
        <option value="incomplet">Profil incomplet</option>
      </select>
      <select v-model="filtreAcces" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Toutes origines d’accès</option>
        <option value="achat">Achat</option>
        <option value="attribution">Attribution admin</option>
      </select>
      <select v-model="filtreCoaching" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Coaching privé — tous</option>
        <option value="oui">A demandé un coaching privé</option>
        <option value="non">Jamais demandé</option>
      </select>
    </div>

    <div class="mt-4 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <AdminTableauSimple :colonnes="['Apprenant', 'Inscrit le', 'Chapitres', 'Profil', 'Coaching', 'Certificats', '']">
        <tr v-for="apprenant in apprenants" :key="apprenant.id">
          <td class="px-4 py-3">
            <p class="font-bold">{{ apprenant.nom }}</p>
            <p class="text-[12px] text-discret">{{ apprenant.email }} · {{ apprenant.whatsapp }}</p>
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-[13px] text-discret">
            {{ apprenant.inscritLe ? formatDate(apprenant.inscritLe) : '—' }}
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            {{ apprenant.chapitresVus }} / {{ apprenant.chapitresTotal }}
            <span class="block text-[12px] text-discret">{{ apprenant.progression }} %</span>
          </td>
          <td class="px-4 py-3">
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-bold"
              :class="apprenant.profilPourcent === 100 ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte'"
            >
              {{ apprenant.profilPourcent }} %
            </span>
          </td>
          <td class="px-4 py-3">
            <span v-if="apprenant.coachingPrive.length" class="rounded-full bg-social-voile px-2.5 py-1 text-[11px] font-bold text-social">
              {{ apprenant.coachingPrive.length }}
            </span>
            <span v-else class="text-discret">—</span>
          </td>
          <td class="px-4 py-3">{{ apprenant.certificats.length || '—' }}</td>
          <td class="px-4 py-3 text-right">
            <button class="text-[12.5px] underline" @click="selection = apprenant">Fiche</button>
          </td>
        </tr>
      </AdminTableauSimple>

      <aside v-if="selection" class="h-fit rounded-[14px] border border-ligne-douce bg-white p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-title text-[21px] font-light">{{ selection.nom }}</h2>
            <p class="text-[12.5px] text-discret">{{ selection.pays }}</p>
          </div>
          <button class="text-[12px] text-discret underline" @click="selection = null">Fermer</button>
        </div>

        <section v-if="selection.persona" class="mt-5 rounded-[12px] border border-ligne-claire p-4">
          <p class="surtitre text-discret">Fiche persona — contexte pour le coach</p>
          <dl class="mt-3 grid gap-2 text-[13.5px] sm:grid-cols-2">
            <div><dt class="text-discret">Âge</dt><dd>{{ selection.persona.age }} ans</dd></div>
            <div><dt class="text-discret">Secteur</dt><dd>{{ selection.persona.secteur }}</dd></div>
            <div><dt class="text-discret">Expérience</dt><dd>{{ selection.persona.experience }}</dd></div>
            <div><dt class="text-discret">Réseaux gérés</dt><dd>{{ selection.persona.reseaux }}</dd></div>
            <div class="sm:col-span-2"><dt class="text-discret">Objectif</dt><dd>{{ selection.persona.objectif }}</dd></div>
          </dl>
        </section>

        <p
          v-if="selection.profilPourcent < 100"
          class="mt-4 rounded-[10px] border border-alerte bg-alerte-voile p-3 text-[13px] text-alerte"
        >
          Profil à {{ selection.profilPourcent }} % — participation aux sessions de coaching bloquée
          tant qu’il n’est pas complété.
        </p>

        <dl class="mt-4 grid gap-2 text-[13.5px] sm:grid-cols-2">
          <div>
            <dt class="text-discret">Inscrit le</dt>
            <dd>{{ selection.inscritLe ? formatDate(selection.inscritLe) : '—' }}</dd>
          </div>
          <div>
            <dt class="text-discret">Modules</dt>
            <dd>{{ selection.modulesAcquis.length }} · {{ formatFcfa(selection.montantPaye) }}</dd>
          </div>
          <div>
            <dt class="text-discret">Chapitres vus</dt>
            <dd>{{ selection.chapitresVus }} / {{ selection.chapitresTotal }}</dd>
          </div>
          <div><dt class="text-discret">Certificats</dt><dd>{{ selection.certificats.length }}</dd></div>
        </dl>

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
      </aside>

      <aside v-else class="h-fit rounded-[14px] border border-dashed border-ligne bg-white p-10 text-center text-[13.5px] text-discret">
        Sélectionnez un apprenant pour ouvrir sa fiche.
      </aside>
    </div>
  </div>
</template>
