<script setup lang="ts">
definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Mes modules — formateur')

/** Filtres d'en-tête (planche D, écran 03) : période et module. */
const periode = ref('30')
const moduleChoisi = ref('')

const { data: modules } = await useFetch<
  {
    id: string
    slug: string
    titre: string
    programme: string
    statut: string
    thematique: string
    inscrits: number
    nouveaux: number
    completion: number
    certificats: number
  }[]
>('/api/formateur/modules', { query: { jours: periode, module: moduleChoisi } })

/** Sans filtre de module, la liste complète alimente le sélecteur — sinon il
 *  ne resterait qu'une option, la sienne. */
const { data: tousLesModules } = await useFetch<{ id: string; titre: string }[]>(
  '/api/formateur/modules',
  { key: 'formateur-modules-liste' },
)

const OPTIONS_PERIODE = [
  { valeur: '30', libelle: '30 derniers jours' },
  { valeur: '90', libelle: '90 derniers jours' },
  { valeur: '365', libelle: '12 derniers mois' },
]

const optionsModules = computed(() => [
  { valeur: '', libelle: 'tous' },
  ...(tousLesModules.value ?? []).map((m) => ({ valeur: m.id, libelle: m.titre })),
])
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">Mes modules — statistiques d’inscription</h1>
      <div class="flex flex-wrap gap-2.5">
        <FormateurFiltrePilule
          v-model="periode"
          etiquette="Période"
          prefixe="🗓 Période :"
          :options="OPTIONS_PERIODE"
        />
        <FormateurFiltrePilule
          v-model="moduleChoisi"
          etiquette="Module"
          prefixe="Module :"
          :options="optionsModules"
        />
      </div>
    </div>

    <AdminTableauSimple
      class="mt-6"
      :colonnes="['Module', 'Inscrits', `Nouveaux (${periode} j)`, 'Complétion', 'Certificats']"
    >
      <tr v-for="module in modules" :key="module.id" class="hover:bg-fond-clair">
        <td class="px-4 py-3">
          <NuxtLink :to="`/formateur/module/${module.id}`" class="font-bold hover:underline">
            {{ module.titre }}
          </NuxtLink>
          <p class="text-[11.5px] font-bold" :class="module.programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'">
            {{ module.programme === 'social-media' ? 'SM' : 'ENT' }} · {{ module.thematique }}
            <!-- La fiche du module est déjà en ligne, sans son contenu :
                 c'est le « teasing publié » de la maquette. -->
            <span v-if="module.statut === 'annonce' || module.statut === 'en-preparation'" class="text-discret">
              — teasing publié
            </span>
          </p>
        </td>
        <td class="px-4 py-3 font-bold">
          {{ module.statut === 'disponible' ? module.inscrits : '—' }}
        </td>
        <td class="px-4 py-3 font-bold text-succes">
          <template v-if="module.statut === 'disponible'">+{{ module.nouveaux }}</template>
          <span v-else class="text-discret">—</span>
        </td>
        <td class="px-4 py-3">
          <span v-if="module.statut === 'disponible'" class="flex items-center gap-2">
            <span class="h-1.5 min-w-[60px] flex-1 rounded-full bg-fond-voile">
              <span
                class="block h-full rounded-full"
                :class="module.programme === 'social-media' ? 'bg-social' : 'bg-entrepreneurs'"
                :style="{ width: `${module.completion}%` }"
              />
            </span>
            {{ module.completion }} %
          </span>
          <span v-else class="text-[12.5px] text-discret">En préparation</span>
        </td>
        <td class="px-4 py-3 font-bold">
          {{ module.statut === 'disponible' ? module.certificats : '—' }}
        </td>
      </tr>
    </AdminTableauSimple>

    <p class="mt-3 text-[12px] text-discret">
      Lecture seule — les contenus des modules sont produits avec l’équipe Big Five. Cliquer un
      module ouvre le détail : progression chapitre par chapitre, liste des inscrits.
    </p>
  </div>
</template>
