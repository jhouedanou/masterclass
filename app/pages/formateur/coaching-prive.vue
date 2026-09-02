<script setup lang="ts">
import type { CreneauCoaching, HistoriqueCoachingPrive, StatutCoachingPrive } from '#shared/types'

definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Coaching privé — formateur')

const { data } = await useFetch<{
  actif: boolean
  seances: {
    id: string
    apprenant: string
    utilisateurId: string
    module: string
    creneau: string | null
    creneaux: CreneauCoaching[]
    dureeMinutes: number
    statut: StatutCoachingPrive
    paye: boolean
    lienSession: string | null
    sujets: string
    historique: HistoriqueCoachingPrive[]
  }[]
}>('/api/formateur/coaching-prive')
</script>

<template>
  <div v-if="data">
    <h1 class="font-title text-[26px] font-light">Coaching privé</h1>
    <p class="mt-2 max-w-[720px] text-[13.5px] text-discret">
      Tarif fixe plateforme : 50 000 FCFA / h. La planification et le paiement sont gérés par
      l’équipe — vous animez. L’apprenant soumet obligatoirement ses préoccupations avant la séance.
    </p>

    <!-- État verrouillé (planche D, écran 05) : la section s'ouvre depuis
         l'administration, avec l'accès « Formateur avec coaching privé ». -->
    <div v-if="!data.actif" class="mt-8 rounded-[14px] border border-dashed border-ligne bg-fond-clair p-8 text-center">
      <Icon name="ph:lock-simple" size="40" class="text-discret" />
      <h2 class="mt-3 font-title text-[21px] font-light">Section verrouillée</h2>
      <p class="mx-auto mt-2 max-w-[520px] text-[14px] text-texte">
        Le coaching privé n’est pas activé sur votre compte. Il s’ouvre à la demande, par
        l’équipe E-Masterclass Big Five : vous apparaîtrez alors dans les demandes des apprenants.
      </p>
      <UiBaseButton
        class="mt-5"
        taille="sm"
        variante="whatsapp"
        :href="lienWhatsApp('Bonjour, je souhaite activer le coaching privé sur mon compte formateur.')"
      >
        Demander l’activation
      </UiBaseButton>
    </div>

    <template v-else>
      <p v-if="!data.seances.length" class="mt-6 text-[13.5px] text-discret">Aucune demande pour le moment.</p>
      <div class="mt-6 flex flex-col gap-4">
        <article
          v-for="seance in data.seances"
          :key="seance.id"
          class="rounded-[14px] border bg-white p-6"
          :class="seance.statut === 'payee' ? 'border-succes' : 'border-ligne-douce'"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="font-title text-[19px] font-light">
                {{ seance.apprenant }}
                <span v-if="seance.creneau" class="text-texte"> — {{ seance.creneau }} · {{ formatDuree(seance.dureeMinutes) }}</span>
                <span v-else class="text-texte"> — demande en cours de traitement par l’équipe</span>
              </h2>
              <p class="mt-1 text-[12.5px] text-discret">{{ seance.module }}</p>
              <p v-if="seance.sujets" class="mt-2 max-w-[640px] whitespace-pre-line text-[14px] text-texte">
                {{ seance.sujets }}
              </p>
            </div>
            <span class="rounded-full px-3 py-1.5 text-[12px] font-bold" :class="CLASSES_COACHING_PRIVE[seance.statut]">
              {{ LIBELLES_COACHING_PRIVE[seance.statut] }}{{ seance.paye ? ' · payée ✓' : '' }}
            </span>
          </div>

          <div v-if="seance.statut === 'payee'" class="mt-4 flex flex-wrap gap-2">
            <UiBaseButton v-if="seance.lienSession" taille="sm" :href="seance.lienSession">Démarrer la session</UiBaseButton>
            <span v-else class="self-center text-[13px] text-discret">Lien de session en attente de planification.</span>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>
