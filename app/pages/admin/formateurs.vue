<script setup lang="ts">
import type { CandidatureFormateur, Formateur } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Formateurs — administration')

type FormateurAdmin = Formateur & {
  nbModules: number
  nbProgrammes: number
  ordrePublic: number
  supprimable: boolean
  sessionsAVenir: number
  compte: { email: string; aUnMotDePasse: boolean } | null
}

const { data: formateurs, refresh } = await useFetch<FormateurAdmin[]>('/api/admin/formateurs')
const message = ref('')
const erreur = ref('')

/**
 * Bascule « simple » / « avec coaching privé » (écran 07b).
 *
 * L'activation passe par une confirmation : elle engage un tarif et ouvre une
 * section entière de l'espace formateur. Le retour en arrière, lui, se fait
 * sans cérémonie — il ne retire rien de déjà payé.
 */
const activation = ref<FormateurAdmin | null>(null)

async function basculerCoachingPrive(f: FormateurAdmin) {
  erreur.value = ''
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
  }
}

// --- Édition d'une fiche (écran 11) -----------------------------------------

const edition = ref<FormateurAdmin | null>(null)
const fiche = reactive({ nom: '', expertise: '', bio: '', programmePrincipal: 'social-media', ficheComplete: false })

function ouvrirEdition(f: FormateurAdmin) {
  edition.value = f
  Object.assign(fiche, {
    nom: f.nom,
    expertise: f.expertise,
    bio: f.bio,
    programmePrincipal: f.programmePrincipal,
    ficheComplete: f.ficheComplete,
  })
}

async function enregistrerFiche() {
  erreur.value = ''
  try {
    await $fetch('/api/admin/formateurs', {
      method: 'PATCH',
      body: { action: 'modifier', id: edition.value!.id, ...fiche },
    })
    message.value = `Fiche de ${fiche.nom} enregistrée.`
    edition.value = null
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Enregistrement impossible.'
  }
}

// --- Ordre de la page publique ----------------------------------------------

/** L'ordre touche `/formateurs` : c'est celui que voit le visiteur, pas un
 *  confort d'administration. La poignée ne commandait rien jusqu'ici. */
const tire = ref('')

async function deposer(cible: FormateurAdmin) {
  if (!tire.value || tire.value === cible.id || !formateurs.value) return
  const ids = formateurs.value.map((f) => f.id)
  const depuis = ids.indexOf(tire.value)
  const vers = ids.indexOf(cible.id)
  tire.value = ''
  if (depuis < 0 || vers < 0) return
  ids.splice(vers, 0, ...ids.splice(depuis, 1))
  try {
    await $fetch('/api/admin/formateurs', {
      method: 'PATCH',
      body: { action: 'reordonner', ordre: ids },
    })
    message.value = 'Ordre de la page publique mis à jour.'
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Réordonnancement impossible.'
  }
}
const { data: candidatures, refresh: rafraichirCandidatures } = await useFetch<CandidatureFormateur[]>('/api/admin/candidatures')

/** Modale de création : `null` fermée, `undefined` à vide, sinon depuis une candidature. */
const creation = ref<CandidatureFormateur | null | undefined>(null)
const creationOuverte = ref(false)

function ouvrirCreation(candidature?: CandidatureFormateur) {
  creation.value = candidature ?? undefined
  creationOuverte.value = true
}

async function apresCreation() {
  await Promise.all([refresh(), rafraichirCandidatures()])
}


