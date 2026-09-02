<script setup lang="ts">
import type { Formateur } from '#shared/types'

type FormateurListe = Formateur & {
  nbModules: number
  modules: { id: string; slug: string; titre: string; thematique: string }[]
}

const { data: formateurs } = await useFetch<FormateurListe[]>('/api/formateurs')
const visibles = computed(() => (formateurs.value ?? []).filter((f) => f.ficheComplete))
const deplie = ref<string>(visibles.value[0]?.id ?? '')

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
  <div>
    <section class="rayures-social border-b border-ligne-claire">
      <div class="conteneur py-12">
        <FilAriane :mailles="mailles" class="mb-6" />
        <UiSurtitre ton="social">Les experts E-Masterclass Big Five</UiSurtitre>
        <h1 class="mt-3 text-[46px] font-medium">Les formateurs</h1>
        <p class="mt-4 max-w-[760px] text-[17px] leading-relaxed text-texte">
          Découvrez les professionnels qui conçoivent les modules et partagent des méthodes issues
          de leur pratique. Ils prolongent également l’apprentissage lors des sessions de coaching
          collectif. Cliquez sur un formateur pour déplier son profil et ses modules sur la page.
        </p>

        <div class="mt-7 grid gap-4 sm:grid-cols-2">
          <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
            <p class="font-title text-[19px] font-light">Coaching collectif</p>
            <p class="mt-1 text-[14px] text-texte">Compris avec les modules concernés.</p>
          </div>
          <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
            <p class="font-title text-[19px] font-light">Coaching privé</p>
            <p class="mt-1 text-[14px] text-texte">
              Réservé séparément, {{ formatFcfa(50000) }} par heure.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="py-14">
      <div class="conteneur flex flex-col gap-4">
        <article
          v-for="formateur in visibles"
          :key="formateur.id"
          class="overflow-hidden rounded-carte border border-ligne-douce"
        >
          <div class="flex flex-wrap items-center gap-5 p-6">
            <NuxtImg
              :src="formateur.photo"
              :alt="`Portrait de ${formateur.nom}`"
              width="84"
              height="84"
              loading="lazy"
              class="size-21 rounded-full bg-fond-voile object-cover"
            />
            <div class="min-w-[220px] flex-1">
              <h2 class="font-title text-[24px] font-light">{{ formateur.nom }}</h2>
              <p class="mt-1 text-[14px] text-texte">
                {{ formateur.expertise }} · {{ formateur.nbModules }} modules
              </p>
              <p class="mt-1 text-[13px] text-discret">
                Coaching privé : {{ formatFcfa(formateur.coachingPriveFcfaHeure) }} par heure
              </p>
            </div>
            <button
              class="rounded-full border border-ligne px-5 py-2.5 text-[14px] font-bold"
              :aria-expanded="deplie === formateur.id"
              @click="deplie = deplie === formateur.id ? '' : formateur.id"
            >
              {{ deplie === formateur.id ? 'Replier ▴' : 'Voir le profil ▾' }}
            </button>
          </div>

          <div v-if="deplie === formateur.id" class="border-t border-ligne-claire bg-fond-clair p-6">
            <p class="max-w-[760px] text-[15px] leading-relaxed text-texte">{{ formateur.bio }}</p>

            <ul class="mt-5 flex flex-wrap gap-2">
              <li v-for="m in formateur.modules" :key="m.id">
                <NuxtLink
                  :to="`/modules/${m.slug}`"
                  class="inline-block rounded-full border border-ligne bg-white px-4 py-2 text-[13.5px] text-encre hover:border-discret"
                >
                  {{ m.titre }}
                </NuxtLink>
              </li>
            </ul>

            <div class="mt-6 rounded-[14px] border border-ligne-douce bg-white p-5">
              <p class="font-title text-[19px] font-light">Coaching privé</p>
              <p class="mt-1 text-[15px] font-bold text-encre">
                {{ formatFcfa(formateur.coachingPriveFcfaHeure) }} par heure
              </p>
              <p class="mt-2 max-w-[620px] text-[14px] leading-relaxed text-texte">
                Un accompagnement individuel, réservé et payé séparément des sessions collectives
                incluses avec les modules.
              </p>
              <UiBaseButton
                v-if="formateur.coachingPriveActif"
                class="mt-4"
                variante="sombre"
                taille="sm"
                :to="`/mon-espace/coaching-prive?formateur=${formateur.id}`"
              >
                Réserver un coaching privé
              </UiBaseButton>
              <p v-else class="mt-3 text-[13px] text-discret">
                Ce formateur n’ouvre pas de coaching privé pour le moment.
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="border-t border-ligne-claire bg-fond-clair py-14">
      <div class="conteneur">
        <!-- Carte « Devenir formateur », bandeau au motif de marque (planche A, écran 06). -->
        <div class="mx-auto max-w-[500px] rounded-[8px] border border-ligne bg-white p-10">
          <img
            src="/images/brand/pattern.png"
            alt=""
            aria-hidden="true"
            class="mb-[22px] h-[72px] w-full rounded-[12px] object-cover"
          >
          <p class="surtitre text-social">Rejoindre E-Masterclass Big Five</p>
          <h2 class="mt-2 font-title text-[27px] font-light">Vous voulez transmettre votre expertise ?</h2>
          <p class="mt-3 text-[15px] leading-relaxed text-texte">
            Proposez un module pratique et partagez votre expérience avec nos apprenants.
          </p>
          <UiBaseButton to="/devenir-formateur" class="mt-6" variante="sombre">
            Devenir formateur
          </UiBaseButton>
        </div>
      </div>
    </section>
  </div>
</template>
