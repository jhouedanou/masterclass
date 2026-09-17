<script setup lang="ts">
import type { Acces, Formateur, Module, Programme, SessionCoaching, Thematique } from '#shared/types'
import { compterChapitres, compterPlaces } from '#shared/utils/compteurs'

definePageMeta({ layout: 'espace', middleware: 'auth' })

const route = useRoute()
const auth = useAuthStore()

interface EtatChapitre {
  position: number
  libelle: string
  titre: string
  dureeSecondes: number
  etat: 'vu' | 'en-cours' | 'a-voir'
  pourcentage: number
  repriseSecondes: number
}

// Route dédiée : elle refuse l'accès à un module non acquis.
const { data, error } = await useFetch<{
  module: Module
  acces: Acces
  formateur: Formateur | null
  thematique: Thematique | null
  programme: Programme | null
  chapitres: EtatChapitre[]
  chapitresVus: number
  ressources: { id: string; titre: string; url: string; format: string }[]
  session: (SessionCoaching & { inscrit: boolean }) | null
  completionProfil: number
}>(() => `/api/mon-espace/module/${route.params.slug}`)

if (!data.value) {
  // 403 quand le module n'a pas été acheté, 404 quand il n'existe pas.
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: error.value?.statusMessage ?? 'Module introuvable',
    fatal: true,
  })
}

const moduleCourant = computed(() => data.value!.module)
usePagePrivee(moduleCourant.value.titre)

const social = computed(() => moduleCourant.value.programme === 'social-media')
const total = computed(() => data.value!.chapitres.length)
const restants = computed(() => total.value - data.value!.chapitresVus)

