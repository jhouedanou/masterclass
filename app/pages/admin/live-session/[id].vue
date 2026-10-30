<script setup lang="ts">
import type { EtapeDeroule, SessionLive } from '#shared/types'
import { dateCourteLive, debutDepuisSaisie, dureeLive, heureLive, saisieDepuisDebut } from '#shared/utils/live'

/**
 * Planifier ou modifier une Live Session (planche 07, CDC §4.1, §5.2) :
 * module, date et heure GMT, durée, formateur, modérateur, réunion Zoom,
 * capacité, fiche publique (prérequis, gains, déroulé), préparation. Puis
 * le cycle : publier, marquer terminée, annuler, déposer le support,
 * inscrits et export CSV, publication de la vidéo montée.
 */
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = computed(() => String(route.params.id))
const creation = computed(() => id.value === 'nouvelle')
usePagePrivee(creation.value ? 'Planifier une Live Session' : 'Live Session — administration')
const { annoncer } = useToasts()

interface Reference {
  modules: {
    id: string
    titre: string
    numero: number
    programme: string
    programmeNom: string
    statut: string
    formateurId: string
    prerequis: string
    acquis: string[]
    sessionActive: boolean
  }[]
  formateurs: { id: string; nom: string }[]
  moderateurs: { id: string; nom: string }[]
}
type Detail = SessionLive & {
  module: { id: string; slug: string; titre: string; numero: number; programme: string; statut: string } | null
  formateur: string
  moderateur: string
  inscrits: number
  reservees: number
  zoom: { reunionId: string | null; motDePasse: string | null; lienParticipation: string | null; lienHote: string | null } | null
}
interface Inscrit {
  id: string
  nom: string
  email: string
  telephone: string
  statut: 'confirmee' | 'a-rembourser'
  confirmeLe: string | null
  referenceTransaction: string
}

const { data: reference } = await useFetch<Reference>('/api/admin/live-sessions')
const { data: detail, refresh } = await useFetch<Detail | null>(() => `/api/admin/live-sessions/${id.value}`, {
  immediate: !creation.value,
  default: () => null,
})
const { data: inscrits, refresh: rafraichirInscrits } = await useFetch<{ inscrits: Inscrit[] }>(
  () => `/api/admin/live-sessions/${id.value}/inscrits`,
  { immediate: !creation.value, default: () => ({ inscrits: [] }) },
)

const DUREES = [60, 75, 90, 105, 120]

function vide() {
  return {
    moduleId: '',
    date: '',
    heure: '19:00',
    dureeMinutes: 90,
    capacite: 100,
    formateurId: '',
    moderateurId: '',
    zoomReunionId: '',
    zoomMotDePasse: '',
    zoomLienParticipation: '',
    zoomLienHote: '',
    prerequis: '',
    gains: '',
    deroule: [] as EtapeDeroule[],
    derouleValide: false,
    testTechniqueLe: '',
  }
}
const form = reactive(vide())
const creerReunionZoom = ref(true)
const prevenirAlertes = ref(true)

function remplir(d: Detail) {
  const { date, heure } = saisieDepuisDebut(d.debut)
  Object.assign(form, {
    moduleId: d.moduleId,
    date,
    heure,
    dureeMinutes: d.dureeMinutes,
    capacite: d.capacite,
    formateurId: d.formateurId,
    moderateurId: d.moderateurId ?? '',
    zoomReunionId: d.zoom?.reunionId ?? '',
    zoomMotDePasse: d.zoom?.motDePasse ?? '',
    zoomLienParticipation: d.zoom?.lienParticipation ?? '',
    zoomLienHote: d.zoom?.lienHote ?? '',
    prerequis: d.prerequis.join('\n'),
    gains: d.gains.join('\n'),
    deroule: d.deroule.map((e) => ({ ...e })),
    derouleValide: Boolean(d.derouleValideLe),
    testTechniqueLe: d.testTechniqueLe ? d.testTechniqueLe.slice(0, 16) : '',
  })
  creerReunionZoom.value = !d.zoom?.reunionId
}
watch(detail, (d) => d && remplir(d), { immediate: true })

