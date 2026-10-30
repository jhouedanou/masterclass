<script setup lang="ts">
import { dureeLive, heureLive, pastilleDateLive } from '#shared/utils/live'

/**
 * Ligne du calendrier des Live Sessions (planches 01 et 02) : pastille de
 * date, programme et numéro, titre, formateur · heure · durée, bouton. Sert
 * aussi aux modules « À venir » datés du calendrier de l'accueil, sans bouton.
 */
const props = defineProps<{
  debut: string
  dureeMinutes?: number
  programme: 'social-media' | 'entrepreneurs'
  reference: string
  titre: string
  formateur?: string | null
  /** Fiche de la session ; absent pour un module « À venir ». */
  lien?: string | null
  complet?: boolean
  /** Libellé quand il n'y a pas de lien : « Module à venir ». */
  mention?: string
}>()

const pastille = computed(() => pastilleDateLive(props.debut))
const sous = computed(() =>
  [props.formateur, props.lien ? `${heureLive(props.debut)} GMT` : null, props.dureeMinutes ? dureeLive(props.dureeMinutes) : null]
    .filter(Boolean)
    .join(' · '),
)
</script>

<template>
  <li class="flex items-center gap-4 rounded-[14px] border border-ligne-douce bg-white p-4 sm:gap-5 sm:p-5">
    <div
      class="flex w-[62px] shrink-0 flex-col items-center rounded-[10px] py-2 text-center leading-none"
      :class="lien ? 'bg-live-voile text-live' : 'bg-alerte-voile text-alerte'"
    >
      <span class="text-[11px] font-bold tracking-[0.08em]">{{ pastille.jourSemaine }}</span>
      <span class="mt-1 font-title text-[24px] font-normal">{{ pastille.jour }}</span>
      <span class="mt-0.5 text-[11px] font-bold tracking-[0.08em]">{{ pastille.mois }}</span>
    </div>
    <div class="min-w-0 flex-1">
      <p
        class="text-[11.5px] font-bold tracking-[0.1em] uppercase"
        :class="programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'"
      >
        {{ reference }}
      </p>
      <p class="mt-1 font-title text-[18px] leading-snug font-light text-encre">
        <NuxtLink v-if="lien" :to="lien" class="hover:underline">{{ titre }}</NuxtLink>
        <template v-else>{{ titre }}</template>
      </p>
      <p v-if="sous" class="mt-1 text-[13px] text-discret">{{ sous }}</p>
      <!-- Sur téléphone, le bouton passe sous le texte. -->
      <div v-if="lien" class="mt-3 sm:hidden">
        <UiBaseButton v-if="!complet" :to="lien" variante="sombre" taille="sm">S’inscrire</UiBaseButton>
        <span v-else class="rounded-full bg-fond-voile px-3.5 py-2 text-[12.5px] font-bold text-discret">Complet</span>
      </div>
    </div>
    <div class="hidden shrink-0 sm:block">
      <UiBaseButton v-if="lien && !complet" :to="lien" variante="sombre" taille="sm">S’inscrire</UiBaseButton>
      <span v-else-if="lien" class="rounded-full bg-fond-voile px-3.5 py-2 text-[12.5px] font-bold text-discret">Complet</span>
      <span v-else class="rounded-full bg-alerte-voile px-3.5 py-2 text-[12.5px] font-bold text-alerte">{{ mention ?? 'À venir' }}</span>
    </div>
  </li>
</template>
