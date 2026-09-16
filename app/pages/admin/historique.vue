<script setup lang="ts">
import type { EntreeJournal } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Historique — administration')

/**
 * Écran 16 — « Journal des actions ».
 *
 * La maquette n'en fait pas un tableau : une seule carte, une entrée par
 * ligne, horodatage en chasse fixe à gauche et description sur deux lignes à
 * droite. Le détail — version restaurable, adresse, notification, motif —
 * forme la seconde ligne, il ne se déplie pas.
 */
const auteur = ref('')
const type = ref('')
const objet = ref('')

const { data } = await useFetch<{
  entrees: EntreeJournal[]
  auteurs: string[]
  types: string[]
  objets: string[]
}>('/api/admin/journal', {
  query: computed(() => ({
    auteur: auteur.value || undefined,
    type: type.value || undefined,
    objet: objet.value || undefined,
  })),
})

const LIBELLES_TYPE: Record<string, string> = {
  contenu: 'Contenu',
  acces: 'Accès',
  compte: 'Compte',
  session: 'Session',
  paiement: 'Paiement',
  parametres: 'Paramètres',
}

/** Les trois filtres se replient derrière la pilule « Filtrer : … ▾ » de la
 *  maquette ; ils restent de vrais menus, seulement rangés. */
const filtresOuverts = ref(false)
const nbFiltres = computed(() => [auteur.value, type.value, objet.value].filter(Boolean).length)

/** L'adresse est tronquée à l'affichage, comme dans la maquette : elle sert à
 *  distinguer deux sessions, pas à localiser quelqu'un. */
function ipCourte(ip?: string) {
  if (!ip) return ''
  const parties = ip.split('.')
  return parties.length === 4 ? `${parties[0]}.${parties[1]}.•.•` : ip
}

/** « 05/09 · 14:32 » */
function horodatage(iso: string) {
  const d = new Date(iso)
  const j = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(d)
  const h = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(d)
  return `${j} · ${h}`
}

/** Seconde ligne d'une entrée : ce que la maquette y met, dans cet ordre. */
function detail(e: EntreeJournal) {
  const bouts: string[] = []
  if (e.diff) bouts.push('Version précédente restaurable')
  if (e.notification) bouts.push(e.notification)
  if (e.objet) bouts.push(e.objet)
  if (e.ip) bouts.push(`IP ${ipCourte(e.ip)}`)
  return bouts.join(' · ')
}
</script>

<template>
  <div v-if="data" class="max-w-[820px]">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[22px] font-light">Journal des actions</h1>
      <button
        class="rounded-full border border-ligne bg-white px-3.5 py-[7px] text-[12px] font-semibold"
        :aria-expanded="filtresOuverts"
        @click="filtresOuverts = !filtresOuverts"
      >
        Filtrer : admin · type · objet
        <template v-if="nbFiltres"> ({{ nbFiltres }})</template> ▾
      </button>
    </div>

    <div v-if="filtresOuverts" class="mt-3 flex flex-wrap gap-2 text-[13px]">
      <select v-model="auteur" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous les auteurs</option>
        <option v-for="a in data.auteurs" :key="a" :value="a">{{ a }}</option>
      </select>
      <select v-model="type" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous les types</option>
        <option v-for="t in data.types" :key="t" :value="t">{{ LIBELLES_TYPE[t!] ?? t }}</option>
      </select>
      <select v-model="objet" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous les objets</option>
        <option v-for="o in data.objets" :key="o" :value="o">{{ o }}</option>
      </select>
    </div>

    <div class="mt-4 rounded-[14px] border border-ligne-douce bg-white px-5 py-1.5">
      <div
        v-for="(entree, i) in data.entrees"
        :key="entree.id"
        class="flex items-start gap-3.5 py-3.5 text-[13px]"
        :class="i < data.entrees.length - 1 && 'border-b border-fond-voile'"
      >
        <span class="min-w-24 shrink-0 font-mono text-[11.5px] text-discret">
          {{ horodatage(entree.date) }}
        </span>
        <span>
          <b>{{ entree.auteur }}</b> {{ entree.action }}
          <b v-if="entree.cible">{{ entree.cible }}</b>
          <span v-if="detail(entree)" class="mt-0.5 block text-[11.5px] text-discret">
            {{ detail(entree) }}
          </span>
        </span>
      </div>
      <p v-if="!data.entrees.length" class="py-8 text-center text-[13px] text-discret">
        Aucune entrée dans ce filtre.
      </p>
    </div>

    <p class="mt-3 text-[12px] text-discret">
      Journal inaltérable, conservé 24 mois. Toute connexion admin, modification, attribution et
      action de paiement y figure.
    </p>
  </div>
</template>
