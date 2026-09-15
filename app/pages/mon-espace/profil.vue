<script setup lang="ts">
import type { Persona, ProgrammeSlug, Utilisateur } from '#shared/types'
import { CHAMPS_ENTREPRENEUR, CHAMPS_SOCIAL_MEDIA, NIVEAUX_EXPERIENCE, calculerCompletionProfil, champsProfil } from '#shared/utils/profil'
import type { EntreeReferentiel } from '#shared/utils/referentiels'
import { entreesDe, libellesReferentiel } from '#shared/utils/referentiels'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Votre profil apprenant')

const auth = useAuthStore()
const { data, refresh } = await useFetch<{ utilisateur: Utilisateur; persona: Persona; programme: ProgrammeSlug | null }>(
  '/api/mon-espace/compte',
)

// Valeurs proposées aux quatre champs à choix multiple. Chargées ici plutôt
// que figées dans la page : elles s'administrent sans déploiement.
const { data: referentiels } = await useFetch<EntreeReferentiel[]>('/api/referentiels', {
  default: () => [],
})
const reseaux = computed(() => entreesDe(referentiels.value, 'reseau'))
const outils = computed(() => entreesDe(referentiels.value, 'outil'))
const canaux = computed(() => entreesDe(referentiels.value, 'canal'))

const formulaire = reactive<Persona & { prenom: string; nom: string; whatsapp: string }>({
  prenom: data.value?.utilisateur.prenom ?? '',
  nom: data.value?.utilisateur.nom ?? '',
  // Le numéro se saisit désormais ici, avec son masque : la fiche ne peut plus
  // atteindre 100 % sans détour par l'écran Paramètres.
  whatsapp: data.value?.utilisateur.whatsapp ?? '',
  ...(data.value?.persona ?? {}),
})

/** Champs ouverts tant que le profil n'est pas à 100 % ; ensuite « Modifier » les déverrouille et « Enregistrer » les reverrouille. */
const edition = ref(false)
const message = ref('')
const erreur = ref('')
const envoi = ref(false)

const programme = computed(() => data.value?.programme ?? null)
const identite = computed(() => ({
  prenom: formulaire.prenom,
  nom: formulaire.nom,
  whatsapp: formulaire.whatsapp,
  // La photo est un champ compté, mais elle ne passe pas par le formulaire :
  // elle s'enregistre seule, donc sa valeur vient de la fiche rechargée.
  photo: data.value?.utilisateur.photo,
}))
const profil = computed(() => calculerCompletionProfil(identite.value, formulaire, programme.value))
/** Même fusion que `calculerCompletionProfil` : l'identité l'emporte sur le persona. */
const valeurs = computed<Record<string, unknown>>(() => ({ ...formulaire, ...identite.value }))
const completion = computed(() => profil.value.pourcentage)
const manquants = computed(() => profil.value.champsManquants)

/** Consigne sous les boutons : le verrouillage ne s'applique qu'à un profil complet. */
const consigneEdition = computed(() => completion.value === 100
  ? '« Modifier » déverrouille les champs, « Enregistrer » sauvegarde et les reverrouille.'
  : 'Renseignez les champs puis « Enregistrer ». Ils restent modifiables tant que le profil n’est pas à 100 %.')

/**
 * Aperçu latéral : miroir en direct du formulaire. Le partage entre « déjà
 * renseigné » et « à renseigner » vient de `champsManquants`, jamais d'un
 * second test de présence — sinon la carte dérive du pourcentage affiché.
 */
const CHAMPS_REFERENTIEL = ['reseaux', 'outils', 'canaux', 'presenceEnLigne'] as const
type ChampReferentiel = (typeof CHAMPS_REFERENTIEL)[number]

/** Ce qu'affiche la colonne « Déjà renseigné » pour un champ donné. */
function libelleValeur(cle: string): string {
  // La photo est un fichier : en montrer l'URL n'apprendrait rien.
  if (cle === 'photo') return 'Déposée'
  if (cle === 'niveau') {
    return NIVEAUX_EXPERIENCE.find((n) => n.valeur === valeurs.value.niveau)?.libelle ?? String(valeurs.value.niveau)
  }
  // Les champs à choix multiple stockent des clés : sans traduction, l'aperçu
  // afficherait « instagram,tiktok » au lieu de « Instagram, TikTok ».
  if (CHAMPS_REFERENTIEL.includes(cle as ChampReferentiel)) {
    return libellesReferentiel(String(valeurs.value[cle] ?? ''), referentiels.value)
  }
  return String(valeurs.value[cle])
}

