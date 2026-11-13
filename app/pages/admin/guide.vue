<script setup lang="ts">
/**
 * Guide de l'administration : où se trouve chaque réglage, et qui a la main
 * sur ce qui ne se règle pas dans le back-office. Ouvert à tout compte
 * d'administration. Le contenu est dans `app/utils/guideAdmin.ts`.
 */
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Guide — administration')

/** Texte avec les segments entre accents graves rendus en chasse fixe. */
const segments = (texte: string) => texte.split(/`([^`]+)`/).map((s, i) => ({ mono: i % 2 === 1, texte: s }))

/** « Visibilité — en haut de l'écran… » : le mot avant le tiret est mis en gras. */
function etape(texte: string) {
  const coupe = texte.indexOf(' — ')
  return coupe > 0 && coupe < 40
    ? { titre: texte.slice(0, coupe), suite: texte.slice(coupe + 3) }
    : { titre: '', suite: texte }
}
</script>

<template>
  <div>
    <h1 class="font-title text-[24px] font-light">Guide de l’administration</h1>
    <p class="mt-1 max-w-[720px] text-[13.5px] leading-relaxed text-discret">
      Où se trouve chaque réglage, écran par écran, et qui a la main sur ce qui ne se règle pas ici.
      Les captures sont prises sur des données de démonstration.
    </p>

    <div class="mt-5 grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Sommaire du guide" class="xl:sticky xl:top-6 xl:self-start">
        <ol class="flex flex-wrap gap-1.5 text-[13px] font-semibold xl:flex-col xl:gap-0.5">
          <li v-for="(rubrique, i) in GUIDE_ADMIN" :key="rubrique.id">
            <a
              :href="`#${rubrique.id}`"
              class="block rounded-full border border-ligne bg-white px-3 py-1.5 text-texte hover:text-social xl:rounded-[8px] xl:border-0 xl:bg-transparent xl:px-2.5 xl:hover:bg-white"
            >
              {{ i + 1 }}. {{ rubrique.titre }}
            </a>
          </li>
        </ol>
      </nav>

      <div class="min-w-0 space-y-5">
        <section
          v-for="(rubrique, i) in GUIDE_ADMIN"
          :id="rubrique.id"
          :key="rubrique.id"
          class="scroll-mt-6 rounded-[14px] border border-ligne-douce bg-white p-5 md:p-6"
        >
          <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 class="font-title text-[20px] font-light text-encre">{{ i + 1 }}. {{ rubrique.titre }}</h2>
            <NuxtLink
              v-if="rubrique.chemin && rubrique.chemin !== '/admin/login'"
              :to="rubrique.chemin"
              class="text-[13px] font-bold text-social hover:underline"
            >
              Ouvrir l’écran →
            </NuxtLink>
          </div>
          <p class="mt-1 text-[13.5px] leading-relaxed text-texte">{{ rubrique.resume }}</p>

          <div class="mt-4 grid gap-5" :class="rubrique.captures?.length ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]' : ''">
            <div class="min-w-0">
              <ol v-if="rubrique.etapes" class="space-y-2.5 text-[13.5px] leading-relaxed text-encre">
                <li v-for="(texte, n) in rubrique.etapes" :key="n" class="flex gap-3">
                  <span class="mt-[3px] grid size-[19px] shrink-0 place-items-center rounded-full bg-social-voile text-[11px] font-bold text-social">
                    {{ n + 1 }}
                  </span>
                  <span class="min-w-0">
                    <b v-if="etape(texte).titre">{{ etape(texte).titre }} — </b>
                    <template v-for="(seg, s) in segments(etape(texte).suite)" :key="s">
                      <code v-if="seg.mono" class="rounded bg-fond-voile px-1 font-mono text-[12px]">{{ seg.texte }}</code>
                      <template v-else>{{ seg.texte }}</template>
                    </template>
                  </span>
                </li>
              </ol>

              <div v-if="rubrique.aSavoir" class="mt-4 rounded-[10px] bg-alerte-pale px-4 py-3 text-[13px] leading-relaxed text-alerte-fonce">
                <p class="text-[11px] font-bold tracking-[0.06em] uppercase">À savoir</p>
                <ul class="mt-1.5 space-y-1.5">
                  <li v-for="(texte, n) in rubrique.aSavoir" :key="n">{{ texte }}</li>
                </ul>
              </div>
            </div>

            <div v-if="rubrique.captures?.length" class="min-w-0 space-y-3">
              <figure v-for="capture in rubrique.captures" :key="capture.fichier">
                <a
                  :href="`/guide/${capture.fichier}`"
                  target="_blank"
                  rel="noopener"
                  class="block overflow-hidden rounded-[10px] border border-ligne-douce"
                >
                  <img
                    :src="`/guide/${capture.fichier}`"
                    :alt="capture.legende"
                    width="1360"
                    height="850"
                    loading="lazy"
                    class="max-h-[340px] w-full object-cover object-top"
                  >
                </a>
                <figcaption class="mt-1.5 text-[12px] text-discret">{{ capture.legende }}</figcaption>
              </figure>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
