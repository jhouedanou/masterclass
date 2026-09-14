<script setup lang="ts">
definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Espace formateur')

const auth = useAuthStore()

/** Filtres d'en-tête (planche D, écran 01) : le mois et le module. */
const mois = ref(new Date().toISOString().slice(0, 7))
const moduleChoisi = ref('')

const { data } = await useFetch<{
  mois: string
  moduleId: string
  mesModules: { id: string; titre: string }[]
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
    id: string
    date: string
    heure: string
    inscrits: number
    places: number
    modulesCouverts: number[]
    nbSujets: number
    thematique: { nom: string } | null
  } | null
  sujets: { utilisateurId: string; apprenant: string; sujet: string; lu: boolean }[]
  aTraiter: {
    coachingPrive: number
    sujetsALire: number
    nouvellesNotes: number
    prochaineSessionDate: string | null
  }
  dernieresNotes: { note: number; commentaire: string; origine: string; date: string }[]
}>('/api/formateur/tableau-bord', {
  query: { mois, module: moduleChoisi },
})

/** Douze mois glissants, du plus récent au plus ancien. */
const optionsMois = computed(() =>
  Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setUTCDate(1)
    d.setUTCMonth(d.getUTCMonth() - i)
    const valeur = d.toISOString().slice(0, 7)
    return { valeur, libelle: formatMois(valeur) }
  }),
)