function horloge(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const LIBELLE_SESSION = (date: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T00:00:00`))
</script>

<template>
  <div v-if="data">
    <NuxtLink to="/mon-espace/modules" class="text-[13px] text-discret hover:underline">
      ← Mes modules
    </NuxtLink>
    <p class="surtitre mt-4" :class="social ? 'text-social' : 'text-entrepreneurs'">
      {{ social ? 'Social Média' : 'Entrepreneurs' }} · {{ data.thematique?.nom }} · Module {{ numeroModule(moduleCourant.numero) }}
    </p>
    <h1 class="mt-2 mb-4 text-[30px] font-light lg:text-[32px]">{{ moduleCourant.titre }}</h1>

    <div class="mb-[22px] flex items-center gap-3.5">
      <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-piste">
        <div class="h-full rounded-full bg-social" :style="{ width: `${(data.chapitresVus / Math.max(total, 1)) * 100}%` }" />
      </div>
      <span class="shrink-0 text-[14px] font-bold text-encre">{{ data.chapitresVus }} / {{ total }} chapitres vus</span>
    </div>

    <div class="grid gap-7 lg:grid-cols-[1fr_400px] lg:items-start">
      <div>
        <!-- Vidéo de bienvenue — ne compte pas dans la progression -->
        <NuxtLink
          :to="`/mon-espace/lecture/${moduleCourant.slug}?chapitre=0`"
          class="group relative mb-5 grid aspect-video w-full place-items-center overflow-hidden rounded-carte bg-encre lg:aspect-auto lg:h-[300px]"
        >
          <img src="/images/brand/pattern.png" alt="" aria-hidden="true" class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.18]">
          <span class="relative grid size-[72px] place-items-center rounded-full bg-white text-[24px] text-encre transition group-hover:scale-105">
            <Icon name="ph:play-fill" size="26" />
          </span>
          <span class="absolute top-4 left-5 rounded-[8px] bg-black/40 px-3 py-1.5 text-[13px] font-bold text-white">
            Vidéo de bienvenue — {{ data.formateur?.nom }}
          </span>
          <span class="pointer-events-none absolute top-4 right-5 text-[12px] text-white/[.22]" aria-hidden="true">
            {{ auth.utilisateur?.prenom }} {{ auth.utilisateur?.nom }} · {{ auth.utilisateur?.email }}
          </span>
          <span class="absolute bottom-3.5 left-5 text-[11.5px] text-nuit-clair">Ne compte pas dans la progression</span>
        </NuxtLink>

        <!-- Chapitres avec état : la maquette les pose en lignes détachées, et
             cerne d'un filet violet celui qui est en cours. -->
        <ol class="flex flex-col gap-2.5">
          <li
            v-for="c in data.chapitres"
            :key="c.position"
            class="flex flex-wrap items-center gap-4 rounded-champ bg-white px-5 py-4"
            :class="c.etat === 'en-cours' ? 'border-[1.5px] border-social' : 'border border-ligne-douce'"
          >
            <span
              class="grid size-8 shrink-0 place-items-center rounded-full font-extrabold"
              :class="c.etat === 'vu' ? 'bg-succes-voile text-[14px] text-succes' : c.etat === 'en-cours' ? 'bg-social-voile text-[12px] text-social' : 'bg-fond-voile text-[12px] text-discret'"
            >
              {{ c.etat === 'vu' ? '✓' : c.etat === 'en-cours' ? `${c.pourcentage}%` : c.position + 1 }}
            </span>
            <span class="min-w-[200px] flex-1">
              <span class="block text-[15px] font-bold text-encre">{{ c.libelle }} — {{ c.titre }}</span>
              <span class="mt-[3px] block text-[12.5px] text-discret">
                <template v-if="c.etat === 'vu'">Vu à 100 %</template>
                <template v-else-if="c.etat === 'en-cours'">En cours — reprise à {{ horloge(c.repriseSecondes) }}</template>
                <template v-else>À voir · {{ horloge(c.dureeSecondes) }}</template>
              </span>
            </span>
            <!-- « Revoir » est un lien nu dans la maquette, pas un bouton : le
                 plein violet est réservé au chapitre qu'on reprend. -->
            <NuxtLink
              v-if="c.etat === 'vu'"
              :to="`/mon-espace/lecture/${moduleCourant.slug}?chapitre=${c.position}`"
              class="shrink-0 text-[13.5px] font-bold text-social hover:underline"
            >
              Revoir
            </NuxtLink>
            <UiBaseButton
              v-else
              :to="`/mon-espace/lecture/${moduleCourant.slug}?chapitre=${c.position}${c.repriseSecondes ? `&reprise=${c.repriseSecondes}` : ''}`"
              taille="sm"
            >
              {{ c.etat === 'en-cours' ? 'Reprendre' : 'Commencer' }}
            </UiBaseButton>
          </li>
        </ol>
      </div>

      <aside class="flex flex-col gap-4">
        <!-- Coaching session du module -->
        <div class="rounded-carte border border-ligne-douce bg-white p-[22px]">
          <p class="mb-2.5 font-title text-[17px] font-light">Coaching session du module</p>
          <template v-if="data.session">
            <p class="text-[14px] font-bold text-encre">
              {{ LIBELLE_SESSION(data.session.date) }} · {{ data.session.heure }} GMT
            </p>
            <p class="mt-1 text-[13px] text-discret">
              {{ data.formateur?.nom }} · {{ formatDuree(data.session.dureeMinutes) }} · {{ compterPlaces(data.session.places) }} · Zoom
            </p>
            <UiBaseButton
              :to="data.completionProfil < 100 ? undefined : (data.session.inscrit ? `/mon-espace/session/${data.session.id}` : '/mon-espace/sessions')"
              class="mt-3.5 w-full"
              taille="sm"
              :variante="data.completionProfil < 100 ? 'verrouille' : 'social'"
              :disabled="data.completionProfil < 100"
            >
              {{ data.session.inscrit ? 'Rejoindre la session — actif le jour J' : 'Réserver ma place' }}
            </UiBaseButton>
            <p
              v-if="data.completionProfil < 100"
              class="mt-2.5 rounded-[8px] bg-alerte-voile px-3 py-2.5 text-[12px] leading-[1.5] text-alerte"
            >
              Profil apprenant à {{ data.completionProfil }} % — complétez-le à 100 % pour débloquer l’accès.
            </p>
          </template>
          <p v-else class="text-[13.5px] text-discret">Aucune session planifiée pour cette thématique pour l’instant.</p>
        </div>

        <!-- Certificat -->
        <div class="rounded-carte border border-ligne-douce bg-white p-[22px]">
          <p class="mb-2.5 font-title text-[17px] font-light">Certificat de participation</p>
          <p class="mb-3 text-[13px] leading-[1.6] text-texte">
            Débloquée automatiquement quand les {{ compterChapitres(total) }} sont vus à 100 %.
            <template v-if="restants > 0">Il vous reste <b>{{ restants }} chapitre{{ restants > 1 ? 's' : '' }}</b>.</template>
            <template v-else>Tous les chapitres sont vus.</template>
          </p>
          <UiBaseButton
            :to="restants === 0 ? `/mon-espace/certificats?module=${moduleCourant.id}` : undefined"
            class="w-full"
            taille="sm"
            :variante="restants > 0 ? 'verrouille' : 'sombre'"
            :disabled="restants > 0"
          >
            Obtenir mon certificat
          </UiBaseButton>
        </div>

        <!-- Ressources -->
        <div class="rounded-carte border border-ligne-douce bg-white p-[22px]">
          <p class="mb-3 font-title text-[17px] font-light">Ressources du module</p>
          <ul v-if="data.ressources.length" class="flex flex-col gap-2.5">
            <li v-for="r in data.ressources" :key="r.id" class="flex items-center justify-between gap-3 text-[13.5px]">
              <a :href="r.url" target="_blank" rel="noopener" class="flex min-w-0 items-center gap-2 text-encre hover:underline">
                <span aria-hidden="true">{{ /pdf/i.test(r.format) ? '📄' : '🔗' }}</span>
                <span class="truncate">{{ r.titre }}</span>
              </a>
              <span class="shrink-0 text-[12.5px] font-bold text-social uppercase">{{ r.format }}</span>
            </li>
          </ul>
          <p v-else class="text-[13.5px] text-discret">Aucune ressource jointe à ce module.</p>
        </div>
      </aside>
    </div>
  </div>
</template>
