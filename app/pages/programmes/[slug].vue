<script setup lang="ts">
import type { Formateur, Module, ProgrammePublic, Thematique } from '#shared/types'
import { dureeSessionEnHeures, PLACES_SESSION } from '#shared/utils/coaching'
import { compterModules } from '#shared/utils/compteurs'

type ThematiqueGarnie = Thematique & { modules: (Module & { formateur: Formateur | null })[] }

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data } = await useFetch<{ programme: ProgrammePublic; thematiques: ThematiqueGarnie[] }>(
  () => `/api/programmes/${slug.value}`,
)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Programme introuvable', fatal: true })
}

const programme = computed(() => data.value!.programme)
const social = computed(() => programme.value.slug === 'social-media')
const filtre = ref('')

/**
 * Les quatre pilules du hero (planche A, écrans 02 et 02b). Elles annonçaient
 * « 9 modules » et « 10 000 FCFA » en dur : le nombre suit maintenant le
 * catalogue, et le prix les fiches. Le format de la session de coaching, lui,
 * est une règle de la plateforme.
 */
const tousLesModules = computed(() => data.value!.thematiques.flatMap((t) => t.modules))

const reperes = computed(() => {
  const modules = tousLesModules.value
  const prix = [...new Set(modules.map((m) => m.prixFcfa))]
  // Un prix unique s'annonce tel quel ; plusieurs, on annonce le plus bas.
  const prixAffiche = prix.length === 1 ? formatFcfa(prix[0]!, true) : `à partir de ${formatFcfa(Math.min(...prix), true)}`
  return [
    { valeur: compterModules(modules.length), suite: 'disponibles' },
    { valeur: prixAffiche, suite: 'par module' },
    { valeur: 'Accès à vie', suite: 'après l’achat' },
    {
      valeur: 'Coaching collectif',
      suite: `de ${dureeSessionEnHeures()} — ${PLACES_SESSION} places`,
    },
  ]
})

const modulesAffiches = computed(() =>
  data.value!.thematiques
    .filter((t) => !filtre.value || t.id === filtre.value)
    .flatMap((t) => t.modules.map((m) => ({ module: m, thematique: t }))),
)

const faqSocial = [
  {
    question: 'Dans quel ordre suivre les modules ?',
    reponse:
      'Aucun ordre n’est imposé. Vous pouvez commencer par le module qui correspond à votre besoin actuel. Les modules de la thématique « Fondations stratégiques » sont recommandés si vous souhaitez d’abord consolider vos bases.',
  },
  {
    question: 'Faut-il déjà travailler dans le Social Media ?',
    reponse:
      'Le programme s’adresse principalement aux Social Media Managers, Community Managers et professionnels de la communication. Le niveau et les éventuels prérequis sont précisés sur chaque fiche module.',
  },
  {
    question: 'Comment participer aux coachings du programme ?',
    reponse:
      'Les sessions sont organisées par thématique. Leur calendrier est disponible dans votre espace apprenant. Pour participer, vous devrez avoir accès à un module concerné et compléter préalablement votre fiche apprenant.',
  },
  {
    question: 'Puis-je acheter des modules dans les deux programmes ?',
    reponse:
      'Oui. Les modules Social Média et Entrepreneurs achetés sont accessibles depuis le même espace apprenant.',
  },
]

const faqEntrepreneurs = [
  {
    question: 'Faut-il avoir déjà lancé son activité ?',
    reponse:
      'Non. Certains modules s’adressent aux porteurs de projet, tandis que d’autres répondent aux besoins d’entrepreneurs déjà en activité. Le public concerné est précisé sur chaque fiche module.',
  },
  {
    question: 'Dans quel ordre suivre les modules ?',
    reponse:
      'Aucun ordre n’est obligatoire. Vous pouvez choisir directement le module correspondant à votre besoin : valider une idée, fixer vos prix, structurer une offre, vendre ou développer votre visibilité.',
  },
  {
    question: 'Les modules sont-ils adaptés à tous les secteurs ?',
    reponse:
      'Les compétences abordées sont applicables à différentes activités. Chaque fiche module précise néanmoins ses objectifs, ses exemples et ses éventuels prérequis.',
  },
  {
    question: 'Comment participer aux coachings du programme ?',
    reponse:
      'Les sessions sont organisées par thématique et apparaissent dans votre espace apprenant. Pour participer, vous devrez avoir accès à un module concerné et compléter votre fiche apprenant.',
  },
]

const faq = computed(() => (social.value ? faqSocial : faqEntrepreneurs))

usePageSeo({
  titreAuto: `Programme ${programme.value.nom} | E-Masterclass Big Five`,
  descriptionAuto: programme.value.descriptionProgramme,
  seo: programme.value.seo,
})

const mailles = computed(() => [
  { libelle: 'Accueil', chemin: '/' },
  { libelle: programme.value.nom },
])
useFilAriane(mailles)

