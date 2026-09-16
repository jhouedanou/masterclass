<script setup lang="ts">
definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Mes revenus — formateur')

/** Filtres d'en-tête (planche D, écran 06) : période et module. */
const mois = ref(new Date().toISOString().slice(0, 7))
const moduleChoisi = ref('')

const { data } = await useFetch<{
  lignes: { libelle: string; ventes: number; ca: number; marge: number; part: number }[]
  total: { ca: number; frais: number; marge: number; remuneration: number; margePlateforme: number }
}>('/api/formateur/revenus', { query: { mois, module: moduleChoisi } })

const { data: mesModules } = await useFetch<{ id: string; titre: string }[]>(
  '/api/formateur/modules',
  { key: 'formateur-modules-liste' },
)

const optionsMois = computed(() =>
  Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setUTCDate(1)
    d.setUTCMonth(d.getUTCMonth() - i)
    const valeur = d.toISOString().slice(0, 7)
    return { valeur, libelle: formatMois(valeur) }
  }),
)

const optionsModules = computed(() => [
  { valeur: '', libelle: 'tous' },
  ...(mesModules.value ?? []).map((m) => ({ valeur: m.id, libelle: m.titre })),
])

/** Les parts sont paramétrées côté administration : les libellés de colonnes
 *  suivent le taux réellement appliqué plutôt qu'un 30 % figé. */
const partFormateur = computed(() => {
  const { marge, remuneration } = data.value?.total ?? { marge: 0, remuneration: 0 }
  return marge ? Math.round((remuneration / marge) * 100) : 30
})
const partPlateforme = computed(() => 100 - partFormateur.value)
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[24px] font-light">Mes revenus</h1>
      <div class="flex flex-wrap gap-2.5">
        <UiFiltrePilule
          v-model="mois"
          etiquette="Période"
          prefixe="🗓 Période :"
          :options="optionsMois"
        />
        <UiFiltrePilule
          v-model="moduleChoisi"
          etiquette="Module"
          prefixe="Module :"
          :options="optionsModules"
        />
      </div>
    </div>

    <!-- Carte de tête du mobile (planche D, écran 07) : la rémunération
         d'abord, le détail ensuite. -->
    <div class="mt-4 rounded-[14px] border-[1.5px] border-social bg-white p-4 lg:hidden">
      <p class="surtitre text-social">Votre rémunération</p>
      <p class="mt-1 font-title text-[30px] font-light">{{ formatFcfa(data.total.remuneration) }}</p>
      <p class="mt-1 text-[11.5px] text-discret">
        marge brute {{ formatFcfa(data.total.marge) }} × {{ partFormateur }} %
      </p>
    </div>

    <div class="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <AdminCarteIndicateur
        taille="sm"
        libelle="CA généré"
        :valeur="formatNombre(data.total.ca)"
        unite="F"
        detail="vos modules + coaching privé"
      />
      <AdminCarteIndicateur
        taille="sm"
        libelle="Frais de paiement"
        :valeur="formatNombre(data.total.frais)"
        unite="F"
        detail="FeexPay"
      />
      <AdminCarteIndicateur
        taille="sm"
        libelle="Marge brute"
        :valeur="formatNombre(data.total.marge)"
        unite="F"
        detail="CA − frais de paiement"
      />
      <AdminCarteIndicateur
        class="hidden lg:block"
        taille="sm"
        accent
        libelle="Votre rémunération"
        :valeur="formatNombre(data.total.remuneration)"
        unite="F"
        :detail="`marge brute × ${partFormateur} %`"
      />
      <AdminCarteIndicateur
        taille="sm"
        libelle="Marge brute Big Five"
        :valeur="formatNombre(data.total.margePlateforme)"
        unite="F"
        :detail="`marge brute × ${partPlateforme} %`"
      />
    </div>

    <AdminTableauSimple
      class="mt-5"
      :colonnes="['Source', 'Ventes', 'CA', 'Marge brute', `Votre part (${partFormateur} %)`]"
      :largeurs="['auto', '100px', '120px', '120px', '130px']"
      largeur-min="760px"
    >
      <tr v-for="ligne in data.lignes" :key="ligne.libelle">
        <td class="px-4 py-3 font-bold">{{ ligne.libelle }}</td>
        <td class="px-4 py-3">{{ ligne.ventes }}</td>
        <td class="px-4 py-3">{{ formatFranc(ligne.ca) }}</td>
        <td class="px-4 py-3">{{ formatFranc(ligne.marge) }}</td>
        <td class="px-4 py-3 font-bold">{{ formatFranc(ligne.part) }}</td>
      </tr>
      <tr class="bg-social-nuage font-bold">
        <td class="px-4 py-3">Total</td>
        <td class="px-4 py-3" />
        <td class="px-4 py-3">{{ formatFranc(data.total.ca) }}</td>
        <td class="px-4 py-3">{{ formatFranc(data.total.marge) }}</td>
        <td class="px-4 py-3 text-social">{{ formatFranc(data.total.remuneration) }}</td>
      </tr>
    </AdminTableauSimple>
    <p v-if="!data.lignes.length" class="mt-3 text-[13.5px] text-discret">
      Aucune vente sur la période retenue.
    </p>

    <!-- Le bouton de téléchargement n'existe que sur l'écran mobile (07) : sur
         le desktop, la maquette ne laisse que la note de bas de tableau, où
         « le relevé PDF de chaque mois » porte le lien. -->
    <UiBaseButton
      class="mt-4 w-full lg:hidden"
      variante="contour"
      taille="sm"
      :to="`/formateur/releve/${mois}?telecharger=1`"
    >
      Télécharger le relevé PDF
    </UiBaseButton>

    <p class="mt-3 text-[12px] leading-relaxed text-discret">
      Répartition marge brute : {{ partPlateforme }} % Big Five · {{ partFormateur }} % formateur
      (pourcentages fixés par contrat, paramétrés côté admin). Versement mensuel par l’équipe —
      <NuxtLink :to="`/formateur/releve/${mois}`" class="text-inherit hover:underline">
        le relevé PDF de chaque mois
      </NuxtLink>
      est téléchargeable ici.
    </p>
  </div>
</template>
