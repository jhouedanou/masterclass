<script setup lang="ts">
import type { Formateur } from '#shared/types'

import type { ProgrammeSlug } from '#shared/types'

type FormateurListe = Formateur & {
  nbModules: number
  modules: { id: string; slug: string; titre: string; thematique: string; programme: ProgrammeSlug }[]
}

/** Pilule « Replier ▴ » / « Voir le profil ▾ », identique dans les deux états. */
const BASCULE = 'shrink-0 rounded-full border-[1.5px] border-ligne px-3.5 py-2 text-[12px] font-bold whitespace-nowrap text-texte hover:bg-fond-clair'

const teinte = (programme: ProgrammeSlug) =>
  programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'

const { data: formateurs } = await useFetch<FormateurListe[]>('/api/formateurs')
const visibles = computed(() => (formateurs.value ?? []).filter((f) => f.ficheComplete))

// Le tarif horaire annoncé en tête de page était écrit en dur (50 000 FCFA) :
// il se lit sur les fiches formateurs, seule source du prix.
const tarifCoachingPrive = computed(() => {
  const tarifs = visibles.value.map((f) => f.coachingPriveFcfaHeure).filter(Boolean)
  return tarifs.length ? Math.min(...tarifs) : null
})
const route = useRoute()
/** Carte détaillée au clic ou par ancre (`/formateurs#coury-othniel`), annexe technique de la planche A. */
const depuisAncre = computed(() => visibles.value.find((f) => `#${f.slug}` === route.hash)?.id)
const deplie = ref<string>(depuisAncre.value ?? visibles.value[0]?.id ?? '')
watch(depuisAncre, (id) => id && (deplie.value = id))
watch(deplie, (id) => {
  const f = visibles.value.find((x) => x.id === id)
  if (import.meta.client && f) history.replaceState(history.state, '', `#${f.slug}`)
})

usePageSeo({
  titreAuto: 'Les formateurs | E-Masterclass Big Five',
  descriptionAuto:
    'Découvrez les professionnels qui conçoivent les modules E-Masterclass Big Five et animent les sessions de coaching collectif.',
  chemin: '/formateurs',
})

const mailles = [{ libelle: 'Accueil', chemin: '/' }, { libelle: 'Les formateurs' }]
useFilAriane(mailles)
</script>

