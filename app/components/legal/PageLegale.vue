<script setup lang="ts">
const props = defineProps<{ titre: string; chemin: string; maj?: string }>()

usePageSeo({
  titreAuto: `${props.titre} | E-Masterclass Big Five`,
  descriptionAuto: `${props.titre} de la plateforme E-Masterclass Big Five, éditée par BigFiveAbidjan SARL.`,
  chemin: props.chemin,
})

const mailles = computed(() => [{ libelle: 'Accueil', chemin: '/' }, { libelle: props.titre }])
useFilAriane(mailles)

/** Sommaire « Documents légaux » commun aux cinq pages (planche A, écran 09). */
const documents = [
  { libelle: 'Conditions générales de vente', chemin: '/cgv' },
  { libelle: 'Mentions légales', chemin: '/mentions-legales' },
  { libelle: 'Conditions générales d’utilisation', chemin: '/cgu' },
  { libelle: 'Politique de confidentialité', chemin: '/confidentialite' },
  { libelle: 'Politique de cookies', chemin: '/cookies' },
]
</script>

<template>
  <div>
    <div class="conteneur pt-6">
      <FilAriane :mailles="mailles" />
    </div>
    <div class="conteneur grid gap-10 pt-6 pb-16 md:grid-cols-[240px_1fr]">
      <aside class="md:sticky md:top-24 md:self-start">
        <p class="surtitre text-discret">Documents légaux</p>
        <nav aria-label="Documents légaux" class="mt-3 flex flex-col gap-0.5">
          <NuxtLink
            v-for="doc in documents"
            :key="doc.chemin"
            :to="doc.chemin"
            class="rounded-[8px] px-3 py-2 text-[14px] text-texte hover:bg-fond-clair"
            :class="doc.chemin === chemin && 'bg-fond-voile font-bold text-encre'"
            :aria-current="doc.chemin === chemin ? 'page' : undefined"
          >
            {{ doc.libelle }}
          </NuxtLink>
        </nav>
      </aside>

      <article class="min-w-0 max-w-[760px]">
        <p v-if="maj" class="text-[13px] text-discret">Dernière mise à jour : {{ maj }}</p>
        <h1 class="mt-2 text-[38px] font-medium">{{ titre }}</h1>

        <div class="editorial mt-8">
          <slot />
        </div>

        <p class="mt-10 rounded-[12px] border border-dashed border-ligne bg-fond-clair p-5 text-[13.5px] text-discret">
          Corps du document — textes juridiques à fournir et à valider avant mise en production. Même
          gabarit pour les cinq pages : sommaire à gauche, articles titrés, date de mise à jour, droit
          ivoirien.
        </p>
      </article>
    </div>
  </div>
</template>