const moduleChoisi = computed(() => reference.value?.modules.find((m) => m.id === form.moduleId) ?? null)
const modulesProposes = computed(() =>
  (reference.value?.modules ?? []).filter((m) => !m.sessionActive || m.id === detail.value?.moduleId),
)
// Choix d'un module en création : formateur, prérequis et gains repris du module (RM12).
watch(
  () => form.moduleId,
  (moduleId) => {
    if (!creation.value) return
    const m = reference.value?.modules.find((x) => x.id === moduleId)
    if (!m) return
    form.formateurId = m.formateurId
    if (!form.prerequis) form.prerequis = m.prerequis
    if (!form.gains) form.gains = m.acquis.join('\n')
  },
)

const statut = computed(() => detail.value?.statut ?? 'brouillon')
const modifiable = computed(() => statut.value === 'brouillon' || statut.value === 'publiee')
const demarree = computed(() => statut.value === 'en-cours' || statut.value === 'terminee')

const lignes = (texte: string) => texte.split('\n').map((l) => l.trim()).filter(Boolean)
function corps() {
  return {
    moduleId: form.moduleId,
    date: form.date,
    heure: form.heure,
    dureeMinutes: Number(form.dureeMinutes),
    capacite: Number(form.capacite),
    formateurId: form.formateurId,
    moderateurId: form.moderateurId || null,
    prerequis: lignes(form.prerequis),
    gains: lignes(form.gains),
    deroule: form.deroule.filter((e) => e.libelle.trim()),
    zoomReunionId: form.zoomReunionId || null,
    zoomMotDePasse: form.zoomMotDePasse || null,
    zoomLienParticipation: form.zoomLienParticipation || null,
    zoomLienHote: form.zoomLienHote || null,
    derouleValide: form.derouleValide,
    testTechniqueLe: form.testTechniqueLe ? new Date(`${form.testTechniqueLe}:00Z`).toISOString() : null,
  }
}

const occupe = ref('')
const erreur = ref('')
function messageErreur(e: unknown): string {
  const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
  return r.data?.statusMessage ?? r.statusMessage ?? 'Action impossible.'
}

/** Enregistre le formulaire ; `naviguer` : ouvrir la session créée (pas quand on publie dans la foulée). */
async function enregistrer(naviguer = true): Promise<string | null> {
  erreur.value = ''
  occupe.value = 'enregistrer'
  try {
    if (creation.value) {
      const session = await $fetch<SessionLive>('/api/admin/live-sessions', { method: 'POST', body: corps() })
      if (naviguer) {
        annoncer('Live Session enregistrée en brouillon')
        await navigateTo(`/admin/live-session/${session.id}`, { replace: true })
      }
      return session.id
    }
    await $fetch(`/api/admin/live-sessions/${id.value}`, { method: 'PATCH', body: corps() })
    await refresh()
    annoncer(statut.value === 'publiee' ? 'Modifications enregistrées. Un nouvel horaire est envoyé aux inscrits.' : 'Modifications enregistrées')
    return id.value
  } catch (e) {
    erreur.value = messageErreur(e)
    return null
  } finally {
    occupe.value = ''
  }
}

async function action(nom: 'publier' | 'terminer' | 'annuler' | 'publier-video', confirmation?: string) {
  if (confirmation && !window.confirm(confirmation)) return
  erreur.value = ''
  let cible = id.value
  if (nom === 'publier') {
    const sessionId = await enregistrer(false)
    if (!sessionId) return
    cible = sessionId
  }
  occupe.value = nom
  try {
    const body = nom === 'publier' ? { creerReunionZoom: creerReunionZoom.value, prevenirAlertes: prevenirAlertes.value } : {}
    const r = await $fetch<{ prevenus?: number }>(`/api/admin/live-sessions/${cible}/${nom}`, { method: 'POST', body })
    const textes = {
      publier: `Live Session publiée. Le module passe en « Live Session » sur le site${r?.prevenus ? ` et ${r.prevenus} apprenant(s) en alerte sont prévenus` : ''}.`,
      terminer: 'Session terminée : quiz et support ouverts aux inscrits.',
      annuler: 'Session annulée. Les inscrits sont prévenus ; le module revient « À venir ».',
      'publier-video': 'Vidéo publiée : le module est disponible et les inscrits y ont accès.',
    }
    annoncer(textes[nom])
    if (cible !== id.value) {
      await navigateTo(`/admin/live-session/${cible}`, { replace: true })
      return
    }
    await Promise.all([refresh(), rafraichirInscrits()])
  } catch (e) {
    erreur.value = messageErreur(e)
    // Brouillon créé, publication refusée (T2) : on ouvre le brouillon, le
    // refus reste annoncé.
    if (cible !== id.value) {
      annoncer(`Brouillon enregistré. ${messageErreur(e)}`, 'erreur')
      await navigateTo(`/admin/live-session/${cible}`, { replace: true })
    }
  } finally {
    occupe.value = ''
  }
}

