<script setup lang="ts">
import type { Formateur, Module } from '#shared/types'

const route = useRoute()
const config = useRuntimeConfig()

const { data } = await useFetch<{ formateur: Formateur; modules: Module[] }>(
  () => `/api/formateurs/${route.params.slug}`,
)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Formateur introuvable', fatal: true })
}

const formateur = computed(() => data.value!.formateur)

usePageSeo({
  titreAuto: `${formateur.value.nom}, formateur | E-Masterclass Big Five`,
  descriptionAuto: formateur.value.bio,
  imageAuto: formateur.value.photo,
  // Une fiche incomplète reste hors index (spec SEO §1).
  seo: {
    ...formateur.value.seo,
    indexable: formateur.value.ficheComplete && formateur.value.seo.indexable !== false,
  },
})

const mailles = computed(() => [
  { libelle: 'Accueil', chemin: '/' },
  { libelle: 'Les formateurs', chemin: '/formateurs' },
  { libelle: formateur.value.nom },
])
useFilAriane(mailles)

useJsonLd(() => ({
  '@type': 'ProfilePage',
  mainEntity: {
    '@type': 'Person',
    name: formateur.value.nom,
    jobTitle: formateur.value.expertise,
    description: formateur.value.bio,
    url: `${config.public.siteUrl}/formateurs/${formateur.value.slug}`,
  },
}))
</script>

<template>
  <div v-if="data">
    <div class="conteneur pt-6">
      <FilAriane :mailles="mailles" />
    </div>

    <section class="conteneur grid gap-10 pt-6 pb-14 lg:grid-cols-[280px_1fr]">
      <div>
        <NuxtImg
          :src="formateur.photo"
          :alt="`Portrait de ${formateur.nom}`"
          width="280"
          height="280"
          class="w-full max-w-[280px] rounded-carte bg-fond-voile object-cover"
        />
        <div class="mt-5 rounded-[14px] border border-ligne-douce p-5">
          <p class="font-title text-[19px] font-light">Coaching privé</p>
          <p class="mt-1 text-[15px] font-bold">
            {{ formatFcfa(formateur.coachingPriveFcfaHeure) }} par heure
          </p>
          <UiBaseButton
            class="mt-4 w-full"
            variante="sombre"
            taille="sm"
            :href="lienWhatsApp(`Bonjour, je souhaite réserver un coaching privé avec ${formateur.nom}.`)"
          >
            Réserver un coaching privé
          </UiBaseButton>
        </div>
      </div>

      <div>
        <h1 class="text-[40px] font-medium">{{ formateur.nom }}</h1>
        <p class="mt-2 text-[17px] text-texte">{{ formateur.expertise }}</p>
        <p class="mt-6 max-w-[760px] text-[15.5px] leading-relaxed text-texte">{{ formateur.bio }}</p>

        <h2 class="mt-10 font-title text-[27px] font-light">Ses modules</h2>
        <div class="mt-5 grid gap-5.5 sm:grid-cols-2">
          <CatalogueModuleCarte v-for="m in data.modules" :key="m.id" :module="m" />
        </div>
      </div>
    </section>
  </div>
</template>
