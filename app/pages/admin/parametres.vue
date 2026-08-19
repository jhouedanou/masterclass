<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Paramètres — administration')

const auth = useAuthStore()
const { data, refresh } = await useFetch<{
  financiers: {
    fraisPaiementPourcent: number
    partBigFivePourcent: number
    partFormateurPourcent: number
    objectifInscriptionsMensuel: number
    objectifCaMensuel: number
  }
  seo: { titreParDefaut: string; descriptionParDefaut: string; imageSocialeParDefaut: string; googleSearchConsole: string; ga4: string }
  role: string
}>('/api/admin/parametres')

const brouillon = reactive({ ...(data.value?.financiers ?? {}) })
const message = ref('')
const erreur = ref('')

async function enregistrer() {
  erreur.value = ''
  try {
    await $fetch('/api/admin/parametres', { method: 'PUT', body: brouillon })
    message.value = 'Paramètres enregistrés — modification journalisée.'
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Enregistrement impossible.'
  }
}
</script>

<template>
  <div v-if="data" class="max-w-[820px]">
    <h1 class="font-title text-[26px] font-light">Paramètres</h1>

    <section class="mt-6 rounded-[14px] border border-ligne-douce bg-white p-6">
      <h2 class="font-title text-[19px] font-light">Répartition et frais</h2>
      <p class="mt-1 text-[12.5px] text-discret">
        Réservé à l’administrateur principal. Toute modification est journalisée.
      </p>

      <form class="mt-5 grid gap-4 sm:grid-cols-2" @submit.prevent="enregistrer">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Frais de paiement FeexPay (%)</span>
          <input v-model.number="brouillon.fraisPaiementPourcent" type="number" min="0" max="20" :disabled="!auth.estAdminSuperieur" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] disabled:bg-fond-clair">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Part Big Five (%)</span>
          <input v-model.number="brouillon.partBigFivePourcent" type="number" min="0" max="100" :disabled="!auth.estAdminSuperieur" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] disabled:bg-fond-clair">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Part formateur (%)</span>
          <input v-model.number="brouillon.partFormateurPourcent" type="number" min="0" max="100" :disabled="!auth.estAdminSuperieur" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] disabled:bg-fond-clair">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Objectif d’inscriptions / mois</span>
          <input v-model.number="brouillon.objectifInscriptionsMensuel" type="number" min="0" :disabled="!auth.estAdminSuperieur" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] disabled:bg-fond-clair">
        </label>
        <label class="block sm:col-span-2">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Objectif de CA / mois (FCFA)</span>
          <input v-model.number="brouillon.objectifCaMensuel" type="number" min="0" :disabled="!auth.estAdminSuperieur" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] disabled:bg-fond-clair">
        </label>

        <div class="sm:col-span-2">
          <p v-if="erreur" class="mb-3 text-[13.5px] text-erreur">{{ erreur }}</p>
          <p v-if="message" class="mb-3 text-[13.5px] text-succes">{{ message }}</p>
          <UiBaseButton v-if="auth.estAdminSuperieur" type="submit" taille="sm">Enregistrer</UiBaseButton>
          <p v-else class="text-[13px] text-discret">
            Votre compte n’a pas le droit de modifier ces paramètres.
          </p>
        </div>
      </form>
    </section>

    <section class="mt-6 rounded-[14px] border border-ligne-douce bg-white p-6">
      <h2 class="font-title text-[19px] font-light">Référencement global</h2>
      <dl class="mt-4 space-y-2 text-[13.5px]">
        <div class="flex justify-between gap-4"><dt class="text-discret">Titre par défaut</dt><dd>{{ data.seo.titreParDefaut }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">Image sociale par défaut</dt><dd class="font-mono text-[12.5px]">{{ data.seo.imageSocialeParDefaut }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">Search Console</dt><dd>{{ data.seo.googleSearchConsole || 'non configurée' }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">GA4</dt><dd>{{ data.seo.ga4 || 'non configuré' }}</dd></div>
      </dl>
      <p class="mt-3 text-[12.5px] text-discret">
        Le détail page par page se règle dans
        <NuxtLink to="/admin/referencement" class="underline">Référencement (SEO)</NuxtLink>.
      </p>
    </section>
  </div>
</template>
