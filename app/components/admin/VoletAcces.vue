<script setup lang="ts">
import type { SectionAdmin } from '#shared/types'

/**
 * Administration des accès (planche C, écrans 07 et 07b) : création d'un
 * compte admin section par section, comptes existants, comptes formateurs
 * avec bascule du coaching privé. Rendu par la page `/admin/acces` et par le
 * volet homonyme de Paramètres (écran 20).
 */

interface Section {
  cle: SectionAdmin
  libelle: string
  note?: string
}
interface Compte {
  id: string
  nom: string
  email: string
  whatsapp: string
  role: string
  sections: SectionAdmin[] | 'toutes'
  revocable: boolean
}

interface FormateurAcces {
  id: string
  nom: string
  email: string
  coachingPriveActif: boolean
  coachingPriveFcfaHeure: number
  nbModules: number
  aUnCompte: boolean
}

const { data, refresh } = await useFetch<{
  sections: Section[]
  role: string
  mesSections: SectionAdmin[] | 'toutes'
  comptes: Compte[]
  formateurs: FormateurAcces[]
}>('/api/admin/acces')

const estSuperieur = computed(() => data.value?.role === 'admin-superieur')

/**
 * Deux droits — l'argent et l'indexation — ne peuvent être accordés que par un
 * administrateur supérieur, et la maquette les peint en orange qu'ils soient
 * cochés ou non : l'œil doit les retrouver du premier coup.
 */
const SENSIBLES: SectionAdmin[] = ['transactions-paiements', 'referencement-avance']
const verrouillee = (cle: SectionAdmin) => SENSIBLES.includes(cle) && !estSuperieur.value

/** Libellé de la sous-ligne d'une section : la maquette accole la note au
 *  libellé (« Administration des accès — permet de… »). */
const LIBELLES_SECTION: Record<string, string> = {
  'admin-superieur': 'Admin principal',
  'admin-contenu': 'Administrateur',
}

// --- Création ---------------------------------------------------------------

const creation = reactive({
  ouverte: false,
  // Un seul champ « Nom » (écran 07) : il est scindé en prénom / nom au premier
  // espace avant l'envoi, le serveur attendant les deux.
  nomComplet: '',
  email: '',
  whatsapp: '',
  motDePasse: '',
  superieur: false,
  // Aucune section n'est cochée par défaut : le compte ne verra que ce qu'on
  // lui accorde explicitement.
  sections: [] as SectionAdmin[],
})
const erreur = ref('')
const { annoncer } = useToasts()
const message = ref('')
const enCours = ref(false)

function basculer(cle: SectionAdmin) {
  const i = creation.sections.indexOf(cle)
  if (i === -1) creation.sections.push(cle)
  else creation.sections.splice(i, 1)
}

/** « Houéfa Ahouansou » → prénom « Houéfa », nom « Ahouansou » ; sans espace,
 *  le nom reprend le prénom pour ne pas laisser un champ vide côté serveur. */
function scinderNom(complet: string): { prenom: string; nom: string } {
  const propre = complet.trim().replace(/\s+/g, ' ')
  const i = propre.indexOf(' ')
  if (i === -1) return { prenom: propre, nom: propre }
  return { prenom: propre.slice(0, i), nom: propre.slice(i + 1) }
}

async function creer() {
  erreur.value = ''
  enCours.value = true
  try {
    const { nomComplet, ...reste } = creation
    await $fetch('/api/admin/acces', {
      method: 'POST',
      body: { action: 'creer', ...reste, ...scinderNom(nomComplet) },
    })
    Object.assign(creation, {
      ouverte: false, nomComplet: '', email: '', whatsapp: '',
      motDePasse: '', superieur: false, sections: [],
    })
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'La création a échoué.'
  } finally {
    enCours.value = false
  }
}

// --- Modification et révocation ---------------------------------------------

const edition = ref<{ id: string; sections: SectionAdmin[] } | null>(null)

function ouvrirEdition(compte: Compte) {
  edition.value = {
    id: compte.id,
    sections: compte.sections === 'toutes' ? [] : [...compte.sections],
  }
}

