<script setup lang="ts">
import type { FicheApprenant } from '~/utils/formateur'

definePageMeta({ layout: 'formateur', middleware: 'formateur' })

const route = useRoute()
const { data, error } = await useFetch(() => `/api/formateur/sujets/${route.params.sessionId}`)

if (!data.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: error.value?.statusMessage ?? 'Session introuvable',
    fatal: true,
  })
}

usePagePrivee(`Sujets de la session du ${formatJourMois(data.value.session.date)}`)

// Le marquage « lu » est une écriture : elle part du navigateur, une fois la
// liste affichée, et non plus du GET qui la charge. Un échec ne doit pas gêner
// la lecture — le compteur retombera à la prochaine ouverture.
onMounted(() => {
  $fetch(`/api/formateur/sujets/${route.params.sessionId}/lus`, { method: 'POST' }).catch(
    () => undefined,
  )
})

/** Fiche ouverte dans le panneau latéral (planche D, écran 04). Elle se
 *  charge à la demande : la liste n'a pas à ramener toutes les fiches. */
const apprenantOuvert = ref('')
const fiche = ref<FicheApprenant | null>(null)
const erreurFiche = ref('')

async function ouvrirFiche(utilisateurId: string) {
  apprenantOuvert.value = utilisateurId
  erreurFiche.value = ''
  try {
    fiche.value = await $fetch<FicheApprenant>(`/api/formateur/apprenant/${utilisateurId}`)
  } catch (e) {
    fiche.value = null
    erreurFiche.value = (e as { statusMessage?: string }).statusMessage ?? 'Fiche indisponible.'
  }
}
</script>

<template>
  <div v-if="data">
    <NuxtLink to="/formateur/sessions" class="text-[14px] text-discret hover:underline">
      ← Mes sessions de coaching
    </NuxtLink>

    <h1 class="mt-3 font-title text-[22px] font-light">
      Sujets soumis pour la session du {{ formatJourMois(data.session.date) }}
    </h1>
    <p class="mt-1.5 text-[13.5px] text-discret">
      {{ data.session.thematique }} · {{ formatDateCourte(data.session.date) }} ·
      {{ data.session.heure }} · {{ data.session.inscrits }}/{{ data.session.places }} inscrits.
      Ouvrir cette page marque les sujets comme lus.
    </p>

    <div class="mt-4 grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div class="flex flex-col gap-4">
        <!-- Même grammaire que la carte « Sujets soumis » de la vue d'ensemble :
             titre dans la carte, réponses en pastilles grises à l'intérieur. -->
        <section class="rounded-[14px] border border-ligne-douce bg-white p-5.5">
          <h2 class="font-sans text-[15px] font-bold">Les {{ data.sujets.length }} réponses</h2>
          <p v-if="!data.sujets.length" class="mt-3 text-[13px] text-discret">
            Aucun sujet soumis pour l’instant.
          </p>
          <ul class="mt-3.5 flex flex-col gap-2.5 text-[13px] text-texte">
            <li
              v-for="sujet in data.sujets"
              :key="sujet.id"
              class="rounded-[10px] bg-fond-clair px-3.5 py-2.75"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  class="font-bold text-encre hover:underline"
                  @click="ouvrirFiche(sujet.utilisateurId)"
                >
                  {{ sujet.apprenant }}
                </button>
                <span v-if="sujet.nouveau" class="rounded-full bg-social-voile px-2.5 py-1 text-[11px] font-bold text-social">
                  Nouveau
                </span>
              </div>
              <p class="mt-1">« {{ sujet.preoccupation }} »</p>
              <p v-if="sujet.attente" class="mt-1 text-[12.5px] text-discret">
                Attente : {{ sujet.attente }}
              </p>
            </li>
          </ul>
        </section>

        <section class="rounded-[14px] border border-ligne-douce bg-white p-5.5">
          <h2 class="font-sans text-[15px] font-bold">Les inscrits</h2>
          <ul class="mt-3 flex flex-wrap gap-2">
            <li v-for="inscrit in data.inscrits" :key="inscrit.id">
              <button
                type="button"
                class="rounded-full border px-3.5 py-2 text-[13px] hover:bg-fond-clair"
                :class="[
                  inscrit.sujetSoumis ? 'border-social text-social' : 'border-ligne text-texte',
                  apprenantOuvert === inscrit.id ? 'bg-social-voile' : '',
                ]"
                @click="ouvrirFiche(inscrit.id)"
              >
                {{ inscrit.nom }}
              </button>
            </li>
          </ul>
          <p class="mt-3 text-[12px] text-discret">
            Cliquer un nom ouvre sa fiche : persona, progression et sujet soumis. Coordonnées et
            paiements restent masqués.
          </p>
        </section>
      </div>

      <FormateurFicheApprenant v-if="fiche" :fiche="fiche" class="lg:sticky lg:top-6" />
      <p v-else class="rounded-[14px] border border-dashed border-ligne bg-white p-5.5 text-[13.5px]"
         :class="erreurFiche ? 'text-erreur' : 'text-discret'">
        {{ erreurFiche || 'Choisissez un apprenant pour afficher sa fiche.' }}
      </p>
    </div>
  </div>
</template>
