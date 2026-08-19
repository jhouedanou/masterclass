<script setup lang="ts">
definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Coaching privé — formateur')

const { data: seances } = await useFetch<
  {
    id: string
    apprenant: string
    date: string | null
    creneau: string | null
    dureeMinutes: number
    statut: string
    paye: boolean
    sujets: string
    note?: number
  }[]
>('/api/formateur/coaching-prive')
</script>

<template>
  <div>
    <h1 class="font-title text-[26px] font-light">Coaching privé</h1>
    <p class="mt-2 max-w-[720px] text-[13.5px] text-discret">
      Tarif fixe plateforme : 50 000 FCFA / h. La planification et le paiement sont gérés par
      l’équipe — vous animez. L’apprenant soumet obligatoirement ses préoccupations avant la séance.
    </p>

    <div class="mt-6 flex flex-col gap-4">
      <article
        v-for="seance in seances"
        :key="seance.id"
        class="rounded-[14px] border bg-white p-6"
        :class="seance.statut === 'confirmee' ? 'border-succes' : 'border-ligne-douce'"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="font-title text-[19px] font-light">
              {{ seance.apprenant }}
              <span v-if="seance.date" class="text-texte">
                — {{ formatDate(seance.date) }} · {{ seance.creneau }} ·
                {{ formatDuree(seance.dureeMinutes) }}
              </span>
              <span v-else class="text-texte"> — demande en cours de traitement par l’équipe</span>
            </h2>
            <p v-if="seance.sujets" class="mt-2 max-w-[640px] text-[14px] text-texte">
              Sujets soumis : « {{ seance.sujets }} »
            </p>
          </div>
          <span
            class="rounded-full px-3 py-1.5 text-[12px] font-bold"
            :class="{
              'bg-succes-voile text-succes': seance.statut === 'confirmee',
              'bg-alerte-voile text-alerte': seance.statut === 'en-attente',
              'bg-fond-voile text-discret': seance.statut === 'realisee',
            }"
          >
            {{
              seance.statut === 'confirmee'
                ? `Confirmée${seance.paye ? ' · payée ✓' : ''}`
                : seance.statut === 'en-attente'
                  ? 'En attente'
                  : `Réalisée${seance.note ? ` · ${seance.note} ★` : ''}`
            }}
          </span>
        </div>

        <div v-if="seance.statut === 'confirmee'" class="mt-4 flex flex-wrap gap-2">
          <UiBaseButton taille="sm">Démarrer la session (jour J)</UiBaseButton>
          <UiBaseButton taille="sm" variante="contour">Voir la fiche apprenant</UiBaseButton>
        </div>
      </article>
    </div>
  </div>
</template>
