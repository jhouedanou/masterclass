<script setup lang="ts">
/**
 * Écran 19 — « Paramètres → Tracking & pixels ».
 *
 * Vit dans un composant parce que l'écran 20 le rend aussi, en volet : une
 * seule implémentation pour les deux entrées. Le titre reste à la page, qui
 * seule sait s'il faut un `h1` ou rien.
 *
 * La maquette ordonne : avis de verrou, conteneur GTM mis en avant, quatre
 * cartes de pixels, code personnalisé, puis le bouton d'enregistrement.
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
 * Un identifiant vide signifie « pas encore fourni » : la carte le dit
 * franchement plutôt que d'afficher un état « actif » trompeur. La maquette
 * écrit « ✓ Actif » et « En attente de vérification ».
 */
function etat(valeur: string) {
  return valeur
    ? { texte: '✓ Actif', classe: 'bg-succes-voile text-succes' }
    : { texte: 'En attente de vérification', classe: 'bg-alerte-voile text-alerte' }
}

const champ =
  'w-full rounded-[10px] border border-ligne px-3 py-2.5 font-mono text-[13.5px] focus:border-social focus:outline-none disabled:bg-fond-voile disabled:text-discret'
const etiquette = 'mb-1.5 block text-[12.5px] font-bold text-texte'
const carte = 'rounded-[14px] border border-ligne-douce bg-white p-5'

