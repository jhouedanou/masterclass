<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('CMS — Site vitrine')

interface Bloc {
  cle: string
  libelle: string
  statut: 'brouillon' | 'publie'
  contenu: Record<string, never>
  publieDu: string | null
  publieAu: string | null
  majLe: string
  majPar: string | null
}
interface Temoignage {
  id: string
  auteur: string
  role: string
  texte: string
  position: number
  publie: boolean
}

interface Version {
  id: string
  libelle: string
  auteur: string
  creeLe: string
  entiteId: string
}

const { data, refresh } = await useFetch<{
  blocs: Bloc[]
  temoignages: Temoignage[]
  versions: Version[]
  blog: { articles: number; categories: number }
}>('/api/admin/cms')

const temoignagesPublies = computed(() => (data.value?.temoignages ?? []).filter((t) => t.publie).length)

const erreur = ref('')
const enCours = ref(false)

// La restauration relève du droit « Historique & versions », distinct de celui
// du CMS : proposer le bouton à qui ne l'a pas promettrait un refus.
const auth = useAuthStore()
const peutRestaurer = computed(() => auth.voitSection('historique-versions'))

/**
 * Le bloc ouvert en édition.
 *
 * Le contenu est désormais manipulé par un formulaire propre à chaque type de
 * bloc plutôt qu'en JSON : une virgule de trop suffisait à tout bloquer, et ce
 * n'est pas ce qu'on demande à quelqu'un qui vient changer une accroche. Les
 * blocs sans forme stable gardent le JSON, dans le composant d'édition.
 */
const edition = ref<{
  cle: string
  libelle: string
  contenu: Record<string, unknown>
  statut: string
  publieDu: string
  publieAu: string
} | null>(null)

function ouvrir(bloc: Bloc) {
  edition.value = {
    cle: bloc.cle,
    libelle: bloc.libelle,
    contenu: JSON.parse(JSON.stringify(bloc.contenu)),
    statut: bloc.statut,
    publieDu: bloc.publieDu?.slice(0, 10) ?? '',
    publieAu: bloc.publieAu?.slice(0, 10) ?? '',
  }
}

/** Historique du bloc ouvert : chaque enregistrement y dépose l'état précédent. */
const historique = computed(() =>
  (data.value?.versions ?? []).filter((v) => v.entiteId === edition.value?.cle),
)

async function restaurer(versionId: string) {
  erreur.value = ''
  try {
    await $fetch('/api/admin/versions', { method: 'POST', body: { versionId } })
    edition.value = null
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'La restauration a échoué.'
  }
}

async function enregistrer() {
  if (!edition.value) return
  erreur.value = ''
  enCours.value = true
  try {
    await $fetch('/api/admin/cms', {
      method: 'PUT',
      body: {
        cle: edition.value.cle,
        contenu: edition.value.contenu,
        statut: edition.value.statut,
        // Un bandeau programmé se publie et se retire tout seul : sans dates,
        // il faut penser à revenir l'éteindre.
        publieDu: edition.value.publieDu || null,
        publieAu: edition.value.publieAu || null,
      },
    })
    edition.value = null
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'L’enregistrement a échoué.'
  } finally {
    enCours.value = false
  }
}

// --- Témoignages ------------------------------------------------------------

const nouveau = reactive({ auteur: '', role: '', texte: '' })

async function ajouterTemoignage() {
  if (!nouveau.auteur.trim() || !nouveau.texte.trim()) return
  await $fetch('/api/admin/temoignages', { method: 'POST', body: { action: 'creer', ...nouveau } })
  Object.assign(nouveau, { auteur: '', role: '', texte: '' })
  await refresh()
}

async function basculerPublication(t: Temoignage) {
  await $fetch('/api/admin/temoignages', {
    method: 'POST',
    body: { action: 'modifier', id: t.id, publie: !t.publie },
  })
  await refresh()
}

async function supprimerTemoignage(id: string) {
  await $fetch('/api/admin/temoignages', { method: 'POST', body: { action: 'supprimer', id } })
  await refresh()
}

// Écran 15 : filets de 1,5 px, chemise 11/13.
const champ =
  'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-[11px] text-[13px] focus:border-social focus:outline-none'

