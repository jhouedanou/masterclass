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

const { data, refresh } = await useFetch<{ blocs: Bloc[]; temoignages: Temoignage[] }>('/api/admin/cms')

const erreur = ref('')
const enCours = ref(false)

/** Le bloc ouvert en édition. Le JSON est manipulé tel quel : chaque bloc a sa
 *  forme propre, et un formulaire figé obligerait à une migration à chaque
 *  évolution éditoriale. */
const edition = ref<{ cle: string; libelle: string; json: string; statut: string } | null>(null)
const jsonInvalide = ref(false)

function ouvrir(bloc: Bloc) {
  edition.value = {
    cle: bloc.cle,
    libelle: bloc.libelle,
    json: JSON.stringify(bloc.contenu, null, 2),
    statut: bloc.statut,
  }
  jsonInvalide.value = false
}

watch(() => edition.value?.json, (v) => {
  if (v === undefined) return
  try {
    JSON.parse(v)
    jsonInvalide.value = false
  } catch {
    jsonInvalide.value = true
  }
})

async function enregistrer() {
  if (!edition.value || jsonInvalide.value) return
  erreur.value = ''
  enCours.value = true
  try {
    await $fetch('/api/admin/cms', {
      method: 'PUT',
      body: {
        cle: edition.value.cle,
        contenu: JSON.parse(edition.value.json),
        statut: edition.value.statut,
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
    </div>

    <!-- Éditeur -->
    <div v-if="edition" class="mt-6 rounded-[14px] border border-social bg-white p-6">
      <h2 class="font-title text-[19px] font-light">{{ edition.libelle }}</h2>

      <label class="mt-4 block">
        <span class="mb-1.5 block text-[13px] font-bold">Contenu</span>
        <textarea
          v-model="edition.json"
          rows="14"
          spellcheck="false"
          class="w-full rounded-[10px] border px-3 py-2.5 font-mono text-[13px] focus:outline-none"
          :class="jsonInvalide ? 'border-erreur' : 'border-ligne focus:border-social'"
        />
      </label>
      <p v-if="jsonInvalide" class="text-[13px] text-erreur">
        Le contenu n’est pas un JSON valide — vérifiez les virgules et les guillemets.
      </p>

      <label class="mt-4 flex items-center gap-2.5">
        <input
          type="checkbox"
          :checked="edition.statut === 'publie'"
          @change="edition.statut = edition.statut === 'publie' ? 'brouillon' : 'publie'"
        >
        <span class="text-[13.5px]">Publier ce bloc sur le site</span>
      </label>

      <div class="mt-5 flex gap-2">
        <UiBaseButton taille="sm" :disabled="jsonInvalide || enCours" @click="enregistrer">
          {{ enCours ? 'Enregistrement…' : 'Enregistrer' }}
        </UiBaseButton>
        <UiBaseButton variante="contour" taille="sm" @click="edition = null">Annuler</UiBaseButton>
      </div>
    </div>

    <!-- Témoignages -->
    <section class="mt-10">
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