async function supprimer() {
  if (!window.confirm('Supprimer définitivement cette Live Session ?')) return
  try {
    await $fetch(`/api/admin/live-sessions/${id.value}`, { method: 'DELETE' })
    annoncer('Live Session supprimée')
    await navigateTo('/admin/live-sessions')
  } catch (e) {
    erreur.value = messageErreur(e)
  }
}

// --- Support de cours (RM5) : envoi direct vers le stockage privé ------------
const fichier = ref<HTMLInputElement | null>(null)
async function deposerSupport() {
  const f = fichier.value?.files?.[0]
  if (!f) return
  erreur.value = ''
  occupe.value = 'support'
  try {
    const depot = await $fetch<{ chemin: string; urlEnvoi: string; type: string; nom: string }>(
      `/api/admin/live-sessions/${id.value}/support`,
      { method: 'POST', body: { etape: 'preparer', nom: f.name, taille: f.size } },
    )
    const envoi = await fetch(depot.urlEnvoi, { method: 'PUT', headers: { 'Content-Type': depot.type }, body: f })
    if (!envoi.ok) throw new Error('Le fichier n’a pas pu être envoyé. Réessayez.')
    await $fetch(`/api/admin/live-sessions/${id.value}/support`, {
      method: 'POST',
      body: { etape: 'confirmer', chemin: depot.chemin, nom: depot.nom },
    })
    annoncer('Support déposé')
    await refresh()
  } catch (e) {
    erreur.value = (e as Error).message && !(e as { data?: unknown }).data ? (e as Error).message : messageErreur(e)
  } finally {
    occupe.value = ''
    if (fichier.value) fichier.value.value = ''
  }
}
async function ouvrirSupport() {
  try {
    const { url } = await $fetch<{ url: string }>(`/api/mon-espace/live-sessions/${id.value}/support`)
    window.open(url, '_blank', 'noopener')
  } catch (e) {
    erreur.value = messageErreur(e)
  }
}

function ajouterEtape() {
  const derniere = form.deroule.at(-1)
  form.deroule.push({ decalageMinutes: derniere ? derniere.decalageMinutes + 15 : 0, libelle: '', questionsReponses: false })
}

const apercuDebut = computed(() => debutDepuisSaisie(form.date, form.heure))
const champ = 'w-full rounded-[10px] border-[1.5px] border-ligne bg-white px-[13px] py-[11px] text-[13.5px] disabled:bg-fond-clair disabled:text-discret'
</script>

