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
    <h1 class="font-title text-[26px] font-light">CMS — Site vitrine</h1>
    <p class="mt-2 max-w-[700px] text-[13.5px] text-discret">
      Chaque zone éditable du site public. Toute modification passe d’abord à l’historique :
      la version précédente reste restaurable depuis
      <NuxtLink to="/admin/historique" class="underline">Historique &amp; versions</NuxtLink>.
    </p>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-[#fdeeee] px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>

    <!-- Blocs -->
    <div class="mt-6 flex flex-col gap-3">
      <article
        v-for="bloc in data.blocs"
        :key="bloc.cle"
        class="rounded-[14px] border border-ligne-douce bg-white p-5"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="font-title text-[18px] font-light">{{ bloc.libelle }}</h2>
            <p class="mt-1 text-[13px] text-discret">{{ resume(bloc) }}</p>
            <p v-if="bloc.publieDu || bloc.publieAu" class="mt-1 text-[12.5px] text-alerte">
              Programmé du {{ formatDate(bloc.publieDu) }} au {{ formatDate(bloc.publieAu) }}
            </p>
          </div>
          <div class="flex items-center gap-2.5">
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-bold"
              :class="bloc.statut === 'publie' ? 'bg-succes-voile text-succes' : 'bg-fond-voile text-discret'"
            >
              {{ bloc.statut === 'publie' ? 'Publié' : 'Brouillon' }}
            </span>
            <UiBaseButton taille="sm" variante="contour" @click="ouvrir(bloc)">Modifier</UiBaseButton>
          </div>
        </div>

        <p class="mt-2.5 text-[12px] text-discret">
          Mis à jour {{ formatDate(bloc.majLe) }}<span v-if="bloc.majPar"> par {{ bloc.majPar }}</span>.
        </p>
      </article>

      <!-- Deux renvois de l'écran 15 : le blog a sa section (écran 22), les
           témoignages se gèrent plus bas sur cette page. -->
      <article class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="font-title text-[18px] font-light">
              Blog — {{ data.blog.articles }} article{{ data.blog.articles > 1 ? 's' : '' }},
              {{ data.blog.categories }} catégorie{{ data.blog.categories > 1 ? 's' : '' }}
            </h2>
            <p class="mt-1 text-[13px] text-discret">(section dédiée, écran 22)</p>
          </div>
          <div class="flex items-center gap-2.5">
            <span class="rounded-full bg-succes-voile px-2.5 py-1 text-[11px] font-bold text-succes">Publié</span>
            <UiBaseButton to="/admin/blog" taille="sm" variante="contour">Gérer</UiBaseButton>
          </div>
        </div>
      </article>
      <article class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="font-title text-[18px] font-light">
              Témoignages — {{ temoignagesPublies }} publié{{ temoignagesPublies > 1 ? 's' : '' }}, ordre manuel
            </h2>
          </div>
          <div class="flex items-center gap-2.5">
            <span class="rounded-full bg-succes-voile px-2.5 py-1 text-[11px] font-bold text-succes">Publié</span>
            <UiBaseButton to="#temoignages" taille="sm" variante="contour">Gérer</UiBaseButton>
          </div>
        </div>
      </article>
    </div>

    <!-- Éditeur -->
    <div v-if="edition" class="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-[1fr_300px]">
      <div class="rounded-[14px] border border-social bg-white p-6">
        <h2 class="font-title text-[19px] font-light">{{ edition.libelle }}</h2>

        <div class="mt-4">
          <AdminEditeurBloc
            :key="edition.cle"
            :cle="edition.cle"
            :contenu="edition.contenu"
            @maj="edition.contenu = $event"
          />
        </div>

        <label class="mt-5 flex items-center gap-2.5">
          <input
            type="checkbox"
            :checked="edition.statut === 'publie'"
            @change="edition.statut = edition.statut === 'publie' ? 'brouillon' : 'publie'"
          >
          <span class="text-[13.5px]">Publier ce bloc sur le site</span>
        </label>

        <!-- Programmation (écran 15 : « Programmer : du 15/10 au 01/11 ») : un
             bandeau qui s'éteint tout seul évite d'avoir à penser à revenir
             l'éteindre. Les deux dates alimentent `publie_du` / `publie_au`. -->
        <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-ligne-claire pt-4 text-[13px]">
          <span class="font-bold">Programmer : du</span>
          <label>
            <span class="sr-only">Visible à partir du (facultatif)</span>
            <input v-model="edition.publieDu" type="date" class="rounded-[10px] border border-ligne px-3 py-2 text-[14px]">
          </label>
          <span class="font-bold">au</span>
          <label>
            <span class="sr-only">Jusqu’au (facultatif)</span>
            <input v-model="edition.publieAu" type="date" class="rounded-[10px] border border-ligne px-3 py-2 text-[14px]">
          </label>
          <span class="text-[12px] text-discret">(facultatif)</span>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <UiBaseButton taille="sm" :disabled="enCours" @click="enregistrer">
            {{ enCours ? 'Enregistrement…' : 'Enregistrer' }}
          </UiBaseButton>
          <UiBaseButton to="/" variante="contour" taille="sm" cible="_blank">
            Voir la page publique
          </UiBaseButton>
          <UiBaseButton variante="contour" taille="sm" @click="edition = null">Annuler</UiBaseButton>
        </div>
      </div>

      <aside class="h-fit rounded-[14px] border border-ligne-douce bg-white p-5">
        <h3 class="font-title text-[17px] font-light">Historique</h3>
        <p class="mt-1 text-[12.5px] text-discret">
          Chaque enregistrement dépose ici l’état précédent. Un bloc en brouillon ne s’affiche pas
          sur la page publique, quelles que soient ses dates.
        </p>
        <ul v-if="historique.length" class="mt-3 flex flex-col gap-2">
          <li
            v-for="v in historique"
            :key="v.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-ligne-claire p-3 text-[12.5px]"
          >
            <span class="text-discret">{{ formatDate(v.creeLe) }} · {{ v.auteur }}</span>
            <button v-if="peutRestaurer" class="text-social underline" @click="restaurer(v.id)">
              Restaurer
            </button>
          </li>
        </ul>
        <p v-else class="mt-3 text-[13px] text-discret">Aucune version antérieure.</p>
        <p v-if="historique.length && !peutRestaurer" class="mt-3 text-[12px] text-discret">
          Restaurer une version demande le droit « Historique &amp; versions ».
        </p>
      </aside>
    </div>

    <!-- Témoignages -->
    <section id="temoignages" class="mt-10 scroll-mt-6">
      <h2 class="font-title text-[21px] font-light">Témoignages</h2>
      <p class="mt-1 text-[13px] text-discret">
        {{ data.temoignages.filter((t) => t.publie).length }} publié(s) sur
        {{ data.temoignages.length }} · ordre manuel.
      </p>

      <div v-if="data.temoignages.length" class="mt-4 flex flex-col gap-2.5">
        <article
          v-for="t in data.temoignages"
          :key="t.id"
          class="flex flex-wrap items-start justify-between gap-3 rounded-[12px] border border-ligne-douce bg-white p-4"
        >
          <div class="max-w-[620px]">
            <p class="text-[13.5px] text-texte">« {{ t.texte }} »</p>
            <p class="mt-1.5 text-[12.5px] font-bold text-encre">
              {{ t.auteur }}<span v-if="t.role" class="font-normal text-discret"> — {{ t.role }}</span>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button class="text-[12.5px] underline" @click="basculerPublication(t)">
              {{ t.publie ? 'Dépublier' : 'Publier' }}
            </button>
            <button class="text-[12.5px] text-erreur underline" @click="supprimerTemoignage(t.id)">
              Supprimer
            </button>
          </div>
        </article>
      </div>
      <p v-else class="mt-4 rounded-[12px] border border-dashed border-ligne p-5 text-[13.5px] text-discret">
        Aucun témoignage pour l’instant. Les visuels et citations définitifs sont attendus du client.
      </p>

      <form class="mt-4 rounded-[14px] border border-ligne-douce bg-white p-5" @submit.prevent="ajouterTemoignage">
        <h3 class="font-title text-[16px] font-light">Ajouter un témoignage</h3>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <input v-model="nouveau.auteur" placeholder="Prénom et nom" required class="rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none">
          <input v-model="nouveau.role" placeholder="Rôle, entreprise" class="rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none">
          <textarea v-model="nouveau.texte" rows="3" placeholder="Le témoignage" required class="sm:col-span-2 rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none" />
        </div>
        <UiBaseButton type="submit" taille="sm" class="mt-3">Ajouter</UiBaseButton>
      </form>
    </section>
  </div>
</template>
