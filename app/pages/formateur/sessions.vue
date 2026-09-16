<script setup lang="ts">
definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Mes sessions — formateur')

const { data: sessions } = await useFetch<
  {
    id: string
    date: string
    heure: string
    titre?: string
    inscrits: number
    places: number
    statut: string
    participation: number | null
    note: number | null
    nbNotes: number
    thematique: { nom: string } | null
  }[]
>('/api/formateur/sessions')

/** Les plus proches d'abord : la séance à préparer est en tête. */
const ordonnees = computed(() =>
  [...(sessions.value ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
)
const aujourdhui = new Date().toISOString().slice(0, 10)
</script>

<template>
  <div>
    <h1 class="font-title text-[26px] font-light">Mes sessions de coaching</h1>
    <p class="mt-2 max-w-[760px] text-[13.5px] text-discret">
      Le nom d’une session ouvre sa salle : elle accepte l’entrée à partir de 15 minutes avant le
      début.
    </p>

    <AdminTableauSimple
      class="mt-6"
      :colonnes="['Date · Heure', 'Session', 'Inscrits', 'Participation', 'Notes']"
    >
      <tr
        v-for="session in ordonnees"
        :key="session.id"
        :class="session.date >= aujourdhui && session.statut === 'planifiee' ? 'bg-social-voile/40' : ''"
      >
        <td class="px-4 py-3 font-bold whitespace-nowrap">
          {{ formatDateCourte(session.date) }} · {{ session.heure }}
        </td>
        <td class="px-4 py-3">
          <NuxtLink :to="`/formateur/session/${session.id}`" class="hover:underline">
            {{ session.titre || session.thematique?.nom }}
          </NuxtLink>
          <span v-if="session.statut === 'annulee'" class="ml-2 text-[12px] font-bold text-erreur">
            annulée
          </span>
        </td>
        <td class="px-4 py-3">
          <NuxtLink :to="`/formateur/sujets/${session.id}`" class="hover:underline">
            <b>{{ session.inscrits }}</b> / {{ session.places }}
          </NuxtLink>
        </td>
        <td class="px-4 py-3">
          <template v-if="session.participation !== null">
            <b class="text-succes">{{ session.participation }} %</b> présents
          </template>
          <span v-else class="text-discret">à venir</span>
        </td>
        <td class="px-4 py-3">
          <span v-if="session.note" class="font-bold text-alerte">
            {{ session.note.toString().replace('.', ',') }} ★
            <span class="font-normal text-discret">({{ session.nbNotes }})</span>
          </span>
          <NuxtLink
            v-else
            :to="`/formateur/sujets/${session.id}`"
            class="text-[12px] font-bold text-social hover:underline"
          >
            {{ session.inscrits }} sujets →
          </NuxtLink>
        </td>
      </tr>
    </AdminTableauSimple>

    <p class="mt-3 text-[12px] leading-relaxed text-discret">
      Le planning est fixé par l’équipe Big Five. La présence Zoom est pointée automatiquement ; les
      notes proviennent de l’évaluation post-session des apprenants. Cliquer « inscrits » ouvre la
      liste avec accès aux fiches profils.
    </p>
  </div>
</template>
