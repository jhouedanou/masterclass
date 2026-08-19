<script setup lang="ts">
import type { Acces, Certificat, Module } from '#shared/types'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Mes certificats')

const { data: certificats, refresh } = await useFetch<Certificat[]>('/api/certificats')
const { data: acces } = await useFetch<(Acces & { module: Module | null })[]>('/api/mon-espace/acces')

/** Modules réalisés dont le certificat n'a pas encore été délivré. */
const aDelivrer = computed(() =>
  (acces.value ?? [])
    .filter((a) => a.progression === 100)
    .filter((a) => !(certificats.value ?? []).some((c) => c.moduleId === a.moduleId)),
)

const enCours = ref('')

async function delivrer(moduleId: string) {
  enCours.value = moduleId
  try {
    await $fetch('/api/certificats', { method: 'POST', body: { moduleId } })
    await refresh()
  } finally {
    enCours.value = ''
  }
}
</script>

<template>
  <div>
    <h1 class="text-[30px] font-medium">Mes certificats</h1>
    <p class="mt-2 max-w-[680px] text-[15px] text-texte">
      Un certificat de participation est mis à disposition après la réalisation du module. Chaque
      certificat porte un numéro unique et un QR code de vérification.
    </p>

    <section v-if="aDelivrer.length" class="mt-8 rounded-[14px] border border-social-bordure bg-social-voile p-5">
      <h2 class="font-title text-[19px] font-light">Certificat disponible</h2>
      <ul class="mt-3 space-y-2">
        <li
          v-for="ligne in aDelivrer"
          :key="ligne.moduleId"
          class="flex flex-wrap items-center justify-between gap-3"
        >
          <span class="text-[14px]">{{ ligne.module?.titre }}</span>
          <UiBaseButton taille="sm" :disabled="enCours === ligne.moduleId" @click="delivrer(ligne.moduleId)">
            {{ enCours === ligne.moduleId ? 'Génération…' : 'Générer mon certificat' }}
          </UiBaseButton>
        </li>
      </ul>
    </section>

    <div v-if="certificats?.length" class="mt-8 flex flex-col gap-3">
      <article
        v-for="certificat in certificats"
        :key="certificat.numero"
        class="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-ligne-douce p-5"
      >
        <div>
          <h2 class="font-title text-[19px] font-light">{{ certificat.titreModule }}</h2>
          <p class="mt-1 text-[13px] text-discret">
            N° {{ certificat.numero }} · délivré le {{ formatDate(certificat.dateDelivrance) }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UiBaseButton :to="`/certificats/${certificat.numero}`" taille="sm">
            Voir / imprimer
          </UiBaseButton>
          <UiBaseButton :to="`/verifier/${certificat.numero}`" variante="contour" taille="sm">
            Vérifier
          </UiBaseButton>
        </div>
      </article>
    </div>

    <p
      v-else-if="!aDelivrer.length"
      class="mt-8 rounded-[14px] border border-dashed border-ligne p-12 text-center text-[14px] text-discret"
    >
      Réalisez un module pour obtenir votre premier certificat.
    </p>
  </div>
</template>
