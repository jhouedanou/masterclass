<script setup lang="ts">
import type { CarteLiveApprenant } from '~/utils/live'
import { quizAReussir } from '#shared/utils/attestation'
import { dateCourteLive, heureLive } from '#shared/utils/live'

/**
 * Carte Live Session de l'espace apprenant (planche 05, CDC §4.3), en tête
 * de « Mes formations ». L'état arrive du serveur : Inscrit, lien disponible
 * (à partir de J-1), session terminée, annulée. Le bouton « Rejoindre » mène
 * à la salle intégrée, jamais à un lien Zoom (option B).
 */
const props = defineProps<{ carte: CarteLiveApprenant }>()

const aujourdHui = computed(() => new Date(props.carte.debut).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10))
const badge = computed(() => {
  switch (props.carte.etat) {
    case 'inscrit':
      return { texte: `Live Session · ${dateCourteLive(props.carte.debut)} · ${heureLive(props.carte.debut)} GMT`, classe: 'bg-live-voile text-live' }
    case 'lien-disponible':
      return {
        texte: aujourdHui.value
          ? `Aujourd’hui · ${heureLive(props.carte.debut)} GMT`
          : `Live Session · ${dateCourteLive(props.carte.debut)} · ${heureLive(props.carte.debut)} GMT`,
        classe: 'bg-live text-white',
      }
    case 'terminee':
      return { texte: 'Session terminée', classe: 'bg-alerte-voile text-alerte' }
    default:
      return { texte: 'Session annulée', classe: 'bg-fond-voile text-discret' }
  }
})
const quizReussi = computed(() => props.carte.quiz !== null && !quizAReussir(props.carte.quiz))

const telechargement = ref(false)
const erreurSupport = ref('')
async function telechargerSupport() {
  telechargement.value = true
  erreurSupport.value = ''
  try {
    const { url } = await $fetch<{ url: string }>(`/api/mon-espace/live-sessions/${props.carte.sessionId}/support`)
    window.location.assign(url)
  } catch (e) {
    const r = e as { data?: { statusMessage?: string } }
    erreurSupport.value = r.data?.statusMessage ?? 'Support momentanément indisponible.'
  } finally {
    telechargement.value = false
  }
}
</script>

<template>
  <article class="grid gap-[18px] rounded-carte border-[1.5px] border-live-bordure bg-white p-6 sm:grid-cols-[1fr_auto] sm:items-center">
    <div class="min-w-0">
      <div class="mb-2 flex flex-wrap items-center gap-2.5">
        <p class="surtitre text-live">
          <span class="hidden lg:inline">{{ carte.module.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }} · </span>{{ carte.module.thematique }}
        </p>
        <span class="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold" :class="badge.classe">{{ badge.texte }}</span>
      </div>
      <h2 class="mb-1.5 font-title text-[21px] leading-[1.25] font-light">{{ carte.module.titre }}</h2>
      <p class="text-[13.5px] leading-relaxed text-discret">
        {{ carte.formateur }} ·
        <template v-if="carte.etat === 'inscrit'">
          Vous recevrez le lien de connexion par email la veille, 10 min avant et à l’heure de début.
        </template>
        <template v-else-if="carte.etat === 'lien-disponible'">
          Micros coupés pendant la formation, questions-réponses aux moments indiqués. Session enregistrée.
        </template>
        <template v-else-if="carte.etat === 'terminee'">
          {{ carte.support ? 'Quiz disponible, ainsi que le support de cours fourni par le formateur.' : 'Quiz disponible.' }}
          La version vidéo sera ajoutée ici dès qu’elle sera prête.
        </template>
        <template v-else>
          Cette session est annulée. Notre équipe vous contacte pour un report ou un remboursement.
          <a :href="lienWhatsApp(`Bonjour, ma Live Session « ${carte.module.titre} » est annulée.`)" target="_blank" rel="noopener" class="font-bold text-whatsapp">Nous écrire sur WhatsApp</a>.
        </template>
      </p>
      <p v-if="erreurSupport" class="mt-2 text-[13px] text-erreur" role="alert">{{ erreurSupport }}</p>
    </div>

    <UiBaseButton v-if="carte.etat === 'lien-disponible'" :to="`/mon-espace/live/${carte.sessionId}`" taille="sm" variante="sombre">
      Rejoindre la session
    </UiBaseButton>
    <!-- Inscrit, session encore loin (maquette du 13/11, étape 1) : le fichier
         d'agenda est celui que joint l'e-mail de confirmation. -->
    <UiBaseButton
      v-else-if="carte.etat === 'inscrit'"
      :href="`/api/live-sessions/${carte.slug}/agenda.ics`"
      cible="_self"
      taille="sm"
      variante="contour"
    >
      Ajouter à mon agenda
    </UiBaseButton>
    <div v-else-if="carte.etat === 'terminee'" class="flex shrink-0 flex-col items-stretch gap-2">
      <UiBaseButton v-if="carte.quiz && !quizReussi" :to="`/mon-espace/quiz/${carte.module.slug}`" taille="sm">
        Passer le quiz
      </UiBaseButton>
      <UiBaseButton v-else-if="quizReussi" to="/mon-espace/certificats" taille="sm" variante="succes">
        Mon certificat
      </UiBaseButton>
      <UiBaseButton v-if="carte.support" taille="sm" variante="contour" :disabled="telechargement" @click="telechargerSupport">
        Télécharger le support
      </UiBaseButton>
      <!-- Étape 4 de la maquette : la Live Session ouvre le coaching collectif
           de sa thématique, comme un module acheté. -->
      <UiBaseButton to="/mon-espace/sessions" taille="sm" variante="contour">
        S’inscrire au coaching collectif
      </UiBaseButton>
    </div>
  </article>
</template>
