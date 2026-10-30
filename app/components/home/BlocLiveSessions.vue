<script setup lang="ts">
import type { SessionLiveListe } from '~/composables/useLiveSessions'
import type { Module } from '#shared/types'

/**
 * Accueil, bloc Live Sessions (planche 01, CDC §5.3) : le format en une
 * phrase et le calendrier des prochaines dates — sessions publiées et
 * modules « À venir » qui ont une date annoncée, triés par date. Absent tant
 * que la fonctionnalité est masquée (la liste arrive vide).
 */
const props = defineProps<{
  sessions: SessionLiveListe[]
  /** Modules du catalogue, pour les « À venir » datés. */
  modules: (Module & { formateur?: { nom: string } | null })[]
}>()

const lignes = computed(() => {
  const maintenant = new Date().toISOString().slice(0, 10)
  const lives = props.sessions.map((s) => ({
    cle: s.id,
    debut: s.debut,
    dureeMinutes: s.dureeMinutes,
    programme: s.module.programme,
    reference: referenceLive(s.module),
    titre: s.module.titre,
    formateur: s.formateur?.nom ?? null,
    lien: `/live-sessions/${s.slug}`,
    complet: s.complet,
  }))
  const bientot = props.modules
    .filter((m) => m.statut === 'annonce' && m.dateLancement && m.dateLancement >= maintenant)
    .map((m) => ({
      cle: m.id,
      debut: `${m.dateLancement}T12:00:00Z`,
      dureeMinutes: undefined,
      programme: m.programme,
      reference: referenceLive(m),
      titre: m.titre,
      formateur: m.formateur?.nom ?? null,
      lien: null,
      complet: false,
    }))
  return [...lives, ...bientot].sort((a, b) => a.debut.localeCompare(b.debut)).slice(0, 6)
})
</script>

<template>
  <section v-if="sessions.length" class="border-t border-ligne-claire py-14" aria-labelledby="titre-live-accueil">
    <div class="conteneur grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
      <div>
        <p class="surtitre surtitre-page text-live">Live Sessions</p>
        <h2 id="titre-live-accueil" class="mt-2.5 text-[34px] leading-tight font-light">
          Apprenez en direct avec le formateur
        </h2>
        <p class="mt-3.5 text-[16px] leading-relaxed text-texte">
          Suivez la formation complète en direct et posez vos questions au formateur. Après la session,
          retrouvez la version vidéo dans votre espace dès qu’elle est prête. Même prix qu’un module :
          10 000 FCFA TTC.
        </p>
        <UiBaseButton to="/live-sessions" variante="contour" class="mt-6">Comment ça marche</UiBaseButton>
      </div>
      <div>
        <h3 class="font-title text-[20px] font-light text-encre">Calendrier des prochaines sessions</h3>
        <ul class="mt-4 flex flex-col gap-3">
          <LiveLigneCalendrier
            v-for="ligne in lignes"
            :key="ligne.cle"
            :debut="ligne.debut"
            :duree-minutes="ligne.dureeMinutes"
            :programme="ligne.programme"
            :reference="ligne.reference"
            :titre="ligne.titre"
            :formateur="ligne.formateur"
            :lien="ligne.lien"
            :complet="ligne.complet"
            mention="Module à venir"
          />
        </ul>
      </div>
    </div>
  </section>
</template>
