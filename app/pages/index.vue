<script setup lang="ts">
import type { Article, Formateur, Module, Programme, Thematique } from '#shared/types'

type ThematiqueGarnie = Thematique & { modules: (Module & { formateur: Formateur | null })[] }

const { data: programmes } = await useFetch<Programme[]>('/api/programmes')
const { data: formateurs } = await useFetch<(Formateur & { nbModules: number })[]>('/api/formateurs')
const { data: articles } = await useFetch<Article[]>('/api/articles')

const selection = ref<'social-media' | 'entrepreneurs'>('social-media')
const { data: programmeSelectionne } = await useFetch<{
  programme: Programme
  thematiques: ThematiqueGarnie[]
}>(() => `/api/programmes/${selection.value}`)

const faq = [
  {
    question: 'Puis-je acheter un seul module ?',
    reponse:
      'Oui. Chaque module est indépendant et peut être acheté séparément selon vos besoins.',
  },
  {
    question: 'Combien coûte un module et comment payer ?',
    reponse:
      'Chaque module coûte 10 000 FCFA TTC. Le paiement s’effectue via FeexPay avec les moyens proposés sur la plateforme.',
  },
  {
    question: 'Combien de temps puis-je accéder à mon module ?',
    reponse: 'L’achat donne un accès à vie au module depuis votre espace apprenant.',
  },
  {
    question: 'Comment participer aux sessions de coaching collectif ?',
    reponse:
      'Le calendrier est disponible dans l’espace apprenant. Avant de rejoindre une session, l’apprenant doit compléter sa fiche afin de fournir au formateur les informations utiles sur son profil et son projet.',
  },
  {
    question: 'Est-ce qu’un certificat est délivré ?',
    reponse: 'Un certificat de participation est mis à disposition après la réalisation du module.',
  },
  {
    question: 'Puis-je suivre les modules depuis mon téléphone ?',
    reponse:
      'Oui. La plateforme est responsive et accessible sur mobile. Elle peut également être installée comme une PWA.',
  },
]

usePageSeo({
  titreAuto: 'E-Masterclass Big Five — Montez en compétences',
  descriptionAuto:
    'Des modules de 60 minutes pour les professionnels du Social Media et les entrepreneurs d’Afrique francophone. 10 000 FCFA TTC par module, accès à vie et coaching collectif.',
  chemin: '/',
})

useJsonLd({
  '@type': 'FAQPage',
  mainEntity: faq.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.reponse },
  })),
})
</script>

