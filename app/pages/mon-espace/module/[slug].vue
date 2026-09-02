<script setup lang="ts">
import type { Acces, Formateur, Module, Programme, Thematique } from '#shared/types'

definePageMeta({ layout: 'espace', middleware: 'auth' })

const route = useRoute()

// Route dédiée : elle refuse l'accès à un module non acquis.
const { data, error, refresh } = await useFetch<{
  module: Module
  acces: Acces
  formateur: Formateur | null
  thematique: Thematique | null
  programme: Programme | null
}>(() => `/api/mon-espace/module/${route.params.slug}`)

if (!data.value) {
  // 403 quand le module n'a pas été acheté, 404 quand il n'existe pas.
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: error.value?.statusMessage ?? 'Module introuvable',
    fatal: true,
  })
}

const moduleCourant = computed(() => data.value!.module)
usePagePrivee(moduleCourant.value.titre)

const chapitreActif = ref(0)
const progression = computed(() => data.value?.acces.progression ?? 0)

async function marquerTermine() {
  await $fetch('/api/mon-espace/progression', {
    method: 'POST',
    body: { moduleId: moduleCourant.value.id, progression: 100 },
  })
  await refresh()
}
</script>

<template>
  <div v-if="data">
    <NuxtLink to="/mon-espace/modules" class="text-[13px] text-discret hover:underline">
      ← Mes modules
    </NuxtLink>
    <h1 class="mt-3 text-[30px] font-medium">{{ moduleCourant.titre }}</h1>
    <p class="mt-1 text-[13px] text-discret">
      {{ data.formateur?.nom }} · {{ formatDuree(moduleCourant.dureeMinutes) }} ·
      {{ data.thematique?.nom }}
    </p>

    <div class="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
      <div>
        <NuxtLink
          :to="`/mon-espace/lecture/${moduleCourant.slug}?chapitre=${chapitreActif}`"
          class="relative grid aspect-16/9 w-full place-items-center overflow-hidden rounded-carte bg-encre text-[#8f8a9c] transition hover:text-white"
        >
          <img
            src="/images/brand/pattern.png"
            alt=""
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.18]"
          >
          <span class="relative text-center">
            <Icon name="ph:play-circle" size="56" />
            <span class="mt-3 block px-6 text-[13.5px]">
              Ouvrir le lecteur — {{ moduleCourant.chapitres[chapitreActif]?.libelle }} :
              {{ moduleCourant.chapitres[chapitreActif]?.titre }}
            </span>
          </span>
        </NuxtLink>

        <section class="editorial mt-8">
          <h2>Pourquoi ce module ?</h2>
          <p>{{ moduleCourant.pourquoi }}</p>
          <h2>Livrable</h2>
          <p>{{ moduleCourant.livrable }}</p>
        </section>
      </div>

      <aside>
        <div class="rounded-[14px] border border-ligne-douce p-5">
          <p class="font-title text-[18px] font-light">Progression</p>
          <div class="mt-3 h-1.5 w-full rounded-full bg-fond-voile">
            <div class="h-full rounded-full bg-social" :style="{ width: `${progression}%` }" />
          </div>
          <p class="mt-1 text-[12.5px] text-discret">{{ progression }} % réalisé</p>

          <UiBaseButton v-if="progression < 100" class="mt-4 w-full" taille="sm" @click="marquerTermine">
            Marquer comme terminé
          </UiBaseButton>
          <UiBaseButton v-else to="/mon-espace/certificats" class="mt-4 w-full" taille="sm" variante="sombre">
            Obtenir mon certificat
          </UiBaseButton>
        </div>

        <nav aria-label="Chapitres du module" class="mt-4 overflow-hidden rounded-[14px] border border-ligne-douce">
          <ol class="divide-y divide-ligne-claire">
            <li v-for="(chapitre, i) in moduleCourant.chapitres" :key="i">
              <button
                class="flex w-full items-center gap-3 px-4 py-3 text-left text-[13.5px]"
                :class="i === chapitreActif ? 'bg-fond-clair font-bold' : 'hover:bg-fond-clair'"
                :aria-current="i === chapitreActif"
                @click="chapitreActif = i"
              >
                <span class="w-12 shrink-0 text-[11px] font-bold tracking-[0.1em] text-social uppercase">
                  {{ chapitre.libelle === 'Introduction' ? 'Intro' : chapitre.libelle.replace('Chapitre ', 'Ch. ') }}
                </span>
                <span>{{ chapitre.titre }}</span>
              </button>
            </li>
          </ol>
        </nav>
      </aside>
    </div>
  </div>
</template>
