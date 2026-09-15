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
    <div class="flex flex-wrap items-start justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">Historique &amp; versions</h1>
      <UiBaseButton taille="sm" variante="contour" @click="exporter">Exporter en CSV</UiBaseButton>
    </div>
    <p class="mt-2 max-w-[760px] text-[12.5px] text-discret">
      Toutes les actions sensibles sont journalisées : publication, modification de fiche,
      attribution ou révocation d’accès, changement de slug, annulation de session, modification des
      paramètres financiers.
    </p>

    <div class="mt-5 flex flex-wrap gap-2 text-[13px]">
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

    <AdminTableauSimple
      class="mt-4"
      :colonnes="['Date', 'Auteur', 'Action', 'Type', 'Notification', '']"
    >
      <template v-for="entree in data.entrees" :key="entree.id">
        <tr>
          <td class="px-4 py-3 whitespace-nowrap text-[12.5px] text-discret">
            {{ formatDate(entree.date) }}
          </td>
          <td class="px-4 py-3 font-bold">{{ entree.auteur }}</td>
          <td class="px-4 py-3">
            {{ entree.action }}
            <span class="block text-[12px] text-discret">{{ entree.cible }}</span>
          </td>
          <td class="px-4 py-3">
            <span v-if="entree.type" class="rounded-full bg-fond-voile px-2.5 py-1 text-[11px] font-bold text-discret">
              {{ LIBELLES_TYPE[entree.type] ?? entree.type }}
            </span>
            <span v-else class="text-discret">—</span>
          </td>
          <td class="px-4 py-3 text-[12.5px]">
            <span v-if="entree.notification" class="text-succes">{{ entree.notification }}</span>
            <span v-else class="text-discret">—</span>
          </td>
          <td class="px-4 py-3 text-right">
            <button
              v-if="entree.diff || entree.ip"
              class="text-[12.5px] underline"
              @click="ouverte = ouverte === entree.id ? '' : entree.id"
            >
              {{ ouverte === entree.id ? 'Masquer' : 'Détail' }}
            </button>
          </td>
        </tr>
        <tr v-if="ouverte === entree.id">
          <td colspan="6" class="bg-fond-voile px-4 py-3 text-[12.5px]">
            <p v-if="entree.ip" class="text-discret">Adresse : {{ ipCourte(entree.ip) }}</p>
            <pre v-if="entree.diff" class="mt-2 overflow-x-auto font-mono text-[12px] text-texte">{{ JSON.stringify(entree.diff, null, 2) }}</pre>
          </td>
        </tr>
      </template>
      <tr v-if="!data.entrees.length">
        <td colspan="6" class="px-4 py-8 text-center text-discret">Aucune entrée dans ce filtre.</td>
      </tr>
    </AdminTableauSimple>
  </div>
</template>
