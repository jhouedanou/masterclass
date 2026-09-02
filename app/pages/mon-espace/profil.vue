<script setup lang="ts">
import type { Persona, Utilisateur } from '#shared/types'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Ma fiche apprenant')

const auth = useAuthStore()
const { data } = await useFetch<{ utilisateur: Utilisateur; persona: Persona }>('/api/mon-espace/compte')

const formulaire = reactive({
  prenom: data.value?.utilisateur.prenom ?? '',
  nom: data.value?.utilisateur.nom ?? '',
  whatsapp: data.value?.utilisateur.whatsapp ?? '',
  pays: data.value?.utilisateur.pays ?? '',
  secteur: data.value?.persona.secteur ?? '',
  experience: data.value?.persona.experience ?? '',
  reseaux: data.value?.persona.reseaux ?? '',
  objectif: data.value?.persona.objectif ?? '',
  age: data.value?.persona.age ?? undefined,
})
const message = ref('')
const erreur = ref('')
const envoi = ref(false)

async function enregistrer() {
  erreur.value = ''
  message.value = ''
  envoi.value = true
  try {
    await $fetch('/api/mon-espace/compte/profil', {
      method: 'PUT',
      body: {
        prenom: formulaire.prenom,
        nom: formulaire.nom,
        whatsapp: formulaire.whatsapp,
        pays: formulaire.pays,
        persona: {
          secteur: formulaire.secteur,
          experience: formulaire.experience,
          reseaux: formulaire.reseaux,
          objectif: formulaire.objectif,
          age: formulaire.age || undefined,
        },
      },
    })
    await auth.rafraichir()
    message.value = auth.utilisateur?.ficheCompletee
      ? 'Fiche enregistrée. Vous pouvez réserver vos sessions de coaching.'
      : 'Fiche enregistrée. Renseignez votre activité et votre objectif pour pouvoir réserver une session.'
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Enregistrement impossible.'
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <div class="max-w-[720px]">
    <h1 class="text-[30px] font-medium">Ma fiche apprenant</h1>
    <p class="mt-2 text-[15px] text-texte">
      Ces informations sont transmises au formateur avant les sessions de coaching collectif. Le nom
      saisi ici figure sur vos certificats. L’adresse e-mail et le mot de passe se modifient dans les
      <NuxtLink to="/mon-espace/parametres" class="font-bold underline">paramètres</NuxtLink>.
    </p>

    <p
      v-if="auth.utilisateur && !auth.utilisateur.ficheCompletee"
      class="mt-5 rounded-[12px] border border-alerte bg-alerte-voile p-4 text-[14px] text-alerte"
    >
      Votre fiche est incomplète : votre activité et votre objectif sont nécessaires pour réserver une session.
    </p>

    <form class="mt-8 grid gap-5 sm:grid-cols-2" @submit.prevent="enregistrer">
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Prénom *</span>
        <input v-model="formulaire.prenom" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Nom *</span>
        <input v-model="formulaire.nom" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Numéro WhatsApp</span>
        <input v-model="formulaire.whatsapp" type="tel" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Pays</span>
        <input v-model="formulaire.pays" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>

      <p class="surtitre text-discret sm:col-span-2">Votre contexte, pour le formateur</p>

      <label class="block sm:col-span-2">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Votre activité ou secteur *</span>
        <input v-model="formulaire.secteur" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none" placeholder="Community manager freelance, restauration, cosmétiques…">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Expérience</span>
        <input v-model="formulaire.experience" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none" placeholder="2 ans, en lancement…">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Âge</span>
        <input v-model.number="formulaire.age" type="number" min="12" max="120" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block sm:col-span-2">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Réseaux ou canaux utilisés</span>
        <input v-model="formulaire.reseaux" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none" placeholder="Instagram, WhatsApp Business, TikTok…">
      </label>
      <label class="block sm:col-span-2">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Votre projet et vos attentes pour le coaching *</span>
        <textarea v-model="formulaire.objectif" rows="4" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none" />
      </label>

      <div class="sm:col-span-2">
        <UiBaseButton type="submit" :disabled="envoi">Enregistrer</UiBaseButton>
        <p v-if="message" class="mt-3 text-[14px] text-succes">{{ message }}</p>
        <p v-if="erreur" class="mt-3 text-[14px] text-erreur">{{ erreur }}</p>
      </div>
    </form>
  </div>
</template>
