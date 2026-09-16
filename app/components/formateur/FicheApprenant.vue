<script setup lang="ts">
import type { FicheApprenant } from '~/utils/formateur'

/**
 * Fiche apprenant en lecture seule (planche D, écran 04, panneau de droite).
 *
 * Elle sert deux écrans — la liste des inscrits d'une session et la page
 * dédiée — d'où le composant. Contact et paiements restent masqués : la
 * relation passe par la plateforme.
 */
const props = defineProps<{ fiche: FicheApprenant }>()

/** « inscrite » pour un prénom se terminant par a ou e, « inscrit » sinon —
 *  la base ne porte pas le genre de l'apprenant. */
const accordInscrit = computed(() =>
  /[ae]$/i.test(props.fiche.prenom.trim()) ? 'inscrite' : 'inscrit',
)
</script>

<template>
  <div class="rounded-[14px] border border-ligne bg-white p-6">
    <p class="surtitre text-discret uppercase">
      Fiche apprenant — lecture seule (inscrits à vos modules / sessions)
    </p>

    <div class="mt-3 flex items-center gap-3.5">
      <span class="grid size-12 shrink-0 place-items-center rounded-full bg-social text-[15px] font-extrabold text-white">
        {{ fiche.initiales }}
      </span>
      <div>
        <b class="text-[16px]">{{ fiche.nomAffiche }}</b>
        <p class="text-[12px] text-discret">
          <template v-if="fiche.ville || fiche.pays">
            {{ [fiche.ville, fiche.pays].filter(Boolean).join(', ') }} ·
          </template>
          {{ accordInscrit }} à {{ fiche.nbModules }} de vos modules
        </p>
      </div>
    </div>

    <div v-if="fiche.persona" class="mt-3.5 rounded-[12px] border border-social-bordure bg-social-voile p-4">
      <p class="surtitre text-social">Persona — pour préparer vos sessions</p>
      <dl class="mt-2.5 flex flex-col gap-1.5 text-[13px]">
        <div v-if="fiche.persona.secteur" class="flex justify-between gap-4">
          <dt class="text-discret">Secteur</dt>
          <dd class="text-right font-bold">{{ fiche.persona.secteur }}</dd>
        </div>
        <div v-if="fiche.persona.experience" class="flex justify-between gap-4">
          <dt class="text-discret">Expérience</dt>
          <dd class="text-right font-bold">{{ fiche.persona.experience }}</dd>
        </div>
        <div v-if="fiche.persona.reseaux" class="flex justify-between gap-4">
          <dt class="text-discret">Réseaux gérés</dt>
          <dd class="text-right font-bold">{{ fiche.persona.reseaux }}</dd>
        </div>
        <div v-if="fiche.persona.entreprise" class="flex justify-between gap-4">
          <dt class="text-discret">Entreprise</dt>
          <dd class="text-right font-bold">{{ fiche.persona.entreprise }}</dd>
        </div>
        <div v-if="fiche.persona.audience" class="flex justify-between gap-4">
          <dt class="text-discret">Audience</dt>
          <dd class="text-right font-bold">{{ fiche.persona.audience }}</dd>
        </div>
        <div v-if="fiche.persona.objectif" class="flex justify-between gap-4">
          <dt class="text-discret">Objectif</dt>
          <dd class="text-right font-bold">{{ fiche.persona.objectif }}</dd>
        </div>
      </dl>
    </div>
    <p v-else class="mt-3.5 rounded-[12px] bg-fond-clair p-4 text-[12.5px] text-discret">
      Cet apprenant n’a pas encore complété sa fiche de profil.
    </p>

    <dl class="mt-3.5 flex flex-col gap-2 text-[13px]">
      <div v-for="p in fiche.progressions" :key="p.moduleId" class="flex justify-between gap-4">
        <dt class="text-discret">Progression — {{ p.titre }}</dt>
        <dd class="text-right font-bold whitespace-nowrap">
          <template v-if="p.chapitres">{{ p.chapitresVus }} / {{ p.chapitres }} chapitres</template>
          <template v-else>{{ p.pourcentage }} %</template>
        </dd>
      </div>
      <div v-if="fiche.sujet" class="flex justify-between gap-4">
        <dt class="text-discret">Sujet soumis pour le {{ formatJourMois(fiche.sujet.session) }}</dt>
        <dd class="text-right font-bold" :class="fiche.sujet.lu ? '' : 'text-social'">
          {{ fiche.sujet.lu ? 'Oui — lu' : 'Oui — à lire' }}
        </dd>
      </div>
      <div v-if="fiche.coachingPriveEnCours || fiche.coachingPriveRealise" class="flex justify-between gap-4">
        <dt class="text-discret">Coaching privé</dt>
        <dd class="text-right font-bold">
          <template v-if="fiche.coachingPriveEnCours">
            {{ fiche.coachingPriveEnCours }} demande{{ fiche.coachingPriveEnCours > 1 ? 's' : '' }} en cours
          </template>
          <template v-else>
            {{ fiche.coachingPriveRealise }} séance{{ fiche.coachingPriveRealise > 1 ? 's' : '' }} réalisée{{ fiche.coachingPriveRealise > 1 ? 's' : '' }}
          </template>
        </dd>
      </div>
    </dl>

    <p v-if="fiche.sujet" class="mt-3.5 rounded-[10px] bg-fond-clair p-3.5 text-[13px] text-texte">
      « {{ fiche.sujet.preoccupation }} »
      <span v-if="fiche.sujet.attente" class="mt-1 block text-discret">
        Attente : {{ fiche.sujet.attente }}
      </span>
    </p>

    <p class="mt-3.5 rounded-[10px] border border-ligne-claire bg-fond-clair px-3.5 py-3 text-[11.5px] leading-relaxed text-discret">
      Vous ne voyez que les apprenants inscrits à vos modules, sessions ou coachings privés. Contact
      et paiements restent masqués — la relation passe par la plateforme.
    </p>
  </div>
</template>
