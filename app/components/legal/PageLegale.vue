<script setup lang="ts">
import type { ContenuLegales } from '#shared/types'

const props = defineProps<{
  /** Clé du document dans le bloc CMS `legales` : `cgv`, `cgu`, `mentions-legales`… */
  cle: string
  titre: string
  chemin: string
  maj?: string
  /**
   * Le contenu passé en `slot` n'est qu'un gabarit d'attente, pas un vrai texte
   * juridique. Seules ces pages affichent l'encart « textes à fournir » ; les
   * CGV, elles, ont un texte réel en repli et n'ont rien à annoncer.
   */
  repliProvisoire?: boolean
}>()

usePageSeo({
  titreAuto: `${props.titre} | E-Masterclass Big Five`,
  descriptionAuto: `${props.titre} de la plateforme E-Masterclass Big Five, éditée par BigFiveAbidjan SARL.`,
  chemin: props.chemin,
})

const mailles = computed(() => [{ libelle: 'Accueil', chemin: '/' }, { libelle: props.titre }])
useFilAriane(mailles)

/**
 * Les cinq documents vivent dans un seul bloc CMS : une clé de cache partagée
 * évite de le redemander à chaque page légale visitée.
 *
 * `lazy` : le corps juridique n'est pas ce qui fait la page — le gabarit, le
 * sommaire et le repli s'affichent sans attendre la réponse. Et si la route
 * échoue ou si le bloc est en brouillon, `default` rend une liste vide, donc
 * le repli reste à l'écran au lieu d'une page cassée.
 */
const { data } = useFetch<{ cle: string; contenu: ContenuLegales }>('/api/vitrine/legales', {
  key: 'vitrine-legales',
  lazy: true,
  default: () => ({ cle: 'legales', contenu: { documents: [] } }),
})

const docCms = computed(() =>
  (data.value?.contenu?.documents ?? []).find((doc) => doc.cle === props.cle),
)

/** Vide tant que le juriste n'a rien rendu : c'est le cas nominal aujourd'hui. */
const corps = computed(() => docCms.value?.corps?.trim() ?? '')

// Titre et date ne suivent le CMS que lorsque son corps est affiché : une page
// qui montre encore son texte figé garde le titre et la date de ce texte.
const titreAffiche = computed(() => (corps.value && docCms.value?.titre?.trim()) || props.titre)
const majAffichee = computed(() => (corps.value && docCms.value?.maj?.trim()) || props.maj)

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
        <p v-if="majAffichee" class="text-[13px] text-discret">
          Dernière mise à jour : {{ majAffichee }}
        </p>
        <h1 class="mt-2 text-[38px] font-medium">{{ titreAffiche }}</h1>

        <!-- Corps saisi au back-office, déjà assaini par server/api/vitrine/[cle].get.ts. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="corps" class="editorial editorial-legal mt-8" v-html="corps" />
        <div v-else class="editorial editorial-legal mt-8">
          <slot />
        </div>

        <p
          v-if="!corps && repliProvisoire"
          class="mt-10 rounded-[12px] border border-dashed border-ligne bg-fond-clair p-5 text-[13.5px] text-discret"
        >
          Corps du document — textes juridiques à fournir et à valider avant mise en production. Même
          gabarit pour les cinq pages : sommaire à gauche, articles titrés, date de mise à jour, droit
          ivoirien.
        </p>
      </article>
    </div>
  </div>
</template>
