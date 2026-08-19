import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/fonts',
    '@nuxt/image',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@nuxtjs/robots',
    '@nuxtjs/sitemap',
    'nuxt-schema-org',
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://emasterclass.bigfive.ci',
    },
  },

  // Le site est intégralement en français (spec SEO §11).
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#80368D' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'https://emasterclass.bigfive.ci',
    name: 'E-Masterclass Big Five',
    description:
      "Plateforme de formation en ligne de BigFiveAbidjan SARL : programmes Social Média et Entrepreneurs, modules courts et attestations de suivi.",
    defaultLocale: 'fr',
  },

  // Spec SEO §2 : pages non indexables. Le noindex par page est posé en plus
  // via useHead dans les layouts privés — robots.txt n'est pas un substitut.
  robots: {
    disallow: [
      '/connexion',
      '/inscription',
      '/mot-de-passe-oublie',
      '/achat',
      '/mon-espace',
      // Attention : « /formateur » sans barre finale bloquerait aussi /formateurs.
      '/formateur/',
      '/formateur$',
      '/admin',
      '/certificats',
      '/verifier',
    ],
  },

  // Spec SEO §8 : sitemap = uniquement les URL canoniques indexables.
  sitemap: {
    exclude: [
      '/connexion',
      '/inscription',
      '/mot-de-passe-oublie',
      '/achat/**',
      '/mon-espace/**',
      '/formateur/**',
      '/admin/**',
      '/certificats/**',
      '/verifier/**',
    ],
    sources: ['/api/__sitemap__/urls'],
  },

  // Spec SEO §9 : Organization global, le reste est posé page par page.
  schemaOrg: {
    identity: {
      type: 'Organization',
      name: 'E-Masterclass Big Five',
      legalName: 'BigFiveAbidjan SARL',
      url: process.env.NUXT_PUBLIC_SITE_URL || 'https://emasterclass.bigfive.ci',
      logo: '/images/logo.svg',
      sameAs: [],
    },
  },

  fonts: {
    families: [
      { name: 'Jost', provider: 'google', weights: [300, 400, 500, 600] },
      { name: 'Mulish', provider: 'google', weights: [400, 600, 700, 800] },
    ],
  },

  nitro: {
    prerender: { crawlLinks: false },
    // Les runtimes de ces modules doivent être inlinés : laissés externes, le
    // build de production émet des imports relatifs qui sortent du projet.
    externals: {
      inline: ['@nuxtjs/robots', '@nuxtjs/sitemap', '@nuxt/icon', '@nuxt/image', 'nuxt-schema-org'],
    },
  },

  typescript: { strict: true },
})
