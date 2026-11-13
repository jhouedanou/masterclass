<script setup lang="ts">
definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Mes revenus — formateur')

/** Filtres d'en-tête (planche D, écran 06) : période et module. */
const mois = ref(new Date().toISOString().slice(0, 7))
const moduleChoisi = ref('')

const { data } = await useFetch<{
  lignes: {
    libelle: string
    ventes: number
    ventesLibelle?: string
    ca: number
    marge: number
    part: number
    coachingHeures?: number
  }[]
  total: {
    ca: number
    frais: number
    fraisPourcent: number
    marge: number
    remuneration: number
    margePlateforme: number
  }
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

/*
 * Aucun pourcentage sur cet écran (maquette du 13/11) : ni le taux des frais de
 * paiement, ni la répartition de la marge. Le formateur lit des montants ; les
 * taux relèvent de son contrat et se règlent côté administration.
 */

/** Rangées de l'écran mobile (planche D, écran 07) : la maquette y remplace la
 *  bande de cartes par quatre lignes, dont celle du coaching privé. */
const ligneCoaching = computed(() => data.value?.lignes.find((l) => l.coachingHeures))

const rangeesMobile = computed(() => {
  const total = data.value?.total
  if (!total) return []
  const rangees = [
    { libelle: 'CA généré', montant: total.ca },
    { libelle: 'Frais de paiement', montant: total.frais },
    { libelle: 'Marge brute Big Five', montant: total.margePlateforme },
  ]
  if (ligneCoaching.value) {
    rangees.push({
      libelle: `Coaching privé (${ligneCoaching.value.coachingHeures} h)`,
      montant: ligneCoaching.value.part,
    })
  }
  return rangees
})
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
        sur une marge brute de {{ formatFcfa(data.total.marge) }}, selon votre contrat
      </p>
    </div>

    <!-- Le téléphone (écran 07) ne porte pas la bande de cartes : la
         rémunération en tête, puis quatre rangées de détail. -->
    <div class="mt-3 flex flex-col gap-2 text-[12.5px] lg:hidden">
      <div
        v-for="rangee in rangeesMobile"
        :key="rangee.libelle"
        class="flex justify-between gap-3 rounded-[10px] border border-ligne-douce bg-white px-3.5 py-3"
      >
        <span>{{ rangee.libelle }}</span>
        <b>{{ formatFranc(rangee.montant) }}</b>
      </div>
    </div>

    <div class="mt-4 hidden gap-3.5 lg:grid lg:grid-cols-3 xl:grid-cols-5">
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
        taille="sm"
        accent
        libelle="Votre rémunération"
        :valeur="formatNombre(data.total.remuneration)"
        unite="F"
        detail="selon votre contrat"
      />
      <AdminCarteIndicateur
        taille="sm"
        libelle="Marge brute Big Five"
        :valeur="formatNombre(data.total.margePlateforme)"
        unite="F"
        detail="selon votre contrat"
      />
    </div>

    <AdminTableauSimple
      class="mt-5"
      :colonnes="['Source', 'Ventes', 'CA', 'Marge brute', 'Votre part']"
      :largeurs="['auto', '100px', '120px', '120px', '130px']"
      largeur-min="760px"
    >
      <tr v-for="ligne in data.lignes" :key="ligne.libelle">
        <td class="px-4 py-3 font-bold">{{ ligne.libelle }}</td>
        <td class="px-4 py-3">{{ ligne.ventesLibelle ?? ligne.ventes }}</td>
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
      Répartition de la marge brute selon les conditions de votre contrat. Versement mensuel par
      l’équipe Big Five —
      <NuxtLink :to="`/formateur/releve/${mois}`" class="text-inherit hover:underline">
        le relevé PDF de chaque mois
      </NuxtLink>
      est téléchargeable ici.
    </p>
  </div>
</template>
