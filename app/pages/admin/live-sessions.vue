<script setup lang="ts">
import type { LiveSession } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Live Sessions — administration')

/**
 * Live Sessions (brief du 02/11) : séances en direct ouvertes au public, avec
 * fiche et prix. Une session publiée paraît sur /live-sessions et l'accueil ;
 * la réunion Zoom est créée à l'enregistrement et suit les changements de
 * date. Les séances payantes s'affichent mais n'ouvrent pas encore
 * l'inscription en ligne.
 */
const { data, refresh } = await useFetch<{ sessions: LiveSession[]; formateurs: { id: string; nom: string }[] }>(
  '/api/admin/live-sessions',
)
const { annoncer } = useToasts()

const STATUTS: { valeur: LiveSession['statut']; libelle: string }[] = [
  { valeur: 'brouillon', libelle: 'Brouillon' },
  { valeur: 'publiee', libelle: 'Publiée' },
  { valeur: 'annulee', libelle: 'Annulée' },
  { valeur: 'terminee', libelle: 'Terminée' },
]

function vide() {
  return {
    id: '',
    titre: '',
    slug: '',
    resume: '',
    description: '',
    prerequis: '',
    objectifs: '',
    formateurId: '',
    date: '',
    heure: '19:00',
    dureeMinutes: 90,
    prixFcfa: 0,
    places: 100,
    statut: 'brouillon' as LiveSession['statut'],
    image: '',
  }
}
const fiche = ref<ReturnType<typeof vide> | null>(null)

function ouvrir(live?: LiveSession) {
  fiche.value = live
    ? {
        ...vide(),
        ...live,
        prerequis: live.prerequis.join('\n'),
        objectifs: live.objectifs.join('\n'),
        image: live.image ?? '',
      }
    : vide()
}

const envoi = ref(false)
async function enregistrer() {
  if (!fiche.value) return
  envoi.value = true
  try {
    const { id, ...corps } = fiche.value
    await $fetch(id ? `/api/admin/live-sessions/${id}` : '/api/admin/live-sessions', {
      method: id ? 'PUT' : 'POST',
      body: corps,
    })
    annoncer(id ? 'Live Session enregistrée.' : 'Live Session créée, réunion Zoom comprise.')
    fiche.value = null
    await refresh()
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    annoncer(err.data?.statusMessage ?? err.statusMessage ?? 'Enregistrement impossible.', 'erreur')
  } finally {
    envoi.value = false
  }
}

const nomFormateur = (id: string) => data.value?.formateurs.find((f) => f.id === id)?.nom ?? '—'
const libelleStatut = (s: LiveSession['statut']) => STATUTS.find((x) => x.valeur === s)?.libelle ?? s

const champ =
  'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-3 text-[13.5px] focus:border-social focus:outline-none'
