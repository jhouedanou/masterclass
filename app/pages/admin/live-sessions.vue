<script setup lang="ts">
import type { SessionLive, VisibiliteLive } from '#shared/types'
import { dateCourteLive, heureLive } from '#shared/utils/live'

/**
 * Back-office Live Sessions (planche 07, CDC §5.2) : réglage de visibilité de
 * la fonctionnalité (10.G), liste des sessions avec statut, date, inscrits /
 * capacité (visibles des seuls admins, RM13) et échéance de la vidéo montée
 * (fin + 21 jours, orange à J-5, rouge une fois dépassée — §4.2).
 */
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Live Sessions — administration')

type Ligne = SessionLive & {
  module: { id: string; slug: string; titre: string; numero: number; programme: string; statut: string } | null
  formateur: string
  moderateur: string
  inscrits: number
  reservees: number
  echeanceVideo: { echeance: string; joursRestants: number; niveau: 'normale' | 'proche' | 'depassee' } | null
}

const { data, refresh } = await useFetch<{ visibilite: VisibiliteLive; sessions: Ligne[] }>('/api/admin/live-sessions')
const { annoncer } = useToasts()
const zoomReel = useRuntimeConfig().public.zoomActif

const VISIBILITES: { valeur: VisibiliteLive; libelle: string; aide: string }[] = [
  { valeur: 'personne', libelle: 'Personne', aide: 'Menu, pages, badges, onglet formateur et e-mails masqués.' },
  { valeur: 'admins', libelle: 'Admins seulement', aide: 'Pour tester en production : visible des seuls comptes admin.' },
  { valeur: 'tous', libelle: 'Tout le monde', aide: 'Ouvert aux apprenants et aux formateurs.' },
]
const enCours = ref(false)
async function changerVisibilite(visibilite: VisibiliteLive) {
  if (!data.value || data.value.visibilite === visibilite) return
  enCours.value = true
  try {
    await $fetch('/api/admin/live-sessions/visibilite', { method: 'PUT', body: { visibilite } })
    data.value.visibilite = visibilite
    annoncer(`Live Sessions visibles pour : ${VISIBILITES.find((v) => v.valeur === visibilite)!.libelle}`)
  } catch (e) {
    annoncer((e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Réglage non enregistré', 'erreur')
  } finally {
    enCours.value = false
  }
}

const STATUTS: Record<string, { libelle: string; classe: string }> = {
  brouillon: { libelle: 'Brouillon', classe: 'bg-fond-voile text-discret' },
  publiee: { libelle: 'Publiée', classe: 'bg-live-voile text-live' },
  'en-cours': { libelle: 'En cours', classe: 'bg-live text-white' },
  terminee: { libelle: 'Terminée', classe: 'bg-alerte-voile text-alerte' },
  annulee: { libelle: 'Annulée', classe: 'bg-erreur-voile text-erreur-fonce' },
}

function suite(ligne: Ligne): { texte: string; classe: string } {
  if (ligne.statut === 'terminee' && ligne.module?.statut === 'disponible') return { texte: 'Vidéo publiée', classe: 'text-succes' }
  if (ligne.echeanceVideo) {
    const e = ligne.echeanceVideo
    const texte = e.joursRestants < 0
      ? `Vidéo en retard de ${-e.joursRestants} j`
      : `Vidéo à publier avant le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(e.echeance))}`
    return { texte, classe: e.niveau === 'depassee' ? 'font-bold text-erreur' : e.niveau === 'proche' ? 'font-bold text-alerte' : 'text-texte' }
  }
  if (ligne.statut === 'brouillon') return { texte: 'À publier', classe: 'text-discret' }
  if (ligne.statut === 'publiee' && !ligne.supportNom) return { texte: 'Support facultatif à déposer', classe: 'text-discret' }
  return { texte: '', classe: '' }
}
</script>

<template>
  <div v-if="data">
    <div class="mb-[18px] flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[24px] font-light">Live Sessions</h1>
      <UiBaseButton to="/admin/live-session/nouvelle" taille="sm" variante="sombre">+ Planifier une Live Session</UiBaseButton>
    </div>

    <section class="mb-5 rounded-[14px] border border-ligne-douce bg-white p-5" aria-labelledby="titre-visibilite">
      <h2 id="titre-visibilite" class="text-[14px] font-bold text-encre">
        Fonctionnalité Live Sessions <span class="font-normal text-discret">· visible sur le site pour</span>
      </h2>
      <div class="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-labelledby="titre-visibilite">
        <button
          v-for="v in VISIBILITES"
          :key="v.valeur"
          type="button"
          role="radio"
          :aria-checked="data.visibilite === v.valeur"
          :disabled="enCours"
          class="rounded-full border px-4 py-2 text-[13px] font-bold"
          :class="data.visibilite === v.valeur ? 'border-encre bg-encre text-white' : 'border-ligne text-texte hover:border-discret'"
          @click="changerVisibilite(v.valeur)"
        >
          {{ v.libelle }}
        </button>
      </div>
      <p class="mt-2 text-[12.5px] text-discret">{{ VISIBILITES.find((v) => v.valeur === data!.visibilite)?.aide }}</p>
    </section>

    <p
      v-if="!zoomReel"
      class="mb-4 rounded-[12px] border border-alerte-bordure bg-alerte-pale p-3.5 text-[13.5px] leading-[1.55] text-alerte-fonce"
      role="status"
    >
      <b>Zoom est en mode simulation sur ce serveur.</b> Une réunion créée à la publication sera fictive.
    </p>

    <AdminTableauSimple
      :colonnes="['Date · Heure (GMT)', 'Module', 'Formateur · modérateur', 'Inscrits / capacité', 'Statut', 'Suite']"
      :largeurs="['160px', 'calc(100% - 860px)', '200px', '130px', '110px', '260px']"
      largeur-min="1100px"
    >
      <tr v-for="ligne in data.sessions" :key="ligne.id" :class="ligne.statut === 'annulee' && 'text-discret'">
        <td class="px-4 py-[14px] font-bold whitespace-nowrap">{{ dateCourteLive(ligne.debut) }} · {{ heureLive(ligne.debut) }}</td>
        <td class="px-4 py-[14px]">
          <NuxtLink :to="`/admin/live-session/${ligne.id}`" class="font-bold text-encre hover:underline">
            {{ ligne.module?.titre ?? ligne.moduleId }}
          </NuxtLink>
          <span class="block text-[12px] text-discret">
            {{ ligne.module?.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }} · Module {{ String(ligne.module?.numero ?? '').padStart(2, '0') }}
          </span>
        </td>
        <td class="px-4 py-[14px]">
          {{ ligne.formateur }}
          <span class="block text-[12px] text-discret">{{ ligne.moderateur || 'Modérateur à choisir' }}</span>
        </td>
        <td class="px-4 py-[14px] whitespace-nowrap">
          <b :class="ligne.inscrits >= ligne.capacite ? 'text-erreur' : ligne.inscrits >= ligne.capacite * 0.8 ? 'text-alerte' : ''">{{ ligne.inscrits }}</b>
          / {{ ligne.capacite }}
          <span v-if="ligne.reservees" class="block text-[12px] text-discret">+ {{ ligne.reservees }} en paiement</span>
        </td>
        <td class="px-4 py-[14px]">
          <span class="rounded-full px-2.5 py-1 text-[11.5px] font-bold" :class="STATUTS[ligne.statut]?.classe">
            {{ STATUTS[ligne.statut]?.libelle }}
          </span>
        </td>
        <td class="px-4 py-[14px] text-[13px]" :class="suite(ligne).classe">{{ suite(ligne).texte }}</td>
      </tr>
      <tr v-if="!data.sessions.length">
        <td colspan="6" class="px-4 py-8 text-center text-discret">
          Aucune Live Session. Planifiez la première sur un module « À venir ».
        </td>
      </tr>
    </AdminTableauSimple>
    <p class="mt-3 text-[12.5px] text-discret">
      Le nombre d’inscrits n’est affiché qu’ici : ni sur le site, ni dans l’espace formateur.
    </p>
  </div>
</template>
