<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Paramètres — administration')

/**
 * Écran 20 : quatre volets.
 *
 * Les trois premiers rendent l'écran qui fait le travail, ils ne s'y contentent
 * plus de renvoyer — c'est ce que montre la maquette, et c'est aussi ce qui
 * rend « Administration des accès » et « Tracking & pixels » atteignables
 * depuis que la barre latérale ne les liste plus au premier niveau.
 *
 * Les renvois d'écran de la maquette («&nbsp;écrans 07 · 07b&nbsp;») sont des
 * annotations de planche, destinées au lecteur de la maquette : ils ne
 * figurent pas dans l'interface.
 */
const auth = useAuthStore()

const { data } = await useFetch<{
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
  { cle: 'attestations', libelle: 'Attestations' },
  { cle: 'profil', libelle: 'Mon profil' },
]

const message = ref('')

const { annoncer } = useToasts()
const erreur = ref('')
const enCours = ref(false)

// --- Mon profil administrateur ----------------------------------------------

/**
 * La maquette n'affiche qu'un champ « Nom complet ». Le modèle, lui, sépare
 * prénom et nom : le premier mot devient le prénom, le reste le nom, et un
 * nom vide reste vide plutôt que de recopier le prénom.
 */
const profil = reactive({ nomComplet: '', email: '', whatsapp: '' })
watchEffect(() => {
  const u = auth.utilisateur
  profil.nomComplet = [u?.prenom, u?.nom].filter(Boolean).join(' ')
  profil.email = u?.email ?? ''
  profil.whatsapp = u?.whatsapp ?? ''
})

const emailModifie = computed(() => profil.email.trim().toLowerCase() !== (auth.utilisateur?.email ?? ''))
const motDePasseEmail = ref('')