function basculerEdition(cle: SectionAdmin) {
  if (!edition.value) return
  const i = edition.value.sections.indexOf(cle)
  if (i === -1) edition.value.sections.push(cle)
  else edition.value.sections.splice(i, 1)
}

async function enregistrerDroits() {
  if (!edition.value) return
  erreur.value = ''
  try {
    await $fetch('/api/admin/acces', {
      method: 'POST',
      body: { action: 'droits', id: edition.value.id, sections: edition.value.sections },
    })
    edition.value = null
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'La modification a échoué.'
  }
}

/** Périmètre d'un compte, colonne de l'écran 07b : les libellés des sections
 *  cochées, « Accès complet — non modifiable » pour l'admin principal. */
function perimetre(compte: Compte): string {
  if (compte.sections === 'toutes') return 'Accès complet — non modifiable'
  if (!compte.sections.length) return 'Aucune section'
  const libelles = data.value?.sections ?? []
  return compte.sections
    .map((cle) => libelles.find((s) => s.cle === cle)?.libelle ?? cle)
    .join(' · ')
}

const revocation = ref<Compte | null>(null)

const totpEnCours = ref('')

/**
 * Dernier recours quand téléphone et codes de secours sont perdus : le compte
 * se réenrôle à sa prochaine connexion. Affaiblissement temporaire, donc
 * confirmation explicite et journalisation côté serveur.
 */
async function reinitialiserTotp(compte: { id: string; nom: string; email: string }) {
  if (!confirm(`Réinitialiser la double authentification de ${compte.nom} (${compte.email}) ?\n\nSon application actuelle et ses codes de secours cesseront de fonctionner. Il devra scanner un nouveau QR code à sa prochaine connexion.`)) {
    return
  }
  erreur.value = ''
  totpEnCours.value = compte.id
  try {
    await $fetch('/api/admin/totp-reinitialiser', { method: 'POST', body: { utilisateurId: compte.id } })
    message.value = `Double authentification réinitialisée pour ${compte.email} — modification journalisée.`
    annoncer(`Double authentification réinitialisée pour ${compte.email} — modification journalisée.`)
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Réinitialisation impossible.'
  } finally {
    totpEnCours.value = ''
  }
}

async function revoquer() {
  if (!revocation.value) return
  try {
    await $fetch('/api/admin/acces', {
      method: 'POST',
      body: { action: 'revoquer', id: revocation.value.id },
    })
    revocation.value = null
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'La révocation a échoué.'
  }
}

// --- Formateurs : simple ↔ avec coaching privé (écran 07b) -------------------

const activation = ref<FormateurAcces | null>(null)
const basculeEnCours = ref('')

async function basculerCoachingPrive(f: FormateurAcces) {
  erreur.value = ''
  basculeEnCours.value = f.id
  try {
    await $fetch(`/api/admin/formateurs/${f.id}/coaching-prive`, {
      method: 'PUT',
      body: { actif: !f.coachingPriveActif },
    })
    message.value = f.coachingPriveActif
      ? `${f.nom} repasse « Formateur simple » : sa section se referme, les séances déjà payées restent honorées.`
      : `${f.nom} devient « Formateur avec coaching privé » : sa section est déverrouillée.`
    activation.value = null
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Modification impossible.'
  } finally {
    basculeEnCours.value = ''
  }
}

function classesSection(cle: SectionAdmin, cochee: boolean) {
  const base = 'flex items-start gap-2.5 rounded-[10px] border-[1.5px] px-3.5 py-3 text-[13.5px]'
  if (SENSIBLES.includes(cle)) return `${base} border-alerte-bordure bg-alerte-neige`
  if (cochee) return `${base} border-social bg-social-nuage`
  return `${base} border-ligne bg-white`
}

