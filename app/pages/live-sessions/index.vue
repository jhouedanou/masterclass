<script setup lang="ts">
import type { SessionLiveListe } from '~/composables/useLiveSessions'
/**
 * Page Live Sessions (planche 02, CDC §5.2) : le format, le parcours en
 * quatre étapes, les prochaines sessions publiées et les règles pendant et
 * après la session. 404 tant que la fonctionnalité est masquée (10.G).
 */
const { data: visibilite } = await useFetch<{ visible: boolean }>('/api/live-sessions/visibilite', { key: 'live-visible' })
if (!visibilite.value?.visible) {
  throw createError({ statusCode: 404, statusMessage: 'Page introuvable', fatal: true })
}
const { data: sessions } = await useFetch<SessionLiveListe[]>('/api/live-sessions', { key: 'live-sessions', default: () => [] })

const etapes = [
  { n: '01', t: 'Inscrivez-vous', d: 'Choisissez une session et réglez-la au prix d’un module, 10 000 FCFA TTC, avec votre compte E-Masterclass.' },
  { n: '02', t: 'Recevez les rappels', d: 'Une invitation à l’inscription, puis un e-mail la veille, 10 minutes avant et à l’heure de début.' },
  { n: '03', t: 'Suivez en direct', d: 'La formation complète, depuis votre espace, suivie d’un temps de questions-réponses avec le formateur.' },
  { n: '04', t: 'Retrouvez la suite', d: 'Quiz et certificat, support de cours s’il est fourni, puis la version vidéo dans votre espace.' },
]

usePageSeo({
  titreAuto: 'Live Sessions : formations en direct | E-Masterclass Big Five',
  descriptionAuto:
    'Suivez la formation en direct avec le formateur, posez vos questions, puis retrouvez la version vidéo dans votre espace. Même prix qu’un module : 10 000 FCFA TTC.',
  chemin: '/live-sessions',
})
useFilAriane([{ libelle: 'Accueil', chemin: '/' }, { libelle: 'Live Sessions' }])
</script>

<template>
  <div>
    <section class="sur-sombre relative overflow-hidden bg-encre text-white">
      <div class="conteneur py-12 lg:py-14">
        <p class="surtitre text-live-pastel">Live Sessions</p>
        <h1 class="mt-3 max-w-[760px] font-title text-[38px] leading-tight font-light lg:text-[50px]">
          Suivez la formation en direct avec le formateur
        </h1>
        <p class="mt-4 max-w-[720px] text-[17px] leading-[1.65] text-gris-perle">
          La formation complète en direct, suivie d’un temps de questions-réponses avec le formateur.
          Même prix qu’un module : 10 000 FCFA TTC.
        </p>
        <ol class="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <li v-for="etape in etapes" :key="etape.n" class="rounded-[14px] border border-nuit-bordure bg-nuit-panneau p-5">
            <p class="font-title text-[26px] font-light text-live-pastel">{{ etape.n }}</p>
            <p class="mt-2 text-[16px] font-bold text-white">{{ etape.t }}</p>
            <p class="mt-1.5 text-[14px] leading-relaxed text-gris-perle">{{ etape.d }}</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="py-14" aria-labelledby="titre-prochaines">
      <div class="conteneur">
        <UiEnTeteSection
          taille-surtitre="page"
          taille="lg"
          surtitre="Calendrier"
          titre="Prochaines Live Sessions"
        />
        <ul v-if="sessions?.length" id="titre-prochaines" class="mt-7 flex max-w-[900px] flex-col gap-3">
          <LiveLigneCalendrier
            v-for="s in sessions"
            :key="s.id"
            :debut="s.debut"
            :duree-minutes="s.dureeMinutes"
            :programme="s.module.programme"
            :reference="referenceLive(s.module)"
            :titre="s.module.titre"
            :formateur="s.formateur?.nom"
            :lien="`/live-sessions/${s.slug}`"
            :complet="s.complet"
          />
        </ul>
        <p v-else class="mt-7 max-w-[640px] rounded-[14px] border border-ligne-douce bg-fond-clair p-6 text-[15px] text-texte">
          Aucune Live Session n’est programmée pour l’instant. Les prochaines dates seront annoncées ici
          et sur la page de chaque programme.
        </p>
      </div>
    </section>

    <section class="border-t border-ligne-claire bg-fond-clair py-14">
      <div class="conteneur grid gap-6 lg:grid-cols-2">
        <div class="rounded-[14px] border border-ligne-douce bg-white p-7">
          <h2 class="font-title text-[24px] font-light">Pendant la session</h2>
          <ul class="mt-4 flex flex-col gap-3 text-[15px] text-texte">
            <li class="flex gap-2.5"><Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />Un modérateur est présent sur chaque session</li>
            <li class="flex gap-2.5"><Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />Les micros des participants sont coupés pendant la formation</li>
            <li class="flex gap-2.5"><Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />Les questions-réponses ont lieu à des moments dédiés, annoncés à l’écran</li>
            <li class="flex gap-2.5"><Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />La session est enregistrée</li>
          </ul>
        </div>
        <div class="rounded-[14px] border border-ligne-douce bg-white p-7">
          <h2 class="font-title text-[24px] font-light">Après la session</h2>
          <ul class="mt-4 flex flex-col gap-3 text-[15px] text-texte">
            <li class="flex gap-2.5"><Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />Le support de cours, s’il est fourni par le formateur, est disponible dans votre espace</li>
            <li class="flex gap-2.5"><Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />Le quiz s’ouvre, avec le certificat à la clé</li>
            <li class="flex gap-2.5"><Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />Vous pouvez vous inscrire aux sessions de coaching collectif</li>
            <li class="flex gap-2.5"><Icon name="ph:check-bold" class="mt-1 shrink-0 text-succes" />La version vidéo de la session est ajoutée à votre espace dès qu’elle est prête</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>
