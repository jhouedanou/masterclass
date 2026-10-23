<script setup lang="ts">
import type { CorrectionQuiz, EtatQuiz, QuestionQuiz, ResultatQuiz } from '#shared/types'

definePageMeta({ layout: 'espace', middleware: 'auth' })

const route = useRoute()
const slug = computed(() => String(route.params.slug))

/**
 * Quiz du module (règles Big Five) : dix questions, réussite à 100 %, trois
 * tentatives par jour remises à zéro à minuit, heure d'Abidjan. La correction
 * vient du serveur à la soumission ; la page ne connaît jamais la bonne réponse.
 *
 * Les options arrivent mélangées pour la tentative en cours : leurs lettres ne
 * valent que pour elle, et `ordre` les accompagne à la soumission. Chaque
 * nouvelle tentative recharge donc les questions. Le quiz reste fermé tant que
 * les vidéos ne sont pas toutes vues.
 */
const { data, error, refresh } = await useFetch<{
  module: { id: string; slug: string; titre: string; formateur: string | null }
  progression: number
  ouvert: boolean
  questions: QuestionQuiz[]
  ordre: { jour: string; numero: number } | null
  etat: EtatQuiz
  copie: { reponses: Record<string, string>; note: number; corrections: CorrectionQuiz[] } | null
}>(() => `/api/mon-espace/quiz/${slug.value}`)

if (!data.value) {
  // 403 sans accès au module, 404 s'il n'existe pas ou n'a pas de quiz.
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: error.value?.statusMessage ?? 'Quiz introuvable',
    fatal: true,
  })
}

usePagePrivee(`Quiz — ${data.value.module.titre}`)

const questions = computed(() => data.value!.questions)
const ouvert = computed(() => data.value!.ouvert)
const etat = ref<EtatQuiz>(data.value.etat)
const reponses = ref<Record<string, string>>({})
const resultat = ref<{ note: number; reussi: boolean; corrections: Map<string, CorrectionQuiz> } | null>(null)

function afficherCopie(copie: NonNullable<typeof data.value>['copie']) {
  if (!copie) return
  reponses.value = { ...copie.reponses }
  resultat.value = { note: copie.note, reussi: true, corrections: new Map(copie.corrections.map((c) => [c.code, c])) }
}
// Quiz déjà réussi : il est fermé, on montre la copie qui l'a validé.
afficherCopie(data.value.copie)

const corrige = computed(() => resultat.value !== null)
const verrouille = computed(() => !etat.value.reussi && etat.value.tentativesRestantes === 0)
const nbRepondues = computed(() => questions.value.filter((q) => reponses.value[q.code]).length)
const toutRepondu = computed(() => nbRepondues.value === questions.value.length)
const videosFinies = computed(() => data.value!.progression >= 100)

const envoi = ref(false)
const erreurEnvoi = ref<string | null>(null)
const blocResultat = ref<HTMLElement | null>(null)

async function soumettre() {
  if (!toutRepondu.value || envoi.value || corrige.value || verrouille.value) return
  envoi.value = true
  erreurEnvoi.value = null
  try {
    const r = await $fetch<ResultatQuiz>(`/api/mon-espace/quiz/${slug.value}`, {
      method: 'POST',
      body: { reponses: reponses.value, ordre: data.value!.ordre },
    })
    etat.value = r.etat
    resultat.value = { note: r.note, reussi: r.reussi, corrections: new Map(r.corrections.map((c) => [c.code, c])) }
    await nextTick()
    blocResultat.value?.focus()
    blocResultat.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    erreurEnvoi.value = err.data?.statusMessage ?? err.statusMessage ?? 'La soumission a échoué. Réessayez.'
    // Un refus du serveur (quota atteint dans un autre onglet, quiz réussi
    // ailleurs, nouveau jour) : on reprend l'état qui fait foi. Si l'ordre des
    // options a changé, les lettres cochées ne désignent plus les mêmes
    // réponses : on les efface.
    const avant = JSON.stringify(data.value?.ordre)
    await refresh()
    if (data.value) {
      etat.value = data.value.etat
      if (JSON.stringify(data.value.ordre) !== avant) reponses.value = {}
      afficherCopie(data.value.copie)
    }
  } finally {
    envoi.value = false
  }
}