const champ = 'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-3 text-[14px] focus:border-social focus:outline-none'
/** Pastille de rôle : 10,5 px, arrondi plein (maquette, écran 07b). */
const pastille = 'inline-block rounded-full px-2.5 py-1 text-[10.5px] font-bold'
/** Lien d'action de tableau : 12 px gras, sans soulignement au repos. */
const lienAction = 'text-[12px] font-bold hover:underline disabled:opacity-50'
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-title text-[23px] font-light">Administration des accès — rôles de la plateforme</h1>
        <p class="mt-1.5 max-w-[760px] text-[13px] leading-relaxed text-discret">
          Trois rôles distincts. Les comptes admin se paramètrent section par section ; les comptes
          formateurs ouvrent le dashboard formateur, avec ou sans le volet coaching privé.
        </p>
      </div>
      <UiBaseButton taille="sm" variante="sombre" @click="creation.ouverte = !creation.ouverte">
        {{ creation.ouverte ? 'Annuler' : 'Créer un compte administrateur' }}
      </UiBaseButton>
    </div>

    <!-- Les trois rôles (écran 07b) : le troisième est celui qu'on accorde. -->
    <div class="mt-5 grid gap-[14px] sm:grid-cols-3">
      <section class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <span :class="[pastille, 'bg-encre text-white']">Administrateur</span>
        <p class="mt-3 text-[12.5px] leading-[1.65] text-texte">
          Dashboard admin complet, sections cochées une à une à la création du compte. Le
          référencement se sépare en deux droits : « contenu » pour les Titles, meta descriptions et
          partages, « réglages avancés » pour les slugs publiés, l’indexation et les canonicals.
          Double vérification à la connexion.
        </p>
      </section>
      <section class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <span :class="[pastille, 'bg-piste text-discret']">Formateur simple</span>
        <p class="mt-3 text-[12.5px] leading-[1.65] text-texte">
          Dashboard formateur : vue d’ensemble, profil public, modules &amp; inscriptions, sessions
          de coaching, profils des apprenants concernés, revenus. <b>Pas de coaching privé.</b>
        </p>
      </section>
      <section class="rounded-[14px] border-[1.5px] border-social bg-white p-5">
        <span :class="[pastille, 'bg-social-voile text-social']">Formateur avec coaching privé</span>
        <p class="mt-3 text-[12.5px] leading-[1.65] text-texte">
          Tout l’accès Formateur simple <b>+ section Coaching privé</b> : demandes le concernant,
          sujets soumis par les apprenants, séances planifiées, revenus coaching. Profil proposé au
          coaching sur /formateurs.
        </p>
      </section>
    </div>

    <p v-if="message" class="mt-5 rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[14px] text-succes">
      {{ message }}
    </p>
    <p v-if="erreur" class="mt-5 rounded-[10px] border border-erreur bg-erreur-voile px-4 py-3 text-[14px] text-erreur">
      {{ erreur }}
    </p>

    <!-- Création (écran 07) -->
    <form
      v-if="creation.ouverte"
      class="mt-5 rounded-[14px] border border-ligne-douce bg-white p-6"
      @submit.prevent="creer"
    >
      <h2 class="font-title text-[23px] font-light">Créer un compte administrateur</h2>
      <p class="mt-1.5 text-[13.5px] text-discret">
        Aucune section n’est cochée par défaut. Le compte ne verra que les sections autorisées —
        les autres sont masquées, pas seulement désactivées.
      </p>

      <div class="mt-[22px] grid gap-[14px] sm:grid-cols-3">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Nom</span>
          <input v-model="creation.nomComplet" required placeholder="Prénom Nom" :class="champ">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Email</span>
          <input v-model="creation.email" type="email" required :class="champ">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Numéro WhatsApp</span>
          <input v-model="creation.whatsapp" type="tel" :class="champ">
        </label>
        <!-- Champ absent de la maquette, mais le serveur exige un mot de passe
             initial : sans lui le compte se crée sans pouvoir entrer. -->
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Mot de passe provisoire</span>
          <input v-model="creation.motDePasse" type="password" required minlength="10" :class="champ">
          <span class="mt-1.5 block text-[12px] text-discret">
            10 caractères minimum — à transmettre à la personne, qui pourra le changer.
          </span>
        </label>
      </div>

      <label v-if="estSuperieur" class="mt-5 flex items-start gap-2.5 rounded-[10px] border-[1.5px] border-alerte bg-alerte-voile px-3.5 py-3 text-[13.5px]">
        <input v-model="creation.superieur" type="checkbox" class="mt-0.5 size-[17px] accent-alerte">
        <span>
          <b class="text-encre">Administrateur supérieur</b> — accès complet, sans cocher de section.
          À réserver aux personnes de confiance ; toute action est journalisée.
        </span>
      </label>

      <fieldset v-if="!creation.superieur" class="mt-6">
        <legend class="mb-3 text-[12px] font-bold tracking-[0.1em] text-discret uppercase">Sections autorisées</legend>
        <div class="grid gap-2.5 sm:grid-cols-3">
          <label
            v-for="section in data.sections"
            :key="section.cle"
            :class="[
              classesSection(section.cle, creation.sections.includes(section.cle)),
              // La section qui ouvre les droits des autres tient toute la
              // largeur dans la maquette : elle ne se coche pas à la légère.
              section.cle === 'administration-acces' ? 'sm:col-span-3 border-alerte bg-alerte-voile' : '',
              verrouillee(section.cle) ? 'opacity-60' : '',
            ]"
          >
            <input
              type="checkbox"
              class="mt-0.5 size-[17px]"
              :class="verrouillee(section.cle) || SENSIBLES.includes(section.cle) ? 'accent-alerte' : 'accent-social'"
              :checked="creation.sections.includes(section.cle)"
              :disabled="verrouillee(section.cle)"
              @change="basculer(section.cle)"
            >
            <span>
              <b class="text-encre">{{ section.libelle }}</b>
              <span
                v-if="section.note"
                class="mt-0.5 block text-[11.5px] font-semibold"
                :class="SENSIBLES.includes(section.cle) ? 'text-alerte' : 'text-discret'"
              >{{ section.note }}</span>
              <span v-if="verrouillee(section.cle)" class="mt-0.5 block text-[11.5px] font-semibold text-alerte">
                Réservé à un administrateur supérieur.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div class="mt-6 flex gap-3">
        <UiBaseButton type="submit" variante="sombre" :disabled="enCours">
          {{ enCours ? 'Création…' : 'Créer le compte' }}
        </UiBaseButton>
        <UiBaseButton variante="contour" @click="creation.ouverte = false">Annuler</UiBaseButton>
      </div>
    </form>

    <!-- Comptes existants et formateurs, dans un même tableau (écran 07b) -->
    <AdminTableauSimple
      class="mt-5"
      :colonnes="['Compte', 'Rôle', 'Périmètre', 'Actions']"
      :largeurs="['28%', '20%', '32%', '20%']"
    >
      <tr v-for="compte in data.comptes" :key="compte.id">
        <td class="px-4 py-3.5">
          <p class="font-bold">{{ compte.nom }}</p>
          <p class="text-[11.5px] text-discret">{{ compte.email }}</p>
        </td>
        <td class="px-4 py-3.5">
          <span
            :class="[pastille, compte.role === 'admin-superieur' ? 'bg-encre text-white' : 'bg-ligne-claire text-texte']"
          >
            {{ LIBELLES_SECTION[compte.role] ?? compte.role }}
          </span>
        </td>
        <td class="px-4 py-3.5 text-[13px] text-discret">{{ perimetre(compte) }}</td>
        <td class="px-4 py-3.5">
          <div class="flex flex-wrap gap-2">
            <span v-if="compte.sections === 'toutes' && !compte.revocable" class="text-[12px] text-discret-clair">—</span>
            <button v-if="compte.sections !== 'toutes'" :class="lienAction" @click="ouvrirEdition(compte)">
              Modifier
            </button>
            <button
              v-if="estSuperieur"
              :class="[lienAction, 'text-discret']"
              :disabled="totpEnCours === compte.id"
              @click="reinitialiserTotp(compte)"
            >
              {{ totpEnCours === compte.id ? 'Réinitialisation…' : 'Réinitialiser la 2FA' }}
            </button>
            <button v-if="compte.revocable" :class="[lienAction, 'text-erreur']" @click="revocation = compte">
              Révoquer
            </button>
          </div>
        </td>
      </tr>
      <tr v-for="f in data.formateurs" :key="f.id">
        <td class="px-4 py-3.5">
          <p class="font-bold">{{ f.nom }}</p>
          <p class="text-[11.5px] text-discret">{{ f.email || 'Aucun compte rattaché' }}</p>
        </td>
        <td class="px-4 py-3.5">
          <span :class="[pastille, f.coachingPriveActif ? 'bg-social-voile text-social' : 'bg-piste text-discret']">
            {{ f.coachingPriveActif ? 'Formateur + coaching privé' : 'Formateur simple' }}
          </span>
        </td>
        <td class="px-4 py-3.5 text-[13px] text-discret">
          Ses {{ f.nbModules }} module{{ f.nbModules > 1 ? 's' : '' }} · ses sessions{{ f.coachingPriveActif ? ' · coaching privé' : '' }}
        </td>
        <td class="px-4 py-3.5">
          <div class="flex flex-wrap gap-2">
            <NuxtLink to="/admin/formateurs" :class="lienAction">Modifier</NuxtLink>
            <button
              v-if="f.coachingPriveActif"
              :class="[lienAction, 'text-discret']"
              :disabled="basculeEnCours === f.id"
              @click="basculerCoachingPrive(f)"
            >
              Repasser simple
            </button>
            <button v-else :class="[lienAction, 'text-social']" @click="activation = f">
              Activer le coaching privé →
            </button>
          </div>
        </td>
      </tr>
    </AdminTableauSimple>

    <AdminModaleCoachingPrive
      v-if="activation"
      :formateur="activation"
      :en-cours="basculeEnCours === activation.id"
      @confirmer="basculerCoachingPrive(activation)"
      @annuler="activation = null"
    />

    <!-- Édition des droits -->
    <div v-if="edition" class="mt-5 rounded-[14px] border-[1.5px] border-social bg-white p-6">
      <h2 class="font-sans text-[15px] font-bold">Droits du compte</h2>
      <div class="mt-4 grid gap-2.5 sm:grid-cols-3">
        <label
          v-for="section in data.sections"
          :key="section.cle"
          :class="[
            classesSection(section.cle, edition.sections.includes(section.cle)),
            verrouillee(section.cle) ? 'opacity-60' : '',
          ]"
        >
          <input
            type="checkbox"
            class="mt-0.5 size-[17px]"
            :class="SENSIBLES.includes(section.cle) ? 'accent-alerte' : 'accent-social'"
            :checked="edition.sections.includes(section.cle)"
            :disabled="verrouillee(section.cle)"
            @change="basculerEdition(section.cle)"
          >
          <b class="text-encre">{{ section.libelle }}</b>
        </label>
      </div>
      <div class="mt-5 flex gap-3">
        <UiBaseButton taille="sm" variante="sombre" @click="enregistrerDroits">Enregistrer</UiBaseButton>
        <UiBaseButton variante="contour" taille="sm" @click="edition = null">Annuler</UiBaseButton>
      </div>
    </div>

    <!-- Révocation -->
    <div v-if="revocation" class="mt-5 rounded-[14px] border border-erreur-bordure bg-erreur-voile p-6">
      <h2 class="font-sans text-[15px] font-bold text-erreur-fonce">Révoquer {{ revocation.nom }} ?</h2>
      <p class="mt-2 max-w-[620px] text-[13px] leading-relaxed text-erreur-fonce">
        Le compte perd tous ses droits et redevient un compte apprenant. Il n’est pas supprimé :
        le journal d’administration référence son nom, et un historique amputé de son auteur ne
        vaudrait plus grand-chose.
      </p>
      <div class="mt-4 flex gap-3">
        <UiBaseButton taille="sm" variante="danger" @click="revoquer">Confirmer la révocation</UiBaseButton>
        <UiBaseButton variante="contour" taille="sm" @click="revocation = null">Annuler</UiBaseButton>
      </div>
    </div>
  </div>
</template>