<template>
  <div class="conteneur py-10">
    <UiSurtitre ton="discret" taille="section">Les experts E-Masterclass Big Five</UiSurtitre>
    <h1 class="mt-2.5 mb-2.5 font-title text-[36px] font-light">Les formateurs</h1>
    <p class="mb-5 max-w-[640px] text-[15px] leading-relaxed text-texte">
      Découvrez les professionnels qui conçoivent les modules et partagent des méthodes issues
      de leur pratique. Ils prolongent également l’apprentissage lors des sessions de coaching
      collectif. Cliquez sur un formateur pour déplier son profil et ses modules sur la page.
    </p>

    <div class="mb-7 grid gap-3.5 sm:grid-cols-2">
      <div class="rounded-[12px] border border-ligne-douce bg-fond-clair px-4.5 py-4">
        <b class="text-[14px]">Coaching collectif</b>
        <p class="mt-[5px] text-[13px] leading-[1.55] text-texte">Compris avec les modules concernés.</p>
      </div>
      <div class="rounded-[12px] border border-ligne-douce bg-fond-clair px-4.5 py-4">
        <b class="text-[14px]">Coaching privé</b>
        <p class="mt-[5px] text-[13px] leading-[1.55] text-texte">
          Réservé séparément<template v-if="tarifCoachingPrive">, {{ formatFcfa(tarifCoachingPrive) }} par heure</template>.
        </p>
      </div>
    </div>

    <!-- Le formateur déplié occupe la largeur ; les autres tiennent en deux colonnes. -->
    <div class="grid items-start gap-3.5 lg:grid-cols-2">
      <template v-for="formateur in visibles" :key="formateur.id">
        <article
          v-if="deplie === formateur.id"
          class="grid gap-5.5 rounded-carte border border-ligne-douce p-6.5 lg:col-span-2 lg:grid-cols-[96px_1fr_220px] lg:items-start"
        >
          <NuxtImg
            :src="formateur.photo"
            :alt="formateur.photoAlt || `Portrait de ${formateur.nom}`"
            width="96"
            height="96"
            loading="lazy"
            class="size-24 rounded-full bg-fond-voile object-cover"
          />
          <div>
            <div class="mb-1 flex items-start justify-between gap-4">
              <h2 class="font-title text-[23px] font-light">{{ formateur.nom }}</h2>
              <button :class="BASCULE" :aria-expanded="true" @click="deplie = ''">Replier ▴</button>
            </div>
            <p class="mb-2.5 text-[13.5px] font-bold" :class="teinte(formateur.programmePrincipal)">
              {{ formateur.expertise }} · {{ formateur.nbModules }} modules
            </p>
            <p class="mb-3.5 text-[14px] leading-[1.65] text-texte">{{ formateur.bio }}</p>
            <ul class="flex flex-wrap gap-2 text-[12.5px]">
              <li v-for="m in formateur.modules" :key="m.id">
                <NuxtLink
                  :to="`/modules/${m.slug}`"
                  class="inline-block rounded-full border px-3 py-1.5"
                  :class="m.programme === 'social-media' ? 'border-social-pilule text-social' : 'border-entrepreneurs-pilule text-entrepreneurs'"
                >
                  {{ m.titre }}
                </NuxtLink>
              </li>
            </ul>
          </div>
          <div class="rounded-[12px] border border-ligne-claire bg-fond-clair p-4.5">
            <p class="mb-2 text-[12px] font-bold tracking-[0.1em] text-discret uppercase">Coaching privé</p>
            <p class="font-title text-[19px] font-light">
              {{ formatFcfa(formateur.coachingPriveFcfaHeure) }} par heure
            </p>
            <p class="mt-1.5 mb-3.5 text-[12.5px] leading-[1.5] text-discret">
              Un accompagnement individuel, réservé et payé séparément des sessions collectives
              incluses avec les modules.
            </p>
            <UiBaseButton
              v-if="formateur.coachingPriveActif"
              class="w-full"
              variante="sombre"
              taille="sm"
              :to="`/mon-espace/coaching-prive?formateur=${formateur.id}`"
            >
              Réserver un coaching privé
            </UiBaseButton>
            <p v-else class="text-[12.5px] text-discret">
              Ce formateur n’ouvre pas de coaching privé pour le moment.
            </p>
          </div>
        </article>

        <article v-else class="flex items-start gap-3.5 rounded-bloc border border-ligne-douce p-5">
          <NuxtImg
            :src="formateur.photo"
            :alt="formateur.photoAlt || `Portrait de ${formateur.nom}`"
            width="56"
            height="56"
            loading="lazy"
            class="size-14 shrink-0 rounded-full bg-fond-voile object-cover"
          />
          <div class="flex-1">
            <h2 class="font-title text-[17px] font-light">{{ formateur.nom }}</h2>
            <p class="mt-0.5 mb-1.5 text-[12.5px] font-bold" :class="teinte(formateur.programmePrincipal)">
              {{ formateur.expertise }}
            </p>
            <p class="text-[12.5px] text-discret">
              {{ formateur.nbModules }} modules · Coaching privé :
              {{ formatFcfa(formateur.coachingPriveFcfaHeure) }} par heure
            </p>
          </div>
          <button
            :class="[BASCULE, 'self-center']"
            :aria-expanded="false"
            @click="deplie = formateur.id"
          >
            Voir le profil ▾
          </button>
        </article>
      </template>
    </div>
  </div>
</template>