/** Nouvelle tentative : nouvel ordre des options, à recharger. */
async function reprendre() {
  await refresh()
  if (data.value) etat.value = data.value.etat
  reponses.value = {}
  resultat.value = null
  erreurEnvoi.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/** Chapitres à revoir, une fois chacun, dans l'ordre du module. */
const chapitresARevoir = computed(() => {
  if (!resultat.value) return []
  const vus = new Map<number, string>()
  for (const c of resultat.value.corrections.values()) {
    if (c.correct) continue
    for (const r of c.renvois) if (!vus.has(r.position)) vus.set(r.position, r.titre)
  }
  return [...vus.entries()].sort((a, b) => a[0] - b[0]).map(([position, titre]) => ({ position, titre }))
})
</script>

<template>
  <div v-if="data" class="mx-auto max-w-[780px]">
    <NuxtLink :to="`/mon-espace/module/${data.module.slug}`" class="text-[13px] text-discret hover:underline">
      ← Retour au module
    </NuxtLink>

    <!-- Bandeau des règles du jour, toujours visible : la maquette le garde
         collé en haut pendant qu'on répond. -->
    <div
      class="sticky top-0 z-10 -mx-4 mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-ligne-douce bg-fond-clair/95 px-4 py-3 text-[13.5px] backdrop-blur sm:mx-0 sm:rounded-champ sm:border"
    >
      <span class="text-texte">
        Dernière note enregistrée :
        <b class="text-encre">{{ etat.derniereNote !== undefined ? `${etat.derniereNote} / 100` : '—' }}</b>
      </span>
      <span v-if="etat.reussi" class="inline-flex items-center gap-1.5 font-bold text-succes-fonce">
        <Icon name="ph:seal-check-fill" class="size-4" /> Quiz réussi
      </span>
      <span v-else class="text-texte">
        Tentatives restantes aujourd’hui :
        <b :class="etat.tentativesRestantes === 0 ? 'text-erreur-fonce' : 'text-encre'">
          {{ etat.tentativesRestantes }} / {{ etat.tentativesMax }}
        </b>
      </span>
    </div>

    <p class="surtitre mt-7 text-social">Quiz du module</p>
    <h1 class="mt-2 text-[28px] font-light lg:text-[32px]">{{ data.module.titre }}</h1>
    <p class="mt-2 text-[14px] leading-[1.6] text-texte">
      <template v-if="data.module.formateur">{{ data.module.formateur }} · </template>
      Répondez aux {{ etat.questions }} questions puis soumettez. Note sur 100, réussite à 100 %,
      {{ etat.tentativesMax }} tentatives par jour (remises à zéro à minuit, heure d’Abidjan).
    </p>
    <!-- Fermé tant que les vidéos ne sont pas toutes vues : le quiz vérifie
         la formation, il ne la remplace pas. -->
    <div
      v-if="!ouvert"
      class="mt-6 flex items-start gap-2.5 rounded-carte border border-ligne-douce bg-white px-5 py-4 text-[14px] leading-[1.6] text-texte"
    >
      <Icon name="ph:lock-simple-fill" class="mt-[3px] size-4 shrink-0 text-social" />
      <div>
        <p>
          Le quiz s’ouvre une fois toutes les vidéos du module vues. Vous en êtes à
          <b class="text-encre">{{ Math.round(data.progression) }} %</b>.
        </p>
        <UiBaseButton :to="`/mon-espace/lecture/${data.module.slug}`" class="mt-3" taille="sm">
          Reprendre les vidéos
        </UiBaseButton>
      </div>
    </div>

    <!-- Résultat de la copie : annoncé aux lecteurs d'écran, et le focus y est
         porté après la soumission. -->
    <section
      v-if="resultat"
      ref="blocResultat"
      tabindex="-1"
      aria-live="polite"
      class="mt-6 scroll-mt-20 rounded-carte border p-[22px] outline-none"
      :class="resultat.reussi ? 'border-succes-bordure bg-succes-pale' : 'border-ligne-douce bg-white'"
    >
      <template v-if="resultat.reussi">
        <p class="flex items-center gap-2 font-title text-[22px] font-light text-succes-fonce">
          <Icon name="ph:seal-check-fill" class="size-6" /> Bravo, quiz réussi : {{ resultat.note }} / 100
        </p>
        <p v-if="videosFinies" class="mt-2 text-[14px] text-texte">Votre attestation de suivi est prête.</p>
        <p v-else class="mt-2 text-[14px] text-texte">
          Il vous reste à terminer les vidéos du module pour obtenir votre attestation.
        </p>
        <div class="mt-4 flex flex-wrap gap-3">
          <UiBaseButton v-if="videosFinies" :to="`/mon-espace/certificats?module=${data.module.id}`" variante="succes" taille="sm">
            Obtenir mon attestation
          </UiBaseButton>
          <UiBaseButton v-else :to="`/mon-espace/module/${data.module.slug}`" taille="sm">Reprendre les vidéos</UiBaseButton>
        </div>
      </template>
      <template v-else>
        <p class="font-title text-[22px] font-light text-encre">Votre note : {{ resultat.note }} / 100</p>
        <p class="mt-2 text-[14px] leading-[1.6] text-texte">
          Il faut 100 / 100 pour réussir le quiz. Les questions à revoir sont signalées ci-dessous, avec le passage
          de la vidéo qui y répond.
        </p>
        <div v-if="chapitresARevoir.length" class="mt-3">
          <p class="text-[13px] font-bold text-encre">Chapitres à revoir</p>
          <ul class="mt-1.5 flex flex-wrap gap-2">
            <li v-for="c in chapitresARevoir" :key="c.position">
              <NuxtLink
                :to="`/mon-espace/lecture/${data.module.slug}?chapitre=${c.position}`"
                class="inline-block rounded-full border border-social-pilule bg-social-neige px-3 py-1 text-[12.5px] font-bold text-social hover:border-social"
              >
                {{ c.position === 0 ? 'Introduction' : `Chapitre ${c.position}` }} · {{ c.titre }}
              </NuxtLink>
            </li>
          </ul>
        </div>
        <p class="mt-4 text-[13.5px] text-texte">
          Tentatives restantes aujourd’hui : <b class="text-encre">{{ etat.tentativesRestantes }} / {{ etat.tentativesMax }}</b>
        </p>
        <UiBaseButton v-if="!verrouille" class="mt-3" taille="sm" @click="reprendre">Reprendre le quiz</UiBaseButton>
        <p v-else class="mt-3 rounded-champ bg-alerte-voile px-4 py-3 text-[13px] leading-[1.55] text-alerte-fonce">
          Plus de tentative aujourd’hui. Revoyez les chapitres signalés et revenez demain : le compteur repart à zéro à
          minuit, heure d’Abidjan.
        </p>
      </template>
    </section>

    <!-- Verrou du jour, sans copie à montrer (page rouverte après les trois
         tentatives). -->
    <p
      v-else-if="verrouille"
      class="mt-6 flex items-start gap-2.5 rounded-carte border border-alerte-bordure bg-alerte-pale px-5 py-4 text-[14px] leading-[1.6] text-alerte-fonce"
    >
      <Icon name="ph:lock-simple-fill" class="mt-[3px] size-4 shrink-0" />
      <span>
        Vous avez utilisé vos {{ etat.tentativesMax }} tentatives d’aujourd’hui<template v-if="etat.derniereNote !== undefined"> (dernière note : {{ etat.derniereNote }} / 100)</template>.
        Revenez demain : le compteur repart à zéro à minuit, heure d’Abidjan.
      </span>
    </p>

    <form v-if="ouvert" class="mt-6 flex flex-col gap-4" @submit.prevent="soumettre">
      <EspaceQuestionQuiz
        v-for="(question, i) in questions"
        :key="question.code"
        v-model="reponses[question.code]"
        :question="question"
        :numero="i + 1"
        :total="questions.length"
        :slug="data.module.slug"
        :correction="resultat?.corrections.get(question.code)"
        :desactive="corrige || verrouille || envoi"
      />

      <div v-if="!corrige && !verrouille" class="flex flex-col gap-2">
        <p v-if="erreurEnvoi" role="alert" class="rounded-champ bg-erreur-voile px-4 py-3 text-[13.5px] text-erreur-fonce">
          {{ erreurEnvoi }}
        </p>
        <UiBaseButton type="submit" taille="lg" class="w-full" :disabled="!toutRepondu || envoi">
          {{ envoi ? 'Correction…' : 'Soumettre mes réponses' }}
        </UiBaseButton>
        <p class="text-center text-[12.5px] text-discret" aria-live="polite">
          {{ nbRepondues }} / {{ questions.length }} questions répondues
        </p>
      </div>
      <UiBaseButton v-else-if="resultat && !resultat.reussi && !verrouille" taille="md" class="w-full" @click="reprendre">
        Reprendre le quiz
      </UiBaseButton>
    </form>
  </div>
</template>
