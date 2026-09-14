<script setup lang="ts">
import type { FicheApprenant } from '~/utils/formateur'

definePageMeta({ layout: 'formateur', middleware: 'formateur' })

const route = useRoute()
const { data: fiche, error } = await useFetch<FicheApprenant>(
  () => `/api/formateur/apprenant/${route.params.id}`,
)

if (!fiche.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: error.value?.statusMessage ?? 'Apprenant introuvable',
    fatal: true,
  })
}

usePagePrivee(`${fiche.value.nomAffiche} — fiche apprenant`)
</script>

<template>
  <div v-if="fiche" class="max-w-[520px]">
    <button type="button" class="text-[14px] text-discret hover:underline" @click="$router.back()">
      ← Retour
    </button>
    <FormateurFicheApprenant class="mt-4" :fiche="fiche" />
  </div>
</template>
