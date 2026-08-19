<script setup lang="ts">
import type { Formateur } from '#shared/types'

definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Mon profil — formateur')

const { data: profil, refresh } = await useFetch<Formateur>('/api/formateur/profil')

const modification = ref(false)
const brouillon = reactive({
  nom: profil.value?.nom ?? '',
  expertise: profil.value?.expertise ?? '',
  bio: profil.value?.bio ?? '',
})
const enregistre = ref(false)

async function enregistrer() {
  await $fetch('/api/formateur/profil', { method: 'PUT', body: brouillon })
  await refresh()
  modification.value = false
  enregistre.value = true
}
</script>

<template>
  <div v-if="profil" class="max-w-[760px]">
    <h1 class="font-title text-[26px] font-light">Votre profil formateur</h1>
    <p class="mt-2 text-[13.5px] text-discret">
      Photo, bio et expertise sont publiées telles quelles sur la page /formateurs et sur vos fiches
      modules.
    </p>

    <div class="mt-6 rounded-[14px] border border-ligne-douce bg-white p-6">
      <div class="flex flex-wrap items-start gap-5">
        <NuxtImg
          :src="profil.photo"
          :alt="`Portrait de ${profil.nom}`"
          width="96"
          height="96"
          class="size-24 rounded-full bg-fond-voile object-cover"
        />
        <div class="grid min-w-[280px] flex-1 gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Nom public</span>
            <input v-model="brouillon.nom" :disabled="!modification" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] disabled:bg-fond-clair">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Spécialité affichée</span>
            <input v-model="brouillon.expertise" :disabled="!modification" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] disabled:bg-fond-clair">
          </label>
          <label class="block sm:col-span-2">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Bio publique</span>
            <textarea v-model="brouillon.bio" :disabled="!modification" rows="5" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] disabled:bg-fond-clair" />
          </label>
        </div>
      </div>

      <p class="mt-5 rounded-[10px] bg-fond-clair p-4 text-[13px] text-texte">
        Coaching privé : <b>{{ formatFcfa(profil.coachingPriveFcfaHeure) }} / h — tarif fixe de la
        plateforme</b>, non modifiable ici. Vos modules et l’ordre d’affichage public sont gérés par
        l’équipe Big Five.
      </p>

      <div class="mt-5 flex flex-wrap gap-2">
        <UiBaseButton v-if="!modification" variante="contour" taille="sm" @click="modification = true">
          Modifier
        </UiBaseButton>
        <UiBaseButton v-else taille="sm" @click="enregistrer">Enregistrer</UiBaseButton>
        <span v-if="enregistre && !modification" class="self-center text-[13px] text-succes">
          Profil mis à jour.
        </span>
      </div>
    </div>
  </div>
</template>
