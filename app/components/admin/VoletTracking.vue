<script setup lang="ts">
/**
 * Écran 19 — « Tracking & pixels ».
 *
 * Vit dans un composant parce que l'écran 20 (Paramètres) le rend aussi, en
 * volet : une seule implémentation pour les deux entrées. Le titre reste à la
 * page, qui seule sait s'il faut un `h1` ou rien.
 */

interface Reglages {
  gtmConteneur: string
  metaPixelId: string
  metaCapiJeton: string
  ga4Mesure: string
  tiktokPixelId: string
  linkedinPartnerId: string
  codePersonnalise: string
  verrouille: boolean
  majLe: string
  majPar: string | null
  role: string
}

const { data, refresh } = await useFetch<Reglages>('/api/admin/tracking')

const estSuperieur = computed(() => data.value?.role === 'admin-superieur')

// L'écran est en lecture seule tant qu'on n'a pas ressaisi son mot de passe :
// un traqueur cassé, ce sont des données publicitaires perdues sans que
// personne ne s'en aperçoive.
const deverrouille = ref(false)
const motDePasse = ref('')
const erreur = ref('')
const { annoncer } = useToasts()
const succes = ref('')
const enCours = ref(false)

const champs = reactive({
  gtmConteneur: '',
  metaPixelId: '',
  metaCapiJeton: '',
  ga4Mesure: '',
  tiktokPixelId: '',
  linkedinPartnerId: '',
  codePersonnalise: '',
})

watchEffect(() => {
  if (!data.value) return
  Object.assign(champs, {
    gtmConteneur: data.value.gtmConteneur,
    metaPixelId: data.value.metaPixelId,
    metaCapiJeton: data.value.metaCapiJeton,
    ga4Mesure: data.value.ga4Mesure,
    tiktokPixelId: data.value.tiktokPixelId,
    linkedinPartnerId: data.value.linkedinPartnerId,
    codePersonnalise: data.value.codePersonnalise,
  })
})

/**
 * La maquette (écran 19) regroupe le pixel Meta et son API Conversions dans une
 * seule carte — ce sont deux identifiants du même outil — et sort le conteneur
 * GTM en tête, encadré de violet : c'est lui qui porte tous les autres.
 */
interface ChampPixel {
  cle: keyof typeof champs
  libelle: string
  exemple?: string
  secret?: boolean
}
interface CartePixel {
  titre: string
  champs: ChampPixel[]
  note?: string
  /** Seule la carte Meta porte le lien « Événement test : envoyer ». */
  testEvenement?: boolean
}

const CARTES: CartePixel[] = [
  {
    titre: 'Meta Pixel + API Conversions',
    champs: [
      { cle: 'metaPixelId', libelle: 'Pixel ID', exemple: '1234567890' },
      { cle: 'metaCapiJeton', libelle: 'Jeton d’accès CAPI (serveur)', secret: true },
    ],
    note: 'Déduplication pixel / CAPI par identifiant d’événement.',
    testEvenement: true,
  },
  {
    titre: 'Google Analytics 4',
    champs: [{ cle: 'ga4Mesure', libelle: 'ID de mesure', exemple: 'G-XXXXXXXXXX' }],
    note: 'E-commerce activé : vue de module, ajout au panier, début de commande, achat.',
  },
  { titre: 'TikTok Pixel', champs: [{ cle: 'tiktokPixelId', libelle: 'Pixel ID' }] },
  { titre: 'LinkedIn Insight Tag', champs: [{ cle: 'linkedinPartnerId', libelle: 'Partner ID' }] },
]

/** Un identifiant vide signifie « pas encore fourni » : la carte le dit
 *  franchement plutôt que d'afficher un état « connecté » trompeur. */
function etat(valeur: string) {
  return valeur
    ? { texte: '✓ Actif', classe: 'bg-succes-voile text-succes' }
    : { texte: 'En attente de vérification', classe: 'bg-alerte-voile text-alerte' }
}

// --- Vérification de l'installation (écran 19) ------------------------------

/**
 * Le conteneur est-il réellement là ?
 *
 * On ne peut pas le savoir depuis le back-office : les pages privées ne sont
 * pas mesurées, et le conteneur ne s'y charge donc jamais. On ouvre la page
 * publique et on regarde si le script est présent — c'est ce que ferait
 * l'assistant de prévisualisation de Google, en plus simple.
 */
const verification = ref('')
const evenementTest = ref('')