<template>
  <div v-if="reference">
    <NuxtLink to="/admin/live-sessions" class="text-[13px] text-discret hover:text-encre">← Live Sessions</NuxtLink>
    <div class="mt-2 mb-[18px] flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[24px] font-light">
        {{ creation ? 'Planifier une Live Session' : moduleChoisi?.titre ?? detail?.module?.titre }}
      </h1>
      <div v-if="detail" class="flex flex-wrap items-center gap-2 text-[13px]">
        <span class="rounded-full bg-fond-voile px-3 py-1 font-bold">{{ { brouillon: 'Brouillon', publiee: 'Publiée', 'en-cours': 'En cours', terminee: 'Terminée', annulee: 'Annulée' }[statut] }}</span>
        <span class="text-discret">{{ detail.inscrits }} inscrit(s) / {{ detail.capacite }}</span>
        <UiBaseButton v-if="statut === 'publiee' || statut === 'en-cours'" :to="`/mon-espace/live/${detail.id}`" taille="sm" variante="live">
          Modérer la session
        </UiBaseButton>
      </div>
    </div>

    <p v-if="erreur" class="mb-4 rounded-[12px] border border-erreur bg-erreur-voile p-3.5 text-[13.5px] text-erreur-fonce" role="alert">
      {{ erreur }}
    </p>

    <div class="grid gap-6 xl:grid-cols-[1fr_340px] xl:items-start">
      <form class="flex flex-col gap-5" @submit.prevent="enregistrer()">
        <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
          <h2 class="mb-4 font-title text-[19px] font-light">Session</h2>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="md:col-span-2">
              <span class="mb-1.5 block text-[13px] font-bold">Module concerné</span>
              <select v-model="form.moduleId" :class="champ" required :disabled="statut !== 'brouillon'">
                <option value="" disabled>Choisir un module</option>
                <option v-for="m in modulesProposes" :key="m.id" :value="m.id">
                  {{ m.programmeNom }} · Module {{ String(m.numero).padStart(2, '0') }} — {{ m.titre }}
                </option>
              </select>
              <span class="mt-1 block text-[12px] text-discret">
                Modules pas encore disponibles en vidéo, sans autre session active.
              </span>
            </label>
            <label>
              <span class="mb-1.5 block text-[13px] font-bold">Date</span>
              <input v-model="form.date" type="date" :class="champ" required :disabled="demarree || statut === 'annulee'">
            </label>
            <label>
              <span class="mb-1.5 block text-[13px] font-bold">Heure (GMT)</span>
              <input v-model="form.heure" type="time" :class="champ" required :disabled="demarree || statut === 'annulee'">
            </label>
            <label>
              <span class="mb-1.5 block text-[13px] font-bold">Durée (Q&R incluses)</span>
              <select v-model.number="form.dureeMinutes" :class="champ" :disabled="demarree || statut === 'annulee'">
                <option v-for="d in DUREES" :key="d" :value="d">{{ dureeLive(d) }}</option>
              </select>
            </label>
            <label>
              <span class="mb-1.5 block text-[13px] font-bold">Capacité (licence Zoom)</span>
              <input v-model.number="form.capacite" type="number" min="1" :class="champ" required :disabled="demarree || statut === 'annulee'">
            </label>
            <label>
              <span class="mb-1.5 block text-[13px] font-bold">Formateur</span>
              <select v-model="form.formateurId" :class="champ" required :disabled="demarree || statut === 'annulee'">
                <option v-for="f in reference.formateurs" :key="f.id" :value="f.id">{{ f.nom }}</option>
              </select>
            </label>
            <label>
              <span class="mb-1.5 block text-[13px] font-bold">Modérateur</span>
              <select v-model="form.moderateurId" :class="champ" :disabled="statut === 'annulee'">
                <option value="">Choisir un admin</option>
                <option v-for="m in reference.moderateurs" :key="m.id" :value="m.id">{{ m.nom }}</option>
              </select>
            </label>
            <p class="text-[13px] md:col-span-2">
              <span class="font-bold">Prix</span> · identique à un module : <b>10 000 FCFA TTC</b>
            </p>
          </div>
        </section>

        <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
          <h2 class="font-title text-[19px] font-light">Réunion Zoom</h2>
          <p class="mt-1 mb-4 text-[12.5px] text-discret">
            Jamais affichée sur le site : les inscrits entrent par la salle intégrée de leur espace.
          </p>
          <label v-if="statut === 'brouillon'" class="mb-4 flex items-start gap-3 text-[13.5px]">
            <input v-model="creerReunionZoom" type="checkbox" class="mt-0.5 size-[18px] accent-social">
            <span>Créer la réunion automatiquement à la publication (sourdine à l’entrée, sans salle d’attente, enregistrement cloud)</span>
          </label>
          <div class="grid gap-4 md:grid-cols-2">
            <label>
              <span class="mb-1.5 block text-[13px] font-bold">ID de réunion</span>
              <input v-model="form.zoomReunionId" inputmode="numeric" placeholder="812 4471 0932" :class="champ" :disabled="demarree || statut === 'annulee'">
            </label>
            <label>
              <span class="mb-1.5 block text-[13px] font-bold">Code secret</span>
              <input v-model="form.zoomMotDePasse" :class="champ" :disabled="demarree || statut === 'annulee'">
            </label>
            <label>
              <span class="mb-1.5 block text-[13px] font-bold">Lien participant</span>
              <input v-model="form.zoomLienParticipation" type="url" placeholder="https://zoom.us/j/…" :class="champ" :disabled="demarree || statut === 'annulee'">
            </label>
            <label>
              <span class="mb-1.5 block text-[13px] font-bold">Lien hôte (formateur)</span>
              <input v-model="form.zoomLienHote" type="url" placeholder="https://zoom.us/s/…" :class="champ" :disabled="demarree || statut === 'annulee'">
            </label>
          </div>
        </section>

        <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
          <h2 class="mb-4 font-title text-[19px] font-light">Fiche publique</h2>
          <div class="grid gap-4 md:grid-cols-2">
            <label>
              <span class="mb-1.5 block text-[13px] font-bold">Prérequis (un par ligne)</span>
              <textarea v-model="form.prerequis" rows="4" :class="champ" />
            </label>
            <label>
              <span class="mb-1.5 block text-[13px] font-bold">Ce que vous allez gagner (un par ligne)</span>
              <textarea v-model="form.gains" rows="4" :class="champ" />
            </label>
          </div>
          <fieldset class="mt-5">
            <legend class="mb-2 text-[13px] font-bold">Déroulé</legend>
            <ul class="flex flex-col gap-2">
              <li v-for="(etape, i) in form.deroule" :key="i" class="flex flex-wrap items-center gap-2">
                <label class="flex items-center gap-1.5 text-[12.5px] text-discret">
                  +<input v-model.number="etape.decalageMinutes" type="number" min="0" class="w-[70px] rounded-[8px] border border-ligne px-2 py-2 text-[13px]" :aria-label="`Minutes après le début, étape ${i + 1}`">min
                </label>
                <input v-model="etape.libelle" class="min-w-[200px] flex-1 rounded-[8px] border border-ligne px-3 py-2 text-[13px]" :aria-label="`Libellé de l’étape ${i + 1}`" placeholder="Chapitre 1 : …">
                <label class="flex items-center gap-1.5 text-[12.5px]">
                  <input v-model="etape.questionsReponses" type="checkbox" class="accent-live"> Q&R
                </label>
                <button type="button" class="px-2 text-[18px] text-discret hover:text-erreur" :aria-label="`Retirer l’étape ${i + 1}`" @click="form.deroule.splice(i, 1)">×</button>
              </li>
            </ul>
            <button type="button" class="mt-2 text-[13px] font-bold text-social hover:underline" @click="ajouterEtape">+ Ajouter une étape</button>
          </fieldset>
        </section>

        <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
          <h2 class="mb-4 font-title text-[19px] font-light">Préparation du formateur</h2>
          <label class="mb-4 flex items-center gap-3 text-[13.5px]">
            <input v-model="form.derouleValide" type="checkbox" class="size-[18px] accent-social">
            Déroulé du module validé par l’équipe
          </label>
          <label class="block max-w-[320px]">
            <span class="mb-1.5 block text-[13px] font-bold">Test micro et caméra avec le modérateur (GMT)</span>
            <input v-model="form.testTechniqueLe" type="datetime-local" :class="champ">
          </label>
        </section>

        <div class="flex flex-wrap gap-2">
          <template v-if="statut === 'brouillon'">
            <UiBaseButton variante="live" :disabled="Boolean(occupe)" @click="action('publier')">Publier la Live Session</UiBaseButton>
            <UiBaseButton type="submit" variante="contour" :disabled="Boolean(occupe)">Enregistrer en brouillon</UiBaseButton>
          </template>
          <UiBaseButton v-else-if="statut !== 'annulee'" type="submit" variante="sombre" :disabled="Boolean(occupe)">
            Enregistrer les modifications
          </UiBaseButton>
        </div>
        <label v-if="statut === 'brouillon'" class="flex items-start gap-3 text-[13px] text-texte">
          <input v-model="prevenirAlertes" type="checkbox" class="mt-0.5 size-[18px] accent-social">
          <span>Prévenir les apprenants en alerte sur ce module, à la publication</span>
        </label>
      </form>

      <aside class="flex flex-col gap-5">
        <section class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <h2 class="text-[12px] font-bold tracking-[0.1em] text-discret uppercase">Aperçu sur le site</h2>
          <div class="mt-3 rounded-[12px] border border-ligne-douce p-4">
            <p class="text-[11.5px] font-bold tracking-[0.1em] text-live uppercase">
              Live Session<template v-if="apercuDebut"> · {{ dateCourteLive(apercuDebut) }}</template>
            </p>
            <p class="mt-1 font-title text-[17px] font-light">{{ moduleChoisi?.titre ?? 'Module à choisir' }}</p>
            <p class="text-[12.5px] text-discret">
              {{ reference.formateurs.find((f) => f.id === form.formateurId)?.nom }}
              <template v-if="apercuDebut"> · {{ heureLive(apercuDebut) }} GMT · {{ dureeLive(form.dureeMinutes) }}</template>
            </p>
          </div>
        </section>

        <section v-if="detail && statut !== 'brouillon'" class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <h2 class="font-title text-[17px] font-light">Cycle de vie</h2>
          <div class="mt-3 flex flex-col gap-2">
            <UiBaseButton
              v-if="statut === 'publiee' || statut === 'en-cours'"
              taille="sm"
              variante="sombre"
              :disabled="Boolean(occupe)"
              @click="action('terminer', 'Marquer la session comme terminée ? Le quiz et le support s’ouvrent aux inscrits.')"
            >
              Marquer comme terminée
            </UiBaseButton>
            <UiBaseButton
              v-if="statut === 'terminee' && detail.module?.statut === 'live-session'"
              taille="sm"
              variante="succes"
              :disabled="Boolean(occupe)"
              @click="action('publier-video', 'Publier la vidéo montée ? Le badge Live Session disparaît et le module passe « Disponible ».')"
            >
              Publier la vidéo
            </UiBaseButton>
            <p v-if="statut === 'terminee' && detail.module?.statut === 'live-session'" class="text-[12px] text-discret">
              Renseignez d’abord les chapitres vidéo dans
              <NuxtLink :to="`/admin/module/${detail.moduleId}`" class="font-bold text-social">l’éditeur du module</NuxtLink>.
            </p>
            <UiBaseButton
              v-if="statut === 'publiee'"
              taille="sm"
              variante="danger"
              :disabled="Boolean(occupe)"
              @click="action('annuler', 'Annuler la session ? Les inscrits reçoivent un e-mail ; le remboursement se traite hors plateforme.')"
            >
              Annuler la session
            </UiBaseButton>
          </div>
        </section>
        <section v-else-if="detail" class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <UiBaseButton taille="sm" variante="danger" @click="action('annuler', 'Annuler ce brouillon ?')">Annuler</UiBaseButton>
          <button type="button" class="ml-3 text-[13px] text-discret hover:text-erreur hover:underline" @click="supprimer">Supprimer</button>
        </section>

        <section v-if="detail && statut !== 'annulee'" class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <h2 class="font-title text-[17px] font-light">Support de cours <span class="text-[13px] text-discret">(facultatif)</span></h2>
          <p class="mt-1 text-[12.5px] text-discret">PDF ou PowerPoint, 50 Mo au plus. Remis aux inscrits après la session.</p>
          <p v-if="detail.supportNom" class="mt-3 text-[13.5px]">
            <button type="button" class="font-bold text-social hover:underline" @click="ouvrirSupport">{{ detail.supportNom }}</button>
          </p>
          <label class="mt-3 block">
            <span class="sr-only">Fichier du support</span>
            <input ref="fichier" type="file" accept=".pdf,.pptx,.ppt,.zip" class="block w-full text-[13px]" :disabled="Boolean(occupe)" @change="deposerSupport">
          </label>
          <p v-if="occupe === 'support'" class="mt-2 text-[12.5px] text-discret" role="status">Envoi en cours…</p>
        </section>

        <section v-if="detail" class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-title text-[17px] font-light">Inscrits ({{ inscrits.inscrits.filter((i) => i.statut === 'confirmee').length }})</h2>
            <a :href="`/api/admin/live-sessions/${detail.id}/inscrits.csv`" class="text-[13px] font-bold text-social hover:underline">Export CSV</a>
          </div>
          <ul class="mt-3 flex max-h-[320px] flex-col gap-2 overflow-y-auto text-[13px]">
            <li v-for="i in inscrits.inscrits" :key="i.id" class="flex justify-between gap-2 border-b border-ligne-claire pb-2">
              <span class="min-w-0">
                <b class="block truncate">{{ i.nom }}</b>
                <span class="block truncate text-discret">{{ i.email }}</span>
              </span>
              <span v-if="i.statut === 'a-rembourser'" class="shrink-0 rounded-full bg-erreur-voile px-2 py-0.5 text-[11px] font-bold text-erreur-fonce">À rembourser</span>
            </li>
            <li v-if="!inscrits.inscrits.length" class="text-discret">Aucun inscrit pour l’instant.</li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>
