<script setup lang="ts">
import type { Acces, Formateur, Module, Programme, SessionCoaching, Thematique } from '#shared/types'

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
    <h1 class="mt-2 text-[30px] font-light">{{ moduleCourant.titre }}</h1>

    <div class="mt-3 flex items-center gap-3">
      <div class="h-1.5 w-full max-w-[320px] rounded-full bg-fond-voile">
        <div class="h-full rounded-full bg-social" :style="{ width: `${(data.chapitresVus / Math.max(total, 1)) * 100}%` }" />
      </div>
      <span class="shrink-0 text-[13.5px] font-bold text-encre">{{ data.chapitresVus }} / {{ total }} chapitres vus</span>
    </div>

    <div class="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <!-- Vidéo de bienvenue — ne compte pas dans la progression -->
        <NuxtLink
          :to="`/mon-espace/lecture/${moduleCourant.slug}?chapitre=0`"
          class="relative grid aspect-16/9 w-full place-items-center overflow-hidden rounded-carte bg-encre text-[#8f8a9c] transition hover:text-white"
        >
          <img src="/images/brand/pattern.png" alt="" aria-hidden="true" class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.18]">
          <span class="relative text-center">
            <Icon name="ph:play-circle" size="56" />
            <span class="mt-3 block px-6 text-[14px] text-white">Vidéo de bienvenue — {{ data.formateur?.nom }}</span>
            <span class="mt-1 block text-[12px]">Ne compte pas dans la progression</span>
          </span>
          <span class="pointer-events-none absolute top-4 right-4 rounded bg-black/40 px-2 py-1 text-[11px] text-white/70" aria-hidden="true">
            {{ auth.utilisateur?.prenom }} {{ auth.utilisateur?.nom }} · {{ auth.utilisateur?.email }}
          </span>
        </NuxtLink>

        <!-- Chapitres avec état -->
        <ol class="mt-6 divide-y divide-ligne-claire overflow-hidden rounded-[14px] border border-ligne-douce bg-white">
          <li v-for="c in data.chapitres" :key="c.position" class="flex flex-wrap items-center gap-4 px-5 py-4">
            <span
              class="grid size-10 shrink-0 place-items-center rounded-full text-[12px] font-bold"
              :class="c.etat === 'vu' ? 'bg-succes-voile text-succes' : c.etat === 'en-cours' ? 'bg-social-voile text-social' : 'bg-fond-voile text-discret'"
            >
              {{ c.etat === 'vu' ? '✓' : c.etat === 'en-cours' ? `${c.pourcentage}%` : c.position + 1 }}
            </span>
            <span class="min-w-[200px] flex-1">
              <span class="block text-[15px] text-encre">{{ c.libelle }} — {{ c.titre }}</span>
              <span class="block text-[12.5px] text-discret">
                <template v-if="c.etat === 'vu'">Vu à 100 %</template>
                <template v-else-if="c.etat === 'en-cours'">En cours — reprise à {{ horloge(c.repriseSecondes) }}</template>
                <template v-else>À voir · {{ horloge(c.dureeSecondes) }}</template>
              </span>
            </span>
            <UiBaseButton
              :to="`/mon-espace/lecture/${moduleCourant.slug}?chapitre=${c.position}${c.repriseSecondes ? `&reprise=${c.repriseSecondes}` : ''}`"
              taille="sm"
              :variante="c.etat === 'vu' ? 'contour' : 'social'"
            >
              {{ c.etat === 'vu' ? 'Revoir' : c.etat === 'en-cours' ? 'Reprendre' : 'Commencer' }}
            </UiBaseButton>
          </li>
        </ol>
      </div>

      <aside class="flex flex-col gap-4">
        <!-- Coaching session du module -->
        <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <p class="font-title text-[18px] font-light">Coaching session du module</p>
          <template v-if="data.session">
            <p class="mt-2 text-[14px] font-bold text-encre">
              {{ LIBELLE_SESSION(data.session.date) }} · {{ data.session.heure }} GMT
            </p>
            <p class="mt-1 text-[13px] text-discret">
              {{ data.formateur?.nom }} · {{ formatDuree(data.session.dureeMinutes) }} · {{ data.session.places }} places · Zoom
            </p>
            <UiBaseButton
              :to="data.session.inscrit ? `/mon-espace/session/${data.session.id}` : '/mon-espace/sessions'"
              class="mt-4 w-full"
              taille="sm"
              :disabled="data.completionProfil < 100"
            >
              {{ data.session.inscrit ? 'Rejoindre la session — actif le jour J' : 'Réserver ma place' }}
            </UiBaseButton>
            <p v-if="data.completionProfil < 100" class="mt-2 text-[12.5px] text-alerte">
              Profil apprenant à {{ data.completionProfil }} % — complétez-le à 100 % pour débloquer l’accès.
            </p>
          </template>
          <p v-else class="mt-2 text-[13.5px] text-discret">Aucune session planifiée pour cette thématique pour l’instant.</p>
        </div>

        <!-- Certificat -->
        <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <p class="font-title text-[18px] font-light">Certificat de participation</p>
          <p class="mt-2 text-[13.5px] text-texte">
            Débloquée automatiquement quand les {{ total }} chapitres sont vus à 100 %.
            <template v-if="restants > 0">Il vous reste <b>{{ restants }} chapitre{{ restants > 1 ? 's' : '' }}</b>.</template>
            <template v-else>Tous les chapitres sont vus.</template>
          </p>
          <UiBaseButton
            :to="restants === 0 ? `/mon-espace/certificats?module=${moduleCourant.id}` : undefined"
            class="mt-4 w-full"
            taille="sm"
            variante="sombre"
            :disabled="restants > 0"
          >
            Obtenir mon certificat
          </UiBaseButton>
        </div>

        <!-- Ressources -->
        <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <p class="font-title text-[18px] font-light">Ressources du module</p>
          <ul v-if="data.ressources.length" class="mt-3 space-y-2">
            <li v-for="r in data.ressources" :key="r.id" class="flex items-center justify-between gap-3 text-[13.5px]">
              <a :href="r.url" target="_blank" rel="noopener" class="flex min-w-0 items-center gap-2 text-encre hover:underline">
                <span aria-hidden="true">{{ /pdf/i.test(r.format) ? '📄' : '🔗' }}</span>
                <span class="truncate">{{ r.titre }}</span>
              </a>
              <span class="shrink-0 rounded-full bg-fond-voile px-2 py-0.5 text-[11px] font-bold text-discret uppercase">{{ r.format }}</span>
            </li>
          </ul>
          <p v-else class="mt-3 text-[13.5px] text-discret">Aucune ressource jointe à ce module.</p>
        </div>
      </aside>
    </div>
  </div>
</template>