const optionsModules = computed(() => [
  { valeur: '', libelle: 'Tous mes modules' },
  ...(data.value?.mesModules ?? []).map((m) => ({ valeur: m.id, libelle: m.titre })),
])
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">
        Bonjour {{ auth.utilisateur?.prenom }} — vos indicateurs du mois
      </h1>
      <div class="flex flex-wrap gap-2.5">
        <FormateurFiltrePilule v-model="mois" etiquette="Mois" :options="optionsMois" />
        <FormateurFiltrePilule v-model="moduleChoisi" etiquette="Module" :options="optionsModules" />
      </div>
    </div>

    <div class="mt-6 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[12px] text-discret">Apprenants inscrits</p>
        <p class="mt-1 font-title text-[27px] font-light">{{ data.inscrits }}</p>
        <p class="mt-1 text-[11.5px] font-bold text-succes">+{{ data.nouveaux }} ce mois</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[12px] text-discret">Complétion moyenne</p>
        <p class="mt-1 font-title text-[27px] font-light">{{ data.completionMoyenne }} %</p>
        <p class="mt-1 text-[11.5px] text-discret">sur vos {{ data.nbModules }} modules</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[12px] text-discret">Présence en session</p>
        <p class="mt-1 font-title text-[27px] font-light">
          {{ data.presenceMoyenne === null ? '—' : `${data.presenceMoyenne} %` }}
        </p>
        <p class="mt-1 text-[11.5px] text-discret">
          {{ data.presenceMoyenne === null ? 'aucune présence relevée' : 'moyenne des 6 dernières' }}
        </p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[12px] text-discret">Note moyenne</p>
        <p class="mt-1 font-title text-[27px] font-light">
          <template v-if="data.noteMoyenne === null">—</template>
          <template v-else>
            {{ data.noteMoyenne.toString().replace('.', ',') }} <span class="text-[14px] text-alerte">★</span>
          </template>
        </p>
        <p class="mt-1 text-[11.5px] text-discret">{{ data.nbNotes }} notes reçues</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[12px] text-discret">Rémunération du mois</p>
        <p class="mt-1 font-title text-[27px] font-light">{{ formatFcfa(data.remunerationDuMois) }}</p>
        <NuxtLink to="/formateur/revenus" class="mt-1 block text-[11.5px] text-discret underline">
          détail dans Revenus
        </NuxtLink>
      </div>
    </div>

    <div class="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <div class="flex flex-col gap-4">
        <!-- Prochaine séance à animer, quel que soit le mois affiché. -->
        <section
          v-if="data.prochaineSession"
          class="sur-sombre flex flex-wrap items-center gap-5 rounded-[16px] bg-encre p-6 text-white"
        >
          <div class="rounded-[10px] bg-encre-800 px-4 py-2.5 text-center">
            <b class="block font-title text-[20px] font-light text-social-clair">
              {{ new Date(data.prochaineSession.date).getUTCDate() }}
            </b>
            <span class="text-[11px] font-bold tracking-wider text-social-clair uppercase">
              {{ new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(new Date(data.prochaineSession.date)).replace('.', '') }}
            </span>
          </div>
          <div class="min-w-[260px] flex-1">
            <b class="text-[15.5px]">
              Votre prochaine coaching session — {{ formatDateCourte(data.prochaineSession.date) }} ·
              {{ data.prochaineSession.heure }} GMT
            </b>
            <p class="mt-1 text-[13px] text-[#b9b4c4]">
              {{ data.prochaineSession.thematique?.nom }}
              <template v-if="data.prochaineSession.modulesCouverts.length">
                · modules {{ data.prochaineSession.modulesCouverts.map(numeroModule).join(', ') }}
              </template>
              · {{ data.prochaineSession.inscrits }}/{{ data.prochaineSession.places }} inscrits
              <template v-if="data.prochaineSession.nbSujets">
                · les sujets soumis par les inscrits sont prêts à consulter
              </template>
            </p>
          </div>
          <UiBaseButton taille="sm" :to="`/formateur/session/${data.prochaineSession.id}`">
            Démarrer la session
          </UiBaseButton>
        </section>

        <section v-if="data.prochaineSession" class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <b class="text-[15px]">
              Sujets soumis pour la session du {{ formatJourMois(data.prochaineSession.date) }}
            </b>
            <NuxtLink
              :to="`/formateur/sujets/${data.prochaineSession.id}`"
              class="text-[12.5px] font-bold text-social hover:underline"
            >
              Les {{ data.prochaineSession.nbSujets }} réponses →
            </NuxtLink>
          </div>
          <p v-if="!data.sujets.length" class="mt-3 text-[13px] text-discret">
            Aucun sujet soumis pour l’instant.
          </p>
          <ul class="mt-3.5 flex flex-col gap-2.5 text-[13px] text-texte">
            <li
              v-for="sujet in data.sujets.slice(0, 3)"
              :key="sujet.utilisateurId"
              class="rounded-[10px] bg-fond-clair px-3.5 py-2.5"
            >
              <NuxtLink :to="`/formateur/apprenant/${sujet.utilisateurId}`" class="font-bold hover:underline">
                {{ sujet.apprenant }}
              </NuxtLink>
              — « {{ sujet.sujet }} »
            </li>
          </ul>
        </section>
      </div>

      <div class="flex flex-col gap-4">
        <section class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <b class="text-[15px]">À traiter</b>
          <div class="mt-3 flex flex-col gap-2.5 text-[13.5px]">
            <NuxtLink to="/formateur/coaching-prive" class="flex justify-between hover:underline">
              <span>Coaching privé — séances à venir</span>
              <b class="text-social">{{ data.aTraiter.coachingPrive }}</b>
            </NuxtLink>
            <NuxtLink
              v-if="data.prochaineSession"
              :to="`/formateur/sujets/${data.prochaineSession.id}`"
              class="flex justify-between hover:underline"
            >
              <span>Sujets à lire avant le {{ formatJourMois(data.aTraiter.prochaineSessionDate) }}</span>
              <b class="text-social">{{ data.aTraiter.sujetsALire }}</b>
            </NuxtLink>
            <div class="flex justify-between">
              <span>Nouvelles notes reçues</span>
              <b>{{ data.aTraiter.nouvellesNotes }}</b>
            </div>
          </div>
        </section>

        <section class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <b class="text-[15px]">Dernières notes reçues</b>
          <p v-if="!data.dernieresNotes.length" class="mt-3 text-[13px] text-discret">
            Aucune note reçue pour l’instant.
          </p>
          <ul class="mt-3 flex flex-col gap-2.5 text-[13px] text-texte">
            <li v-for="(note, i) in data.dernieresNotes" :key="i" class="flex justify-between gap-3">
              <span>
                <span class="text-alerte">{{ '★'.repeat(note.note) }}</span
                ><span class="text-ligne-douce">{{ '★'.repeat(5 - note.note) }}</span>
                <template v-if="note.commentaire"> « {{ note.commentaire }} »</template>
              </span>
              <span class="whitespace-nowrap text-discret">{{ note.origine }} {{ formatJourMois(note.date) }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