async function verifierInstallation() {
  verification.value = 'Vérification en cours…'
  try {
    const page = await $fetch<string>('/', { responseType: 'text' })
    const idPresent = champs.gtmConteneur && page.includes(champs.gtmConteneur)
    // Le conteneur est chargé par un script client, après consentement : il
    // n'apparaît pas dans le HTML rendu par le serveur. On le dit plutôt que
    // de conclure à une panne.
    verification.value = idPresent
      ? 'Conteneur trouvé dans la page publique.'
      : champs.gtmConteneur
        ? 'Le conteneur n’apparaît pas dans le HTML servi — c’est attendu : il se charge côté navigateur, après acceptation des cookies. Ouvrez la page publique en navigation privée, acceptez la mesure, puis vérifiez dans l’aperçu de Google Tag Manager.'
        : 'Aucun identifiant de conteneur renseigné : rien n’est injecté.'
  } catch {
    verification.value = 'La page publique n’a pas répondu.'
  }
}

/** Un événement de contrôle poussé dans la couche de données, pour voir
 *  arriver quelque chose dans l'aperçu de Google Tag Manager. */
function envoyerEvenementTest() {
  const w = window as unknown as { dataLayer?: unknown[] }
  w.dataLayer = w.dataLayer ?? []
  w.dataLayer.push({ event: 'emc_test', origine: 'back-office', horodatage: new Date().toISOString() })
  evenementTest.value =
    'Événement « emc_test » poussé dans la couche de données de cet onglet. Il n’arrivera chez Google que si le conteneur y est chargé — ce qui n’est pas le cas des pages d’administration, volontairement.'
}

async function enregistrer() {
  erreur.value = ''
  succes.value = ''
  enCours.value = true
  try {
    const corps: Record<string, unknown> = { motDePasse: motDePasse.value, ...champs }
    if (!estSuperieur.value) delete corps.codePersonnalise

    await $fetch('/api/admin/tracking', { method: 'PUT', body: corps })
    succes.value = 'Réglages enregistrés. Chaque changement est inscrit au journal.'
    annoncer('Réglages enregistrés. Chaque changement est inscrit au journal.')
    motDePasse.value = ''
    deverrouille.value = false
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'L’enregistrement a échoué.'
  } finally {
    enCours.value = false
  }
}

// Écran de réglages : titre de page en Jost 300 à 23 px, titres de carte en
// Mulish gras — 15 px pour le conteneur GTM, 14 px pour les cartes de pixel.
const carte = 'rounded-[14px] border border-ligne-douce bg-white p-[18px]'
const titrePixel = 'font-sans text-[14px] font-bold'
const pastille = 'shrink-0 rounded-full px-2.5 py-[3px] text-[10.5px] font-bold'
/** État d'une carte : son premier identifiant fait foi. */
const etatCarte = (bloc: CartePixel) => etat(champs[bloc.champs[0]?.cle ?? 'gtmConteneur'])
const champPixel =
  'w-full rounded-[9px] border-[1.5px] border-ligne px-3 py-2.5 font-mono text-[13px] focus:border-social focus:outline-none disabled:bg-fond-voile disabled:text-discret'
</script>