const config = useRuntimeConfig()

useJsonLd(() => ({
  '@type': 'ItemList',
  name: `Modules du programme ${programme.value.nom}`,
  itemListElement: modulesAffiches.value.map((entree, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: entree.module.titre,
    url: `${config.public.siteUrl}/modules/${entree.module.slug}`,
  })),
}))
</script>

<template>
  <div v-if="data">
    <!-- hero programme : dégradé de la couleur du programme et motif de marque
         en fond (planche A, écrans 02 et 02b) -->
    <section
      class="sur-sombre relative overflow-hidden text-white"
      :class="social ? 'degrade-social' : 'degrade-entrepreneurs'"
    >
      <img
        src="/images/brand/pattern.png"
        alt=""
        aria-hidden="true"
        width="1144"
        height="1090"
        class="pointer-events-none absolute top-0 right-0 hidden h-full w-[340px] object-cover md:block"
        :class="social ? 'opacity-[.28]' : 'opacity-[.24]'"
      >
      <div class="conteneur relative py-12">
        <!-- La maquette teinte le surtitre dans le clair du programme, pas en
             blanc atténué : rose pâle sur le violet, bleuté sur le bleu. -->
        <p class="surtitre" :class="social ? 'text-[#e6c7f0]' : 'text-[#c3c9ef]'">Programme</p>
        <h1 class="mt-3 font-title text-[44px] font-light lg:text-[56px]">
          {{ programme.nom }}
        </h1>
        <p
          class="mt-4 max-w-[760px] text-[17px] leading-[1.65]"
          :class="social ? 'text-[#f0e4f5]' : 'text-[#e3e6f7]'"
        >
          {{ programme.descriptionProgramme }}
        </p>
        <ul class="mt-6.5 flex flex-wrap gap-3.5 text-[14px]">
          <li
            v-for="repere in reperes"
            :key="repere.valeur"
            class="rounded-full bg-white/15 px-4 py-2.25"
          >
            {{ repere.valeur }} {{ repere.suite }}
          </li>
        </ul>
      </div>
    </section>

    <!-- liste des modules -->
    <section class="py-14">
      <div class="conteneur">
        <UiEnTeteSection
          taille-surtitre="page"
          surtitre="Les modules du programme"
          titre="Choisissez la compétence que vous souhaitez renforcer"
          :intro="
            social
              ? 'Parcourez les modules par thématique. Chacun peut être acheté et suivi indépendamment, sans ordre imposé.'
              : 'Parcourez les modules par thématique. Chacun peut être acheté et suivi indépendamment, selon les besoins actuels de votre activité.'
          "
        />

        <div class="mt-7 flex flex-wrap gap-2" role="group" aria-label="Filtrer par thématique">
          <button
            class="rounded-full border px-4.5 py-2.5 text-[14px] font-bold"
            :class="
              !filtre
                ? social
                  ? 'border-social bg-social text-white'
                  : 'border-entrepreneurs bg-entrepreneurs text-white'
                : 'border-ligne text-texte hover:border-discret'
            "
            :aria-pressed="!filtre"
            @click="filtre = ''"
          >
            Tous
          </button>
          <button
            v-for="thematique in data.thematiques"
            :key="thematique.id"
            class="rounded-full border px-4.5 py-2.5 text-[14px] font-bold"
            :class="
              filtre === thematique.id
                ? social
                  ? 'border-social bg-social text-white'
                  : 'border-entrepreneurs bg-entrepreneurs text-white'
                : 'border-ligne text-texte hover:border-discret'
            "
            :aria-pressed="filtre === thematique.id"
            @click="filtre = thematique.id"
          >
            {{ thematique.nom }}
          </button>
        </div>

        <div class="mt-7 grid gap-5.5 sm:grid-cols-2 lg:grid-cols-3">
          <CatalogueModuleCarte
            v-for="entree in modulesAffiches"
            :key="entree.module.id"
            variante="programme"
            :module="entree.module"
            :thematique-nom="entree.thematique.nom"
            statut-visible
          />
        </div>
      </div>
    </section>

    <!-- FAQ du programme : une seule colonne bornée à 900 px, dans le
         prolongement de la liste des modules — la maquette ne lui donne ni
         fond propre, ni filet, ni colonne latérale. Le gabarit en deux
         colonnes est celui de la FAQ d'accueil (écran 01). -->
    <section class="pb-12">
      <div class="conteneur">
        <UiEnTeteSection
          taille-surtitre="page"
          taille="sm"
          surtitre="FAQ du programme"
          :titre="`Vos questions sur le programme ${programme.nom}`"
        />
        <UiAccordeonFaq class="mt-4.5 max-w-[900px]" taille="sm" :questions="faq" />
      </div>
    </section>
  </div>
</template>