const suppression = ref<FormateurAdmin | null>(null)
const confirmation = ref('')
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">
        Formateurs — {{ formateurs?.length ?? 0 }} profils
      </h1>
      <UiBaseButton taille="sm" variante="contour" @click="ouvrirCreation()">+ Ajouter un formateur</UiBaseButton>
    </div>

    <p class="mt-2 max-w-[820px] text-[12.5px] text-discret">
      Le profil public (photo, bio, spécialité) est modifiable ici ; l’ordre pilote la page
      /formateurs. Tarif de coaching privé fixe à 50 000 FCFA / h pour tous. L’accès « Formateur
      simple » ou « Formateur avec coaching privé » se bascule ci-dessous : il ouvre la section
      dans son espace et le rend sélectionnable dans les demandes des apprenants.
    </p>

    <p v-if="message" class="mt-4 rounded-[12px] border border-succes bg-succes-voile p-3 text-[13.5px] text-succes">{{ message }}</p>
    <p v-if="erreur" class="mt-4 rounded-[12px] border border-erreur bg-[#fdeeee] p-3 text-[13.5px] text-erreur">{{ erreur }}</p>

    <AdminTableauSimple
      class="mt-5"
      :colonnes="['Formateur', 'Accès', 'Modules', 'Coaching privé', 'Ordre public', 'Actions']"
    >
      <tr
        v-for="f in formateurs"
        :key="f.id"
        :class="tire === f.id && 'opacity-50'"
        @dragover.prevent
        @drop.prevent="deposer(f)"
      >
        <td class="px-4 py-3">
          <p class="font-bold">{{ f.nom }}</p>
          <p class="text-[12px] text-discret">{{ f.expertise }}</p>
        </td>
        <td class="px-4 py-3 text-[13px]">
          <template v-if="f.compte">
            <span class="text-succes">Compte actif</span>
            <span class="block text-[12px] text-discret">{{ f.compte.email }}</span>
          </template>
          <span v-else class="text-alerte">Aucun compte rattaché</span>
        </td>
        <td class="px-4 py-3">
          {{ f.nbModules }} module{{ f.nbModules > 1 ? 's' : '' }}
          <span class="block text-[12px] text-discret">
            {{ formatFcfa(f.coachingPriveFcfaHeure) }}/h (fixe)
          </span>
        </td>
        <td class="px-4 py-3">
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
            :class="f.coachingPriveActif ? 'bg-social-voile text-social' : 'bg-fond-voile text-discret'"
          >
            {{ f.coachingPriveActif ? 'Avec coaching privé' : 'Formateur simple' }}
          </span>
          <button
            v-if="f.coachingPriveActif"
            class="mt-1 block text-[12.5px] underline"
            @click="basculerCoachingPrive(f)"
          >
            Repasser simple
          </button>
          <button v-else class="mt-1 block text-[12.5px] text-social underline" @click="activation = f">
            Activer le coaching privé →
          </button>
        </td>
        <td class="px-4 py-3">
          <span
            class="cursor-grab text-discret"
            draggable="true"
            :aria-label="`Déplacer ${f.nom}`"
            @dragstart="tire = f.id"
            @dragend="tire = ''"
          >⋮⋮</span>
          {{ f.ordrePublic }}
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <button class="text-[12.5px] underline" @click="ouvrirEdition(f)">Modifier</button>
          <NuxtLink :to="`/formateurs/${f.slug}`" class="ml-3 text-[12.5px] underline">Voir</NuxtLink>
          <button class="ml-3 text-[12.5px] text-erreur underline" @click="suppression = f">Supprimer</button>
        </td>
      </tr>
    </AdminTableauSimple>

    <section class="mt-10 rounded-[14px] border border-ligne-douce bg-white p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-title text-[19px] font-light">Candidatures « Devenir formateur »</h2>
          <p class="mt-1 text-[13px] text-discret">
            {{ (candidatures ?? []).filter((c) => c.statut === 'nouvelle').length }} nouvelle(s) ·
            {{ (candidatures ?? []).filter((c) => c.statut === 'en-etude').length }} en étude
          </p>
        </div>
        <UiBaseButton to="/admin/candidatures" taille="sm" variante="contour">
          Ouvrir les candidatures
        </UiBaseButton>
      </div>
    </section>

    <!-- Activation du coaching privé : elle engage un tarif et ouvre une
         section entière de l'espace formateur. Le retour en arrière, lui, ne
         demande pas de confirmation — il ne retire rien de déjà payé. -->
    <div v-if="activation" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <div class="w-full max-w-lg rounded-carte bg-white p-6">
        <h2 class="font-title text-[21px] font-light">
          Activer le coaching privé pour {{ activation.nom }} ?
        </h2>
        <ul class="mt-4 ml-4 list-disc text-[13.5px] text-texte">
          <li class="mt-1.5">
            La section « Coaching privé » s’ouvre dans son espace formateur : il y voit les
            demandes qui le concernent et leurs créneaux.
          </li>
          <li class="mt-1.5">
            Il devient sélectionnable par les apprenants au moment de leur demande.
          </li>
          <li class="mt-1.5">
            Le tarif est fixe à {{ formatFcfa(activation.coachingPriveFcfaHeure) }} de l’heure,
            identique pour tous les formateurs.
          </li>
          <li class="mt-1.5">
            Sa rémunération suit la même répartition que les modules : part du formateur sur la
            marge, après frais de paiement.
          </li>
        </ul>
        <div class="mt-5 flex flex-wrap gap-2">
          <UiBaseButton taille="sm" @click="basculerCoachingPrive(activation)">
            Activer le coaching privé
          </UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="activation = null">Annuler</UiBaseButton>
        </div>
      </div>
    </div>

    <!-- Édition de la fiche publique -->
    <div v-if="edition" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <form class="w-full max-w-lg rounded-carte bg-white p-6" @submit.prevent="enregistrerFiche">
        <h2 class="font-title text-[21px] font-light">Fiche de {{ edition.nom }}</h2>
        <p class="mt-1 text-[12.5px] text-discret">
          Ce que voit le visiteur sur /formateurs et dans le bloc « Votre formateur » des fiches
          commerciales.
        </p>
        <div class="mt-4 grid gap-3">
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold">Nom</span>
            <input v-model="fiche.nom" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold">Expertise</span>
            <input v-model="fiche.expertise" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold">Biographie</span>
            <textarea v-model="fiche.bio" rows="4" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold">Programme de rattachement</span>
            <select v-model="fiche.programmePrincipal" class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
              <option value="social-media">Social Média</option>
              <option value="entrepreneurs">Entrepreneurs</option>
            </select>
          </label>
          <label class="flex items-start gap-2.5 text-[13.5px]">
            <input v-model="fiche.ficheComplete" type="checkbox" class="mt-0.5">
            <span>
              Fiche complète
              <span class="block text-[12px] text-discret">
                Une fiche incomplète reste hors du plan de site et non indexable.
              </span>
            </span>
          </label>
        </div>
        <div class="mt-5 flex flex-wrap gap-2">
          <UiBaseButton type="submit" taille="sm">Enregistrer</UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="edition = null">Annuler</UiBaseButton>
        </div>
      </form>
    </div>

    <div v-if="suppression" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <div class="w-full max-w-lg rounded-carte bg-white p-6">
        <h2 class="font-title text-[21px] font-light">Supprimer le formateur {{ suppression.nom }} ?</h2>
        <p class="mt-3 text-[14px] text-texte">
          Son profil disparaît de la page /formateurs et il ne peut plus être choisi pour un coaching
          privé.
        </p>
        <p
          v-if="!suppression.supprimable"
          class="mt-3 rounded-[10px] border border-erreur bg-[#fdeeee] p-3 text-[13.5px] text-erreur-fonce"
        >
          Impossible : {{ suppression.nbModules }} module(s) publié(s) et
          {{ suppression.sessionsAVenir }} session(s) à venir lui sont rattachés. Réassignez-les
          d’abord.
        </p>
        <template v-else>
          <label class="mt-4 block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">
              Tapez « SUPPRIMER » pour confirmer
            </span>
            <input v-model="confirmation" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
        </template>
        <div class="mt-5 flex flex-wrap gap-2">
          <UiBaseButton
            taille="sm"
            variante="sombre"
            :disabled="!suppression.supprimable || confirmation !== 'SUPPRIMER'"
          >
            Supprimer définitivement
          </UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="suppression = null; confirmation = ''">
            Annuler
          </UiBaseButton>
        </div>
        <p class="mt-3 text-[12px] text-discret">
          Action journalisée, réservée aux administrateurs disposant du droit « Formateurs ».
        </p>
      </div>
    </div>
  </div>
</template>