<template>
  <div>
    <HomeHeroCarousel v-if="programmes?.length" :programmes="programmes" />

    <!-- bandeau sous le hero -->
    <div class="border-b border-ligne-claire bg-fond-clair">
      <div class="conteneur flex flex-wrap gap-x-7 gap-y-2 py-4.5 text-[14px] text-texte">
        <span><b class="text-encre">18 modules</b> disponibles</span>
        <span><b class="text-encre">10 000 FCFA TTC</b> par module</span>
        <span><b class="text-encre">Accès à vie</b> après l’achat</span>
      </div>
    </div>

    <!-- programmes -->
    <section class="border-t border-ligne-claire bg-fond-clair py-14">
      <div class="conteneur">
        <UiEnTeteSection
          surtitre="Nos programmes"
          titre="Deux programmes pour renforcer les compétences qui font la différence"
          intro="Choisissez votre univers, puis le module qui répond à votre besoin du moment."
        />

        <div class="mt-8 grid gap-7 lg:grid-cols-2">
          <article
            v-for="programme in programmes"
            :key="programme.id"
            class="rounded-carte border border-ligne-douce bg-white p-8.5"
            :style="{ borderTop: `5px solid ${programme.couleur}` }"
          >
            <h3
              class="font-title text-[27px] font-light"
              :style="{ color: programme.couleur }"
            >
              {{ programme.nom }}
            </h3>
            <p class="mt-2 mb-4.5 text-[15px] leading-relaxed text-texte">
              {{ programme.descriptionCarte }}
            </p>
            <p class="mb-5.5 flex flex-wrap gap-5 text-[14px] text-texte">
              <span><b class="text-encre">9 modules</b></span>
              <span><b class="text-encre">3 thématiques</b></span>
              <span><b class="text-encre">Sessions</b> de coaching collectif</span>
            </p>
            <UiBaseButton
              :to="`/programmes/${programme.slug}`"
              :variante="programme.slug === 'social-media' ? 'social' : 'entrepreneurs'"
            >
              Découvrir le programme {{ programme.nom }}
            </UiBaseButton>
          </article>
        </div>
      </div>
    </section>

    <!-- thématiques -->
    <section class="py-14">
      <div class="conteneur">
        <UiSurtitre>Les thématiques</UiSurtitre>
        <div class="flex flex-wrap items-end justify-between gap-6">
          <h2 class="mt-2.5 max-w-[720px] text-[34px] font-light">
            Explorez les thématiques de chaque programme
          </h2>
          <div
            class="flex gap-2 rounded-full bg-fond-voile p-1.5 text-[14px] font-bold"
            role="group"
            aria-label="Choisir un programme"
          >
            <button
              v-for="option in [
                { valeur: 'social-media', libelle: 'Social Média', actif: 'bg-social text-white' },
                { valeur: 'entrepreneurs', libelle: 'Entrepreneurs', actif: 'bg-entrepreneurs text-white' },
              ]"
              :key="option.valeur"
              class="rounded-full px-5.5 py-2.5"
              :class="selection === option.valeur ? option.actif : 'text-texte'"
              :aria-pressed="selection === option.valeur"
              @click="selection = option.valeur as typeof selection"
            >
              {{ option.libelle }}
            </button>
          </div>
        </div>

        <p class="mt-2.5 mb-7 max-w-[760px] text-[15px] leading-relaxed text-texte">
          Sélectionnez un programme, puis explorez les modules disponibles dans chaque thématique.
          Chaque module peut être choisi et acheté indépendamment.
        </p>

        <HomeAccordeonThematiques
          v-if="programmeSelectionne"
          :thematiques="programmeSelectionne.thematiques"
          :couleur="selection === 'social-media' ? 'social' : 'entrepreneurs'"
        />
      </div>
    </section>

    <!-- formateurs -->
    <section class="bg-encre py-14 text-white">
      <div class="conteneur">
        <UiEnTeteSection
          surtitre="Nos formateurs"
          titre="Des professionnels de terrain pour transmettre ce qu’ils pratiquent"
          intro="Chaque module est conçu et animé par un professionnel expérimenté, qui prolonge l’apprentissage lors des sessions de coaching collectif."
          ton="clair"
          clair
        />
        <div class="mt-8 grid gap-5.5 sm:grid-cols-2 lg:grid-cols-4">
          <CatalogueFormateurCarteSombre
            v-for="formateur in (formateurs ?? []).slice(0, 4)"
            :key="formateur.id"
            :formateur="formateur"
          />
        </div>
        <UiBaseButton to="/formateurs" variante="blanc" class="mt-6.5">
          Découvrir tous les formateurs
        </UiBaseButton>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-14">
      <div class="conteneur grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <UiEnTeteSection
            surtitre="Questions fréquentes"
            titre="Avant de commencer, voici l’essentiel"
            intro="Retrouvez les réponses aux principales questions concernant l’achat, l’accès aux modules et les sessions de coaching."
          />
          <div class="mt-5.5 rounded-[14px] border border-ligne-douce bg-fond-clair px-5.5 py-5">
            <p class="mb-3.5 text-[14.5px] leading-relaxed text-texte">
              Vous avez une autre question ? Contactez directement notre équipe sur WhatsApp.
            </p>
            <UiBaseButton
              :href="lienWhatsApp('Bonjour, j’ai une question sur E-Masterclass Big Five.')"
              variante="whatsapp"
            >
              <Icon name="ph:whatsapp-logo-fill" size="20" />
              Discuter sur WhatsApp
            </UiBaseButton>
          </div>
        </div>

        <UiAccordeonFaq :questions="faq" />
      </div>
    </section>

    <!-- blog -->
    <section class="border-t border-ligne-claire bg-fond-clair py-14">
      <div class="conteneur">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <UiEnTeteSection
            surtitre="Ressources et conseils"
            titre="Derniers articles du blog"
          />
          <UiBaseButton to="/blog" variante="contour" taille="sm">Tous les articles</UiBaseButton>
        </div>
        <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <CatalogueArticleCarte
            v-for="article in (articles ?? []).slice(0, 3)"
            :key="article.id"
            :article="article"
          />
        </div>
      </div>
    </section>
  </div>
</template>
