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

/** Les huit titres de section de la fiche partagent la même coiffe (24 px). */
const TITRE_SECTION = 'mb-4 font-title text-[24px] font-light'
/** Pastille d'état du bloc d'achat (planche A, 03c) : statut, jamais action. */
const PASTILLE = 'inline-block rounded-full px-3 py-[5px] text-[11.5px] font-bold'
const CHAMP = 'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-[13px] text-[14px] focus:border-social focus:outline-none'
/** Les deux boutons de partage se partagent la largeur de la carte. */
const PARTAGE = 'flex-1 rounded-full border-[1.5px] py-2.5 text-center'

// La première ligne décrit ce module-ci : durée et nombre de chapitres étaient
// figés à « 60 minutes » et « 3 chapitres » pour toutes les fiches.
const inclus = computed(() => {
  const chapitres = moduleCourant.value.chapitres.filter((c) => c.libelle !== 'Introduction').length
  return [
    `Module vidéo de ${formatDuree(moduleCourant.value.dureeMinutes)} — vidéo d’intro + ${chapitres} chapitres`,
    'Ressources pédagogiques du module',
    'Accès à vie depuis votre espace apprenant',
    'Coaching collectif lié à la thématique, selon le calendrier',
    'Certificat de participation',
    'Accès à la communauté WhatsApp',
  ]
})

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
    <div class="conteneur grid gap-14 pt-12 pb-16 lg:grid-cols-[1fr_400px] lg:items-start">
      <article>
        <FilAriane class="mb-[18px]" :mailles="mailles" />

        <h1 class="mb-4 font-title text-[40px] leading-[1.15] font-light text-pretty">
          {{ moduleCourant.titre }}
        </h1>
        <p class="mb-7 text-[18px] leading-relaxed font-semibold text-encre">
          {{ moduleCourant.promesse }}
        </p>

        <h2 :class="TITRE_SECTION">Pourquoi ce module ?</h2>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="editorial mb-[30px] text-[15.5px] leading-[1.75] text-texte" v-html="rendreTexteRiche(moduleCourant.pourquoi)" />

        <h2 :class="TITRE_SECTION">Pour qui ?</h2>
        <!-- Public et prérequis tiennent dans un seul bloc encre, non dans deux
             cartes claires : c'est le seul aplat sombre de la fiche. -->
        <div class="sur-sombre mb-8 grid gap-8 rounded-carte bg-encre px-[30px] py-[26px] text-white sm:grid-cols-[1.4fr_1fr]">
          <div>
            <p class="mb-3 text-[11px] font-bold tracking-[0.12em] uppercase" :class="social ? 'text-social-pastel' : 'text-[#a9b2e2]'">
              Pour qui
            </p>
            <ul class="flex flex-col gap-2 text-[14px] leading-[1.55] text-ligne-brume">
              <li v-for="ligne in moduleCourant.pourQui" :key="ligne">— {{ ligne }}</li>
            </ul>
          </div>
          <div>
            <p class="mb-3 text-[11px] font-bold tracking-[0.12em] uppercase" :class="social ? 'text-social-pastel' : 'text-[#a9b2e2]'">
              Prérequis
            </p>
            <p class="text-[14px] leading-[1.55] text-ligne-brume">{{ moduleCourant.prerequis }}</p>
          </div>
        </div>

        <h2 :class="TITRE_SECTION">Programme</h2>
        <ol class="mb-8 flex flex-col gap-2.5">
          <li
            v-for="(chapitre, i) in moduleCourant.chapitres"
            :key="i"
            class="flex items-center gap-4 rounded-[12px] border border-ligne-douce px-5 py-[15px]"
          >
            <span
              class="shrink-0 text-[12px] font-bold uppercase"
              :class="social ? 'text-social' : 'text-entrepreneurs'"
            >
              {{ chapitre.libelle === 'Introduction' ? 'Intro' : chapitre.libelle.replace('Chapitre', 'Ch.') }}
            </span>
            <span class="text-[15px] font-semibold text-encre">{{ chapitre.titre }}</span>
          </li>
        </ol>

        <h2 :class="TITRE_SECTION">Acquis</h2>
        <ul
          class="mb-8 flex flex-col gap-2.5 rounded-carte border px-7 py-6 text-[14.5px] leading-[1.55] text-texte"
          :class="social ? 'border-social-bordure-tendre bg-social-nuage' : 'border-entrepreneurs-bordure bg-entrepreneurs-nuage'"
        >
          <li v-for="acquis in moduleCourant.acquis" :key="acquis">
            <b :class="social ? 'text-social' : 'text-entrepreneurs'" aria-hidden="true">✓</b>
            {{ acquis }}
          </li>
        </ul>

        <h2 :class="TITRE_SECTION">Livrable</h2>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="editorial mb-[30px] text-[15.5px] leading-[1.75] text-texte" v-html="rendreTexteRiche(moduleCourant.livrable)" />

        <template v-if="moduleCourant.pointsForts.length">
          <h2 :class="TITRE_SECTION">Points forts</h2>
          <div class="mb-8 rounded-bloc border border-ligne-douce px-6 py-5 text-[14.5px] leading-[1.7] text-texte">
            <p v-for="(point, i) in moduleCourant.pointsForts" :key="point" :class="i > 0 && 'mt-3'">
              {{ point }}
            </p>
          </div>
        </template>

        <template v-if="data.formateur">
          <p class="mb-2 text-[12px] font-bold tracking-[0.14em] text-discret uppercase">Votre formateur</p>
          <h2 :class="TITRE_SECTION">{{ data.formateur.nom }}</h2>
          <div class="mb-8 flex items-start gap-[18px] rounded-bloc border border-ligne-douce p-[22px]">
            <NuxtImg
              :src="data.formateur.photo"
              :alt="data.formateur.photoAlt || `Portrait de ${data.formateur.nom}`"
              width="64"
              height="64"
              loading="lazy"
              class="size-16 shrink-0 rounded-full bg-fond-voile object-cover"
            />
            <div>
              <p class="mb-2 text-[13.5px] font-bold" :class="social ? 'text-social' : 'text-entrepreneurs'">
                {{ data.formateur.expertise }} · Formateur de la thématique {{ data.thematique?.nom }}
              </p>
              <p class="mb-2.5 text-[14.5px] leading-[1.7] text-texte">{{ data.formateur.bio }}</p>
              <p class="mb-3 text-[13.5px] text-discret">
                {{ data.nbModulesThematique }} modules disponibles dans la thématique
                {{ data.thematique?.nom }}
              </p>
              <NuxtLink
                :to="`/formateurs/${data.formateur.slug}`"
                class="text-[13.5px] font-bold"
                :class="social ? 'text-social' : 'text-entrepreneurs'"
              >
                Découvrir le profil du formateur →
              </NuxtLink>
            </div>
          </div>
        </template>

        <h2 class="mb-3.5 font-title text-[24px] font-light">FAQ du module</h2>
        <UiAccordeonFaq taille="sm" :questions="moduleCourant.faq" />
      </article>

      <!-- carte d'achat collante -->
      <aside class="lg:sticky lg:top-6 lg:self-start">
        <div class="rounded-[18px] border border-ligne-tendre p-7 shadow-[0_12px_32px_rgba(23,21,28,.07)]">
          <div
            class="mb-5 flex h-[170px] items-center justify-center overflow-hidden rounded-[12px]"
            :class="social ? 'rayures-visuel-social' : 'rayures-visuel-entrepreneurs'"
          >
            <NuxtImg
              :src="`/images/modules/${moduleCourant.programme}.svg`"
              :alt="`Visuel du module ${moduleCourant.titre}`"
              width="360"
              height="170"
              class="size-full object-cover"
            />
          </div>

          <!-- 5 · Déjà acheté : le prix disparaît, le CTA ouvre l'espace apprenant. -->
          <template v-if="dejaAchete">
            <span :class="[PASTILLE, 'bg-succes-voile text-whatsapp']">✓ Dans votre espace</span>
            <UiBaseButton
              :to="`/mon-espace/module/${moduleCourant.slug}`"
              class="mt-3 w-full"
              variante="sombre"
              taille="lg"
            >
              Reprendre le module
            </UiBaseButton>
          </template>

          <!-- 3 · Bientôt disponible : fiche publiée, vente non ouverte, bouton inactif, prix masquable. -->
          <template v-else-if="bientot">
            <span :class="[PASTILLE, 'bg-alerte-voile text-alerte']">Bientôt disponible</span>
            <p v-if="!moduleCourant.prixMasque" class="mt-3 font-title text-[34px] font-light">
              {{ formatFcfa(moduleCourant.prixFcfa) }}
              <span class="text-[14px] text-discret">TTC</span>
            </p>
            <p class="mt-1.5 text-[13.5px] text-texte">
              Prochainement<template v-if="moduleCourant.dateLancement"> — {{ formatDate(moduleCourant.dateLancement) }}</template>
            </p>
            <!-- Vente non ouverte : bouton inerte, en gris de filet plutôt qu'en contour. -->
            <p class="mt-4 rounded-full bg-ligne-claire py-4 text-center text-[14px] font-extrabold text-discret-clair" aria-disabled="true">
              Prochainement
            </p>
          </template>

          <!-- 4 · Fiche à venir : vente non ouverte, collecte email/WhatsApp pour notification au lancement. -->
          <template v-else-if="!disponible">
            <span :class="[PASTILLE, social ? 'bg-social-voile text-social' : 'bg-entrepreneurs-voile text-entrepreneurs']">
              À venir
            </span>
            <form v-if="alerte.etat !== 'envoye'" class="mt-3 flex flex-col gap-2.5" @submit.prevent="etrePrevenu">
              <input
                v-model="alerte.email"
                type="email"
                required
                placeholder="Votre adresse email"
                aria-label="Adresse email"
                :class="CHAMP"
              >
              <input
                v-model="alerte.whatsapp"
                type="tel"
                placeholder="Numéro WhatsApp (facultatif)"
                aria-label="Numéro WhatsApp"
                :class="CHAMP"
              >
              <p v-if="alerte.etat === 'erreur'" class="text-[13px] text-erreur">{{ alerte.message }}</p>
              <UiBaseButton
                type="submit"
                class="w-full"
                :variante="social ? 'contour-social' : 'contour'"
                taille="lg"
                :disabled="alerte.etat === 'envoi'"
              >
                Être prévenu du lancement
              </UiBaseButton>
            </form>
            <p v-else class="mt-3 rounded-[12px] border border-succes-bordure bg-succes-voile px-4 py-3.5 text-[13px] leading-relaxed text-succes-fonce">
              ✓ Nous vous préviendrons au lancement.
            </p>
          </template>

          <!-- 1 et 2 · Disponible, visiteur ou connecté. -->
          <template v-else>
            <p class="mb-1.5 font-title text-[34px] font-light">
              {{ formatFcfa(moduleCourant.prixFcfa) }}
              <span class="font-sans text-[14px] text-discret">TTC</span>
            </p>
            <p class="mb-[18px] text-[13.5px] text-texte">Paiement unique · Accès à vie</p>

            <UiBaseButton
              class="mb-3 w-full"
              :variante="social ? 'social' : 'entrepreneurs'"
              taille="lg"
              @click="acheter"
            >
              Acheter ce module
            </UiBaseButton>

            <p class="text-center text-[12.5px] text-discret">
              Mobile Money · Djamo · Wave · Visa — via FeexPay
            </p>
          </template>

          <ul class="mt-[18px] flex flex-col gap-[9px] border-t border-ligne-claire pt-4 text-[13.5px] leading-relaxed text-texte">
            <li v-for="ligne in inclus" :key="ligne">
              <span class="text-succes" aria-hidden="true">✓</span> {{ ligne }}
            </li>
          </ul>

          <div class="mt-[18px] flex gap-2.5 text-[13px] font-bold">
            <button :class="[PARTAGE, 'border-ligne text-texte hover:bg-fond-clair']" @click="copierLien">
              {{ lienCopie ? 'Lien copié' : 'Copier le lien' }}
            </button>
            <a
              :href="lienWhatsApp(`${moduleCourant.titre} — ${config.public.siteUrl}/modules/${moduleCourant.slug}`)"
              target="_blank"
              rel="noopener"
              :class="[PARTAGE, 'border-whatsapp text-whatsapp hover:bg-succes-voile']"
            >
              Partager sur WhatsApp
            </a>
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