<template>
  <div v-if="data" class="max-w-[1100px]">
    <p class="text-[13.5px] text-discret">
      Un seul conteneur GTM est injecté sur le site et la PWA ; tous les pixels se gèrent ensuite
      dans GTM. Les identifiants ci-dessous alimentent les événements serveur (CAPI) et la
      vérification. Le conteneur ne se charge qu’après acceptation de la mesure, et jamais sur
      l’administration, l’espace apprenant ni le tunnel d’achat.
    </p>

    <!-- Verrou : bandeau d'alerte pleine largeur, action à droite (maquette). -->
    <div class="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[12px] border-[1.5px] border-alerte bg-alerte-voile px-[18px] py-3.5">
      <span class="text-[12.5px] leading-relaxed text-alerte-fonce">
        <b>🔒 {{ deverrouille ? 'Modification déverrouillée.' : 'Modification verrouillée.' }}</b>
        Les champs sont en lecture seule pour éviter toute erreur (un tracker cassé = perte de
        données publicitaires). Déverrouiller exige le mot de passe admin, et chaque changement est
        journalisé avec l’ancienne valeur.
      </span>
      <UiBaseButton v-if="!deverrouille" taille="sm" variante="sombre" @click="deverrouille = true">
        Déverrouiller
      </UiBaseButton>
      <label v-else class="w-full max-w-[360px]">
        <span class="mb-1.5 block text-[12.5px] font-bold text-alerte-fonce">Votre mot de passe</span>
        <input
          v-model="motDePasse"
          type="password"
          autocomplete="current-password"
          class="w-full rounded-[10px] border-[1.5px] border-ligne bg-white px-3 py-2.5 text-[14px] focus:border-social focus:outline-none"
        >
      </label>
    </div>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-erreur-voile px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>
    <p v-if="succes" class="mt-4 rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[14px] text-succes">{{ succes }}</p>

    <!-- Conteneur principal : la maquette l'encadre de violet, il porte tout. -->
    <section class="mt-4 rounded-[14px] border-[1.5px] border-social bg-social-nuage p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-sans text-[15px] font-bold">Google Tag Manager (conteneur principal)</h2>
        <span :class="[pastille, etat(champs.gtmConteneur).classe]">{{ etat(champs.gtmConteneur).texte }}</span>
      </div>
      <div class="mt-3 flex flex-wrap items-end gap-3">
        <label class="min-w-[240px] flex-1">
          <span class="mb-1.5 block text-[12.5px] font-bold">ID du conteneur</span>
          <input
            v-model="champs.gtmConteneur"
            placeholder="GTM-XXXXXXX"
            :disabled="!deverrouille"
            class="w-full rounded-[10px] border-[1.5px] border-ligne bg-white px-3.5 py-3 font-mono text-[14px] focus:border-social focus:outline-none disabled:bg-fond-voile disabled:text-discret"
          >
        </label>
        <UiBaseButton taille="sm" variante="sombre" @click="verifierInstallation">
          Vérifier l’installation
        </UiBaseButton>
      </div>
      <p class="mt-2.5 text-[12px] text-discret">
        Injecté automatiquement dans le <code>&lt;head&gt;</code> de toutes les pages publiques
        (site + PWA + tunnel), consentement cookies respecté (Consent Mode v2).
      </p>
      <p v-if="verification" class="mt-2.5 rounded-[10px] border border-ligne bg-white px-3.5 py-3 text-[12.5px] text-texte">
        {{ verification }}
      </p>
    </section>

    <div class="mt-4 grid gap-[14px] lg:grid-cols-2">
      <section v-for="bloc in CARTES" :key="bloc.titre" :class="carte">
        <div class="flex flex-wrap items-center justify-between gap-2.5">
          <h2 :class="titrePixel">{{ bloc.titre }}</h2>
          <span :class="[pastille, etatCarte(bloc).classe]">{{ etatCarte(bloc).texte }}</span>
        </div>
        <label v-for="c in bloc.champs" :key="c.cle" class="mt-2.5 block">
          <span class="mb-1.5 block text-[12px] font-bold">{{ c.libelle }}</span>
          <input
            v-model="champs[c.cle]"
            :type="c.secret && !deverrouille ? 'password' : 'text'"
            :placeholder="c.exemple"
            :disabled="!deverrouille"
            :class="champPixel"
          >
        </label>
        <p v-if="bloc.note || bloc.testEvenement" class="mt-2 text-[11.5px] text-discret">
          {{ bloc.note }}
          <template v-if="bloc.testEvenement">
            Événement test :
            <button class="font-bold text-inherit hover:underline" @click="envoyerEvenementTest">envoyer</button>
          </template>
        </p>
        <p v-if="bloc.testEvenement && evenementTest" class="mt-2 rounded-[9px] border border-ligne bg-fond-clair px-3 py-2.5 text-[11.5px] text-texte">
          {{ evenementTest }}
        </p>
      </section>
    </div>

    <section v-if="estSuperieur" class="mt-4" :class="carte">
      <h2 :class="titrePixel">Code personnalisé (avancé)</h2>
      <p class="mt-1 mb-2.5 text-[12px] text-discret">
        Scripts additionnels injectés dans le <code>&lt;head&gt;</code> — réservé aux admins avec le
        droit « Performances (marketing) ». Chaque modification est journalisée.
      </p>
      <textarea
        v-model="champs.codePersonnalise"
        rows="3"
        :disabled="!deverrouille"
        placeholder="<!-- Ex : script de heatmap, A/B testing… -->"
        class="min-h-[72px] w-full rounded-[10px] border-[1.5px] border-ligne bg-white px-3.5 py-3 font-mono text-[12.5px] text-texte focus:border-social focus:outline-none disabled:bg-fond-voile disabled:text-discret"
      />
    </section>

    <div class="mt-5 flex flex-wrap items-center gap-3">
      <UiBaseButton variante="sombre" :disabled="!deverrouille || enCours" @click="enregistrer">
        <template v-if="enCours">Enregistrement…</template>
        <template v-else-if="deverrouille">Enregistrer</template>
        <template v-else>Enregistrer (déverrouiller d’abord)</template>
      </UiBaseButton>
      <p class="max-w-[620px] text-[12.5px] text-discret">
        À l’enregistrement, chaque changement est inscrit au journal avec son ancienne valeur.
        Événements suivis : PageView · ViewContent · InitiateCheckout · AddPaymentInfo · Purchase ·
        CompleteRegistration. Dernière modification {{ formatDate(data.majLe) }}<span v-if="data.majPar"> par {{ data.majPar }}</span>.
      </p>
    </div>
  </div>
</template>
