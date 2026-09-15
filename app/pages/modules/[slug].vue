<script setup lang="ts">
import { rendreTexteRiche } from '#shared/utils/texteRiche'
import type { Formateur, Module, Programme, Thematique } from '#shared/types'

const route = useRoute()
const config = useRuntimeConfig()
const achat = useAchatStore()

const { data } = await useFetch<{
  module: Module
  formateur: Formateur | null
  thematique: Thematique | null
  programme: Programme | null
  nbModulesThematique: number
  similaires: Module[]
}>(() => `/api/modules/${route.params.slug}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Module introuvable', fatal: true })
}

const moduleCourant = computed(() => data.value!.module)
const social = computed(() => moduleCourant.value.programme === 'social-media')
const disponible = computed(() => moduleCourant.value.statut === 'disponible')
/** 3 · Bientôt disponible : fiche publiée, vente non ouverte, bouton inactif. */
const bientot = computed(() => moduleCourant.value.statut === 'annonce')

// 4 · Fiche à venir : « Être prévenu du lancement » collecte email/WhatsApp.
const alerte = reactive({ email: '', whatsapp: '', etat: 'saisie' as 'saisie' | 'envoi' | 'envoye' | 'erreur', message: '' })
async function etrePrevenu() {
  alerte.etat = 'envoi'
  alerte.message = ''
  try {
    await $fetch('/api/alertes-lancement', {
      method: 'POST',
      body: { slug: moduleCourant.value.slug, email: alerte.email, whatsapp: alerte.whatsapp },
    })
    alerte.etat = 'envoye'
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    alerte.etat = 'erreur'
    alerte.message = r.data?.statusMessage ?? r.statusMessage ?? 'Envoi impossible, réessayez.'
  }
}

// États du bloc d'achat : visiteur, connecté, à venir, déjà acheté.
const { data: possession } = await useFetch<{ possede: boolean }>('/api/mon-espace/possede', {
  query: computed(() => ({ moduleId: moduleCourant.value.id })),
})
const dejaAchete = computed(() => possession.value?.possede === true)

const inclus = [
  'Module vidéo de 60 minutes — vidéo d’intro + 3 chapitres',
  'Ressources pédagogiques du module',
  'Accès à vie depuis votre espace apprenant',
  'Coaching collectif lié à la thématique, selon le calendrier',
  'Certificat de participation',
  'Accès à la communauté WhatsApp',
]

usePageSeo({
  // Gabarit automatique du Title module (spec SEO §4).
  titreAuto: `${moduleCourant.value.titre} | E-Masterclass Big Five`,
  descriptionAuto: moduleCourant.value.promesse,
  seo: moduleCourant.value.seo,
})

const mailles = computed(() => [
  { libelle: data.value!.programme?.nom ?? '', chemin: `/programmes/${moduleCourant.value.programme}` },
  { libelle: data.value!.thematique?.nom ?? '' },
  { libelle: `Module ${numeroModule(moduleCourant.value.numero)}` },
])
useFilAriane(mailles)

useJsonLd(() => ({
  '@type': 'Course',
  name: moduleCourant.value.titre,
  description: moduleCourant.value.promesse,
  url: `${config.public.siteUrl}/modules/${moduleCourant.value.slug}`,
  provider: {
    '@type': 'Organization',
    name: 'E-Masterclass Big Five',
    legalName: 'BigFiveAbidjan SARL',
  },
  ...(data.value?.formateur
    ? { instructor: { '@type': 'Person', name: data.value.formateur.nom } }
    : {}),
  hasCourseInstance: {
    '@type': 'CourseInstance',
    courseMode: 'online',
    courseWorkload: `PT${moduleCourant.value.dureeMinutes}M`,
  },
  offers: {
    '@type': 'Offer',
    price: moduleCourant.value.prixFcfa,
    priceCurrency: 'XOF',
    availability: disponible.value ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
  },
}))

const lienCopie = ref(false)
async function copierLien() {
  await navigator.clipboard.writeText(`${config.public.siteUrl}/modules/${moduleCourant.value.slug}`)
  lienCopie.value = true
  setTimeout(() => (lienCopie.value = false), 2500)
}

const auth = useAuthStore()

function acheter() {
  achat.definir({
    id: moduleCourant.value.id,
    slug: moduleCourant.value.slug,
    titre: moduleCourant.value.titre,
    prixFcfa: moduleCourant.value.prixFcfa,
    programme: data.value!.programme?.nom ?? '',
    thematique: data.value!.thematique?.nom ?? '',
    formateur: data.value!.formateur?.nom ?? '',
    dureeMinutes: moduleCourant.value.dureeMinutes,
  })
  // Un compte existant saute l'étape de création et va au récapitulatif.
  navigateTo(auth.estConnecte ? '/achat/recapitulatif' : '/achat/compte')
}
</script>

<template>
  <div v-if="data">
    <div class="conteneur pt-6">
      <FilAriane :mailles="mailles" />
    </div>

    <div class="conteneur grid gap-12 pt-6 pb-14 lg:grid-cols-[1fr_360px]">
      <article>
        <h1 class="text-[38px] leading-[1.12] font-medium lg:text-[44px]">
          {{ moduleCourant.titre }}
        </h1>
        <p class="mt-4 max-w-[720px] text-[17px] leading-relaxed text-texte">
          {{ moduleCourant.promesse }}
        </p>

        <section class="mt-10">
          <h2 class="font-title text-[27px] font-light">Pourquoi ce module ?</h2>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="editorial mt-3 text-[15.5px] leading-relaxed text-texte" v-html="rendreTexteRiche(moduleCourant.pourquoi)" />
        </section>

        <section class="mt-10 grid gap-6 sm:grid-cols-2">
          <div class="rounded-[14px] border border-ligne-tendre p-6">
            <h2 class="font-title text-[21px] font-light">Pour qui ?</h2>
            <ul class="mt-3 space-y-2">
              <li
                v-for="ligne in moduleCourant.pourQui"
                :key="ligne"
                class="text-[14.5px] leading-relaxed text-texte"
              >
                — {{ ligne }}
              </li>
            </ul>
          </div>
          <div class="rounded-[14px] border border-ligne-tendre p-6">
            <h2 class="font-title text-[21px] font-light">Prérequis</h2>
            <p class="mt-3 text-[14.5px] leading-relaxed text-texte">{{ moduleCourant.prerequis }}</p>
          </div>
        </section>

        <section class="mt-10">
          <h2 class="font-title text-[27px] font-light">Programme</h2>
          <ol class="mt-4 divide-y divide-ligne-claire overflow-hidden rounded-[14px] border border-ligne-tendre">
            <li
              v-for="(chapitre, i) in moduleCourant.chapitres"
              :key="i"
              class="flex items-center gap-4 px-6 py-4"
            >
              <span
                class="w-16 shrink-0 text-[12px] font-bold tracking-[0.1em] uppercase"
                :class="social ? 'text-social' : 'text-entrepreneurs'"
              >
                {{ chapitre.libelle === 'Introduction' ? 'Intro' : chapitre.libelle.replace('Chapitre', 'Ch.') }}
              </span>
              <span class="text-[15px] text-encre">{{ chapitre.titre }}</span>
            </li>
          </ol>
        </section>

        <section class="mt-10">
          <h2 class="font-title text-[27px] font-light">Acquis</h2>
          <ul class="mt-3 space-y-2">
            <li
              v-for="acquis in moduleCourant.acquis"
              :key="acquis"
              class="flex gap-2 text-[15px] leading-relaxed text-texte"
            >
              <span class="text-succes" aria-hidden="true">✓</span>
              {{ acquis }}
            </li>
          </ul>
        </section>

        <section class="mt-10">
          <h2 class="font-title text-[27px] font-light">Livrable</h2>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="editorial mt-3 text-[15.5px] leading-relaxed text-texte" v-html="rendreTexteRiche(moduleCourant.livrable)" />
        </section>

        <section v-if="moduleCourant.pointsForts.length" class="mt-10">
          <h2 class="font-title text-[27px] font-light">Points forts</h2>
          <p
            v-for="point in moduleCourant.pointsForts"
            :key="point"
            class="mt-3 text-[15.5px] leading-relaxed text-texte"
          >
            {{ point }}
          </p>
        </section>

        <section v-if="data.formateur" class="mt-10 rounded-[14px] border border-ligne-tendre p-6">
          <p class="surtitre" :class="social ? 'text-social' : 'text-entrepreneurs'">Votre formateur</p>
          <h2 class="mt-2 font-title text-[27px] font-light">{{ data.formateur.nom }}</h2>
          <div class="mt-4 flex flex-wrap items-start gap-5">
            <NuxtImg
              :src="data.formateur.photo"
              :alt="`Portrait de ${data.formateur.nom}`"
              width="96"
              height="96"
              class="size-24 rounded-full bg-fond-voile object-cover"
            />
            <div class="min-w-[240px] flex-1">
              <p class="text-[14px] font-bold" :class="social ? 'text-social' : 'text-entrepreneurs'">
                {{ data.formateur.expertise }} · Formateur de la thématique {{ data.thematique?.nom }}
              </p>
              <p class="mt-2 text-[14.5px] leading-relaxed text-texte">{{ data.formateur.bio }}</p>
              <p class="mt-3 text-[13px] text-discret">
                {{ data.nbModulesThematique }} modules disponibles dans la thématique
                {{ data.thematique?.nom }}
              </p>
              <NuxtLink
                :to="`/formateurs/${data.formateur.slug}`"
                class="mt-3 inline-block text-[14px] font-bold"
                :class="social ? 'text-social' : 'text-entrepreneurs'"
              >
                Découvrir le profil du formateur →
              </NuxtLink>
            </div>
          </div>
        </section>

        <section class="mt-10">
          <h2 class="font-title text-[27px] font-light">FAQ du module</h2>
          <UiAccordeonFaq class="mt-4" :questions="moduleCourant.faq" />
        </section>
      </article>

      <!-- carte d'achat sticky -->
      <aside class="lg:sticky lg:top-24 lg:self-start">
        <div class="overflow-hidden rounded-carte border border-ligne-douce">
          <div
            class="flex h-40 items-center justify-center"
            :class="social ? 'rayures-visuel-social' : 'rayures-visuel-entrepreneurs'"
          >
            <NuxtImg
              :src="`/images/modules/${moduleCourant.programme}.svg`"
              :alt="`Visuel du module ${moduleCourant.titre}`"
              width="360"
              height="160"
              class="size-full object-cover"
            />
          </div>

          <div class="p-6">
            <!-- 5 · Déjà acheté : le prix disparaît, le CTA ouvre l'espace apprenant. -->
            <template v-if="dejaAchete">
              <p class="font-title text-[24px] font-light text-succes">✓ Dans votre espace</p>
              <UiBaseButton
                :to="`/mon-espace/module/${moduleCourant.slug}`"
                class="mt-5 w-full"
                variante="sombre"
                taille="lg"
              >
                Reprendre le module
              </UiBaseButton>
            </template>

            <!-- 3 · Bientôt disponible : fiche publiée, vente non ouverte, bouton inactif, prix masquable. -->
            <template v-else-if="bientot">
              <span class="inline-block rounded-full bg-alerte-voile px-3 py-1 text-[12px] font-bold tracking-[0.08em] text-alerte uppercase">
                Bientôt disponible
              </span>
              <p v-if="!moduleCourant.prixMasque" class="mt-3 font-title text-[32px] font-light">
                {{ formatFcfa(moduleCourant.prixFcfa) }}
                <span class="text-[15px] text-discret">TTC</span>
              </p>
              <p class="mt-1 text-[13px] text-discret">
                Prochainement<template v-if="moduleCourant.dateLancement"> — {{ formatDate(moduleCourant.dateLancement) }}</template>
              </p>
              <UiBaseButton class="mt-5 w-full" variante="contour" taille="lg" disabled aria-disabled="true">
                Bientôt disponible
              </UiBaseButton>
            </template>

            <!-- 4 · Fiche à venir : vente non ouverte, collecte email/WhatsApp pour notification au lancement. -->
            <template v-else-if="!disponible">
              <p class="font-title text-[24px] font-light text-alerte">À venir</p>
              <p class="mt-1 text-[13px] text-discret">Fiche publiée, vente non ouverte.</p>
              <form v-if="alerte.etat !== 'envoye'" class="mt-5 space-y-2.5" @submit.prevent="etrePrevenu">
                <input
                  v-model="alerte.email"
                  type="email"
                  required
                  placeholder="Votre adresse email"
                  aria-label="Adresse email"
                  class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[14.5px] focus:border-social focus:outline-none"
                >
                <input
                  v-model="alerte.whatsapp"
                  type="tel"
                  placeholder="Numéro WhatsApp (facultatif)"
                  aria-label="Numéro WhatsApp"
                  class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[14.5px] focus:border-social focus:outline-none"
                >
                <p v-if="alerte.etat === 'erreur'" class="text-[13px] text-erreur">{{ alerte.message }}</p>
                <UiBaseButton type="submit" class="w-full" variante="contour" taille="lg" :disabled="alerte.etat === 'envoi'">
                  Être prévenu du lancement
                </UiBaseButton>
              </form>
              <p v-else class="mt-5 rounded-[10px] border border-succes bg-succes-voile p-3 text-[14px] text-succes">
                ✓ Nous vous préviendrons au lancement.
              </p>
            </template>

            <!-- 1 et 2 · Disponible, visiteur ou connecté. -->
            <template v-else>
              <p class="font-title text-[32px] font-light">
                {{ formatFcfa(moduleCourant.prixFcfa) }}
                <span class="text-[15px] text-discret">TTC</span>
              </p>
              <p class="mt-1 text-[13px] text-discret">Paiement unique · Accès à vie</p>

              <UiBaseButton
                class="mt-5 w-full"
                :variante="social ? 'social' : 'entrepreneurs'"
                taille="lg"
                @click="acheter"
              >
                Acheter ce module
              </UiBaseButton>

              <p class="mt-3 text-center text-[12.5px] text-discret">
                Mobile Money · Djamo · Wave · Visa — via FeexPay
              </p>
            </template>

            <ul class="mt-5 space-y-2 border-t border-ligne-claire pt-5">
              <li
                v-for="ligne in inclus"
                :key="ligne"
                class="flex gap-2 text-[13.5px] leading-relaxed text-texte"
              >
                <span class="text-succes" aria-hidden="true">✓</span>
                {{ ligne }}
              </li>
            </ul>

            <div class="mt-5 flex flex-wrap gap-2 border-t border-ligne-claire pt-4 text-[13px]">
              <button class="rounded-full border border-ligne px-4 py-2 hover:bg-fond-clair" @click="copierLien">
                {{ lienCopie ? 'Lien copié' : 'Copier le lien' }}
              </button>
              <a
                :href="lienWhatsApp(`${moduleCourant.titre} — ${config.public.siteUrl}/modules/${moduleCourant.slug}`)"
                target="_blank"
                rel="noopener"
                class="rounded-full border border-ligne px-4 py-2 text-encre hover:bg-fond-clair"
              >
                Partager sur WhatsApp
              </a>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Mobile (planche A, écran 07) : barre d'achat collante en bas de l'écran. -->
    <div
      v-if="disponible && !dejaAchete"
      class="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-ligne-claire bg-white px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden"
    >
      <p class="font-title text-[22px] font-light">
        {{ formatFcfa(moduleCourant.prixFcfa) }} <span class="text-[13px] text-discret">TTC</span>
      </p>
      <UiBaseButton :variante="social ? 'social' : 'entrepreneurs'" @click="acheter">Acheter ce module</UiBaseButton>
    </div>
    <div v-if="disponible && !dejaAchete" class="h-20 lg:hidden" aria-hidden="true" />
  </div>
</template>
