<script setup lang="ts">
import type { EtapeDeroule } from '#shared/types'
import { dateLongueLive, dureeLive, heureLive } from '#shared/utils/live'

/**
 * Fiche Live Session (planche 03, CDC §5.2) : titre et promesse du module,
 * date, compte à rebours, prérequis, gains, formateur, déroulé, prix et
 * bouton. Le bouton suit RM3 : « S'inscrire », « Complet » ou « Inscriptions
 * closes ». Aucun lien Zoom, aucun nombre d'inscrits dans la page (RM4, RM13).
 */
interface Fiche {
  redirection: string | null
  session: {
    id: string
    slug: string
    debut: string
    dureeMinutes: number
    statut: string
    prerequis: string[]
    gains: string[]
    deroule: EtapeDeroule[]
    module: {
      id: string
      slug: string
      titre: string
      numero: number
      programme: 'social-media' | 'entrepreneurs'
      promesse: string
      prixFcfa: number
    }
    formateur: { nom: string; slug: string; expertise: string; bio: string; photo?: string; photoAlt?: string } | null
  }
  programme: { slug: string; nom: string; couleur: string } | null
  thematique: string | null
  inscriptionsOuvertes: boolean
  complet: boolean
  closes: boolean
  dejaInscrit: boolean
  paiementEnCours: boolean
}

const route = useRoute()
const auth = useAuthStore()
const achat = useAchatStore()
const { suivre } = useSuivi()

const { data } = await useFetch<Fiche>(() => `/api/live-sessions/${route.params.slug}`)
if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable', fatal: true })
}
if (data.value.redirection) {
  await navigateTo(data.value.redirection, { redirectCode: 302 })
}

const session = computed(() => data.value!.session)
const module = computed(() => session.value.module)
const social = computed(() => module.value.programme === 'social-media')
const initialesFormateur = computed(() =>
  (session.value.formateur?.nom ?? '')
    .split(/\s+/)
    .map((m) => m.charAt(0).toUpperCase())
    .slice(0, 2)
    .join(''),
)

// Compte à rebours (planche 03). Calculé dans le navigateur seulement : le
// rendu serveur afficherait une valeur aussitôt fausse.
const maintenant = ref<number | null>(null)
let minuteur: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  maintenant.value = Date.now()
  minuteur = setInterval(() => (maintenant.value = Date.now()), 1000)
})
onBeforeUnmount(() => clearInterval(minuteur))

const ecart = computed(() =>
  maintenant.value === null ? null : Math.max(0, new Date(session.value.debut).getTime() - maintenant.value),
)
const compteARebours = computed(() => {
  if (ecart.value === null) return null
  const s = Math.floor(ecart.value / 1000)
  return [
    { v: Math.floor(s / 86400), l: 'jours' },
    { v: Math.floor((s % 86400) / 3600), l: 'heures' },
    { v: Math.floor((s % 3600) / 60), l: 'min' },
    { v: s % 60, l: 's' },
  ].map((c) => ({ ...c, v: String(c.v).padStart(2, '0') }))
})
/** Fiche ouverte au moment du début : le bouton se désactive (§11), le serveur refuse aussi. */
const commencee = computed(() => ecart.value === 0)
const ouvertes = computed(() => data.value!.inscriptionsOuvertes && !commencee.value)

const articleSuivi = computed(() => ({
  id: `live-${session.value.slug}`,
  titre: module.value.titre,
  prixFcfa: module.value.prixFcfa,
  categorie: 'Live Session',
}))

onMounted(() => {
  if (data.value?.dejaInscrit) return
  suivre('ViewContent', { articles: [articleSuivi.value], categorieContenu: 'live_session' })
})

function sInscrire() {
  if (!ouvertes.value) return
  suivre('InitiateCheckout', { articles: [articleSuivi.value], categorieContenu: 'live_session' })
  achat.definirLive({
    slug: session.value.slug,
    titre: module.value.titre,
    prixFcfa: module.value.prixFcfa,
    debut: session.value.debut,
    dureeMinutes: session.value.dureeMinutes,
    formateur: session.value.formateur?.nom ?? '',
    programme: data.value!.programme?.nom ?? '',
  })
  // Compte obligatoire (RM10) : création ou connexion, puis retour au récapitulatif.
  navigateTo(auth.estConnecte ? '/achat/recapitulatif' : '/achat/compte')
}

