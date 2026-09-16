<script setup lang="ts">
import type { Article, Formateur } from '#shared/types'

defineProps<{ article: Article & { auteur?: Formateur | null } }>()

/**
 * Carte d'article (planche A, écran 12). La catégorie s'y porte en pastille
 * teintée du programme qu'elle sert, non en surtitre violet : la phase 1
 * peignait en violet jusqu'aux articles Entrepreneuriat.
 */
function teintePastille(categorie: string) {
  if (categorie === 'Social Média') return 'bg-social-voile text-social'
  if (categorie === 'Entrepreneuriat') return 'bg-entrepreneurs-voile text-entrepreneurs'
  return 'bg-fond-voile text-texte'
}
function teinteLien(categorie: string) {
  return categorie === 'Entrepreneuriat' ? 'text-entrepreneurs' : 'text-social'
}
</script>

<template>
  <article class="group flex flex-col overflow-hidden rounded-carte border border-ligne-douce bg-white">
    <NuxtLink :to="`/blog/${article.slug}`" class="block h-[170px] overflow-hidden bg-fond-voile" tabindex="-1" aria-hidden="true">
      <NuxtImg
        :src="article.image"
        :alt="article.imageAlt"
        width="480"
        height="270"
        loading="lazy"
        class="size-full object-cover transition group-hover:scale-105"
      />
    </NuxtLink>
    <div class="flex flex-1 flex-col gap-2.5 p-[22px]">
      <span class="self-start rounded-full px-3 py-[5px] text-[11.5px] font-bold" :class="teintePastille(article.categorie)">
        {{ article.categorie }}
      </span>
      <h3 class="font-title text-[20px] leading-[1.3] font-light">
        <NuxtLink :to="`/blog/${article.slug}`" class="text-encre hover:underline">
          {{ article.titre }}
        </NuxtLink>
      </h3>
      <p class="line-clamp-3 text-[13.5px] leading-[1.6] text-texte">{{ article.chapo }}</p>
      <p class="mt-auto text-[12.5px] text-discret">
        <span v-if="article.auteur">{{ article.auteur.nom }} · </span>
        <time :datetime="article.publieLe ?? undefined">{{ formatDate(article.publieLe) }}</time>
        · {{ article.tempsLectureMinutes }} min
      </p>
      <NuxtLink
        :to="`/blog/${article.slug}`"
        class="text-[13.5px] font-bold hover:underline"
        :class="teinteLien(article.categorie)"
      >
        Lire l’article →
      </NuxtLink>
    </div>
  </article>
</template>