const etiquette = 'mb-1.5 block text-[12.5px] font-bold'
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[24px] font-light">Live Sessions</h1>
      <UiBaseButton taille="sm" @click="ouvrir()">+ Nouvelle Live Session</UiBaseButton>
    </div>
    <p class="mt-1 max-w-prose text-[13px] text-discret">
      Une Live Session publiée paraît sur la page Live Sessions et sur l’accueil. La réunion Zoom est
      créée à l’enregistrement. Les séances payantes s’affichent avec leur prix, mais l’inscription
      en ligne n’est ouverte que pour les séances gratuites.
    </p>

    <form v-if="fiche" class="mt-5 grid gap-4 rounded-[14px] border border-ligne-douce bg-white p-[22px]" @submit.prevent="enregistrer">
      <h2 class="font-sans text-[15px] font-bold">{{ fiche.id ? 'Modifier la Live Session' : 'Nouvelle Live Session' }}</h2>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="block"><span :class="etiquette">Titre</span><input v-model="fiche.titre" required :class="champ"></label>
        <label class="block">
          <span :class="etiquette">Adresse (slug) — vide : tirée du titre</span>
          <input v-model="fiche.slug" :class="[champ, 'font-mono text-[13px]']" placeholder="ma-live-session">
        </label>
      </div>
      <label class="block"><span :class="etiquette">Accroche (cartes et haut de fiche)</span><input v-model="fiche.resume" maxlength="240" :class="champ"></label>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="block">
          <span :class="etiquette">Ce que l’on apprend — une ligne par point</span>
          <textarea v-model="fiche.objectifs" rows="5" :class="champ" />
        </label>
        <label class="block">
          <span :class="etiquette">Prérequis — une ligne par point</span>
          <textarea v-model="fiche.prerequis" rows="5" :class="champ" />
        </label>
      </div>
      <label class="block"><span :class="etiquette">Description (facultative)</span><textarea v-model="fiche.description" rows="4" :class="champ" /></label>
      <div class="grid gap-4 md:grid-cols-4">
        <label class="block">
          <span :class="etiquette">Formateur</span>
          <select v-model="fiche.formateurId" required :class="champ">
            <option value="" disabled>Choisir…</option>
            <option v-for="f in data.formateurs" :key="f.id" :value="f.id">{{ f.nom }}</option>
          </select>
        </label>
        <label class="block"><span :class="etiquette">Date</span><input v-model="fiche.date" type="date" required :class="champ"></label>
        <label class="block"><span :class="etiquette">Heure (Abidjan)</span><input v-model="fiche.heure" type="time" required :class="champ"></label>
        <label class="block"><span :class="etiquette">Durée (minutes)</span><input v-model.number="fiche.dureeMinutes" type="number" min="15" max="600" required :class="champ"></label>
        <label class="block"><span :class="etiquette">Prix (FCFA, 0 = gratuit)</span><input v-model.number="fiche.prixFcfa" type="number" min="0" step="500" required :class="champ"></label>
        <label class="block"><span :class="etiquette">Places</span><input v-model.number="fiche.places" type="number" min="1" required :class="champ"></label>
        <label class="block">
          <span :class="etiquette">Statut</span>
          <select v-model="fiche.statut" :class="champ">
            <option v-for="s in STATUTS" :key="s.valeur" :value="s.valeur">{{ s.libelle }}</option>
          </select>
        </label>
        <label class="block"><span :class="etiquette">Image (facultative)</span><input v-model="fiche.image" placeholder="/images/…" :class="champ"></label>
      </div>
      <div class="flex gap-3">
        <UiBaseButton type="submit" taille="sm" :disabled="envoi">Enregistrer</UiBaseButton>
        <UiBaseButton variante="contour" taille="sm" @click="fiche = null">Annuler</UiBaseButton>
      </div>
    </form>

    <AdminTableauSimple
      class="mt-5"
      :colonnes="['Date', 'Titre', 'Formateur', 'Prix', 'Inscrits', 'Statut', '']"
      :largeurs="['130px', '1fr', '170px', '110px', '100px', '110px', '150px']"
      largeur-min="900px"
    >
      <tr v-if="!data.sessions.length"><td colspan="7" class="px-4 py-6 text-discret">Aucune Live Session pour l’instant.</td></tr>
      <tr v-for="live in data.sessions" :key="live.id">
        <td class="px-4 py-3">{{ formatDateCourte(live.date) }} · {{ live.heure }}</td>
        <td class="px-4 py-3 font-bold">{{ live.titre }}</td>
        <td class="px-4 py-3">{{ nomFormateur(live.formateurId) }}</td>
        <td class="px-4 py-3">{{ live.prixFcfa > 0 ? formatFranc(live.prixFcfa) : 'Gratuit' }}</td>
        <td class="px-4 py-3">{{ live.inscrits }} / {{ live.places }}</td>
        <td class="px-4 py-3">{{ libelleStatut(live.statut) }}</td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <NuxtLink v-if="live.statut === 'publiee'" :to="`/live-sessions/${live.slug}`" target="_blank" class="mr-3 text-[12.5px] underline">Voir</NuxtLink>
          <NuxtLink :to="`/mon-espace/session/${live.id}`" class="mr-3 text-[12.5px] underline">Salle</NuxtLink>
          <button type="button" class="text-[12.5px] font-bold text-social" @click="ouvrir(live)">Modifier</button>
        </td>
      </tr>
    </AdminTableauSimple>
  </div>
</template>