const mailles = computed(() => [
  { libelle: 'Live Sessions', chemin: '/live-sessions' },
  ...(data.value!.programme ? [{ libelle: data.value!.programme.nom, chemin: `/programmes/${data.value!.programme.slug}` }] : []),
  ...(data.value!.thematique ? [{ libelle: data.value!.thematique }] : []),
])
useFilAriane(mailles)

usePageSeo({
  titreAuto: `Live Session · ${module.value.titre} | E-Masterclass Big Five`,
  descriptionAuto: `${dateLongueLive(session.value.debut)} à ${heureLive(session.value.debut)} GMT, en direct avec ${session.value.formateur?.nom ?? 'le formateur'}. ${module.value.promesse}`,
})

const config = useRuntimeConfig()
useJsonLd(() => ({
  '@type': 'Event',
  name: `Live Session · ${module.value.titre}`,
  startDate: session.value.debut,
  endDate: new Date(new Date(session.value.debut).getTime() + session.value.dureeMinutes * 60_000).toISOString(),
  eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  location: { '@type': 'VirtualLocation', url: `${config.public.siteUrl}/live-sessions/${session.value.slug}` },
  description: module.value.promesse,
  offers: {
    '@type': 'Offer',
    price: module.value.prixFcfa,
    priceCurrency: 'XOF',
    availability: data.value!.complet ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    url: `${config.public.siteUrl}/live-sessions/${session.value.slug}`,
  },
  ...(session.value.formateur ? { performer: { '@type': 'Person', name: session.value.formateur.nom } } : {}),
}))
</script>