async function enregistrerProfil() {
  message.value = ''
  erreur.value = ''
  enCours.value = true
  try {
    // L'e-mail identifie le compte : le changer exige le mot de passe courant,
    // et passe par sa propre route.
    if (emailModifie.value) {
      if (!motDePasseEmail.value) {
        erreur.value = 'Confirmez votre mot de passe pour changer d’adresse e-mail.'
        return
      }
      await $fetch('/api/mon-espace/compte/email', {
        method: 'PUT',
        body: { email: profil.email, motDePasse: motDePasseEmail.value },
      })
      motDePasseEmail.value = ''
    }
    const [prenom, ...reste] = profil.nomComplet.trim().split(/\s+/)
    await $fetch('/api/admin/profil', {
      method: 'PUT',
      body: { prenom: prenom ?? '', nom: reste.join(' '), whatsapp: profil.whatsapp },
    })
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
const etiquette = 'mb-1.5 block text-[12.5px] font-bold'
const carte = 'rounded-[14px] border border-ligne-douce bg-white p-6'
const titreCarte = 'font-sans text-[15px] font-bold'
</script>

<template>
  <div v-if="data" class="max-w-[1100px]">
    <h1 class="font-title text-[24px] font-light">Paramètres</h1>

    <UiOnglets v-model="onglet" class="mt-4.5" accent="social" :onglets="ONGLETS" />

    <p v-if="message" class="mt-[22px] rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[14px] text-succes">{{ message }}</p>
    <p v-if="erreur" class="mt-[22px] rounded-[10px] border border-erreur bg-erreur-voile px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>

    <!--
      Les trois premiers volets rendent l'écran lui-même.

      `Suspense` est indispensable : les volets d'accès et de tracking lisent
      leurs données par un `await` de haut niveau, donc leur `setup` est
      asynchrone. Monté par un `v-if` après le premier rendu, un tel composant
      n'a plus la frontière de la page pour l'attendre et reste en suspens,
      sans rien afficher ni rien signaler.
    -->
    <Suspense>
      <AdminVoletAcces v-if="onglet === 'acces'" class="mt-[22px]" />

      <AdminVoletTracking v-else-if="onglet === 'tracking'" class="mt-[22px]" />

      <AdminVoletAttestations v-else-if="onglet === 'attestations'" class="mt-[22px]" />

      <div v-else-if="onglet === 'referencement'" class="mt-[22px]">
        <section :class="carte">
          <h2 :class="titreCarte">Référencement — règles globales</h2>
          <p class="mt-1.5 text-[12.5px] text-discret">
            Ces valeurs servent de repli quand une page n’a pas les siennes.
          </p>
          <dl class="mt-4 space-y-2 text-[13.5px]">
            <div class="flex justify-between gap-4"><dt class="text-discret">Titre par défaut</dt><dd>{{ data.seo.titreParDefaut }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-discret">Description par défaut</dt><dd class="text-right">{{ data.seo.descriptionParDefaut }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-discret">Image sociale</dt><dd class="font-mono text-[12.5px]">{{ data.seo.imageSocialeParDefaut }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-discret">Search Console</dt><dd>{{ data.seo.googleSearchConsole || 'non configurée' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-discret">Google Analytics 4</dt><dd>{{ data.seo.ga4 || 'non configuré' }}</dd></div>
          </dl>
          <UiBaseButton to="/admin/referencement" taille="sm" variante="contour" class="mt-4">
            Ouvrir Référencement (SEO)
          </UiBaseButton>
        </section>
        <AdminReferentiels class="mt-4" />
      </div>

      <!-- Mon profil : deux cartes côte à côte dans la maquette. -->
      <div v-else class="mt-[22px] grid items-start gap-5 lg:grid-cols-2">
        <section :class="carte">
          <h2 :class="titreCarte">Mon profil administrateur</h2>

          <div class="mt-4 flex flex-wrap items-center gap-4">
            <UiAvatar
              :initiales="`${auth.utilisateur?.prenom?.[0] ?? ''}${auth.utilisateur?.nom?.[0] ?? ''}`"
              :photo="auth.utilisateur?.photo"
              taille="grand"
            />
            <label class="cursor-pointer rounded-full border-[1.5px] border-ligne px-4 py-2 text-[12.5px] font-bold text-encre">
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

          <form class="mt-5 flex flex-col gap-3.5" @submit.prevent="enregistrerProfil">
            <label class="block">
              <span :class="etiquette">Nom complet</span>
              <input v-model="profil.nomComplet" required :class="champ">
            </label>
            <label class="block">
              <span :class="etiquette">Email professionnel</span>
              <input v-model="profil.email" type="email" required :class="champ">
            </label>
            <label v-if="emailModifie" class="block">
              <span :class="etiquette">Confirmez votre mot de passe</span>
              <input v-model="motDePasseEmail" type="password" autocomplete="current-password" :class="champ">
            </label>
            <label class="block">
              <span :class="etiquette">Numéro WhatsApp (reçoit les codes de connexion)</span>
              <input v-model="profil.whatsapp" placeholder="+225…" :class="champ">
            </label>
            <div>
              <UiBaseButton type="submit" taille="sm" variante="sombre" :disabled="enCours">
                {{ enCours ? 'Enregistrement…' : 'Enregistrer le profil' }}
              </UiBaseButton>
            </div>
          </form>

          <p class="mt-3 text-[12px] leading-[1.6] text-discret">
            Le changement d’email ou de numéro WhatsApp exige une revérification par code (les deux
            servent à la double vérification).
          </p>
        </section>

        <section :class="carte">
          <h2 :class="titreCarte">Changer le mot de passe</h2>
          <CompteFormulaireMotDePasse
            class="mt-4"
            robustesse
            libelle-bouton="Mettre à jour le mot de passe"
          />
          <p class="mt-3 text-[12px] leading-[1.6] text-discret">
            Confirmation par code envoyé sur WhatsApp. Toutes les autres sessions sont déconnectées.
            Action journalisée.
          </p>
        </section>
      </div>

      <template #fallback>
        <p class="mt-[22px] text-[13.5px] text-discret">Chargement…</p>
      </template>
    </Suspense>
  </div>
</template>