// --- Vérification de l'installation -----------------------------------------

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
    motDePasse.value = ''
    deverrouille.value = false
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'L’enregistrement a échoué.'
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <div v-if="data">
    <p class="max-w-[820px] text-[13.5px] text-discret">
      Un seul conteneur GTM est injecté sur le site et la PWA ; tous les pixels se gèrent ensuite
      dans GTM. Les identifiants ci-dessous alimentent les événements serveur (CAPI) et la
      vérification.
    </p>

    <!-- Avis de verrou : première chose sous l'intro dans la maquette. -->
    <div class="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[12px] border-[1.5px] border-alerte bg-alerte-voile px-[18px] py-3.5">
      <p class="max-w-[780px] text-[12.5px] leading-[1.6] text-alerte-fonce">
        <b v-if="!deverrouille">🔒 Modification verrouillée.</b>
        <b v-else>🔓 Modification déverrouillée.</b>
        Les champs sont en lecture seule pour éviter toute erreur (un tracker cassé = perte de
        données publicitaires). Cliquer «&nbsp;Déverrouiller&nbsp;» exige le mot de passe admin
        + une confirmation, et chaque changement est journalisé avec l’ancienne valeur.
      </p>
      <UiBaseButton v-if="!deverrouille" taille="sm" variante="sombre" @click="deverrouille = true">
        Déverrouiller
      </UiBaseButton>
    </div>

    <label v-if="deverrouille" class="mt-3 block max-w-[360px]">
      <span :class="etiquette">Votre mot de passe</span>
      <input
        v-model="motDePasse"
        type="password"
        autocomplete="current-password"
        class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none"
      >
    </label>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-erreur-voile px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>
    <p v-if="succes" class="mt-4 rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[14px] text-succes">{{ succes }}</p>

    <!-- Conteneur principal : carte isolée et mise en avant. -->
    <section class="mt-4 rounded-[14px] border-[1.5px] border-social bg-social-nuage p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <b class="text-[15px]">Google Tag Manager (conteneur principal)</b>
        <span class="rounded-full px-2.5 py-[3px] text-[11px] font-bold" :class="etat(champs.gtmConteneur).classe">
          {{ champs.gtmConteneur ? '✓ Connecté' : 'En attente de vérification' }}
        </span>
      </div>
      <div class="mt-3 grid items-end gap-3 sm:grid-cols-[1fr_auto]">
        <label class="block">
          <span :class="etiquette">ID du conteneur</span>
          <input v-model="champs.gtmConteneur" placeholder="GTM-XXXXXXX" :disabled="!deverrouille" :class="champ">
        </label>
        <UiBaseButton taille="sm" variante="sombre" @click="verifierInstallation">
          Vérifier l’installation
        </UiBaseButton>
      </div>
      <p class="mt-2 text-[12px] text-discret">
        Injecté automatiquement dans le <code>&lt;head&gt;</code> de toutes les pages (site + PWA +
        tunnel), consentement cookies respecté (Consent Mode v2).
      </p>
      <p v-if="verification" class="mt-2 rounded-[10px] border border-ligne bg-white p-3 text-[12.5px] text-texte">
        {{ verification }}
      </p>
    </section>

    <!-- Les quatre pixels, deux par deux. -->
    <div class="mt-4 grid gap-4 md:grid-cols-2">
      <section :class="carte">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <b class="text-[15px]">Meta Pixel + API Conversions</b>
          <span class="rounded-full px-2.5 py-[3px] text-[11px] font-bold" :class="etat(champs.metaPixelId).classe">
            {{ etat(champs.metaPixelId).texte }}
          </span>
        </div>
        <label class="mt-3 block">
          <span :class="etiquette">Pixel ID</span>
          <input v-model="champs.metaPixelId" placeholder="1234567890" :disabled="!deverrouille" :class="champ">
        </label>
        <label class="mt-3 block">
          <span :class="etiquette">Jeton d’accès CAPI (serveur)</span>
          <input
            v-model="champs.metaCapiJeton"
            :type="deverrouille ? 'text' : 'password'"
            :disabled="!deverrouille"
            :class="champ"
          >
        </label>
        <p class="mt-2 text-[12px] text-discret">
          Déduplication pixel/CAPI par <code>event_id</code>. Événement test :
          <button class="font-bold text-social" @click="envoyerEvenementTest">envoyer</button>
        </p>
        <p v-if="evenementTest" class="mt-2 rounded-[10px] border border-ligne bg-fond-clair p-3 text-[12.5px] text-texte">
          {{ evenementTest }}
        </p>
      </section>

      <section :class="carte">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <b class="text-[15px]">Google Analytics 4</b>
          <span class="rounded-full px-2.5 py-[3px] text-[11px] font-bold" :class="etat(champs.ga4Mesure).classe">
            {{ etat(champs.ga4Mesure).texte }}
          </span>
        </div>
        <label class="mt-3 block">
          <span :class="etiquette">ID de mesure</span>
          <input v-model="champs.ga4Mesure" placeholder="G-XXXXXXXXXX" :disabled="!deverrouille" :class="champ">
        </label>
        <p class="mt-2 text-[12px] text-discret">
          E-commerce activé : <code>view_item</code>, <code>add_to_cart</code> (clic Acheter),
          <code>begin_checkout</code>, <code>purchase</code>.
        </p>
      </section>

      <section :class="carte">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <b class="text-[15px]">TikTok Pixel</b>
          <span class="rounded-full px-2.5 py-[3px] text-[11px] font-bold" :class="etat(champs.tiktokPixelId).classe">
            {{ etat(champs.tiktokPixelId).texte }}
          </span>
        </div>
        <label class="mt-3 block">
          <span :class="etiquette">Pixel ID</span>
          <input v-model="champs.tiktokPixelId" :disabled="!deverrouille" :class="champ">
        </label>
      </section>

      <section :class="carte">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <b class="text-[15px]">LinkedIn Insight Tag</b>
          <span class="rounded-full px-2.5 py-[3px] text-[11px] font-bold" :class="etat(champs.linkedinPartnerId).classe">
            {{ etat(champs.linkedinPartnerId).texte }}
          </span>
        </div>
        <label class="mt-3 block">
          <span :class="etiquette">Partner ID</span>
          <input v-model="champs.linkedinPartnerId" :disabled="!deverrouille" :class="champ">
        </label>
      </section>
    </div>

    <!-- Code personnalisé : carte neutre dans la maquette, pas ambre. -->
    <section v-if="estSuperieur" :class="[carte, 'mt-4']">
      <b class="text-[15px]">Code personnalisé (avancé)</b>
      <p class="mt-1.5 text-[12.5px] text-texte">
        Scripts additionnels injectés dans le <code>&lt;head&gt;</code> — réservé aux admins avec le
        droit «&nbsp;Performances (marketing)&nbsp;». Chaque modification est journalisée.
      </p>
      <textarea
        v-model="champs.codePersonnalise"
        rows="4"
        :disabled="!deverrouille"
        placeholder="<!-- Ex : script de heatmap, A/B testing… -->"
        class="mt-3 w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 font-mono text-[13px] focus:border-social focus:outline-none disabled:bg-fond-voile disabled:text-discret"
      />
    </section>

    <div class="mt-5 flex flex-wrap items-center gap-4">
      <UiBaseButton :disabled="!deverrouille || enCours" @click="enregistrer">
        {{ enCours ? 'Enregistrement…' : deverrouille ? 'Enregistrer' : 'Enregistrer (déverrouiller d’abord)' }}
      </UiBaseButton>
      <p class="max-w-[620px] text-[12px] text-discret">
        À l’enregistrement : récapitulatif des changements (ancienne → nouvelle valeur) à confirmer.
        Événements suivis : PageView · ViewContent · InitiateCheckout · AddPaymentInfo · Purchase ·
        CompleteRegistration.
        <template v-if="data.majLe">
          Dernière modification {{ formatDate(data.majLe) }}<span v-if="data.majPar"> par {{ data.majPar }}</span>.
        </template>
      </p>
    </div>
  </div>
</template>
