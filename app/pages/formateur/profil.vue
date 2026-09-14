<script setup lang="ts">
import type { Formateur } from '#shared/types'

definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Mon profil — formateur')

const { data: profil, refresh } = await useFetch<Formateur>('/api/formateur/profil')

/**
 * « Modifier » déverrouille les champs, « Enregistrer » publie la mise à jour
 * (planche D, écran 02).
 */
const modification = ref(false)
const brouillon = reactive({
  nom: profil.value?.nom ?? '',
  expertise: profil.value?.expertise ?? '',
  emailPro: profil.value?.emailPro ?? '',
  whatsapp: profil.value?.whatsapp ?? '',
  bio: profil.value?.bio ?? '',
})
const enregistre = ref(false)
const erreur = ref('')

async function enregistrer() {
  erreur.value = ''
  try {
    await $fetch('/api/formateur/profil', { method: 'PUT', body: brouillon })
    await refresh()
    modification.value = false
    enregistre.value = true
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Enregistrement impossible.'
  }
}

// « Changer la photo » : envoi immédiat, la photo n'attend pas « Enregistrer ».
const champPhoto = ref<HTMLInputElement | null>(null)
const envoiPhoto = ref(false)

async function envoyerPhoto(evenement: Event) {
  const fichier = (evenement.target as HTMLInputElement).files?.[0]
  if (!fichier) return
  envoiPhoto.value = true
  erreur.value = ''
  try {
    const corps = new FormData()
    corps.append('photo', fichier)
    await $fetch('/api/formateur/photo', { method: 'POST', body: corps })
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Envoi de la photo impossible.'
  } finally {
    envoiPhoto.value = false
    if (champPhoto.value) champPhoto.value.value = ''
  }
}
</script>

<template>
  <div v-if="profil" class="max-w-[720px]">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="font-title text-[26px] font-light">Votre profil formateur</h1>
      <span
        class="rounded-full px-3 py-1.5 text-[11px] font-bold"
        :class="profil.coachingPriveActif ? 'bg-social-voile text-social' : 'bg-fond-voile text-discret'"
      >
        {{ profil.coachingPriveActif ? 'Formateur + coaching privé' : 'Formateur simple' }}
      </span>
    </div>
    <p class="mt-2 text-[13.5px] text-discret">
      Photo, bio et expertises sont publiées telles quelles sur la page /formateurs et sur vos
      fiches modules. L’e-mail professionnel et le numéro WhatsApp restent internes à l’équipe.
    </p>

    <div class="mt-6 rounded-[14px] border border-ligne-douce bg-white p-6">
      <div class="flex flex-wrap items-center gap-4">
        <NuxtImg
          :src="profil.photo"
          :alt="`Portrait de ${profil.nom}`"
          width="72"
          height="72"
          class="size-[72px] rounded-full bg-fond-voile object-cover"
        />
        <input
          ref="champPhoto"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="sr-only"
          @change="envoyerPhoto"
        >
        <UiBaseButton
          variante="contour"
          taille="sm"
          :disabled="envoiPhoto"
          @click="champPhoto?.click()"
        >
          {{ envoiPhoto ? 'Envoi…' : 'Changer la photo' }}
        </UiBaseButton>
        <span class="text-[12px] text-discret">JPEG, PNG ou WebP · 2 Mo au maximum</span>
      </div>

      <div class="mt-5 grid gap-3.5 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Nom public</span>
          <input v-model="brouillon.nom" :disabled="!modification" class="w-full rounded-[10px] border border-ligne px-3.5 py-3 text-[14px] disabled:bg-fond-clair">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Spécialité affichée</span>
          <input v-model="brouillon.expertise" :disabled="!modification" class="w-full rounded-[10px] border border-ligne px-3.5 py-3 text-[14px] disabled:bg-fond-clair">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Email professionnel</span>
          <input v-model="brouillon.emailPro" type="email" inputmode="email" :disabled="!modification" class="w-full rounded-[10px] border border-ligne px-3.5 py-3 text-[14px] disabled:bg-fond-clair">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Numéro WhatsApp</span>
          <input v-model="brouillon.whatsapp" type="tel" inputmode="tel" :disabled="!modification" class="w-full rounded-[10px] border border-ligne px-3.5 py-3 text-[14px] disabled:bg-fond-clair">
        </label>
        <label class="block sm:col-span-2">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Bio publique</span>
          <textarea v-model="brouillon.bio" :disabled="!modification" rows="4" class="w-full rounded-[10px] border border-ligne px-3.5 py-3 text-[14px] leading-relaxed disabled:bg-fond-clair" />
        </label>
      </div>

      <p class="mt-3.5 rounded-[12px] border border-ligne-claire bg-fond-clair px-4 py-3.5 text-[12.5px] leading-relaxed text-discret">
        Coaching privé : <b class="text-encre">{{ formatFcfa(profil.coachingPriveFcfaHeure) }} / h —
        tarif fixe de la plateforme</b>, non modifiable ici. Vos modules et l’ordre d’affichage
        public sont gérés par l’équipe Big Five.
      </p>

      <div class="mt-5 flex flex-wrap items-center gap-3.5">
        <UiBaseButton v-if="!modification" variante="contour" taille="sm" @click="modification = true">
          Modifier
        </UiBaseButton>
        <UiBaseButton v-else taille="sm" @click="enregistrer">Enregistrer</UiBaseButton>
        <span v-if="!modification && !enregistre" class="text-[13px] text-discret">
          « Modifier » déverrouille les champs, « Enregistrer » publie la mise à jour.
        </span>
        <span v-if="enregistre && !modification" class="text-[13px] font-bold text-succes">
          Profil mis à jour.
        </span>
      </div>
      <p v-if="erreur" class="mt-3 text-[13px] text-erreur">{{ erreur }}</p>
    </div>
  </div>
</template>
