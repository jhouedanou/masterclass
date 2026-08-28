<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Tracking & pixels')

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

interface Carte {
  cle: keyof typeof champs
  titre: string
  libelle: string
  exemple: string
  note: string
  secret?: boolean
}

const CARTES: Carte[] = [
  { cle: 'gtmConteneur', titre: 'Google Tag Manager', libelle: 'ID du conteneur', exemple: 'GTM-XXXXXXX',
    note: 'Injecté dans le <head> de toutes les pages, consentement cookies respecté.' },
  { cle: 'ga4Mesure', titre: 'Google Analytics 4', libelle: 'ID de mesure', exemple: 'G-XXXXXXXXXX',
    note: 'E-commerce : vue de module, ajout au panier, début de commande, achat.' },
  { cle: 'metaPixelId', titre: 'Meta Pixel', libelle: 'Pixel ID', exemple: '1234567890',
    note: 'Déduplication pixel / API Conversions par identifiant d’événement.' },
  { cle: 'metaCapiJeton', titre: 'Meta — API Conversions', libelle: 'Jeton d’accès serveur', exemple: '', secret: true,
    note: 'Envoi serveur des conversions, plus fiable que le pixel seul.' },
  { cle: 'tiktokPixelId', titre: 'TikTok Pixel', libelle: 'Pixel ID', exemple: '', note: '' },
  { cle: 'linkedinPartnerId', titre: 'LinkedIn Insight', libelle: 'Partner ID', exemple: '', note: '' },
]

/** Un identifiant vide signifie « pas encore fourni » : la carte le dit
 *  franchement plutôt que d'afficher un état « connecté » trompeur. */
function etat(valeur: string) {
  return valeur
    ? { texte: 'Renseigné', classe: 'bg-succes-voile text-succes' }
    : { texte: 'En attente', classe: 'bg-alerte-voile text-alerte' }
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
    <h1 class="font-title text-[26px] font-light">Tracking &amp; pixels</h1>
    <p class="mt-2 max-w-[720px] text-[13.5px] text-discret">
      Un seul conteneur Google Tag Manager est injecté sur le site et la PWA ; tous les pixels se
      gèrent ensuite dans GTM. Les identifiants ci-dessous alimentent les événements serveur et la
      vérification de propriété.
    </p>

    <!-- Verrou -->
    <div
      class="mt-6 rounded-[14px] border p-5"
      :class="deverrouille ? 'border-social bg-social-voile' : 'border-ligne-douce bg-white'"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-start gap-3">
          <Icon :name="deverrouille ? 'ph:lock-open' : 'ph:lock-simple'" size="22" class="mt-0.5 text-encre" />
          <div>
            <p class="text-[14px] font-bold text-encre">
              {{ deverrouille ? 'Modification déverrouillée' : 'Modification verrouillée' }}
            </p>
            <p class="mt-1 max-w-[600px] text-[13px] text-texte">
              Les champs sont en lecture seule pour éviter toute erreur : un traqueur cassé, ce sont
              des données publicitaires perdues sans que personne ne s’en aperçoive. Déverrouiller
              exige votre mot de passe, et chaque changement est journalisé avec son ancienne valeur.
            </p>
          </div>
        </div>
        <UiBaseButton
          v-if="!deverrouille"
          taille="sm"
          variante="contour"
          @click="deverrouille = true"
        >
          Déverrouiller
        </UiBaseButton>
      </div>

      <label v-if="deverrouille" class="mt-4 block max-w-[360px]">
        <span class="mb-1.5 block text-[13px] font-bold">Votre mot de passe</span>
        <input
          v-model="motDePasse"
          type="password"
          autocomplete="current-password"
          class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none"
        >
      </label>
    </div>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-[#fdeeee] px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>
    <p v-if="succes" class="mt-4 rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[14px] text-succes">{{ succes }}</p>

    <!-- Cartes -->
    <div class="mt-6 grid gap-4 lg:grid-cols-2">
      <section
        v-for="bloc in CARTES"
        :key="bloc.cle"
        class="rounded-[14px] border border-ligne-douce bg-white p-5"
      >
        <div class="flex items-start justify-between gap-3">
          <h2 class="font-title text-[17px] font-light">{{ bloc.titre }}</h2>
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
            :class="etat(champs[bloc.cle]).classe"
          >
            {{ etat(champs[bloc.cle]).texte }}
          </span>
        </div>
        <label class="mt-3 block">
          <span class="mb-1.5 block text-[12.5px] font-bold text-texte">{{ bloc.libelle }}</span>
          <input
            v-model="champs[bloc.cle]"
            :type="bloc.secret && !deverrouille ? 'password' : 'text'"
            :placeholder="bloc.exemple"
            :disabled="!deverrouille"
            class="w-full rounded-[10px] border border-ligne px-3 py-2.5 font-mono text-[13.5px] focus:border-social focus:outline-none disabled:bg-fond-voile disabled:text-discret"
          >
        </label>
        <p v-if="bloc.note" class="mt-2 text-[12px] text-discret">{{ bloc.note }}</p>
      </section>
    </div>

    <!-- Code personnalisé -->
    <section
      v-if="estSuperieur"
      class="mt-4 rounded-[14px] border border-alerte bg-alerte-voile p-5"
    >
      <h2 class="font-title text-[17px] font-light">Code personnalisé</h2>
      <p class="mt-1 text-[12.5px] text-texte">
        Scripts additionnels injectés dans le <code>&lt;head&gt;</code>. Réservé aux administrateurs
        supérieurs — une erreur ici casse toutes les pages du site.
      </p>
      <textarea
        v-model="champs.codePersonnalise"
        rows="4"
        :disabled="!deverrouille"
        class="mt-3 w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 font-mono text-[13px] focus:border-social focus:outline-none disabled:bg-fond-voile disabled:text-discret"
      />
    </section>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <UiBaseButton :disabled="!deverrouille || enCours" @click="enregistrer">
        {{ enCours ? 'Enregistrement…' : 'Enregistrer les réglages' }}
      </UiBaseButton>
      <p class="text-[12.5px] text-discret">
        Dernière modification {{ formatDate(data.majLe) }}<span v-if="data.majPar"> par {{ data.majPar }}</span>.
      </p>
    </div>
  </div>
</template>
