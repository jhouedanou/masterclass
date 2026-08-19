<script setup lang="ts">
const achat = useAchatStore()
const auth = useAuthStore()

const formulaire = reactive({ prenom: '', nom: '', email: '', whatsapp: '', pays: 'Côte d’Ivoire' })
const erreur = ref('')
const enCours = ref(false)

usePagePrivee('Créez votre compte')

// L'achat en cours doit survivre à la connexion : on le laisse dans le store.
onMounted(() => {
  if (auth.estConnecte) navigateTo('/achat/recapitulatif')
})

async function soumettre() {
  erreur.value = ''
  enCours.value = true
  try {
    await auth.inscription(formulaire)
    await navigateTo('/achat/recapitulatif')
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'La création du compte a échoué.'
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <div class="conteneur max-w-[840px] py-12">
    <UiEtapesAchat :etape="1" />

    <h1 class="mt-8 text-[36px] font-medium">Créez votre compte</h1>
    <p class="mt-3 max-w-[620px] text-[16px] leading-relaxed text-texte">
      Votre compte vous permettra de finaliser votre achat, d’accéder à vos modules et de suivre vos
      prochaines sessions.
    </p>

    <div v-if="achat.module" class="mt-6 rounded-[14px] border border-ligne-douce bg-fond-clair p-5 text-[14px]">
      <p class="text-discret">Module sélectionné</p>
      <p class="mt-1 font-title text-[19px] font-light">{{ achat.module.titre }}</p>
    </div>

    <form class="mt-8 grid gap-5 sm:grid-cols-2" @submit.prevent="soumettre">
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Prénom *</span>
        <input v-model="formulaire.prenom" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Nom *</span>
        <input v-model="formulaire.nom" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Email *</span>
        <input v-model="formulaire.email" required type="email" autocomplete="email" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Numéro WhatsApp *</span>
        <input v-model="formulaire.whatsapp" required type="tel" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block sm:col-span-2">
        <!-- Le pays est saisi ici et n'est plus redemandé dans la fiche apprenant. -->
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Pays *</span>
        <input v-model="formulaire.pays" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>

      <div class="sm:col-span-2">
        <p v-if="erreur" class="mb-3 text-[14px] text-erreur">{{ erreur }}</p>
        <UiBaseButton type="submit" class="w-full" taille="lg" :disabled="enCours">
          {{ enCours ? 'Création…' : 'Créer mon compte et continuer' }}
        </UiBaseButton>
        <p class="mt-4 text-center text-[14px] text-texte">
          Déjà inscrit ?
          <NuxtLink to="/connexion?suite=/achat/recapitulatif" class="font-bold">Se connecter</NuxtLink>
        </p>
      </div>
    </form>
  </div>
</template>
