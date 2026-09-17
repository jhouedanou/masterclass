<script setup lang="ts">
import type { CandidatureFormateur, Formateur } from '#shared/types'
import { compterModules } from '#shared/utils/compteurs'

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
const { annoncer } = useToasts()
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
const fiche = reactive({ nom: '', expertise: '', bio: '', photoAlt: '', programmePrincipal: 'social-media', ficheComplete: false })

function ouvrirEdition(f: FormateurAdmin) {
  edition.value = f
  Object.assign(fiche, {
    nom: f.nom,
    expertise: f.expertise,
    bio: f.bio,
    photoAlt: f.photoAlt ?? '',
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
    annoncer(`Fiche de ${fiche.nom} enregistrée.`)
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
    annoncer('Ordre de la page publique mis à jour.')
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
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[22px] font-light">
        Formateurs — {{ formateurs?.length ?? 0 }} profils
      </h1>
      <UiBaseButton taille="sm" variante="sombre" @click="ouvrirCreation()">
        + Ajouter un formateur
      </UiBaseButton>
    </div>

    <p v-if="message" class="mb-4 rounded-[12px] border border-succes bg-succes-voile p-3 text-[13.5px] text-succes">{{ message }}</p>
    <p v-if="erreur" class="mb-4 rounded-[12px] border border-erreur bg-erreur-voile p-3 text-[13.5px] text-erreur">{{ erreur }}</p>

    <!-- Largeurs de colonnes de la maquette, écran 11. Les actions n'ont pas
         de colonne : elles se rangent au bout de l'ordre public. -->
    <AdminTableauSimple
      :colonnes="['Formateur', 'Modules', 'Accès', 'Tarif coaching', 'Ordre public']"
      :largeurs="['calc((100% - 465px) * 0.6154)', 'calc((100% - 465px) * 0.3846)', '175px', '120px', '170px']"
      largeur-min="820px"
    >
      <tr
        v-for="f in formateurs"
        :key="f.id"
        :class="tire === f.id && 'opacity-50'"
        @dragover.prevent
        @drop.prevent="deposer(f)"
      >
        <td class="px-[18px] py-3.5">
          <span class="flex items-center gap-2.5">
            <span class="rayures-visuel-social size-[34px] shrink-0 rounded-full" />
            <span class="min-w-0">
              <!-- Le lien vers la fiche publique passe par le nom : la maquette
                   ne montre pas d'action « Voir ». -->
              <NuxtLink :to="`/formateurs/${f.slug}`" class="font-bold text-inherit hover:underline">
                {{ f.nom }}
              </NuxtLink>
              <span class="block text-[11.5px] text-discret">{{ f.expertise }}</span>
            </span>
          </span>
        </td>
        <td class="px-[18px] py-3.5">
          {{ f.nbModules }} module{{ f.nbModules > 1 ? 's' : '' }} ·
          {{ f.nbProgrammes }} programme{{ f.nbProgrammes > 1 ? 's' : '' }}
        </td>
        <td class="px-[18px] py-3.5">
          <span
            class="block rounded-full px-2.5 py-1 text-center text-[10.5px] font-bold whitespace-nowrap"
            :class="f.coachingPriveActif ? 'bg-social-voile text-social' : 'bg-piste text-discret'"
          >
            {{ f.coachingPriveActif ? 'Formateur + coaching privé' : 'Formateur simple' }}
          </span>
        </td>
        <td class="px-[18px] py-3.5">
          <template v-if="f.coachingPriveActif">
            <b>{{ formatFcfa(f.coachingPriveFcfaHeure) }}/h</b>
            <span class="text-[11px] text-discret">(fixe)</span>
          </template>
          <button v-else class="text-[12px] font-bold text-social" @click="activation = f">
            Activer le coaching privé
          </button>
        </td>
        <td class="px-[18px] py-3.5">
          <span class="flex items-center gap-2 text-[12px] font-bold">
            <span
              class="cursor-grab text-discret"
              draggable="true"
              :aria-label="`Déplacer ${f.nom}`"
              @dragstart="tire = f.id"
              @dragend="tire = ''"
            >⋮⋮</span>
            <span class="font-normal">{{ f.ordrePublic }}</span>
            <button class="ml-auto text-social hover:underline" @click="ouvrirEdition(f)">Modifier</button>
            <button class="text-erreur hover:underline" @click="suppression = f">Supprimer</button>
          </span>
        </td>
      </tr>
    </AdminTableauSimple>

    <p class="mt-3 text-[12px] leading-[1.6] text-discret">
      Le profil public (photo, bio, ancre) est modifiable ici ; l’ordre ⋮⋮ pilote la page
      /formateurs. Tarif coaching privé : <b class="text-encre">50 000 FCFA / h, fixe pour tous les
      formateurs</b>. L’accès (Formateur simple / Formateur avec coaching privé) se gère dans
      <NuxtLink to="/admin/parametres" class="font-bold">Paramètres → Administration des accès</NuxtLink>.
    </p>

    <!-- Écran 12 · les candidatures ont leur propre écran, résumé ici en ligne-carte. -->
    <section class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-bloc border border-ligne-douce bg-white px-5 py-4">
      <span class="text-[13.5px]">
        <b class="text-[15px]">Candidatures « Devenir formateur »</b>
        <span class="block text-[12.5px] text-discret">
          {{ (candidatures ?? []).filter((c) => c.statut === 'nouvelle').length }} nouvelle(s) ·
          {{ (candidatures ?? []).filter((c) => c.statut === 'en-etude').length }} en étude
        </span>
      </span>
      <NuxtLink to="/admin/candidatures" class="text-[12.5px] font-bold">
        Ouvrir les candidatures →
      </NuxtLink>
    </section>

    <!-- « + Ajouter un formateur » de l'en-tête : la modale n'était pas montée,
         le bouton de la maquette n'ouvrait rien. -->
    <AdminModaleCreationFormateur
      v-if="creationOuverte"
      :candidature="creation"
      @fermer="creationOuverte = false"
      @cree="creationOuverte = false; message = 'Compte formateur créé.'; apresCreation()"
    />

    <!-- Activation du coaching privé (écran 07b), modale partagée avec
         l'administration des accès. -->
    <AdminModaleCoachingPrive
      v-if="activation"
      :formateur="activation"
      @confirmer="basculerCoachingPrive(activation)"
      @annuler="activation = null"
    />

    <!-- Édition de la fiche publique -->
    <div v-if="edition" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <form class="w-full max-w-lg rounded-carte bg-white p-[26px] shadow-[0_16px_40px_rgba(23,21,28,.12)]" @submit.prevent="enregistrerFiche">
        <h2 class="font-sans text-[16px] font-bold">Fiche de {{ edition.nom }}</h2>
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
            <span class="mb-1.5 block text-[13px] font-bold">Texte alternatif du portrait</span>
            <input v-model="fiche.photoAlt" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]" placeholder="Ce que montre la photo, pour qui ne la voit pas">
            <span class="mt-1 block text-[12px] text-discret">
              Vide, « Portrait de {{ fiche.nom || 'Nom du formateur' }} » est utilisé.
            </span>
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
      <div class="w-full max-w-[460px] rounded-carte bg-white p-[26px] shadow-[0_16px_40px_rgba(23,21,28,.12)]">
        <b class="text-[16px] text-erreur">Supprimer le formateur {{ suppression.nom }} ?</b>
        <p class="mt-2.5 mb-3 text-[13px] leading-[1.6] text-texte">
          Son profil disparaît de la page /formateurs et il ne peut plus être choisi pour un
          coaching privé. <b>Impossible si des modules publiés ou des sessions à venir lui sont
          rattachés</b> — réassignez-les d’abord (ici : {{ compterModules(suppression.nbModules) }} ·
          {{ suppression.sessionsAVenir }} session(s)).
        </p>
        <label v-if="suppression.supprimable" class="mb-3.5 flex flex-col gap-1.5 text-[12.5px] font-bold text-texte">
          Tapez « SUPPRIMER » pour confirmer
          <input
            v-model="confirmation"
            placeholder="SUPPRIMER"
            class="w-full rounded-[10px] border-[1.5px] border-ligne px-[13px] py-[11px] text-[13.5px] font-normal"
          >
        </label>
        <div class="flex gap-2.5">
          <UiBaseButton
            taille="sm"
            variante="danger"
            class="flex-1"
            :disabled="!suppression.supprimable || confirmation !== 'SUPPRIMER'"
          >
            Supprimer définitivement
          </UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" class="flex-1" @click="suppression = null; confirmation = ''">
            Annuler
          </UiBaseButton>
        </div>
        <p class="mt-2.5 text-[11.5px] text-discret">
          Action journalisée · réservée aux admins avec le droit « Formateurs ».
        </p>
      </div>
    </div>
  </div>
</template>
