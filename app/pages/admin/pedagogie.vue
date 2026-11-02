<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Pédagogie — administration')

/**
 * Usage pédagogique, depuis la base : complétion par module, abandon chapitre
 * par chapitre, réussite aux quiz. Ces chiffres couvrent tous les apprenants,
 * consentement cookies ou non — GA4 n'en voit qu'une partie.
 */
interface LigneModule {
  id: string
  titre: string
  programme: string
  inscrits: number
  commences: number
  termines: number
  progressionMoyenne: number
  quiz: { apprenants: number; reussis: number; tentatives: number; noteMoyenne: number | null }
  chapitres: { position: number; titre: string; commences: number; vus: number }[]
}

const { data } = await useFetch<{
  total: { inscrits: number; commences: number; termines: number; quizApprenants: number; quizReussis: number }
  modules: LigneModule[]
}>('/api/admin/pedagogie')

const ouvert = ref<string | null>(null)

const taux = (part: number, sur: number) => (sur > 0 ? `${Math.round((part / sur) * 100)} %` : '—')

const carte = 'rounded-[14px] border border-ligne-douce bg-white p-[22px]'
const enTete = 'bg-fond-clair text-[10.5px] font-bold tracking-[0.06em] text-discret uppercase'
</script>

<template>
  <div v-if="data">
    <h1 class="font-title text-[24px] font-light">Pédagogie</h1>
    <p class="mt-1 max-w-prose text-[13px] text-discret">
      Progression réelle des apprenants, lue en base : elle couvre tout le monde, que les cookies
      de mesure aient été acceptés ou non. Les accès révoqués ne comptent pas.
    </p>

    <div class="mt-5 grid gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
      <AdminCarteIndicateur libelle="Inscriptions à un module" :valeur="String(data.total.inscrits)" taille="sm" />
      <AdminCarteIndicateur
        libelle="Modules commencés"
        :valeur="taux(data.total.commences, data.total.inscrits)"
        taille="sm"
        :detail="`${data.total.commences} sur ${data.total.inscrits}`"
      />
      <AdminCarteIndicateur
        libelle="Modules terminés"
        :valeur="taux(data.total.termines, data.total.inscrits)"
        taille="sm"
        :detail="`${data.total.termines} sur ${data.total.inscrits} — toutes les vidéos vues`"
        accent
      />
      <AdminCarteIndicateur
        libelle="Quiz réussis"
        :valeur="taux(data.total.quizReussis, data.total.quizApprenants)"
        taille="sm"
        :detail="`${data.total.quizReussis} apprenants sur ${data.total.quizApprenants} ayant tenté`"
      />
    </div>

    <section class="mt-5" :class="carte">
      <h2 class="font-sans text-[15px] font-bold">Par module</h2>
      <p v-if="!data.modules.length" class="mt-3 text-[13px] text-discret">Aucun apprenant inscrit pour l’instant.</p>
      <div v-else class="mt-3.5 overflow-x-auto rounded-[10px] border border-ligne-claire text-[12.5px]">
        <table class="w-full min-w-[760px] text-left">
          <thead :class="enTete">
            <tr class="border-b border-ligne-claire">
              <th class="px-3.5 py-2.5">Module</th>
              <th class="px-3.5 py-2.5">Inscrits</th>
              <th class="px-3.5 py-2.5">Commencé</th>
              <th class="px-3.5 py-2.5">Terminé</th>
              <th class="px-3.5 py-2.5">Progression moy.</th>
              <th class="px-3.5 py-2.5">Quiz réussi</th>
              <th class="px-3.5 py-2.5">Note moy.</th>
              <th class="px-3.5 py-2.5"><span class="sr-only">Détail</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="m in data.modules" :key="m.id">
              <tr class="border-b border-fond-voile">
                <td class="px-3.5 py-3"><b>{{ m.titre }}</b></td>
                <td class="px-3.5 py-3">{{ m.inscrits }}</td>
                <td class="px-3.5 py-3">{{ taux(m.commences, m.inscrits) }}</td>
                <td class="px-3.5 py-3 font-bold">{{ taux(m.termines, m.inscrits) }}</td>
                <td class="px-3.5 py-3">{{ m.progressionMoyenne }} %</td>
                <td class="px-3.5 py-3">
                  {{ taux(m.quiz.reussis, m.quiz.apprenants) }}
                  <span class="text-discret">({{ m.quiz.tentatives }} tent.)</span>
                </td>
                <td class="px-3.5 py-3">{{ m.quiz.noteMoyenne === null ? '—' : `${m.quiz.noteMoyenne}/100` }}</td>
                <td class="px-3.5 py-3 text-right">
                  <button
                    type="button"
                    class="text-[12px] font-bold text-social underline-offset-2 hover:underline"
                    :aria-expanded="ouvert === m.id"
                    @click="ouvert = ouvert === m.id ? null : m.id"
                  >
                    {{ ouvert === m.id ? 'Masquer' : 'Chapitres' }}
                  </button>
                </td>
              </tr>
              <tr v-if="ouvert === m.id" class="bg-fond-clair">
                <td colspan="8" class="px-3.5 py-3">
                  <p class="mb-2 text-[11.5px] text-discret">
                    Abandon chapitre par chapitre : part des inscrits qui ont commencé, puis vu en entier,
                    chaque chapitre.
                  </p>
                  <ol class="grid gap-1.5">
                    <li v-for="c in m.chapitres" :key="c.position" class="grid grid-cols-[1fr_120px_120px] items-center gap-3">
                      <span class="truncate">{{ c.position === 0 ? 'Intro' : `Ch. ${c.position}` }} — {{ c.titre }}</span>
                      <span>commencé {{ taux(c.commences, m.inscrits) }}</span>
                      <span class="font-bold">vu {{ taux(c.vus, m.inscrits) }}</span>
                    </li>
                  </ol>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
