<script setup lang="ts">
import type { EntreeJournal } from '#shared/types'
import type { ColonneCsv } from '~/utils/csv'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Historique — administration')

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

/** Le détail d'une entrée : diff et adresse, repliés par défaut. */
const ouverte = ref('')

const LIBELLES_TYPE: Record<string, string> = {
  contenu: 'Contenu',
  acces: 'Accès',
  compte: 'Compte',
  session: 'Session',
  paiement: 'Paiement',
  parametres: 'Paramètres',
}

function exporter() {
  exporterCsv(
    `journal-${new Date().toISOString().slice(0, 10)}`,
    [
      { cle: (e) => e.date.slice(0, 19).replace('T', ' '), libelle: 'Date' },
      { cle: 'auteur', libelle: 'Auteur' },
      { cle: (e) => (e.type ? (LIBELLES_TYPE[e.type] ?? e.type) : ''), libelle: 'Type' },
      { cle: 'action', libelle: 'Action' },
      { cle: 'cible', libelle: 'Cible' },
      { cle: (e) => e.objet ?? '', libelle: 'Objet' },
      { cle: (e) => e.ip ?? '', libelle: 'Adresse IP' },
      { cle: (e) => e.notification ?? '', libelle: 'Notification' },
    ] satisfies ColonneCsv<EntreeJournal>[],
    data.value?.entrees ?? [],
  )
}

/** « 05/09 · 14:32 » : la maquette date chaque ligne en monospace court. */
function dateCourte(iso: string) {
  const d = new Date(iso)
  const jour = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(d)
  const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(d)
  return `${jour} · ${heure}`
}

/** L'adresse est tronquée à l'affichage, comme dans la maquette : elle sert à
 *  distinguer deux sessions, pas à localiser quelqu'un. */
function ipCourte(ip?: string) {
  if (!ip) return ''
  const parties = ip.split('.')
  return parties.length === 4 ? `${parties[0]}.${parties[1]}.•.•` : ip
}
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[24px] font-light">Journal des actions</h1>
      <!-- « Filtrer : admin · type · objet ▾ » de la maquette : trois filtres,
           trois pilules, plutôt qu'un menu qui les cacherait. -->
      <div class="flex flex-wrap gap-2">
        <UiFiltrePilule
          v-model="auteur"
          etiquette="Filtrer par administrateur"
          :options="[{ valeur: '', libelle: 'Admin : tous' }, ...data.auteurs.map((a) => ({ valeur: a, libelle: a }))]"
        />
        <UiFiltrePilule
          v-model="type"
          etiquette="Filtrer par type d’action"
          :options="[{ valeur: '', libelle: 'Type : tous' }, ...data.types.map((t) => ({ valeur: t, libelle: LIBELLES_TYPE[t] ?? t }))]"
        />
        <UiFiltrePilule
          v-model="objet"
          etiquette="Filtrer par objet"
          :options="[{ valeur: '', libelle: 'Objet : tous' }, ...data.objets.map((o) => ({ valeur: o, libelle: o }))]"
        />
      </div>
    </div>

    <!-- Une seule carte, une ligne par action : la maquette ne dresse pas de
         tableau ici, elle déroule un fil daté. -->
    <div class="mt-4 rounded-[14px] border border-ligne-douce bg-white px-5 py-1.5">
      <div
        v-for="(entree, i) in data.entrees"
        :key="entree.id"
        class="flex items-start gap-3.5 py-3.5 text-[13px]"
        :class="i < data.entrees.length - 1 && 'border-b border-fond-voile'"
      >
        <span class="min-w-[96px] shrink-0 font-mono text-[11.5px] text-discret">
          {{ dateCourte(entree.date) }}
        </span>
        <span class="min-w-0">
          <b>{{ entree.auteur }}</b> {{ entree.action }}
          <template v-if="entree.cible"> — <b>{{ entree.cible }}</b></template>
          <span class="mt-0.5 block text-[11.5px] text-discret">
            <template v-if="entree.objet">{{ entree.objet }} · </template>
            <template v-if="entree.notification">{{ entree.notification }} · </template>
            <button
              v-if="entree.diff"
              class="text-inherit hover:underline"
              @click="ouverte = ouverte === entree.id ? '' : entree.id"
            >
              {{ ouverte === entree.id ? 'Masquer le détail' : 'Diff consultable' }}
            </button>
            <template v-if="entree.diff && entree.ip"> · </template>
            <template v-if="entree.ip">IP {{ ipCourte(entree.ip) }}</template>
          </span>
          <pre
            v-if="ouverte === entree.id && entree.diff"
            class="mt-2 overflow-x-auto rounded-[10px] bg-fond-clair p-3 font-mono text-[11.5px] text-texte"
          >{{ JSON.stringify(entree.diff, null, 2) }}</pre>
        </span>
      </div>
      <p v-if="!data.entrees.length" class="py-8 text-center text-[13px] text-discret">
        Aucune entrée dans ce filtre.
      </p>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-3 text-[12.5px] text-discret">
      <button class="rounded-full border border-ligne bg-white px-3.5 py-2 font-semibold text-encre" @click="exporter">
        Exporter en CSV
      </button>
      <span>
        Journal inaltérable, conservé 24 mois. Toute connexion admin, modification, attribution et
        action de paiement y figure.
      </span>
    </div>
  </div>
</template>
