<script setup lang="ts">
import type { DemandeCoachingPrive } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Coaching privé — administration')

const { data } = await useFetch<{
  demandes: (DemandeCoachingPrive & { module: string; montant: number })[]
  statistiquesFormateurs: {
    id: string
    nom: string
    nbModules: number
    inscrits: number
    completion: number
    /** `null` tant qu'aucune présence n'a été relevée sur ses séances. */
    presence: number | null
    coachingPrive: number
  }[]
}>('/api/admin/coaching-prive')

const libelles: Record<string, string> = {
  'en-attente': 'En attente',
  'confirmee-attente-paiement': 'Confirmée — en attente de paiement',
  payee: 'Payée',
  realisee: 'Réalisée',
}
</script>

<template>
  <div v-if="data">
    <h1 class="font-title text-[26px] font-light">Demandes de coaching privé</h1>
    <p class="mt-2 text-[12.5px] text-discret">
      Tarif fixe : 50 000 FCFA / h. Aucun paiement n’est demandé avant confirmation. Rappel
      automatique à l’équipe si aucune réponse sous 48 h (à brancher).
    </p>

    <div class="mt-5 flex flex-col gap-4">
      <article
        v-for="demande in data.demandes"
        :key="demande.id"
        class="rounded-[14px] border bg-white p-6"
        :class="demande.statut === 'payee' ? 'border-succes' : 'border-ligne-douce'"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-[280px] flex-1">
            <h2 class="font-title text-[19px] font-light">
              {{ demande.apprenant }} — {{ demande.module }}
            </h2>
            <p class="mt-2 text-[13.5px] text-texte">
              <span class="text-discret">Besoins :</span> « {{ demande.besoins }} »
            </p>
            <p class="mt-1 text-[13.5px] text-texte">
              <span class="text-discret">Disponibilités :</span> {{ demande.disponibilites }}
            </p>
            <p v-if="demande.creneau" class="mt-1 text-[13px] text-succes">
              Créneau retenu : {{ demande.creneau }}
            </p>
          </div>
          <div class="text-right">
            <span
              class="inline-block rounded-full px-3 py-1.5 text-[12px] font-bold"
              :class="{
                'bg-alerte-voile text-alerte': demande.statut === 'en-attente',
                'bg-social-voile text-social': demande.statut === 'confirmee-attente-paiement',
                'bg-succes-voile text-succes': demande.statut === 'payee' || demande.statut === 'realisee',
              }"
            >
              {{ libelles[demande.statut] }}
            </span>
            <p class="mt-2 text-[13px] text-texte">
              {{ demande.heures }} h — {{ formatFcfa(demande.montant) }}
            </p>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <UiBaseButton v-if="demande.statut === 'en-attente'" taille="sm">
            Confirmer + envoyer le lien de paiement
          </UiBaseButton>
          <UiBaseButton v-else-if="demande.statut === 'payee'" taille="sm" variante="sombre">
            Générer le lien de session
          </UiBaseButton>
          <UiBaseButton taille="sm" variante="contour">Voir la fiche apprenant</UiBaseButton>
        </div>
        <p v-if="demande.statut === 'payee'" class="mt-3 text-[12.5px] text-discret">
          La génération crée l’événement d’agenda avec l’apprenant et le formateur (date, heure,
          thématique, problématique) et envoie la confirmation — intégration à brancher.
        </p>
      </article>
    </div>

    <h2 class="mt-10 font-title text-[19px] font-light">Statistiques par formateur</h2>
    <p class="mt-1 text-[12.5px] text-discret">
      Vue consolidée : chaque formateur ne voit que ses propres chiffres dans son espace.
    </p>
    <AdminTableauSimple
      class="mt-3"
      :colonnes="['Formateur', 'Modules', 'Inscrits', 'Complétion', 'Présence sessions', 'Coaching privé']"
    >
      <tr v-for="f in data.statistiquesFormateurs" :key="f.id">
        <td class="px-4 py-3 font-bold">{{ f.nom }}</td>
        <td class="px-4 py-3">{{ f.nbModules }}</td>
        <td class="px-4 py-3">{{ f.inscrits }}</td>
        <td class="px-4 py-3">{{ f.completion }} %</td>
        <td class="px-4 py-3">{{ f.presence === null ? '—' : `${f.presence} %` }}</td>
        <td class="px-4 py-3">{{ f.coachingPrive }}</td>
      </tr>
    </AdminTableauSimple>
  </div>
</template>