const renseignes = computed(() =>
  champsProfil(programme.value)
    .filter((champ) => !manquants.value.some((m) => m.cle === champ.cle))
    .map((champ) => ({
      ...champ,
      valeur: libelleValeur(champ.cle),
    })),
)
/**
 * Photo de profil. Elle se dépose seule, hors du formulaire : un fichier ne se
 * conserve pas dans un champ tant qu'on n'a pas cliqué « Enregistrer », et
 * l'apprenant doit voir tout de suite ce qu'il a choisi. Elle n'entre pas dans
 * le calcul de complétion — un profil déjà à 100 % ne doit pas y retomber.
 */
const champPhoto = ref<HTMLInputElement | null>(null)
const photoEnCours = ref(false)
const photo = computed(() => data.value?.utilisateur.photo ?? null)

/**
 * Compte rendu propre à la photo, rendu dans la carte elle-même. Il ne passe
 * pas par `message` / `erreur`, qui s'affichent au pied du formulaire : un
 * refus de format apparaîtrait alors plusieurs écrans sous le bouton qu'on
 * vient d'actionner, et effacerait au passage le compte rendu du dernier
 * enregistrement.
 */
const photoMessage = ref('')
const photoErreur = ref('')

/** Message d'un refus du serveur (format, taille, session), repli générique sinon. */
function motifPhoto(e: unknown, defaut: string) {
  const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
  return r.data?.statusMessage ?? r.statusMessage ?? defaut
}

async function envoyerPhoto(evenement: Event) {
  const entree = evenement.target as HTMLInputElement
  const fichier = entree.files?.[0]
  if (!fichier) return

  photoErreur.value = ''
  photoMessage.value = ''
  photoEnCours.value = true
  try {
    const corps = new FormData()
    corps.append('photo', fichier)
    await $fetch('/api/mon-espace/compte/photo', { method: 'POST', body: corps })
    await Promise.all([auth.rafraichir(), refresh()])
    photoMessage.value = 'Photo mise à jour.'
  } catch (e) {
    photoErreur.value = motifPhoto(e, 'Dépôt de la photo impossible.')
  } finally {
    photoEnCours.value = false
    // Remis à zéro pour que redéposer le même fichier déclenche encore `change`.
    entree.value = ''
  }
}

async function retirerPhoto() {
  photoErreur.value = ''
  photoMessage.value = ''
  photoEnCours.value = true
  try {
    await $fetch('/api/mon-espace/compte/photo', { method: 'DELETE' })
    await Promise.all([auth.rafraichir(), refresh()])
    photoMessage.value = 'Photo retirée : vos initiales sont de nouveau affichées.'
  } catch (e) {
    photoErreur.value = motifPhoto(e, 'Retrait de la photo impossible.')
  } finally {
    photoEnCours.value = false
  }
}

const nomComplet = computed(() => [formulaire.prenom, formulaire.nom].filter(Boolean).join(' '))
const initiales = computed(() => `${formulaire.prenom?.[0] ?? ''}${formulaire.nom?.[0] ?? ''}`.toUpperCase())
const libelleProgramme = computed(() =>
  programme.value === 'entrepreneurs' ? 'Entrepreneurs' : programme.value === 'social-media' ? 'Social Média' : null,
)

/** Compte tout juste créé : profil incomplet, on ouvre l'édition d'emblée sinon l'écran paraît figé. */
edition.value = completion.value < 100

const STADES = ['En projet / idée', 'Lancement (< 2 ans)', 'En croissance (2 ans et +)']
const TAILLES = ['Seul(e)', '2 à 5 personnes', '6 à 20 personnes', 'Plus de 20']
const BUDGETS = ['Moins de 50 000 FCFA', '50 000 – 150 000 FCFA', '150 000 – 500 000 FCFA', 'Plus de 500 000 FCFA']
const AUDIENCES = ['Moins de 1 000 abonnés', '1 000 à 10 000 abonnés', '10 000 à 100 000 abonnés', 'Plus de 100 000 abonnés']

