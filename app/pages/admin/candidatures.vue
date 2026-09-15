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

const filtre = ref<'toutes' | CandidatureFormateur['statut']>('toutes')
const FILTRES = [
  { cle: 'toutes', libelle: 'Toutes' },
  { cle: 'nouvelle', libelle: 'Nouvelles' },
  { cle: 'en-etude', libelle: 'En étude' },
  { cle: 'acceptee', libelle: 'Acceptées' },
  { cle: 'refusee', libelle: 'Refusées' },
] as const

const visibles = computed(() =>
  (candidatures.value ?? []).filter((c) => filtre.value === 'toutes' || c.statut === filtre.value),
)
const compte = (cle: string) => (candidatures.value ?? []).filter((c) => c.statut === cle).length
</script>

<template>
  <div>
    <h1 class="font-title text-[26px] font-light">Candidatures « Devenir formateur »</h1>
    <p class="mt-2 max-w-[720px] text-[13.5px] text-discret">
      Les candidatures reçues depuis la page publique. Créer le compte depuis une candidature la
      marque acceptée et prérempli la fiche du formateur.
    </p>

    <p v-if="message" class="mt-4 rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[14px] text-succes">{{ message }}</p>
    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-[#fdeeee] px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>

    <div class="mt-5 flex flex-wrap gap-2" role="group">
      <button
        v-for="f in FILTRES"
        :key="f.cle"
        class="rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold"
        :class="filtre === f.cle ? 'border-encre bg-encre text-white' : 'border-ligne text-texte'"
        :aria-pressed="filtre === f.cle"
        @click="filtre = f.cle"
      >
        {{ f.libelle }}
        <span class="font-normal">
          ({{ f.cle === 'toutes' ? (candidatures ?? []).length : compte(f.cle) }})
        </span>
      </button>
    </div>

    <div class="mt-4 flex flex-col gap-3">
      <article
        v-for="candidature in visibles"
        :key="candidature.id"
        class="rounded-[14px] border border-ligne-douce bg-white p-5"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-[280px] flex-1">
            <h2 class="font-title text-[18px] font-light">
              {{ candidature.nom }} — {{ candidature.expertise }}
            </h2>
            <p class="mt-2 whitespace-pre-line text-[13.5px] text-texte">{{ candidature.message }}</p>
            <p class="mt-1 text-[12.5px] text-discret">
              {{ candidature.whatsapp }}<span v-if="candidature.email"> · {{ candidature.email }}</span>
              <a v-if="candidature.lien" :href="candidature.lien" target="_blank" rel="noopener" class="underline"> · lien joint</a>
              · reçue le {{ formatDate(candidature.recueLe) }}
            </p>
          </div>
          <span
            class="rounded-full px-3 py-1.5 text-[12px] font-bold"
            :class="{
              'bg-alerte-voile text-alerte': candidature.statut === 'nouvelle',
              'bg-social-voile text-social': candidature.statut === 'en-etude',
              'bg-succes-voile text-succes': candidature.statut === 'acceptee',
              'bg-fond-voile text-discret': candidature.statut === 'refusee',
            }"
          >
            {{ LIBELLES_CANDIDATURE[candidature.statut] }}
          </span>
        </div>

        <div v-if="candidature.statut !== 'acceptee'" class="mt-4 flex flex-wrap gap-2">
          <UiBaseButton
            taille="sm"
            variante="whatsapp"
            :href="lienWhatsApp(`Bonjour ${candidature.nom}, nous revenons vers vous au sujet de votre candidature formateur.`)"
          >
            Contacter sur WhatsApp
          </UiBaseButton>
          <UiBaseButton v-if="candidature.statut === 'nouvelle'" taille="sm" variante="contour" @click="traiterCandidature(candidature, 'en-etude')">
            Marquer en étude
          </UiBaseButton>
          <UiBaseButton v-if="candidature.statut !== 'refusee'" taille="sm" variante="sombre" @click="ouvrirCreation(candidature)">
            Créer le compte formateur
          </UiBaseButton>
          <UiBaseButton v-if="candidature.statut !== 'refusee'" taille="sm" variante="contour" @click="traiterCandidature(candidature, 'refuser')">
            Refuser
          </UiBaseButton>
          <UiBaseButton v-else taille="sm" variante="contour" @click="traiterCandidature(candidature, 'nouvelle')">
            Rouvrir
          </UiBaseButton>
        </div>
        <p v-else class="mt-3 text-[12.5px] text-succes">
          Compte formateur créé<span v-if="candidature.traiteeLe"> le {{ formatDate(candidature.traiteeLe) }}</span>.
        </p>
      </article>

      <p v-if="!visibles.length" class="rounded-[14px] border border-dashed border-ligne p-8 text-center text-[13.5px] text-discret">
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
