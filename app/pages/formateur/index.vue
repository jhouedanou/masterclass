<script setup lang="ts">
definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Espace formateur')

const auth = useAuthStore()
const { data } = await useFetch<{
  inscrits: number
  nouveaux: number
  completionMoyenne: number
  nbModules: number
  // `null` tant qu'aucune présence n'a été relevée en séance et tant qu'aucun
  // apprenant n'a noté : l'absence de mesure n'est pas une mesure nulle.
  presenceMoyenne: number | null
  noteMoyenne: number | null
  nbNotes: number
  remunerationDuMois: number
  prochaineSession: {
    date: string
    heure: string
    inscrits: number
    places: number
    thematique: { nom: string } | null
  } | null
  sujets: { apprenant: string; sujet: string }[]
  dernieresNotes: { note: number; commentaire: string; origine: string }[]
}>('/api/formateur/tableau-bord')
</script>

<template>
  <div v-if="data">
    <h1 class="font-title text-[26px] font-light">
      Bonjour {{ auth.utilisateur?.prenom }} — vos indicateurs du mois
    </h1>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[13px] text-discret">Apprenants inscrits</p>
        <p class="mt-1 font-title text-[30px] font-light">{{ data.inscrits }}</p>
        <p class="mt-1 text-[12px] text-succes">+{{ data.nouveaux }} ce mois</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[13px] text-discret">Complétion moyenne</p>
        <p class="mt-1 font-title text-[30px] font-light">{{ data.completionMoyenne }} %</p>
        <p class="mt-1 text-[12px] text-discret">sur vos {{ data.nbModules }} modules</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[13px] text-discret">Présence en session</p>
        <p class="mt-1 font-title text-[30px] font-light">
          {{ data.presenceMoyenne === null ? '—' : `${data.presenceMoyenne} %` }}
        </p>
        <p class="mt-1 text-[12px] text-discret">
          {{ data.presenceMoyenne === null ? 'aucune présence relevée' : 'moyenne de vos séances' }}
        </p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[13px] text-discret">Note moyenne</p>
        <p class="mt-1 font-title text-[30px] font-light">
          <template v-if="data.noteMoyenne === null">—</template>
          <template v-else>
            {{ data.noteMoyenne.toString().replace('.', ',') }} <span class="text-alerte">★</span>
          </template>
        </p>
        <p class="mt-1 text-[12px] text-discret">{{ data.nbNotes }} notes reçues</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[13px] text-discret">Rémunération du mois</p>
        <p class="mt-1 font-title text-[30px] font-light">{{ formatFcfa(data.remunerationDuMois) }}</p>
        <NuxtLink to="/formateur/revenus" class="mt-1 block text-[12px] underline">
          détail dans Revenus
        </NuxtLink>
      </div>
    </div>

    <section
      v-if="data.prochaineSession"
      class="mt-6 flex flex-wrap items-center gap-5 rounded-[14px] border border-social-bordure bg-social-voile p-6"
    >
      <div class="rounded-[12px] bg-social px-5 py-3 text-center text-white">
        <p class="font-title text-[24px] font-light">
          {{ new Date(data.prochaineSession.date).getDate() }}
        </p>
        <p class="text-[11px] tracking-wider uppercase">
          {{ new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(data.prochaineSession.date)) }}
        </p>
      </div>
      <div class="min-w-[280px] flex-1">
        <p class="font-title text-[19px] font-light">
          Votre prochaine session — {{ formatDate(data.prochaineSession.date) }} ·
          {{ data.prochaineSession.heure }}
        </p>
        <p class="mt-1 text-[13.5px] text-texte">
          {{ data.prochaineSession.thematique?.nom }} ·
          {{ data.prochaineSession.inscrits }}/{{ data.prochaineSession.places }} inscrits · les
          sujets soumis par les inscrits sont prêts à consulter
        </p>
      </div>
      <UiBaseButton taille="sm">Démarrer la session</UiBaseButton>
    </section>

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Sujets soumis pour la prochaine session</h2>
        <ul class="mt-4 space-y-3">
          <li v-for="sujet in data.sujets" :key="sujet.apprenant" class="text-[14px]">
            <span class="font-bold">{{ sujet.apprenant }}</span>
            <span class="text-texte"> — « {{ sujet.sujet }} »</span>
          </li>
        </ul>
      </section>

      <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Dernières notes reçues</h2>
        <ul class="mt-4 space-y-3">
          <li v-for="(note, i) in data.dernieresNotes" :key="i" class="text-[14px]">
            <span class="text-alerte">{{ '★'.repeat(note.note) }}</span>
            <span class="text-texte"> « {{ note.commentaire }} »</span>
            <span class="text-discret"> — {{ note.origine }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
