<script setup lang="ts">
import type { Formateur, Module, Thematique } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Chapitre {
  id: string
  position: number
  libelle: string
  titre: string
  dureeMinutes: number | null
  nbLignesScript: number
}
interface Ressource {
  id: string
  titre: string
  url: string
  format: string
}
interface Version {
  id: string
  libelle: string
  auteur: string
  creeLe: string
}

const route = useRoute()
const { data, refresh } = await useFetch<{
  module: Module
  chapitres: Chapitre[]
  ressources: Ressource[]
  thematiques: Thematique[]
  formateurs: Formateur[]
  versions: Version[]
  peutOuvrirOffre: boolean
}>(() => `/api/admin/module/${route.params.id}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Module introuvable', fatal: true })
}

usePagePrivee(`${data.value.module.titre} — édition`)

const onglet = ref<'informations' | 'chapitres' | 'ressources' | 'offre' | 'referencement' | 'historique'>('informations')
const erreur = ref('')
const succes = ref('')
const enCours = ref(false)

// --- Informations -----------------------------------------------------------

const fiche = reactive({
  titre: '',
  promesse: '',
  pourquoi: '',
  prerequis: '',
  livrable: '',
  pourQui: '',
  acquis: '',
})

watchEffect(() => {
  const m = data.value?.module
  if (!m) return
  Object.assign(fiche, {
    titre: m.titre,
    promesse: m.promesse,
    pourquoi: m.pourquoi,
    prerequis: m.prerequis,
    livrable: m.livrable,
    // Une ligne = une puce sur la fiche publique.
    pourQui: m.pourQui.join('\n'),
    acquis: m.acquis.join('\n'),
  })
})

const lignes = (v: string) => v.split('\n').map((l) => l.trim()).filter(Boolean)

async function enregistrerFiche() {
  await appliquer({
    titre: fiche.titre,
    promesse: fiche.promesse,
    pourquoi: fiche.pourquoi,
    prerequis: fiche.prerequis,
    livrable: fiche.livrable,
    pourQui: lignes(fiche.pourQui),
    acquis: lignes(fiche.acquis),
  })
}

async function appliquer(champs: Record<string, unknown>) {
  erreur.value = ''
  succes.value = ''
  enCours.value = true
  try {
    await $fetch('/api/admin/modules', {
      method: 'PUT',
      body: { id: data.value!.module.id, ...champs },
    })
    succes.value = 'Enregistré. La version précédente reste restaurable.'
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'L’enregistrement a échoué.'
  } finally {
    enCours.value = false
  }
}

// --- Chapitres --------------------------------------------------------------

const nouveauChapitre = reactive({ libelle: '', titre: '', dureeMinutes: 18 })

async function chapitre(body: Record<string, unknown>) {
  erreur.value = ''
  try {
    await $fetch('/api/admin/chapitres', {
      method: 'POST',
      body: { moduleId: data.value!.module.id, ...body },
    })
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Action impossible.'
  }
}

async function ajouterChapitre() {
  if (!nouveauChapitre.titre.trim()) return
  await chapitre({ action: 'creer', ...nouveauChapitre })
  Object.assign(nouveauChapitre, { libelle: '', titre: '', dureeMinutes: 18 })
}

/** Déplacement d'un cran : suffisant au clavier comme à la souris, et sans
 *  dépendance de glisser-déposer. */
async function deplacer(index: number, sens: -1 | 1) {
  const ids = data.value!.chapitres.map((c) => c.id)
  const cible = index + sens
  if (cible < 0 || cible >= ids.length) return
  ;[ids[index], ids[cible]] = [ids[cible]!, ids[index]!]
  await chapitre({ action: 'reordonner', ordre: ids })
}

// --- Ressources -------------------------------------------------------------

const nouvelleRessource = reactive({ titre: '', url: '', format: 'PDF' })

async function ressource(body: Record<string, unknown>) {
  await $fetch('/api/admin/ressources', {
    method: 'POST',
    body: { moduleId: data.value!.module.id, ...body },
  })
  await refresh()
}

async function ajouterRessource() {
  if (!nouvelleRessource.titre.trim() || !nouvelleRessource.url.trim()) return
  await ressource({ action: 'creer', ...nouvelleRessource })
  Object.assign(nouvelleRessource, { titre: '', url: '' })
}

// --- Offre ------------------------------------------------------------------

const prix = ref(0)
watchEffect(() => { if (data.value) prix.value = data.value.module.prixFcfa })

async function restaurer(versionId: string) {
  erreur.value = ''
  try {
    await $fetch('/api/admin/versions', { method: 'POST', body: { versionId } })
    succes.value = 'Version restaurée.'
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'La restauration a échoué.'
  }
}

const ONGLETS = [
  { cle: 'informations', libelle: 'Informations' },
  { cle: 'chapitres', libelle: 'Chapitres' },
  { cle: 'ressources', libelle: 'Ressources' },
  { cle: 'offre', libelle: 'Offre' },
  { cle: 'referencement', libelle: 'Référencement et partage' },
  { cle: 'historique', libelle: 'Historique' },
] as const

const nomThematique = computed(
  () => data.value?.thematiques.find((t) => t.id === data.value?.module.thematiqueId)?.nom ?? '',
)

const champ = 'w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none'
</script>

<template>
  <div v-if="data">
    <NuxtLink to="/admin/contenus" class="text-[13px] text-discret hover:underline">← Modules &amp; chapitres</NuxtLink>

    <div class="mt-3 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-title text-[26px] font-light">
          Module {{ String(data.module.numero).padStart(2, '0') }} · {{ data.module.titre }}
        </h1>
        <p class="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-discret">
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
            :class="{
              'bg-succes-voile text-succes': data.module.statut === 'disponible',
              'bg-alerte-voile text-alerte': data.module.statut === 'en-preparation',
              'bg-fond-voile text-discret': data.module.statut === 'brouillon',
            }"
          >
            {{ data.module.statut }}
          </span>
          <span>{{ data.module.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }}</span>
          <span>·</span>
          <span>{{ nomThematique }}</span>
        </p>
      </div>
      <UiBaseButton
        v-if="data.module.statut !== 'brouillon'"
        :to="`/modules/${data.module.slug}`"
        variante="contour"
        taille="sm"
        cible="_blank"
      >
        Prévisualiser
      </UiBaseButton>
    </div>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-[#fdeeee] px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>
    <p v-if="succes" class="mt-4 rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[14px] text-succes">{{ succes }}</p>

    <div class="mt-5 flex flex-wrap gap-2 border-b border-ligne-douce" role="tablist">
      <button
        v-for="o in ONGLETS"
        :key="o.cle"
        role="tab"
        :aria-selected="onglet === o.cle"
        class="-mb-px border-b-2 px-3.5 py-2.5 text-[13.5px] font-bold"
        :class="onglet === o.cle ? 'border-social text-social' : 'border-transparent text-discret hover:text-encre'"
        @click="onglet = o.cle"
      >
        {{ o.libelle }}
        <span v-if="o.cle === 'chapitres'" class="font-normal">({{ data.chapitres.length }})</span>
        <span v-if="o.cle === 'ressources'" class="font-normal">({{ data.ressources.length }})</span>
      </button>
    </div>

    <!-- Informations -->
    <section v-if="onglet === 'informations'" class="mt-6 max-w-[760px]">
      <div class="flex flex-col gap-4">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Titre du module</span>
          <input v-model="fiche.titre" :class="champ">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">La promesse</span>
          <textarea v-model="fiche.promesse" rows="2" :class="champ" />
          <span class="mt-1 block text-[12px] text-discret">Sous le titre, en une phrase — le bénéfice concret.</span>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Pourquoi ce module ?</span>
          <textarea v-model="fiche.pourquoi" rows="4" :class="champ" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Pour qui ?</span>
          <textarea v-model="fiche.pourQui" rows="3" :class="champ" />
          <span class="mt-1 block text-[12px] text-discret">Une ligne = une puce sur la fiche publique.</span>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Prérequis</span>
          <input v-model="fiche.prerequis" :class="champ">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Les objectifs du module</span>
          <textarea v-model="fiche.acquis" rows="3" :class="champ" />
          <span class="mt-1 block text-[12px] text-discret">Une ligne = un objectif.</span>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Ce que vous construisez pendant le module</span>
          <textarea v-model="fiche.livrable" rows="2" :class="champ" />
        </label>
      </div>
      <UiBaseButton class="mt-5" taille="sm" :disabled="enCours" @click="enregistrerFiche">
        {{ enCours ? 'Enregistrement…' : 'Enregistrer' }}
      </UiBaseButton>
    </section>

    <!-- Chapitres -->
    <section v-if="onglet === 'chapitres'" class="mt-6 max-w-[760px]">
      <div v-if="data.chapitres.length" class="flex flex-col gap-2">
        <article
          v-for="(c, i) in data.chapitres"
          :key="c.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-ligne-douce bg-white p-4"
        >
          <div class="min-w-0">
            <p class="text-[14px] font-bold text-encre">{{ c.libelle }} · {{ c.titre }}</p>
            <p class="mt-0.5 text-[12.5px] text-discret">
              {{ c.dureeMinutes ? `${c.dureeMinutes} min` : 'durée non renseignée' }} ·
              {{ c.nbLignesScript ? `script de ${c.nbLignesScript} lignes` : 'script à importer' }}
            </p>
          </div>
          <div class="flex items-center gap-1.5">
            <button class="rounded-[8px] border border-ligne px-2 py-1 text-[12px]" :disabled="i === 0" @click="deplacer(i, -1)">↑</button>
            <button class="rounded-[8px] border border-ligne px-2 py-1 text-[12px]" :disabled="i === data.chapitres.length - 1" @click="deplacer(i, 1)">↓</button>
            <button class="ml-2 text-[12.5px] text-erreur underline" @click="chapitre({ action: 'supprimer', id: c.id })">Supprimer</button>
          </div>
        </article>
      </div>
      <p v-else class="rounded-[12px] border border-dashed border-ligne p-5 text-[13.5px] text-discret">
        Aucun chapitre. Il en faut au moins un pour pouvoir ouvrir l’offre.
      </p>

      <form class="mt-4 rounded-[14px] border border-ligne-douce bg-white p-5" @submit.prevent="ajouterChapitre">
        <h3 class="font-title text-[16px] font-light">Ajouter un chapitre</h3>
        <div class="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <input v-model="nouveauChapitre.libelle" placeholder="Chapitre 1" :class="champ">
          <input v-model="nouveauChapitre.titre" placeholder="Titre du chapitre" required :class="champ">
          <input v-model.number="nouveauChapitre.dureeMinutes" type="number" min="1" placeholder="min" :class="champ">
        </div>
        <UiBaseButton type="submit" taille="sm" class="mt-3">Ajouter</UiBaseButton>
      </form>
    </section>

    <!-- Ressources -->
    <section v-if="onglet === 'ressources'" class="mt-6 max-w-[760px]">
      <div v-if="data.ressources.length" class="flex flex-col gap-2">
        <article
          v-for="r in data.ressources"
          :key="r.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-ligne-douce bg-white p-4"
        >
          <div class="min-w-0">
            <p class="text-[14px] font-bold text-encre">{{ r.titre }}</p>
            <p class="mt-0.5 truncate text-[12.5px] text-discret">{{ r.format }} · {{ r.url }}</p>
          </div>
          <button class="text-[12.5px] text-erreur underline" @click="ressource({ action: 'supprimer', id: r.id })">Retirer</button>
        </article>
      </div>
      <p v-else class="rounded-[12px] border border-dashed border-ligne p-5 text-[13.5px] text-discret">
        Aucune ressource. Modèles, checklists et supports remis à l’apprenant se déposent ici.
      </p>

      <form
        class="mt-4 rounded-[14px] border border-ligne-douce bg-white p-5"
        @submit.prevent="ajouterRessource"
      >
        <h3 class="font-title text-[16px] font-light">Ajouter une ressource</h3>
        <div class="mt-3 grid gap-3 sm:grid-cols-[2fr_2fr_1fr]">
          <input v-model="nouvelleRessource.titre" placeholder="Titre" required :class="champ">
          <input v-model="nouvelleRessource.url" placeholder="Lien du fichier" required :class="champ">
          <input v-model="nouvelleRessource.format" placeholder="PDF" :class="champ">
        </div>
        <UiBaseButton type="submit" taille="sm" class="mt-3">Ajouter</UiBaseButton>
      </form>
    </section>

    <!-- Offre -->
    <section v-if="onglet === 'offre'" class="mt-6 max-w-[620px]">
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Prix TTC (FCFA)</span>
          <input v-model.number="prix" type="number" min="0" step="500" :class="champ">
        </label>
        <UiBaseButton class="mt-4" taille="sm" variante="contour" @click="appliquer({ prixFcfa: prix })">
          Enregistrer le prix
        </UiBaseButton>
      </div>

      <div class="mt-4 rounded-[14px] border p-5" :class="data.peutOuvrirOffre ? 'border-succes bg-succes-voile' : 'border-alerte bg-alerte-voile'">
        <p class="text-[14px] font-bold text-encre">
          {{ data.module.statut === 'disponible' ? 'Offre ouverte' : 'Offre fermée' }}
        </p>
        <p class="mt-1.5 text-[13px] text-texte">
          <template v-if="data.peutOuvrirOffre">
            Fermer l’offre ne retire jamais les accès déjà acquis : les apprenants gardent leur
            module à vie.
          </template>
          <template v-else>
            L’ouverture est bloquée tant que la promesse, le « pourquoi » et au moins un chapitre
            ne sont pas renseignés.
          </template>
        </p>
        <div class="mt-4 flex gap-2">
          <UiBaseButton
            v-if="data.module.statut !== 'disponible'"
            taille="sm"
            :disabled="!data.peutOuvrirOffre"
            @click="appliquer({ statut: 'disponible' })"
          >
            Ouvrir l’offre
          </UiBaseButton>
          <UiBaseButton
            v-else
            taille="sm"
            variante="contour"
            @click="appliquer({ statut: 'en-preparation' })"
          >
            Fermer l’offre
          </UiBaseButton>
        </div>
      </div>
    </section>

    <!-- Historique -->
    <!-- Référencement et partage (planche C, écran 24) : même panneau que la
         liste SEO, mêmes champs, même API. -->
    <section v-if="onglet === 'referencement'" class="mt-6 max-w-[620px]">
      <AdminPanneauReferencement
        :id="data.module.id"
        :libelle="data.module.titre"
        :chemin="`/modules/${data.module.slug}`"
        :seo="data.module.seo"
        integre
        @enregistre="refresh()"
      />
    </section>

    <section v-if="onglet === 'historique'" class="mt-6 max-w-[760px]">
      <div v-if="data.versions.length" class="flex flex-col gap-2">
        <article
          v-for="v in data.versions"
          :key="v.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-ligne-douce bg-white p-4"
        >
          <p class="text-[13.5px]">
            <b class="text-encre">{{ new Date(v.creeLe).toLocaleString('fr-FR') }}</b>
            <span class="text-discret"> — avant modification par {{ v.auteur }}</span>
          </p>
          <button class="text-[12.5px] underline" @click="restaurer(v.id)">Restaurer</button>
        </article>
      </div>
      <p v-else class="rounded-[12px] border border-dashed border-ligne p-5 text-[13.5px] text-discret">
        Aucune version enregistrée : ce module n’a pas encore été modifié depuis le back-office.
      </p>
    </section>
  </div>
</template>
