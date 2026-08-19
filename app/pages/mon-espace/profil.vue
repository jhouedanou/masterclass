<script setup lang="ts">
definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Ma fiche apprenant')

const auth = useAuthStore()
const formulaire = reactive({
  prenom: auth.utilisateur?.prenom ?? '',
  nom: auth.utilisateur?.nom ?? '',
  email: auth.utilisateur?.email ?? '',
  whatsapp: auth.utilisateur?.whatsapp ?? '',
  activite: '',
  projet: '',
  attentes: '',
})
const enregistre = ref(false)
</script>

<template>
  <div class="max-w-[720px]">
    <h1 class="text-[30px] font-medium">Ma fiche apprenant</h1>
    <p class="mt-2 text-[15px] text-texte">
      Ces informations sont transmises au formateur avant les sessions de coaching collectif. Le nom
      saisi ici figure sur vos certificats.
    </p>

    <form class="mt-8 grid gap-5 sm:grid-cols-2" @submit.prevent="enregistre = true">
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Prénom</span>
        <input v-model="formulaire.prenom" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Nom</span>
        <input v-model="formulaire.nom" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Adresse e-mail</span>
        <input v-model="formulaire.email" type="email" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Numéro WhatsApp</span>
        <input v-model="formulaire.whatsapp" type="tel" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block sm:col-span-2">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Votre activité</span>
        <input v-model="formulaire.activite" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block sm:col-span-2">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Votre projet</span>
        <textarea v-model="formulaire.projet" rows="4" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none" />
      </label>
      <label class="block sm:col-span-2">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Vos attentes pour le coaching</span>
        <textarea v-model="formulaire.attentes" rows="4" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none" />
      </label>

      <div class="sm:col-span-2">
        <UiBaseButton type="submit">Enregistrer</UiBaseButton>
        <p v-if="enregistre" class="mt-3 text-[14px] text-succes">
          Modifications prises en compte localement — la persistance côté serveur reste à brancher.
        </p>
      </div>
    </form>
  </div>
</template>