<template>
  <div v-if="data && !data.redirection">
    <div class="conteneur grid gap-12 pt-10 pb-16 lg:grid-cols-[1fr_380px] lg:items-start">
      <article>
        <FilAriane class="mb-[18px]" :mailles="mailles" />
        <p class="text-[12.5px] font-bold tracking-[0.12em] text-live uppercase">
          Live Session · {{ dateLongueLive(session.debut) }}
        </p>
        <h1 class="mt-2.5 font-title text-[36px] leading-[1.15] font-light text-pretty lg:text-[42px]">
          {{ module.titre }}
        </h1>
        <p class="mt-3.5 max-w-[680px] text-[17px] leading-relaxed text-texte">{{ module.promesse }}</p>

        <div class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
          <ol v-if="compteARebours" class="flex gap-2" aria-label="Temps restant avant le début">
            <li
              v-for="c in compteARebours"
              :key="c.l"
              class="flex w-[62px] flex-col items-center rounded-[10px] bg-encre py-2 text-white"
            >
              <span class="font-title text-[22px] leading-none font-normal tabular-nums">{{ c.v }}</span>
              <span class="mt-1 text-[11px] text-gris-perle">{{ c.l }}</span>
            </li>
          </ol>
          <p class="text-[14.5px] text-texte">
            <b class="text-encre">{{ heureLive(session.debut) }} GMT</b> · {{ dureeLive(session.dureeMinutes) }}
            questions-réponses comprises · en direct sur Zoom, depuis votre espace
          </p>
        </div>

        <div class="mt-10 grid gap-6 md:grid-cols-2">
          <section v-if="session.prerequis.length" class="rounded-[14px] border border-ligne-douce p-6">
            <h2 class="font-title text-[21px] font-light">Prérequis</h2>
            <ul class="mt-3 flex flex-col gap-2 text-[15px] text-texte">
              <li v-for="p in session.prerequis" :key="p" class="flex gap-2.5">
                <span aria-hidden="true" class="text-discret">•</span>{{ p }}
              </li>
            </ul>
          </section>
          <section v-if="session.gains.length" class="rounded-[14px] border border-ligne-douce p-6">
            <h2 class="font-title text-[21px] font-light">Ce que vous allez gagner</h2>
            <ul class="mt-3 flex flex-col gap-2 text-[15px] text-texte">
              <li v-for="g in session.gains" :key="g" class="flex gap-2.5">
                <Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />{{ g }}
              </li>
            </ul>
          </section>
        </div>

        <section v-if="session.formateur" class="mt-6 flex gap-5 rounded-[14px] border border-ligne-douce p-6">
          <UiAvatar :photo="session.formateur.photo" :initiales="initialesFormateur" taille="grand" class="shrink-0" />
          <div>
            <h2 class="text-[12px] font-bold tracking-[0.1em] text-discret uppercase">Votre formateur</h2>
            <p class="mt-1 font-title text-[21px] font-light">{{ session.formateur.nom }}</p>
            <p class="text-[14px] text-texte">{{ session.formateur.expertise }}</p>
            <NuxtLink
              :to="`/formateurs/${session.formateur.slug}`"
              class="mt-2 inline-block text-[14px] font-bold"
              :class="social ? 'text-social' : 'text-entrepreneurs'"
            >
              Voir le profil →
            </NuxtLink>
          </div>
        </section>

        <section v-if="session.deroule.length" class="mt-6 rounded-[14px] border border-ligne-douce p-6">
          <h2 class="font-title text-[21px] font-light">Déroulé</h2>
          <ol class="mt-4 flex flex-col">
            <li
              v-for="etape in session.deroule"
              :key="`${etape.decalageMinutes}-${etape.libelle}`"
              class="flex gap-4 border-b border-ligne-claire py-2.5 text-[15px] last:border-0"
            >
              <span class="w-[60px] shrink-0 font-mono text-[13.5px] text-discret">
                {{ heureLive(new Date(new Date(session.debut).getTime() + etape.decalageMinutes * 60_000).toISOString()) }}
              </span>
              <span :class="etape.questionsReponses ? 'font-bold text-live' : 'text-encre'">
                {{ etape.libelle }}<template v-if="etape.questionsReponses"> · questions-réponses</template>
              </span>
            </li>
          </ol>
          <p class="mt-4 text-[13.5px] text-discret">
            Micros coupés pendant la formation · modérateur présent · questions-réponses aux moments indiqués.
          </p>
        </section>
      </article>

      <aside class="rounded-carte border border-ligne-douce bg-white p-7 lg:sticky lg:top-6">
        <p class="font-title text-[34px] font-light text-encre">
          {{ formatNombre(module.prixFcfa) }} FCFA <span class="text-[16px] text-discret">TTC</span>
        </p>
        <p class="mt-1 text-[14px] text-texte">{{ dateLongueLive(session.debut) }} · {{ heureLive(session.debut) }} GMT</p>

        <UiBaseButton v-if="data.dejaInscrit" to="/mon-espace" class="mt-5 w-full" variante="succes" taille="lg">
          Vous êtes inscrit · mon espace
        </UiBaseButton>
        <p
          v-else-if="data.paiementEnCours"
          class="mt-5 rounded-[12px] border border-alerte-bordure bg-alerte-pale p-3.5 text-[13.5px] text-alerte-fonce"
          role="status"
        >
          Votre paiement est en cours de traitement par l’équipe. Elle revient vers vous rapidement.
        </p>
        <UiBaseButton v-else-if="ouvertes" class="mt-5 w-full" variante="live" taille="lg" @click="sInscrire">
          S’inscrire à la Live Session
        </UiBaseButton>
        <UiBaseButton v-else class="mt-5 w-full" variante="verrouille" taille="lg" disabled>
          {{ data.complet && !commencee ? 'Complet' : 'Inscriptions closes' }}
        </UiBaseButton>
        <p class="mt-2.5 text-center text-[12.5px] text-discret">Mobile Money, Djamo, Wave ou Visa</p>

        <ul class="mt-5 flex flex-col gap-2.5 border-t border-ligne-claire pt-5 text-[14px] text-texte">
          <li class="flex gap-2.5"><Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />Formation en direct · {{ dureeLive(session.dureeMinutes) }}</li>
          <li class="flex gap-2.5"><Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />Questions-réponses avec le formateur</li>
          <li class="flex gap-2.5"><Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />Rappels par e-mail, session ouverte depuis votre espace</li>
          <li class="flex gap-2.5"><Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />Support de cours, si fourni par le formateur</li>
          <li class="flex gap-2.5"><Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />Version vidéo ajoutée dès qu’elle est prête</li>
          <li class="flex gap-2.5"><Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />Accès aux sessions de coaching collectif</li>
        </ul>
        <p class="mt-5 rounded-[12px] bg-fond-clair p-3.5 text-[12.5px] leading-relaxed text-discret">
          La session est enregistrée : l’enregistrement sert à produire la version vidéo du module.
        </p>
      </aside>
    </div>
  </div>
</template>
