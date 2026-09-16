<script setup lang="ts">
import type { Formateur, Module } from '#shared/types'

/**
 * Carte de module. Les maquettes en dessinent deux versions :
 *   - `accueil` — compacte, prix fondu dans la ligne de méta, lien texte
 *     teinté par le programme (planche A, écran 01) ;
 *   - `programme` — plus grande, sans prix dans la méta, avec un pied de
 *     carte qui oppose le prix en gras à un bouton pilule encre (écrans 02
 *     et 02b). La phase 1 servait la version accueil sur les deux.
 */
const props = withDefaults(
  defineProps<{
    module: Module & { formateur?: Formateur | null }
    thematiqueNom?: string
    statutVisible?: boolean
    /** Marque un module auquel l'apprenant a déjà accès (espace privé). Faux
     *  partout ailleurs : sur le site public, personne n'est identifié. */
    possede?: boolean
    /** Flèche « → » après « Découvrir le module » : présente sur l'accueil, absente sur les pages programme (planche A). */
    fleche?: boolean
    variante?: 'accueil' | 'programme'
  }>(),
  { variante: 'accueil' },
)

const social = computed(() => props.module.programme === 'social-media')
const teinte = computed(() => (social.value ? 'text-social' : 'text-entrepreneurs'))
const large = computed(() => props.variante === 'programme')
</script>

<template>
  <article
    class="flex flex-col border"
    :class="[
      social ? 'border-ligne-douce' : 'border-entrepreneurs-bordure',
      large ? 'gap-3 rounded-[14px] p-6' : 'gap-2.5 rounded-[12px] p-[22px]',
    ]"
  >
    <div class="flex items-start justify-between gap-3">
      <p class="text-[12px] font-bold tracking-[0.1em] uppercase" :class="teinte">
        Module {{ numeroModule(module.numero) }}<template v-if="thematiqueNom"> · {{ thematiqueNom }}</template>
      </p>
      <span
        v-if="possede"
        class="shrink-0 rounded-full bg-succes-voile px-2.5 py-1 text-[11px] font-bold text-succes"
      >
        Vous y avez accès
      </span>
      <span
        v-else-if="statutVisible"
        class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
        :class="
          module.statut === 'disponible'
            ? large
              ? 'bg-succes-pale text-whatsapp'
              : 'bg-succes-voile text-succes'
            : 'bg-alerte-voile text-alerte'
        "
      >
        {{ module.statut === 'disponible' ? 'Disponible' : module.statut === 'annonce' ? 'Bientôt disponible' : 'À venir' }}
      </span>
    </div>

    <h3 class="font-title leading-[1.3] font-light" :class="large ? 'text-[20px]' : 'text-[18px]'">
      <NuxtLink :to="`/modules/${module.slug}`" class="text-encre hover:underline">
        {{ module.titre }}
      </NuxtLink>
    </h3>

    <p class="text-[13px] text-discret">
      {{ module.formateur?.nom }} · {{ formatDuree(module.dureeMinutes) }}<template v-if="!large"> ·
      {{ formatFcfa(module.prixFcfa, true) }}</template>
    </p>

    <!-- Pied de carte des pages programme : prix à gauche, bouton à droite. -->
    <div v-if="large" class="mt-auto flex items-center justify-between gap-3 pt-2">
      <b class="text-[16px]">{{ formatFcfa(module.prixFcfa) }}</b>
      <UiBaseButton :to="`/modules/${module.slug}`" variante="sombre" taille="sm">
        Découvrir le module
      </UiBaseButton>
    </div>

    <NuxtLink
      v-else
      :to="`/modules/${module.slug}`"
      class="mt-auto pt-1 text-[14px] font-bold"
      :class="teinte"
    >
      Découvrir le module<template v-if="fleche"> →</template>
    </NuxtLink>
  </article>
</template>