/** Un aperçu court du contenu, pour lire la liste sans ouvrir chaque bloc. */
function resume(bloc: Bloc): string {
  const c = bloc.contenu as Record<string, unknown>
  if (bloc.cle === 'banniere') {
    const slides = (c.slides as unknown[] | undefined)?.length ?? 0
    return `${slides} slide${slides > 1 ? 's' : ''} · défilement ${c.dureeSecondes ?? 6} s`
  }
  if (bloc.cle === 'annonce') return (c.texte as string) || 'Aucun texte — le bandeau reste masqué'
  if (bloc.cle === 'accueil') {
    const n = (c.chiffres as unknown[] | undefined)?.length ?? 0
    return `${n} chiffre${n > 1 ? 's' : ''} clé${n > 1 ? 's' : ''}`
  }
  if (bloc.cle === 'legales') {
    const n = (c.documents as unknown[] | undefined)?.length ?? 0
    return `${n} documents versionnés`
  }
  return 'Textes portés par les fiches programme'
}
</script>

<template>
  <div v-if="data">
    <h1 class="font-title text-[24px] font-light">CMS — Site vitrine</h1>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-erreur-voile px-4 py-3 text-[13px] text-erreur">{{ erreur }}</p>

    <!-- Écran 15 : une ligne-carte par zone éditable ; celle qu'on ouvre
         s'étend sur place, cerclée de violet, au lieu de renvoyer plus bas. -->
    <div class="mt-4 flex flex-col gap-2.5">
      <article
        v-for="bloc in data.blocs"
        :key="bloc.cle"
        class="rounded-[12px] bg-white px-5 py-4 text-[13.5px]"
        :class="edition?.cle === bloc.cle ? 'border-[1.5px] border-social' : 'border border-ligne-douce'"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span>
            <b>{{ bloc.libelle }}</b> — {{ resume(bloc) }}
            <span v-if="bloc.publieDu || bloc.publieAu" class="text-alerte">
              · programmé du {{ formatDate(bloc.publieDu) }} au {{ formatDate(bloc.publieAu) }}
            </span>
          </span>
          <span class="flex items-center gap-2.5">
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-bold"
              :class="bloc.statut === 'publie' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte'"
            >
              {{ bloc.statut === 'publie' ? 'Publié' : 'Brouillon' }}
            </span>
            <button
              v-if="edition?.cle !== bloc.cle"
              class="text-[12.5px] font-bold text-social"
              @click="ouvrir(bloc)"
            >
              Modifier
            </button>
            <button v-else class="text-[12.5px] font-bold text-discret" @click="edition = null">Fermer</button>
          </span>
        </div>

        <template v-if="edition && edition.cle === bloc.cle">
          <div class="mt-3">
            <AdminEditeurBloc
              :key="edition.cle"
              :cle="edition.cle"
              :contenu="edition.contenu"
              @maj="edition!.contenu = $event"
            />
          </div>

          <label class="mt-3 flex items-center gap-2.5 text-[12.5px] font-semibold text-texte">
            <input
              type="checkbox"
              class="size-4 accent-social"
              :checked="edition.statut === 'publie'"
              @change="edition!.statut = edition!.statut === 'publie' ? 'brouillon' : 'publie'"
            >
            Publier ce bloc sur le site
          </label>

          <!-- Programmation (écran 15 : « Programmer : du 15/10 au 01/11 ») : un
               bandeau qui s'éteint tout seul évite d'avoir à penser à revenir
               l'éteindre. Les deux dates alimentent `publie_du` / `publie_au`. -->
          <div class="mt-2.5 flex flex-wrap items-center gap-2.5 text-[12.5px]">
            <span class="font-semibold text-texte">Programmer : du</span>
            <label>
              <span class="sr-only">Visible à partir du (facultatif)</span>
              <input v-model="edition.publieDu" type="date" :class="champ">
            </label>
            <span class="font-semibold text-texte">au</span>
            <label>
              <span class="sr-only">Jusqu’au (facultatif)</span>
              <input v-model="edition.publieAu" type="date" :class="champ">
            </label>
            <span class="text-discret">(facultatif)</span>
            <UiBaseButton class="ml-auto" variante="sombre" taille="sm" :disabled="enCours" @click="enregistrer">
              {{ enCours ? 'Enregistrement…' : 'Publier' }}
            </UiBaseButton>
          </div>

          <div class="mt-3 border-t border-ligne-claire pt-3">
            <p class="text-[12.5px] font-bold">Historique des versions</p>
            <ul v-if="historique.length" class="mt-2 flex flex-col gap-1.5">
              <li
                v-for="v in historique"
                :key="v.id"
                class="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-ligne-claire px-3 py-2.5 text-[12px]"
              >
                <span class="text-discret">{{ formatDate(v.creeLe) }} · {{ v.auteur }}</span>
                <button v-if="peutRestaurer" class="font-bold text-social" @click="restaurer(v.id)">
                  Restaurer
                </button>
              </li>
            </ul>
            <p v-else class="mt-1.5 text-[12px] text-discret">Aucune version antérieure.</p>
            <p v-if="historique.length && !peutRestaurer" class="mt-1.5 text-[11.5px] text-discret">
              Restaurer une version demande le droit « Historique &amp; versions ».
            </p>
            <p class="mt-2 text-[11.5px] text-discret">
              Mis à jour {{ formatDate(bloc.majLe) }}<span v-if="bloc.majPar"> par {{ bloc.majPar }}</span>.
            </p>
          </div>
        </template>
      </article>

      <!-- Deux renvois de l'écran 15 : le blog a sa section (écran 22), les
           témoignages se gèrent plus bas sur cette page. -->
      <article class="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-ligne-douce bg-white px-5 py-4 text-[13.5px]">
        <span>
          <b>Blog</b> — {{ data.blog.articles }} article{{ data.blog.articles > 1 ? 's' : '' }},
          {{ data.blog.categories }} catégorie{{ data.blog.categories > 1 ? 's' : '' }}
          <span class="text-discret">(section dédiée, écran 22)</span>
        </span>
        <span class="flex items-center gap-2.5">
          <span class="rounded-full px-2.5 py-1 text-[11px] font-bold bg-succes-voile text-succes">Publié</span>
          <NuxtLink to="/admin/blog" class="text-[12.5px] font-bold">Gérer</NuxtLink>
        </span>
      </article>
      <article class="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-ligne-douce bg-white px-5 py-4 text-[13.5px]">
        <span>
          <b>Témoignages</b> — {{ temoignagesPublies }} publié{{ temoignagesPublies > 1 ? 's' : '' }}, ordre manuel
        </span>
        <span class="flex items-center gap-2.5">
          <span class="rounded-full px-2.5 py-1 text-[11px] font-bold bg-succes-voile text-succes">Publié</span>
          <NuxtLink to="#temoignages" class="text-[12.5px] font-bold">Gérer</NuxtLink>
        </span>
      </article>
    </div>

    <p class="mt-3 text-[12px] text-discret">
      Chaque bloc a un bouton « Prévisualiser » et un historique de versions avec restauration en
      1 clic. Toute modification passe d’abord par
      <NuxtLink to="/admin/historique" class="text-inherit hover:underline">Historique &amp; versions</NuxtLink>.
    </p>

    <!-- Témoignages -->
    <section id="temoignages" class="mt-4 scroll-mt-6 rounded-[12px] border border-ligne-douce bg-white px-5 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-sans text-[15px] font-bold">Témoignages</h2>
        <span class="text-[12px] text-discret">
          {{ temoignagesPublies }} publié(s) sur {{ data.temoignages.length }} · ordre manuel
        </span>
      </div>

      <div v-if="data.temoignages.length" class="mt-3 flex flex-col gap-2.5">
        <article
          v-for="t in data.temoignages"
          :key="t.id"
          class="flex flex-wrap items-start justify-between gap-3 rounded-[10px] border border-ligne-claire px-3 py-2.5"
        >
          <div class="max-w-[620px]">
            <p class="text-[13px] text-texte">« {{ t.texte }} »</p>
            <p class="mt-1 text-[12px] font-bold text-encre">
              {{ t.auteur }}<span v-if="t.role" class="font-normal text-discret"> — {{ t.role }}</span>
            </p>
          </div>
          <div class="flex items-center gap-3 text-[12.5px] font-bold">
            <button class="text-social" @click="basculerPublication(t)">
              {{ t.publie ? 'Dépublier' : 'Publier' }}
            </button>
            <button class="text-erreur" @click="supprimerTemoignage(t.id)">Supprimer</button>
          </div>
        </article>
      </div>
      <p v-else class="mt-3 rounded-[10px] border border-dashed border-ligne-pointillee p-5 text-[13px] text-discret">
        Aucun témoignage pour l’instant. Les visuels et citations définitifs sont attendus du client.
      </p>

      <form class="mt-3 border-t border-ligne-claire pt-3" @submit.prevent="ajouterTemoignage">
        <p class="text-[12.5px] font-bold">Ajouter un témoignage</p>
        <div class="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          <input v-model="nouveau.auteur" placeholder="Prénom et nom" required :class="champ">
          <input v-model="nouveau.role" placeholder="Rôle, entreprise" :class="champ">
          <textarea v-model="nouveau.texte" rows="3" placeholder="Le témoignage" required class="sm:col-span-2" :class="champ" />
        </div>
        <UiBaseButton type="submit" taille="sm" class="mt-2.5">Ajouter</UiBaseButton>
      </form>
    </section>
  </div>
</template>
