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

/**
 * Le sélecteur garde la liste complète : filtrée, la réponse ne contiendrait
 * plus que le module choisi, et on ne pourrait plus en changer.
 *
 * Elle se retient du premier chargement non filtré plutôt que de rappeler la
 * route — cet appel-là refaisait à lui seul cinq requêtes, dont deux tables
 * entières, pour deux champs que la réponse portait déjà.
 */
const catalogue = ref<{ id: string; titre: string }[]>([])
watchEffect(() => {
  if (!moduleChoisi.value && modules.value) {
    catalogue.value = modules.value.map((m) => ({ id: m.id, titre: m.titre }))
  }
})

const OPTIONS_PERIODE = [
  { valeur: '30', libelle: '30 derniers jours' },
  { valeur: '90', libelle: '90 derniers jours' },
  { valeur: '365', libelle: '12 derniers mois' },
]

const optionsModules = computed(() => [
  { valeur: '', libelle: 'tous' },
  ...catalogue.value.map((m) => ({ valeur: m.id, libelle: m.titre })),
])
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[24px] font-light">Mes modules — statistiques d’inscription</h1>
      <div class="flex flex-wrap gap-2.5">
        <UiFiltrePilule
          v-model="periode"
          etiquette="Période"
          prefixe="🗓 Période :"
          :options="OPTIONS_PERIODE"
        />
        <UiFiltrePilule
          v-model="moduleChoisi"
          etiquette="Module"
          prefixe="Module :"
          :options="optionsModules"
        />
      </div>
    </div>

    <AdminTableauSimple
      class="mt-4"
      :colonnes="['Module', 'Inscrits', `Nouveaux (${periode} j)`, 'Complétion', 'Certificats']"
      :largeurs="['auto', '110px', '130px', '130px', '120px']"
      largeur-min="820px"
    >
      <tr v-for="module in modules" :key="module.id" class="hover:bg-fond-clair">
        <td class="px-4 py-3">
          <!-- La maquette écrit le titre en gras noir : le lien ne prend pas
               le violet des liens. -->
          <NuxtLink :to="`/formateur/module/${module.id}`" class="font-bold text-inherit hover:underline">
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
        <td class="px-4 py-3">
          <b v-if="module.statut === 'disponible'" class="text-succes">+{{ module.nouveaux }}</b>
          <span v-else class="text-discret">—</span>
        </td>
        <td class="px-4 py-3">
          <span v-if="module.statut === 'disponible'" class="flex items-center gap-2">
            <span class="h-1.5 min-w-[60px] flex-1 rounded-full bg-piste">
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
