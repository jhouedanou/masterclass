<script setup lang="ts">
const props = defineProps<{ titre: string; chemin: string; maj?: string }>()

usePageSeo({
  titreAuto: `${props.titre} | E-Masterclass Big Five`,
  descriptionAuto: `${props.titre} de la plateforme E-Masterclass Big Five, éditée par BigFiveAbidjan SARL.`,
  chemin: props.chemin,
})

const mailles = computed(() => [{ libelle: 'Accueil', chemin: '/' }, { libelle: props.titre }])
useFilAriane(mailles)
</script>

<template>
  <div>
    <div class="conteneur pt-6">
      <FilAriane :mailles="mailles" />
    </div>
    <article class="conteneur max-w-[760px] pt-6 pb-16">
      <h1 class="text-[38px] font-medium">{{ titre }}</h1>
      <p v-if="maj" class="mt-2 text-[13px] text-discret">Dernière mise à jour : {{ maj }}</p>

      <div class="editorial mt-8">
        <slot />
      </div>

      <p class="mt-10 rounded-[12px] border border-dashed border-ligne bg-fond-clair p-5 text-[13.5px] text-discret">
        Gabarit en place : le texte définitif doit être fourni et validé juridiquement avant mise en
        production.
      </p>
    </article>
  </div>
</template>