const CHAMP = 'w-full rounded-[10px] border px-4 py-2.5 text-[15px] focus:outline-none disabled:bg-fond-clair disabled:text-texte'
const classe = computed(() => [CHAMP, edition.value ? 'border-ligne focus:border-social' : 'border-ligne-claire'])

async function enregistrer() {
  erreur.value = ''
  message.value = ''
  envoi.value = true
  try {
    // `whatsapp` est extrait explicitement : il appartient au compte, pas au
    // persona, et `majPersona` le laisserait tomber sans bruit.
    const { prenom, nom, whatsapp, ...persona } = formulaire
    await $fetch('/api/mon-espace/compte/profil', {
      method: 'PUT',
      body: {
        prenom,
        nom,
        whatsapp,
        persona: { ...persona, age: persona.age || undefined },
      },
    })
    await Promise.all([auth.rafraichir(), refresh()])
    // Reverrouillage seulement une fois le profil complet : sinon l'apprenant reste bloqué devant des champs grisés.
    edition.value = completion.value < 100
    message.value =
      completion.value === 100
        ? 'Profil enregistré à 100 % : vous pouvez rejoindre vos coaching sessions.'
        : `Profil enregistré à ${completion.value} %. Complétez-le à 100 % pour rejoindre une coaching session.`
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreur.value = r.data?.statusMessage ?? r.statusMessage ?? 'Enregistrement impossible.'
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <div class="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
    <div id="profilenregistrement" class="min-w-0">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <h1 class="text-[30px] font-medium">Votre profil apprenant</h1>
        <p class="font-title text-[34px] leading-none font-light"
          :class="completion === 100 ? 'text-succes' : 'text-alerte'">{{ completion }} %</p>
      </div>
      <div class="mt-3 h-1.5 w-full rounded-full bg-fond-voile">
        <div class="h-full rounded-full transition-all" :class="completion === 100 ? 'bg-succes' : 'bg-alerte'"
          :style="{ width: `${completion}%` }" />
      </div>
      <p class="mt-3 text-[14.5px] text-texte">
        Ces informations permettent à vos coachs de préparer des sessions adaptées à votre contexte.
        Complétion à 100 % requise pour rejoindre une coaching session. Votre pays, renseigné à la
        création du compte, n’est plus demandé ici.
      </p>

      <!-- Le dépôt est indépendant du formulaire : il s'enregistre à la sélection,
           et reste donc ouvert même quand les champs sont verrouillés. -->
      <div class="mt-8 flex flex-wrap items-center gap-4 rounded-[12px] border border-ligne-claire bg-white p-4">
        <UiAvatar :photo="photo" :initiales="initiales" taille="grand" />
        <div class="min-w-0 flex-1">
          <p class="text-[14px] font-bold text-encre">Photo de profil</p>
          <p class="mt-0.5 text-[13px] text-discret">
            JPEG, PNG ou WebP, 512 ko maximum.
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-2.5">
            <input
              ref="champPhoto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="sr-only"
              @change="envoyerPhoto"
            >
            <UiBaseButton
              type="button"
              variante="contour"
              taille="sm"
              :disabled="photoEnCours"
              @click="champPhoto?.click()"
            >
              {{ photo ? 'Changer la photo' : 'Ajouter une photo' }}
            </UiBaseButton>
            <button
              v-if="photo"
              type="button"
              class="text-[13px] text-discret underline hover:text-encre"
              :disabled="photoEnCours"
              @click="retirerPhoto"
            >
              Retirer
            </button>
            <span v-if="photoEnCours" class="text-[13px] text-discret" role="status">Envoi en cours…</span>
            <span v-else-if="photoErreur" class="text-[13px] font-bold text-erreur" role="alert">{{ photoErreur }}</span>
            <span v-else-if="photoMessage" class="text-[13px] text-succes" role="status">{{ photoMessage }}</span>
          </div>
        </div>
      </div>

      <form class="mt-8" @submit.prevent="enregistrer">
        <fieldset :disabled="!edition" class="grid gap-5 sm:grid-cols-2">
          <legend class="surtitre mb-4 text-discret">Vous, en quelques repères</legend>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Prénom *</span>
            <input v-model="formulaire.prenom" required :class="classe">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Nom *</span>
            <input v-model="formulaire.nom" required :class="classe">
          </label>
          <label class="block sm:col-span-2">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Numéro WhatsApp *</span>
            <UiChampTelephone
              v-model="formulaire.whatsapp"
              :pays="data?.utilisateur.pays"
              :disabled="!edition"
            />
            <span class="mt-1.5 block text-[12.5px] text-discret">
              Sert aux rappels de session. Choisissez le pays, puis saisissez le numéro sans l’indicatif.
            </span>
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Âge</span>
            <input v-model.number="formulaire.age" type="number" min="12" max="120" :class="classe">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Ville</span>
            <input v-model="formulaire.ville" :class="classe" placeholder="Abidjan, Bouaké, Cotonou…">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Secteur d’activité</span>
            <input v-model="formulaire.secteur" :class="classe" placeholder="Agence digitale, commerce, restauration…">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Niveau d’expérience</span>
            <select v-model="formulaire.niveau" :class="[...classe, 'bg-white']">
              <option value="">Choisir…</option>
              <option v-for="n in NIVEAUX_EXPERIENCE" :key="n.valeur" :value="n.valeur">{{ n.libelle }}</option>
            </select>
          </label>
          <label class="block sm:col-span-2">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Objectif principal</span>
            <textarea v-model="formulaire.objectif" rows="3" :class="classe"
              placeholder="Doubler mes ventes en ligne et déléguer ma communication d’ici 6 mois." />
          </label>
        </fieldset>

        <!-- Bloc propre au programme -->
        <fieldset v-if="programme === 'entrepreneurs'" :disabled="!edition" class="mt-8 grid gap-5 sm:grid-cols-2">
          <legend class="surtitre mb-4 text-entrepreneurs">Spécifique au profil Entrepreneur</legend>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">{{ CHAMPS_ENTREPRENEUR[0]!.libelle }}</span>
            <input v-model="formulaire.entreprise" :class="classe">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Stade de développement</span>
            <select v-model="formulaire.stade" :class="[...classe, 'bg-white']">
              <option value="">Choisir…</option>
              <option v-for="s in STADES" :key="s">{{ s }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Taille de l’équipe</span>
            <select v-model="formulaire.tailleEquipe" :class="[...classe, 'bg-white']">
              <option value="">Choisir…</option>
              <option v-for="t in TAILLES" :key="t">{{ t }}</option>
            </select>
          </label>
          <div class="block">
            <span id="champ-canaux" class="mb-1.5 block text-[13px] font-bold text-texte">Canaux de vente actuels</span>
            <UiChampMultiChoix
              v-model="formulaire.canaux"
              :entrees="canaux"
              :disabled="!edition"
              aria-labelledby="champ-canaux"
            />
          </div>
          <div class="block">
            <span id="champ-presence" class="mb-1.5 block text-[13px] font-bold text-texte">Présence en ligne existante</span>
            <UiChampMultiChoix
              v-model="formulaire.presenceEnLigne"
              :entrees="reseaux"
              :disabled="!edition"
              aria-labelledby="champ-presence"
            />
          </div>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Budget communication mensuel</span>
            <select v-model="formulaire.budget" :class="[...classe, 'bg-white']">
              <option value="">Choisir…</option>
              <option v-for="b in BUDGETS" :key="b">{{ b }}</option>
            </select>
          </label>
          <label class="block sm:col-span-2">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Votre principal défi business aujourd’hui</span>
            <textarea v-model="formulaire.defi" rows="3" :class="classe"
              placeholder="Attirer des clients réguliers sans dépendre uniquement du bouche-à-oreille." />
          </label>
        </fieldset>

        <fieldset v-else-if="programme === 'social-media'" :disabled="!edition" class="mt-8 grid gap-5 sm:grid-cols-2">
          <legend class="surtitre mb-4 text-social">Spécifique au programme Social Média</legend>
          <div class="block">
            <span id="champ-reseaux" class="mb-1.5 block text-[13px] font-bold text-texte">{{ CHAMPS_SOCIAL_MEDIA[0]!.libelle }}
              actuellement</span>
            <UiChampMultiChoix
              v-model="formulaire.reseaux"
              :entrees="reseaux"
              :disabled="!edition"
              aria-labelledby="champ-reseaux"
            />
          </div>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Taille d’audience approximative</span>
            <select v-model="formulaire.audience" :class="[...classe, 'bg-white']">
              <option value="">Choisir…</option>
              <option v-for="a in AUDIENCES" :key="a">{{ a }}</option>
            </select>
          </label>
          <div class="block">
            <span id="champ-outils" class="mb-1.5 block text-[13px] font-bold text-texte">Outils utilisés</span>
            <UiChampMultiChoix
              v-model="formulaire.outils"
              :entrees="outils"
              :disabled="!edition"
              aria-labelledby="champ-outils"
            />
          </div>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Clients / marques accompagnés</span>
            <input v-model="formulaire.clients" :class="classe" placeholder="Une marque de cosmétiques, un restaurant…">
          </label>
        </fieldset>

        <p v-else class="mt-8 rounded-[12px] border border-dashed border-ligne p-4 text-[13.5px] text-discret">
          Le bloc propre à votre programme (Entrepreneur ou Social Média) apparaît dès votre premier module.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-3">
          <UiBaseButton v-if="!edition" type="button" variante="contour" @click="edition = true">Modifier</UiBaseButton>
          <UiBaseButton v-else type="submit" :disabled="envoi">Enregistrer</UiBaseButton>
          <p class="text-[12.5px] text-discret">{{ consigneEdition }}</p>
        </div>
        <p v-if="message" class="mt-3 text-[14px] text-succes" role="status">{{ message }}</p>
        <p v-if="erreur" class="mt-3 text-[14px] text-erreur" role="alert">{{ erreur }}</p>
      </form>
    </div>

    <!-- Aperçu : miroir en direct du formulaire, dans la colonne restée vide. -->
    <aside id="apercuenregistrement" class="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
      <section class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <h2 class="font-title text-[19px] font-light">Aperçu de votre profil</h2>

        <div class="mt-4 flex items-center gap-3">
          <UiAvatar :photo="photo" :initiales="initiales" taille="carte" />
          <div class="min-w-0">
            <p class="truncate text-[15px] font-bold text-encre">{{ nomComplet || 'Votre nom' }}</p>
            <p class="truncate text-[12.5px] text-discret">
              {{ libelleProgramme ?? 'Programme à venir' }}<template v-if="formulaire.ville"> · {{ formulaire.ville
              }}</template>
            </p>
          </div>
        </div>

        <p v-if="completion === 100"
          class="mt-4 rounded-[10px] bg-succes-voile px-3.5 py-2.5 text-[13px] font-bold text-succes">
          Profil complet — vous pouvez rejoindre une coaching session.
        </p>
        <template v-else>
          <p class="mt-4 text-[13px] font-bold text-alerte">
            Il reste {{ manquants.length }} information{{ manquants.length > 1 ? 's' : '' }} à renseigner.
          </p>
          <ul class="mt-2 space-y-1.5 text-[13.5px]">
            <li v-for="champ in manquants" :key="champ.cle" class="flex items-start gap-2 text-texte">
              <span aria-hidden="true" class="mt-[7px] size-[7px] shrink-0 rounded-full border border-alerte" />
              <span class="min-w-0">
                {{ champ.libelle }}
                <!-- La photo ne se saisit pas dans le formulaire : sans ce repère,
                     la ligne nommerait un champ sans moyen visible de le remplir. -->
                <span v-if="champ.cle === 'photo'" class="text-discret">— carte « Photo de profil », en haut</span>
              </span>
            </li>
          </ul>
        </template>

        <template v-if="renseignes.length">
          <p class="surtitre mt-5 text-discret">Déjà renseigné</p>
          <dl class="mt-2 divide-y divide-ligne-claire text-[13.5px]">
            <div v-for="champ in renseignes" :key="champ.cle" class="flex gap-3 py-2">
              <dt class="w-[42%] shrink-0 text-discret">{{ champ.libelle }}</dt>
              <dd class="line-clamp-2 min-w-0 flex-1 break-words text-encre">{{ champ.valeur }}</dd>
            </div>
          </dl>
        </template>
      </section>
    </aside>
  </div>
</template>
