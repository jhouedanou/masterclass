<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Paramètres — administration')

/**
 * Écran 20 : quatre volets.
 *
 * Chacun renvoie vers l'écran qui fait réellement le travail plutôt que de le
 * dupliquer — sauf « Mon profil », qui n'a pas d'écran ailleurs. La répartition
 * financière a rejoint les Revenus : ce sont ces pourcentages qui en
 * commandent le calcul, et les lire à côté du résultat évite d'avoir à s'en
 * souvenir.
 */
const auth = useAuthStore()

const { data, refresh } = await useFetch<{
  financiers: {
    fraisPaiementPourcent: number
    partBigFivePourcent: number
    partFormateurPourcent: number
    objectifInscriptionsMensuel: number
    objectifCaMensuel: number
  }
  seo: {
    titreParDefaut: string
    descriptionParDefaut: string
    imageSocialeParDefaut: string
    googleSearchConsole: string
    ga4: string
  }
  role: string
}>('/api/admin/parametres')

const onglet = ref('profil')
const ONGLETS = [
  { cle: 'acces', libelle: 'Administration des accès' },
  { cle: 'tracking', libelle: 'Tracking & pixels 🔒' },
  { cle: 'referencement', libelle: 'Référencement · règles globales 🔒' },
  { cle: 'profil', libelle: 'Mon profil' },
]

const message = ref('')

const { annoncer } = useToasts()
const erreur = ref('')
const enCours = ref(false)

// --- Mon profil -------------------------------------------------------------

const profil = reactive({ prenom: '', nom: '', whatsapp: '' })
watchEffect(() => {
  profil.prenom = auth.utilisateur?.prenom ?? ''
  profil.nom = auth.utilisateur?.nom ?? ''
  profil.whatsapp = auth.utilisateur?.whatsapp ?? ''
})

async function enregistrerProfil() {
  message.value = ''
  erreur.value = ''
  enCours.value = true
  try {
    await $fetch('/api/admin/profil', { method: 'PUT', body: { ...profil } })
    await auth.rafraichir()
    message.value = 'Profil enregistré.'
    annoncer('Profil enregistré.')
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Enregistrement impossible.'
  } finally {
    enCours.value = false
  }
}

const photoEnCours = ref(false)

async function deposerPhoto(fichier: File | null | undefined) {
  if (!fichier) return
  erreur.value = ''
  photoEnCours.value = true
  try {
    const corps = new FormData()
    corps.append('photo', fichier)
    await $fetch('/api/mon-espace/compte/photo', { method: 'POST', body: corps })
    await auth.rafraichir()
    message.value = 'Photo enregistrée.'
    annoncer('Photo enregistrée.')
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Dépôt impossible.'
  } finally {
    photoEnCours.value = false
  }
}

const champ =
  'w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none'
// Carte de contenu de la maquette : filet clair, 14 px de rayon, 24 px de marge
// intérieure sur l'écran Paramètres ; titre en Mulish gras 15 px, dans la carte.
const carte = 'rounded-[14px] border border-ligne-douce bg-white p-6'
const titreCarte = 'font-sans text-[15px] font-bold'
</script>

