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
    '@vite-pwa/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    // Scelle les cookies de session (chiffrement + signature). 32 caractères
    // minimum ; obligatoire en production, sinon le serveur refuse d'ouvrir
    // une session (voir server/utils/session.ts).
    sessionPassword: process.env.NUXT_SESSION_PASSWORD || '',

    // Envoi des e-mails et messages WhatsApp (codes de vérification, liens
    // d'invitation, suivi du coaching privé). `console` écrit dans la sortie
    // du serveur tant qu'aucun fournisseur n'est retenu (voir
    // server/utils/notifications.ts).
    notificationsDriver: process.env.NOTIFICATIONS_DRIVER || 'console',

    // Code de la double vérification admin : `interne` (table codes_verification
    // + notifier) ou `supabase-auth` (Supabase Auth émet, envoie et vérifie le
    // code avec son SMTP — voir server/utils/codeAdmin.ts).
    codeAdminFournisseur: process.env.CODE_ADMIN_FOURNISSEUR || 'interne',

    // Accès à la base Supabase. La clé secrète (`sb_secret_…`, nouveau système
    // de clés — l'ancienne `service_role` reste acceptée en secours) contourne
    // la sécurité au niveau des lignes : elle reste hors du bloc `public`,
    // donc jamais servie au navigateur (voir server/database/client.ts).
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseSecretKey:
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',

    // Diffusion des vidéos. Le secret scelle les autorisations de lecture ; il
    // est partagé avec le Worker Cloudflare, qui les vérifie. La base pointe
    // sur ce Worker en production, sur la route locale `/medias` en
    // développement (voir server/utils/video.ts).
    videoSigningSecret: process.env.VIDEO_SIGNING_SECRET || '',
    videoBaseUrl: process.env.VIDEO_BASE_URL || '',

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
      '/reinitialiser-mot-de-passe',
      '/achat',
      '/mon-espace',
      // Attention : « /formateur » sans barre finale bloquerait aussi /formateurs.
      '/formateur/',
      '/formateur$',
      '/admin',
      '/certificats',
      '/verifier',
      '/hors-ligne',
    ],
  },

  // Spec SEO §8 : sitemap = uniquement les URL canoniques indexables.
  sitemap: {
    exclude: [
      '/connexion',
      '/inscription',
      '/mot-de-passe-oublie',
      '/reinitialiser-mot-de-passe',
      '/achat/**',
      '/mon-espace/**',
      '/formateur/**',
      '/admin/**',
      '/certificats/**',
      // « /verifier/** » ne couvre pas la page de saisie elle-même.
      '/verifier',
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

  // Spec SEO §11 : la plateforme s'installe comme application. Le contenu et
  // les métadonnées sont identiques au site — la PWA n'est pas une variante.
  pwa: {
    // « Mise à jour disponible » proposée à l'écran (planche B, écran 13)
    // plutôt qu'appliquée en silence — voir app/components/layout/BandeauPwa.vue.
    registerType: 'prompt',
    manifest: {
      name: 'E-Masterclass Big Five',
      short_name: 'E-Masterclass',
      description:
        'Modules de 60 minutes pour les professionnels du Social Media et les entrepreneurs d’Afrique francophone.',
      lang: 'fr',
      dir: 'ltr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#faf9fc',
      theme_color: '#80368D',
      categories: ['education', 'business'],
      icons: [
        { src: '/images/pwa/icone-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/images/pwa/icone-512.png', sizes: '512x512', type: 'image/png' },
        {
          src: '/images/pwa/icone-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      shortcuts: [
        { name: 'Mon espace', url: '/mon-espace' },
        { name: 'Catalogue des modules', url: '/modules' },
      ],
    },
    workbox: {
      // Le catalogue et les pages publiques passent par le réseau d'abord :
      // un contenu périmé serait pire qu'un chargement un peu plus lent. Sans
      // réseau, la navigation retombe sur l'écran hors ligne (planche B, 13).
      // Pas de `navigateFallback` : Workbox l'aurait servi à CHAQUE navigation,
      // réseau ou non (comportement « application monopage »), et tout le site
      // affichait l'écran hors ligne dès que le service worker était installé.
      // L'écran de repli n'est servi que si le réseau échoue (précache ci-dessous).
      navigateFallback: null,
      additionalManifestEntries: [{ url: '/hors-ligne', revision: String(Date.now()) }],
      globPatterns: ['**/*.{js,css,ico,png,svg,webp,woff2}'],
      runtimeCaching: [
        {
          urlPattern: ({ request, url }) =>
            request.mode === 'navigate' &&
            !/^\/(api|admin|mon-espace|achat)/.test(url.pathname),
          handler: 'NetworkOnly',
          options: { precacheFallback: { fallbackURL: '/hors-ligne' } },
        },
        {
          // Les visuels et polices, eux, gagnent à être servis depuis le cache.
          urlPattern: ({ request }) => ['image', 'font', 'style'].includes(request.destination),
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'emc-statiques', expiration: { maxEntries: 120 } },
        },
      ],
    },
    client: { installPrompt: true },
    devOptions: { enabled: false },
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
