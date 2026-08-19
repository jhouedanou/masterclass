<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

useSeoMeta({
  title: props.error.statusCode === 404 ? 'Page introuvable' : 'Une erreur est survenue',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white">
    <LayoutTheHeader />
    <main class="conteneur flex flex-1 items-center py-24">
      <div class="mx-auto max-w-lg text-center">
        <p class="font-title text-[64px] font-light text-social">{{ error.statusCode }}</p>
        <h1 class="mt-4 text-[30px] font-medium">
          {{ error.statusCode === 404 ? 'Cette page n’existe pas' : 'Une erreur est survenue' }}
        </h1>
        <p class="mt-3 text-[15px] text-texte">
          {{
            error.statusCode === 404
              ? 'Le lien est peut-être obsolète, ou la page a été déplacée.'
              : 'Réessayez dans un instant. Si le problème persiste, écrivez-nous.'
          }}
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <UiBaseButton to="/">Retour à l’accueil</UiBaseButton>
          <UiBaseButton to="/modules" variante="contour">Voir les modules</UiBaseButton>
        </div>
      </div>
    </main>
    <LayoutTheFooter />
  </div>
</template>
