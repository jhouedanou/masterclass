<script setup lang="ts">
import type { Article, Formateur } from '#shared/types'

defineProps<{ article: Article & { auteur?: Formateur | null } }>()
</script>

<template>
  <article class="group flex flex-col overflow-hidden rounded-[14px] border border-ligne-douce bg-white">
    <NuxtLink :to="`/blog/${article.slug}`" class="block aspect-16/9 overflow-hidden bg-fond-voile">
      <NuxtImg
        :src="article.image"
        :alt="article.imageAlt"
        width="480"
        height="270"
        loading="lazy"
        class="size-full object-cover transition group-hover:scale-105"
      />
    </NuxtLink>
    <div class="flex flex-1 flex-col p-5">
      <p class="text-[12px] font-bold tracking-[0.1em] text-social uppercase">
        {{ article.categorie }}
      </p>
      <h3 class="mt-2.5 font-title text-[20px] leading-[1.25] font-light">
        <NuxtLink :to="`/blog/${article.slug}`" class="text-encre hover:underline">
          {{ article.titre }}
        </NuxtLink>
      </h3>
      <p class="mt-2 line-clamp-3 text-[14.5px] leading-relaxed text-texte">{{ article.chapo }}</p>
      <p class="mt-4 pt-1 text-[12.5px] text-discret">
        <span v-if="article.auteur">{{ article.auteur.nom }} · </span>
        <time :datetime="article.publieLe ?? undefined">{{ formatDate(article.publieLe) }}</time>
        · {{ article.tempsLectureMinutes }} min de lecture
      </p>
    </div>
  </article>
</template>
