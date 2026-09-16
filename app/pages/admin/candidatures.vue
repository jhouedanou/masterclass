<script setup lang="ts">
import type { CandidatureFormateur } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Candidatures formateurs — administration')

/**
 * Écran 12. Il partage un artboard avec la gestion des formateurs, mais le
 * droit « candidatures-formateurs » existe pour qu'on puisse traiter les
 * candidatures sans accéder à la liste des formateurs : d'où une page à part.
 */
const { data: candidatures, refresh } = await useFetch<CandidatureFormateur[]>(
  '/api/admin/candidatures',
)

const message = ref('')
const erreur = ref('')

/** Modale de création : `null` fermée, `undefined` à vide, sinon depuis une
 *  candidature dont les champs sont préremplis. */
const creation = ref<CandidatureFormateur | null | undefined>(null)
const creationOuverte = ref(false)

function ouvrirCreation(candidature?: CandidatureFormateur) {
  creation.value = candidature ?? undefined
  creationOuverte.value = true
}

async function traiterCandidature(
  c: CandidatureFormateur,
  action: 'en-etude' | 'refuser' | 'nouvelle',
) {
  erreur.value = ''
  try {
    await $fetch('/api/admin/candidatures', { method: 'PATCH', body: { id: c.id, action } })
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Action impossible.'
  }
}

const LIBELLES_CANDIDATURE: Record<CandidatureFormateur['statut'], string> = {
  nouvelle: 'Nouvelle',
  'en-etude': 'En étude',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
}

const filtre = ref('toutes')
const FILTRES = [
  { valeur: 'toutes', libelle: 'Tous statuts' },
  { valeur: 'nouvelle', libelle: 'Nouvelles' },
  { valeur: 'en-etude', libelle: 'En étude' },
  { valeur: 'acceptee', libelle: 'Acceptées' },
  { valeur: 'refusee', libelle: 'Refusées' },
]

const visibles = computed(() =>
  (candidatures.value ?? []).filter((c) => filtre.value === 'toutes' || c.statut === filtre.value),
)
const compte = (cle: string) => (candidatures.value ?? []).filter((c) => c.statut === cle).length

/**
 * La maquette ne déploie une carte que pour les candidatures à traiter ; une
 * candidature classée se range en ligne-carte, libellé et pastille.
 */
const A_TRAITER: string[] = ['nouvelle', 'en-etude']
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[22px] font-light">
        Candidatures formateurs
        <span
          v-if="compte('nouvelle')"
          class="ml-1 rounded-full bg-social px-2.5 py-[3px] align-middle text-[12px] font-sans font-bold text-white"
        >{{ compte('nouvelle') }} nouvelle{{ compte('nouvelle') > 1 ? 's' : '' }}</span>
      </h1>
      <UiFiltrePilule v-model="filtre" etiquette="Statut" :options="FILTRES" />
    </div>

    <p v-if="message" class="mb-4 rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[13.5px] text-succes">{{ message }}</p>
    <p v-if="erreur" class="mb-4 rounded-[10px] border border-erreur bg-erreur-voile px-4 py-3 text-[13.5px] text-erreur">{{ erreur }}</p>

    <div class="flex flex-col gap-3">
      <template v-for="candidature in visibles" :key="candidature.id">
        <article
          v-if="A_TRAITER.includes(candidature.statut)"
          class="rounded-bloc border border-ligne-douce bg-white p-5"
        >
          <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
            <b class="text-[14.5px]">{{ candidature.nom }} — {{ candidature.expertise }}</b>
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
              :class="candidature.statut === 'nouvelle' ? 'bg-alerte-voile text-alerte' : 'bg-[#eef0fa] text-entrepreneurs'"
            >{{ LIBELLES_CANDIDATURE[candidature.statut] }}</span>
          </div>
          <p class="mb-3 text-[12.5px] leading-[1.6] text-texte">
            {{ candidature.message }} · {{ candidature.whatsapp }}
            <template v-if="candidature.email"> · {{ candidature.email }}</template>
            <a v-if="candidature.lien" :href="candidature.lien" target="_blank" rel="noopener"> · lien joint</a>
            · reçue le {{ formatDate(candidature.recueLe) }}
          </p>
          <div class="flex flex-wrap items-center gap-2 text-[12.5px] font-bold">
            <UiBaseButton
              taille="sm"
              variante="sombre"
              :href="lienWhatsApp(`Bonjour ${candidature.nom}, nous revenons vers vous au sujet de votre candidature formateur.`)"
            >
              Contacter sur WhatsApp
            </UiBaseButton>
            <UiBaseButton
              v-if="candidature.statut === 'nouvelle'"
              taille="sm"
              variante="contour"
              @click="traiterCandidature(candidature, 'en-etude')"
            >
              Marquer en étude
            </UiBaseButton>
            <UiBaseButton taille="sm" variante="contour" @click="ouvrirCreation(candidature)">
              Créer le compte formateur
            </UiBaseButton>
            <!-- Refuser est destructif : lien rouge, sans contour. -->
            <button class="px-1.5 py-2.5 text-erreur hover:underline" @click="traiterCandidature(candidature, 'refuser')">
              Refuser
            </button>
          </div>
        </article>

        <article
          v-else
          class="flex flex-wrap items-center justify-between gap-3 rounded-bloc border border-ligne-douce bg-white px-5 py-4 text-[13px]"
        >
          <span><b>{{ candidature.nom }}</b> — {{ candidature.expertise }}</span>
          <span class="flex items-center gap-2.5">
            <button
              v-if="candidature.statut === 'refusee'"
              class="text-[12.5px] font-bold"
              @click="traiterCandidature(candidature, 'nouvelle')"
            >
              Rouvrir
            </button>
            <span v-else-if="candidature.traiteeLe" class="text-[12px] text-discret">
              Compte créé le {{ formatDate(candidature.traiteeLe) }}
            </span>
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
              :class="candidature.statut === 'acceptee' ? 'bg-succes-voile text-succes' : 'bg-piste text-discret'"
            >{{ LIBELLES_CANDIDATURE[candidature.statut] }}</span>
          </span>
        </article>
      </template>

      <p v-if="!visibles.length" class="rounded-bloc border border-dashed border-ligne p-8 text-center text-[13.5px] text-discret">
        Aucune candidature dans ce filtre.
      </p>
    </div>

    <AdminModaleCreationFormateur
      v-if="creationOuverte"
      :candidature="creation"
      @fermer="creationOuverte = false"
      @cree="creationOuverte = false; message = 'Compte formateur créé.'; refresh()"
    />
  </div>
</template>