<template>
  <div v-if="data" class="max-w-[1100px]">
    <h1 class="font-title text-[24px] font-light">Paramètres</h1>

    <UiOnglets v-model="onglet" class="mt-4.5" accent="social" :onglets="ONGLETS" />

    <p v-if="message" class="mt-[22px] rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[14px] text-succes">{{ message }}</p>
    <p v-if="erreur" class="mt-[22px] rounded-[10px] border border-erreur bg-erreur-voile px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>

    <!-- Accès -->
    <section v-if="onglet === 'acces'" :class="[carte, 'mt-[22px]']">
      <h2 :class="titreCarte">Administration des accès</h2>
      <p class="mt-2 text-[13px] leading-relaxed text-texte">
        Trois rôles : administrateur, formateur simple, formateur avec coaching privé. Les comptes
        d’administration se paramètrent section par section — une section non cochée est masquée,
        pas seulement désactivée.
      </p>
      <UiBaseButton to="/admin/acces" taille="sm" variante="contour" class="mt-4">
        Ouvrir l’administration des accès
      </UiBaseButton>
    </section>

    <!-- Tracking -->
    <section v-if="onglet === 'tracking'" :class="[carte, 'mt-[22px]']">
      <h2 :class="titreCarte">Tracking &amp; pixels</h2>
      <p class="mt-2 text-[13px] leading-relaxed text-texte">
        Un seul conteneur Google Tag Manager, chargé sur les pages publiques après acceptation de
        la mesure. La modification exige de ressaisir son mot de passe : un traqueur cassé, ce sont
        des données publicitaires perdues sans que personne ne s’en aperçoive.
      </p>
      <dl class="mt-3.5 flex flex-col gap-2.5 text-[13px]">
        <div class="flex justify-between gap-4">
          <dt class="text-discret">Search Console</dt>
          <dd class="font-bold">{{ data.seo.googleSearchConsole || 'non configurée' }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-discret">Google Analytics 4</dt>
          <dd class="font-bold">{{ data.seo.ga4 || 'non configuré' }}</dd>
        </div>
      </dl>
      <UiBaseButton to="/admin/tracking" taille="sm" variante="contour" class="mt-4">
        Ouvrir Tracking &amp; pixels
      </UiBaseButton>
    </section>

    <!-- Référencement -->
    <section v-if="onglet === 'referencement'" :class="[carte, 'mt-[22px]']">
      <h2 :class="titreCarte">Référencement · règles globales</h2>
      <p class="mt-2 text-[12.5px] text-discret">
        Ces valeurs servent de repli quand une page n’a pas les siennes.
      </p>
      <dl class="mt-3.5 flex flex-col gap-2.5 text-[13px]">
        <div class="flex justify-between gap-4"><dt class="text-discret">Titre par défaut</dt><dd class="font-bold">{{ data.seo.titreParDefaut }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">Description par défaut</dt><dd class="text-right font-bold">{{ data.seo.descriptionParDefaut }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">Image sociale</dt><dd class="font-mono text-[12.5px] font-bold">{{ data.seo.imageSocialeParDefaut }}</dd></div>
      </dl>
      <UiBaseButton to="/admin/referencement" taille="sm" variante="contour" class="mt-4">
        Ouvrir Référencement (SEO)
      </UiBaseButton>
    </section>

    <AdminReferentiels v-if="onglet === 'referencement'" class="mt-5" />

    <!-- Mon profil : deux cartes côte à côte (maquette, écran 20). -->
    <div v-if="onglet === 'profil'" class="mt-[22px] grid items-start gap-5 lg:grid-cols-2">
      <section :class="carte">
        <h2 :class="titreCarte">Mon profil administrateur</h2>

        <div class="my-4 flex flex-wrap items-center gap-3.5">
          <UiAvatar
            :initiales="`${auth.utilisateur?.prenom?.[0] ?? ''}${auth.utilisateur?.nom?.[0] ?? ''}`"
            :photo="auth.utilisateur?.photo"
            taille="grand"
          />
          <label class="cursor-pointer rounded-full border-[1.5px] border-ligne px-4 py-2 text-[12.5px] font-bold text-texte">
            {{ photoEnCours ? 'Envoi…' : 'Changer la photo' }}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="sr-only"
              :disabled="photoEnCours"
              @change="deposerPhoto(($event.target as HTMLInputElement).files?.[0])"
            >
          </label>
        </div>

        <form class="flex flex-col gap-3" @submit.prevent="enregistrerProfil">
          <label class="block">
            <span class="mb-1.5 block text-[12.5px] font-bold">Prénom</span>
            <input v-model="profil.prenom" required :class="champ">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[12.5px] font-bold">Nom</span>
            <input v-model="profil.nom" required :class="champ">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[12.5px] font-bold">Email professionnel</span>
            <input :value="auth.utilisateur?.email" disabled :class="[champ, 'bg-fond-voile text-discret']">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[12.5px] font-bold">Numéro WhatsApp (reçoit les codes de connexion)</span>
            <input v-model="profil.whatsapp" placeholder="+225…" :class="champ">
          </label>
          <UiBaseButton type="submit" taille="sm" variante="sombre" class="self-start" :disabled="enCours">
            {{ enCours ? 'Enregistrement…' : 'Enregistrer le profil' }}
          </UiBaseButton>
          <p class="text-[11.5px] leading-relaxed text-discret">
            L’email identifie le compte : le changer passe par l’administration des accès. Le
            changement de numéro WhatsApp exige une revérification par code — il sert à la double
            vérification.
          </p>
        </form>
      </section>

      <section :class="carte">
        <h2 :class="titreCarte">Changer le mot de passe</h2>
        <CompteFormulaireMotDePasse class="mt-4" />
        <p class="mt-3 text-[11.5px] leading-relaxed text-discret">
          Rôle : {{ auth.estAdminSuperieur ? 'administrateur supérieur' : 'administrateur de contenu' }}.
          Confirmation par code envoyé sur WhatsApp. Toutes les autres sessions sont déconnectées.
          Action journalisée.
        </p>
      </section>
    </div>
  </div>
</template>
