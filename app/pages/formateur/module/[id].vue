<script setup lang="ts">
definePageMeta({ layout: 'formateur', middleware: 'formateur' })

const route = useRoute()
const { data, error } = await useFetch(() => `/api/formateur/module/${route.params.id}`)

if (!data.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: error.value?.statusMessage ?? 'Module introuvable',
    fatal: true,
  })
}

usePagePrivee(`${data.value.module.titre} — mes modules`)
</script>

<template>
  <div v-if="data">
    <NuxtLink to="/formateur/modules" class="text-[14px] text-discret hover:underline">
      ← Mes modules
    </NuxtLink>

    <div class="mt-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="surtitre" :class="data.module.programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'">
          Module {{ numeroModule(data.module.numero) }} · {{ data.module.thematique }}
        </p>
        <h1 class="mt-1 font-title text-[26px] font-light">{{ data.module.titre }}</h1>
      </div>
      <UiBaseButton variante="contour" taille="sm" :to="`/modules/${data.module.slug}`">
        Voir la fiche publique
      </UiBaseButton>
    </div>

    <div class="mt-6 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[12px] text-discret">Inscrits</p>
        <p class="mt-1 font-title text-[27px] font-light">{{ data.inscrits }}</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[12px] text-discret">Complétion moyenne</p>
        <p class="mt-1 font-title text-[27px] font-light">{{ data.completion }} %</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[12px] text-discret">Certificats délivrés</p>
        <p class="mt-1 font-title text-[27px] font-light">{{ data.certificats }}</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[12px] text-discret">Durée du module</p>
        <p class="mt-1 font-title text-[27px] font-light">{{ formatDuree(data.module.dureeMinutes) }}</p>
        <p class="mt-1 text-[11.5px] text-discret">{{ data.module.nbChapitres }} chapitres</p>
      </div>
    </div>

    <section class="mt-6">
      <h2 class="font-title text-[19px] font-light">Progression chapitre par chapitre</h2>
      <AdminTableauSimple class="mt-3" :colonnes="['Chapitre', 'Terminé par', 'Part des inscrits']">
        <tr v-for="chapitre in data.chapitres" :key="chapitre.position">
          <td class="px-4 py-3">
            <p class="font-bold">{{ chapitre.libelle }}</p>
            <p class="text-[12.5px] text-discret">{{ chapitre.titre }}</p>
          </td>
          <td class="px-4 py-3 font-bold">{{ chapitre.vuPar }} / {{ data.inscrits }}</td>
          <td class="px-4 py-3">
            <span class="flex items-center gap-2">
              <span class="h-1.5 min-w-[60px] flex-1 rounded-full bg-fond-voile">
                <span
                  class="block h-full rounded-full bg-social"
                  :style="{ width: `${data.inscrits ? Math.round((chapitre.vuPar / data.inscrits) * 100) : 0}%` }"
                />
              </span>
              {{ data.inscrits ? Math.round((chapitre.vuPar / data.inscrits) * 100) : 0 }} %
            </span>
          </td>
        </tr>
      </AdminTableauSimple>
      <p class="mt-3 text-[12px] text-discret">
        Un chapitre compte pour terminé quand 95 % de sa vidéo a été vue.
      </p>
    </section>

    <section class="mt-8">
      <h2 class="font-title text-[19px] font-light">Les inscrits</h2>
      <AdminTableauSimple class="mt-3" :colonnes="['Apprenant', 'Progression', 'Inscrit le', 'Certificat']">
        <tr v-for="apprenant in data.apprenants" :key="apprenant.id">
          <td class="px-4 py-3">
            <NuxtLink :to="`/formateur/apprenant/${apprenant.id}`" class="font-bold hover:underline">
              {{ apprenant.nom }}
            </NuxtLink>
          </td>
          <td class="px-4 py-3">{{ apprenant.progression }} %</td>
          <td class="px-4 py-3 text-discret">{{ formatDate(apprenant.inscritLe) }}</td>
          <td class="px-4 py-3">
            <span v-if="apprenant.certifie" class="font-bold text-succes">Délivré ✓</span>
            <span v-else class="text-discret">—</span>
          </td>
        </tr>
      </AdminTableauSimple>
      <p v-if="!data.apprenants.length" class="mt-3 text-[13.5px] text-discret">
        Aucun inscrit pour l’instant.
      </p>
    </section>
  </div>
</template>
