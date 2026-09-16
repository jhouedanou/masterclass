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
  photoAlt: profil.value?.photoAlt ?? '',
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
  <!-- La maquette ne pose pas de carte à l'intérieur de l'écran : l'écran est
       lui-même le panneau blanc de 720 px, titre compris — d'où le titre dans
       la carte et la marge intérieure de 40 px. -->
  <div v-if="profil" class="max-w-[720px] rounded-[14px] border border-ligne-douce bg-white p-6 sm:p-10">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="font-title text-[26px] font-light">Votre profil formateur</h1>
      <span
        class="rounded-full px-3 py-1.25 text-[11px] font-bold"
        :class="profil.coachingPriveActif ? 'bg-social-voile text-social' : 'bg-fond-voile text-discret'"
      >
        {{ profil.coachingPriveActif ? 'Formateur + coaching privé' : 'Formateur simple' }}
      </span>
    </div>
    <p class="mt-1.5 text-[13.5px] text-discret">
      Photo, bio et expertises sont publiées telles quelles sur la page /formateurs et sur vos
      fiches modules.
    </p>

    <div class="mt-6 flex flex-wrap items-center gap-4">
      <NuxtImg
        :src="profil.photo"
        :alt="profil.photoAlt || `Portrait de ${profil.nom}`"
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
      <!-- Contour gris clair, et non le contour encre de `UiBaseButton` : la
           maquette réserve le trait noir aux deux boutons du bas. -->
      <button
        type="button"
        class="rounded-full border-[1.5px] border-ligne px-4.5 py-2.25 text-[12.5px] font-bold text-texte transition hover:bg-fond-clair disabled:opacity-50"
        :disabled="envoiPhoto"
        @click="champPhoto?.click()"
      >
        {{ envoiPhoto ? 'Envoi…' : 'Changer la photo' }}
      </button>
    </div>

    <div class="mt-5.5 grid gap-3.5 sm:grid-cols-2">
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold">Nom public</span>
        <input v-model="brouillon.nom" :disabled="!modification" class="w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-3 text-[14px] disabled:bg-fond-clair">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold">Spécialité affichée</span>
        <input v-model="brouillon.expertise" :disabled="!modification" class="w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-3 text-[14px] disabled:bg-fond-clair">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold">Email professionnel</span>
        <input v-model="brouillon.emailPro" type="email" inputmode="email" :disabled="!modification" class="w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-3 text-[14px] disabled:bg-fond-clair">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold">Numéro WhatsApp</span>
        <input v-model="brouillon.whatsapp" type="tel" inputmode="tel" :disabled="!modification" class="w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-3 text-[14px] disabled:bg-fond-clair">
      </label>
      <label class="block sm:col-span-2">
        <span class="mb-1.5 block text-[13px] font-bold">Bio publique</span>
        <textarea v-model="brouillon.bio" :disabled="!modification" rows="3" class="min-h-[84px] w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-3 text-[14px] leading-relaxed disabled:bg-fond-clair" />
      </label>
      <label class="block sm:col-span-2">
        <span class="mb-1.5 block text-[13px] font-bold">Texte alternatif de votre photo</span>
        <input v-model="brouillon.photoAlt" :disabled="!modification" placeholder="Ce que montre la photo, pour qui ne la voit pas" class="w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-3 text-[14px] disabled:bg-fond-clair">
        <span class="mt-1 block text-[12px] text-discret">
          Lu par les lecteurs d’écran. Vide, « Portrait de {{ profil.nom }} » est utilisé.
        </span>
      </label>
    </div>

    <p class="mt-3.5 rounded-[12px] border border-ligne-claire bg-fond-clair px-4 py-3.5 text-[12.5px] leading-relaxed text-discret">
      Coaching privé : <b class="text-encre">{{ formatFcfa(profil.coachingPriveFcfaHeure) }} / h —
      tarif fixe de la plateforme</b>, non modifiable ici. Vos modules et l’ordre d’affichage
      public sont gérés par l’équipe Big Five.
    </p>

    <!-- La maquette montre les deux boutons côte à côte en permanence : plutôt
         que d'en masquer un, « Enregistrer » reste actif et publie le
         brouillon, modifié ou non. -->
    <div class="mt-5.5 flex flex-wrap items-center gap-3.5">
      <UiBaseButton variante="contour" @click="modification = true">Modifier</UiBaseButton>
      <UiBaseButton @click="enregistrer">Enregistrer</UiBaseButton>
      <span class="text-[13px] text-discret">
        « Modifier » déverrouille les champs, « Enregistrer » publie la mise à jour.
      </span>
    </div>
    <p v-if="enregistre && !modification" class="mt-3 text-[13px] font-bold text-succes">
      Profil mis à jour.
    </p>
    <p v-if="erreur" class="mt-3 text-[13px] text-erreur">{{ erreur }}</p>
  </div>
</template>
