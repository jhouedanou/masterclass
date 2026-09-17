<script setup lang="ts">
import type { CreneauCoaching, HistoriqueCoachingPrive, StatutCoachingPrive } from '#shared/types'

definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Coaching privé — formateur')

const { data, refresh } = await useFetch<{
  actif: boolean
  tarifFcfaHeure: number
  activationDemandeeLe: string | null
  seances: {
    id: string
    apprenant: string
    utilisateurId: string
    module: string
    creneau: string | null
    creneaux: CreneauCoaching[]
    heures: number
    dureeMinutes: number
    statut: StatutCoachingPrive
    paye: boolean
    lienSession: string | null
    sujets: string
    agendaCree: boolean
    /** Note laissée par l'apprenant, une fois la séance réalisée. */
    note: number | null
    historique: HistoriqueCoachingPrive[]
  }[]
}>('/api/formateur/coaching-prive')

const envoi = ref(false)
const erreur = ref('')

async function demanderActivation() {
  envoi.value = true
  erreur.value = ''
  try {
    await $fetch('/api/formateur/demande-activation', { method: 'POST' })
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Demande impossible pour l’instant.'
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <div v-if="data">
    <h1 class="font-title text-[22px] font-light">Coaching privé</h1>
    <p class="mt-1 max-w-[720px] text-[12.5px] text-discret">
      Tarif fixe plateforme : {{ formatFcfa(data.tarifFcfaHeure) }} / h. La planification et le
      paiement sont gérés par l’équipe — vous animez.
    </p>

    <!-- État verrouillé (planche D, écran 05, panneau de droite) : la section
         s'ouvre depuis l'administration, avec l'accès « Formateur avec
         coaching privé ». -->
    <div
      v-if="!data.actif"
      class="mx-auto mt-8 max-w-[420px] rounded-[14px] border border-ligne bg-white p-9 text-center"
    >
      <p class="surtitre-menu text-discret">État — formateur simple (section verrouillée)</p>
      <span class="mx-auto mt-4.5 grid size-14 place-items-center rounded-full bg-piste text-discret">
        <Icon name="ph:lock-simple" size="24" />
      </span>
      <b class="mt-3 block text-[16px]">Coaching privé non activé</b>
      <p class="mx-auto mt-2 max-w-[300px] text-[13px] leading-relaxed text-discret">
        Votre accès actuel est « Formateur simple ». L’équipe Big Five peut activer le coaching
        privé pour votre profil : vous apparaîtrez alors sur /formateurs au tarif fixe de
        {{ formatFcfa(data.tarifFcfaHeure) }} / h.
      </p>
      <UiBaseButton
        v-if="!data.activationDemandeeLe"
        class="mt-4"
        variante="contour"
        taille="sm"
        :disabled="envoi"
        @click="demanderActivation"
      >
        Demander l’activation à l’équipe
      </UiBaseButton>
      <p v-else class="mt-4 rounded-[10px] bg-succes-voile px-4 py-3 text-[13px] font-bold text-succes">
        Demande envoyée le {{ formatDate(data.activationDemandeeLe) }} — l’équipe vous répondra.
      </p>
      <p v-if="erreur" class="mt-3 text-[13px] text-erreur">{{ erreur }}</p>
    </div>

    <template v-else>
      <p v-if="!data.seances.length" class="mt-4 text-[13.5px] text-discret">
        Aucune demande pour le moment.
      </p>
      <div class="mt-4 flex flex-col gap-3">
        <article
          v-for="seance in data.seances"
          :key="seance.id"
          class="rounded-[14px] bg-white"
          :class="seance.statut === 'payee'
            ? 'border-[1.5px] border-social p-5'
            : seance.statut === 'realisee'
              ? 'border border-ligne-douce px-5 py-4 opacity-80'
              : 'border border-ligne-douce px-5 py-4'"
        >
          <!-- Séance confirmée : carte de contenu, titre 15 px et rangée
               d'actions. Les autres états tiennent sur une ligne-carte de
               13,5 px, comme la maquette. -->
          <template v-if="seance.statut === 'payee'">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="font-sans text-[15px] font-bold">
                {{ seance.apprenant }}
                <template v-if="seance.creneau">— {{ seance.creneau }} · {{ seance.heures }} h</template>
              </h2>
              <span
                class="rounded-full px-2.5 py-1 text-[11px] font-bold"
                :class="CLASSES_COACHING_PRIVE[seance.statut]"
              >
                Confirmée{{ seance.paye ? ' · payée ✓' : '' }}
              </span>
            </div>

            <p v-if="seance.sujets" class="mt-2 max-w-[640px] text-[13px] leading-relaxed text-texte">
              <b>Sujets soumis :</b> {{ seance.sujets }}
            </p>

            <div class="mt-3 flex flex-wrap items-center gap-2.5">
              <UiBaseButton taille="sm" :to="`/formateur/session/prive-${seance.id}`">
                Démarrer la session (jour J)
              </UiBaseButton>
              <!-- Contour gris clair, comme « Changer la photo » de l'écran 02. -->
              <NuxtLink
                :to="`/formateur/apprenant/${seance.utilisateurId}`"
                class="rounded-full border-[1.5px] border-ligne px-5 py-2.75 text-[12.5px] font-bold text-texte transition hover:bg-fond-clair"
              >
                Voir la fiche apprenant
              </NuxtLink>
              <span v-if="seance.agendaCree" class="text-[11.5px] text-discret">
                Événement Google Agenda créé — rappels automatiques
              </span>
              <span v-else class="text-[11.5px] text-discret">
                Créneau en attente de planification par l’équipe.
              </span>
            </div>
          </template>

          <div v-else class="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
            <span>
              <NuxtLink
                :to="`/formateur/apprenant/${seance.utilisateurId}`"
                class="font-bold text-inherit hover:underline"
              >
                {{ seance.apprenant }}
              </NuxtLink>
              <template v-if="seance.creneau">
                — {{ seance.creneau }} · {{ seance.heures }} h ·
                {{ LIBELLES_COACHING_PRIVE[seance.statut].toLowerCase() }}
                <template v-if="seance.note">
                  · notée <b class="text-or">{{ seance.note }} ★</b>
                </template>
              </template>
              <template v-else>
                — demande en cours de traitement par l’équipe (créneau à confirmer)
              </template>
            </span>
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
              :class="CLASSES_COACHING_PRIVE[seance.statut]"
            >
              {{ LIBELLES_COACHING_PRIVE[seance.statut] }}
            </span>
          </div>
        </article>
      </div>

      <p class="mt-3.5 rounded-[12px] border border-ligne-douce bg-white px-4.5 py-3.5 text-[12.5px] leading-relaxed text-discret">
        L’apprenant soumet obligatoirement ses préoccupations avant d’entrer en session — vous les
        recevez ici et par email. Votre rémunération coaching apparaît dans l’onglet Revenus.
      </p>
    </template>
  </div>
</template>
