<script setup lang="ts">
import type { EtapeDeroule } from '#shared/types'
import { dateCourteLive, dateLongueLive, heureLive, ligneHoraireLive, pastilleDateLive } from '#shared/utils/live'

/**
 * Espace formateur, onglet « Live Sessions » (planche 08, CDC §4.4) : ses
 * sessions seulement, planifiées par l'équipe. Lecture seule sur la date et
 * le lien (RM12) ; pas de nombre d'inscrits (RM13). Préparation : déroulé,
 * support facultatif, test technique. « Animer sur Zoom » s'active 30 minutes
 * avant le début.
 */
definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Mes Live Sessions')

interface SessionFormateur {
  id: string
  slug: string
  etat: 'planifiee' | 'aujourdhui' | 'terminee' | 'annulee'
  debut: string
  dureeMinutes: number
  module: { titre: string; programme: string; thematique: string }
  moderateur: string
  preparation: { derouleValide: boolean; support: string | null; testTechniqueLe: string | null }
  deroule: EtapeDeroule[]
  animerActif: boolean
  animerA: string
  lienHote: string | null
}

const { data: visibilite } = await useFetch<{ visible: boolean }>('/api/live-sessions/visibilite', { key: 'live-visible' })
if (!visibilite.value?.visible) {
  throw createError({ statusCode: 404, statusMessage: 'Page introuvable', fatal: true })
}
const { data: sessions, refresh } = await useFetch<SessionFormateur[]>('/api/formateur/live-sessions', { default: () => [] })
const { annoncer } = useToasts()

const prochaine = computed(() => sessions.value.find((s) => s.etat === 'planifiee' || s.etat === 'aujourdhui') ?? null)

const ETATS = {
  planifiee: { libelle: 'Planifiée', classe: 'bg-live-voile text-live' },
  aujourdhui: { libelle: 'Aujourd’hui', classe: 'bg-live text-white' },
  terminee: { libelle: 'Terminée', classe: 'bg-alerte-voile text-alerte' },
  annulee: { libelle: 'Annulée', classe: 'bg-fond-voile text-discret' },
} as const

function suite(s: SessionFormateur): string {
  if (s.etat === 'annulee') return '—'
  if (s.etat === 'terminee') return 'Version vidéo en préparation par l’équipe'
  if (!s.preparation.derouleValide) return 'Déroulé en cours de validation'
  if (!s.preparation.testTechniqueLe) return 'Test technique à planifier'
  if (!s.preparation.support) return 'Support à déposer (facultatif)'
  return 'Prête'
}

// --- Dépôt du support (RM5) : envoi direct vers le stockage privé -----------
const envoi = ref<string | null>(null)
async function deposer(session: SessionFormateur, evenement: Event) {
  const champ = evenement.target as HTMLInputElement
  const f = champ.files?.[0]
  if (!f) return
  envoi.value = session.id
  try {
    const depot = await $fetch<{ chemin: string; urlEnvoi: string; type: string; nom: string }>(
      `/api/formateur/live-sessions/${session.id}/support`,
      { method: 'POST', body: { etape: 'preparer', nom: f.name, taille: f.size } },
    )
    const reponse = await fetch(depot.urlEnvoi, { method: 'PUT', headers: { 'Content-Type': depot.type }, body: f })
    if (!reponse.ok) throw new Error('Le fichier n’a pas pu être envoyé. Réessayez.')
    await $fetch(`/api/formateur/live-sessions/${session.id}/support`, {
      method: 'POST',
      body: { etape: 'confirmer', chemin: depot.chemin, nom: depot.nom },
    })
    annoncer('Support déposé : il sera partagé avec les inscrits après la session.')
    await refresh()
  } catch (e) {
    const r = e as { data?: { statusMessage?: string }; message?: string }
    annoncer(r.data?.statusMessage ?? r.message ?? 'Dépôt impossible', 'erreur')
  } finally {
    envoi.value = null
    champ.value = ''
  }
}

const dateTest = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
    .format(new Date(iso))
    .replace(':', 'h')
</script>

<template>
  <div>
    <h1 class="font-title text-[26px] font-light">Mes Live Sessions</h1>
    <p class="mt-1.5 max-w-[720px] text-[14px] text-texte">
      Les sessions sont planifiées par l’équipe Big Five. Vous retrouvez ici vos dates, le lien pour animer et
      ce qu’il reste à préparer.
    </p>

    <section
      v-if="prochaine"
      class="sur-sombre mt-5 rounded-[16px] bg-encre p-6 text-white"
      aria-labelledby="titre-prochaine-live"
    >
      <div class="flex flex-wrap items-center gap-5">
        <div class="rounded-[10px] bg-nuit-panneau px-4 py-2.5 text-center">
          <b class="block text-[20px] text-live-pastel">{{ pastilleDateLive(prochaine.debut).jour }}</b>
          <span class="text-[11px] font-bold text-live-pastel uppercase">{{ pastilleDateLive(prochaine.debut).mois }}</span>
        </div>
        <div class="min-w-[240px] flex-1">
          <p class="text-[11.5px] font-bold tracking-[0.12em] text-live-pastel uppercase">Prochaine Live Session</p>
          <h2 id="titre-prochaine-live" class="mt-0.5 text-[17px] font-bold text-white">{{ prochaine.module.titre }}</h2>
          <p class="mt-1 text-[13px] text-nuit-clair">
            {{ ligneHoraireLive(prochaine.debut, prochaine.dureeMinutes) }} ·
            {{ prochaine.module.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }} · {{ prochaine.module.thematique }} ·
            modérateur : {{ prochaine.moderateur }}
          </p>
        </div>
        <div class="text-center">
          <UiBaseButton
            :to="prochaine.animerActif ? `/formateur/live/${prochaine.id}` : undefined"
            :variante="prochaine.animerActif ? 'live' : 'verrouille-sombre'"
            :disabled="!prochaine.animerActif"
          >
            Animer sur Zoom
          </UiBaseButton>
          <p class="mt-1.5 text-[12px] text-nuit-discret">
            <template v-if="prochaine.animerActif && prochaine.lienHote">
              Secours : <a :href="prochaine.lienHote" target="_blank" rel="noopener" class="underline">ouvrir dans l’application Zoom</a>
            </template>
            <template v-else>Actif le jour J, 30 min avant le début</template>
          </p>
        </div>
      </div>

      <div class="mt-6 grid gap-5 lg:grid-cols-2">
        <div class="rounded-[12px] bg-nuit-panneau p-5">
          <h3 class="text-[14px] font-bold text-white">À préparer avant le {{ dateLongueLive(prochaine.debut).toLowerCase() }}</h3>
          <ul class="mt-3 flex flex-col gap-3 text-[13.5px]">
            <li class="flex items-start justify-between gap-3">
              <span>
                <span class="block text-white">Déroulé du module validé par l’équipe</span>
              </span>
              <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="prochaine.preparation.derouleValide ? 'bg-succes-voile text-succes' : 'bg-nuit-pastille text-nuit-clair'">
                {{ prochaine.preparation.derouleValide ? 'Validé' : 'En cours' }}
              </span>
            </li>
            <li class="flex items-start justify-between gap-3">
              <span>
                <span class="block text-white">Support de cours (facultatif)</span>
                <span class="block text-[12px] text-nuit-discret">
                  {{ prochaine.preparation.support ?? 'Partagé avec les inscrits après la session' }}
                </span>
              </span>
              <label class="shrink-0 cursor-pointer rounded-full border border-nuit-bordure px-3 py-1.5 text-[12px] font-bold text-white hover:bg-nuit-bordure focus-within:outline-2 focus-within:outline-live-pastel">
                {{ envoi === prochaine.id ? 'Envoi…' : prochaine.preparation.support ? 'Remplacer' : 'Déposer un fichier' }}
                <input type="file" accept=".pdf,.pptx,.ppt,.zip" class="sr-only" :disabled="envoi !== null" @change="deposer(prochaine, $event)">
              </label>
            </li>
            <li class="flex items-start justify-between gap-3">
              <span class="block text-white">Test micro et caméra avec le modérateur</span>
              <span class="shrink-0 text-[12.5px] text-nuit-clair">
                {{ prochaine.preparation.testTechniqueLe ? dateTest(prochaine.preparation.testTechniqueLe) : 'Date à venir' }}
              </span>
            </li>
          </ul>
        </div>
        <div class="rounded-[12px] bg-nuit-panneau p-5">
          <h3 class="text-[14px] font-bold text-white">Déroulé de la session</h3>
          <ol class="mt-3 flex flex-col gap-2 text-[13.5px] text-gris-perle">
            <li>1. Vous déroulez le module chapitre par chapitre, sans interruption.</li>
            <li>2. Micros des participants coupés pendant la formation.</li>
            <li>3. Questions-réponses aux moments indiqués, gérées par le modérateur.</li>
            <li>4. La session est enregistrée. La partie formation devient ensuite le module vidéo.</li>
          </ol>
          <ol v-if="prochaine.deroule.length" class="mt-4 flex flex-col gap-1.5 border-t border-nuit-bordure pt-3 text-[13px]">
            <li v-for="e in prochaine.deroule" :key="`${e.decalageMinutes}-${e.libelle}`" class="flex gap-3">
              <span class="w-[50px] shrink-0 font-mono text-nuit-discret">+{{ e.decalageMinutes }} min</span>
              <span :class="e.questionsReponses ? 'font-bold text-live-pastel' : 'text-white'">{{ e.libelle }}</span>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <AdminTableauSimple
      class="mt-5"
      :colonnes="['Date · heure', 'Module', 'Statut', 'Suite']"
      :largeurs="['150px', 'calc(100% - 560px)', '120px', '290px']"
      largeur-min="760px"
    >
      <tr v-for="s in sessions" :key="s.id" :class="s.etat === 'annulee' && 'text-discret'">
        <td class="px-4 py-[14px] font-bold whitespace-nowrap">{{ dateCourteLive(s.debut) }} · {{ heureLive(s.debut) }}</td>
        <td class="px-4 py-[14px]">{{ s.module.titre }}</td>
        <td class="px-4 py-[14px]">
          <span class="rounded-full px-2.5 py-1 text-[11.5px] font-bold" :class="ETATS[s.etat].classe">{{ ETATS[s.etat].libelle }}</span>
        </td>
        <td class="px-4 py-[14px] text-[13px]">
          <span class="flex flex-wrap items-center gap-2">
            {{ suite(s) }}
            <label
              v-if="s.etat === 'terminee' && s.id !== prochaine?.id"
              class="cursor-pointer rounded-full border border-ligne px-2.5 py-1 text-[12px] font-bold hover:border-discret focus-within:outline-2 focus-within:outline-social"
            >
              {{ envoi === s.id ? 'Envoi…' : s.preparation.support ? 'Remplacer le support' : 'Déposer le support' }}
              <input type="file" accept=".pdf,.pptx,.ppt,.zip" class="sr-only" :disabled="envoi !== null" @change="deposer(s, $event)">
            </label>
            <NuxtLink v-if="s.etat === 'aujourdhui' && s.animerActif" :to="`/formateur/live/${s.id}`" class="font-bold text-live hover:underline">
              Animer →
            </NuxtLink>
          </span>
        </td>
      </tr>
      <tr v-if="!sessions.length">
        <td colspan="4" class="px-4 py-8 text-center text-discret">Aucune Live Session planifiée pour vous.</td>
      </tr>
    </AdminTableauSimple>
    <p class="mt-3 text-[12.5px] text-discret">
      Une fois la version vidéo publiée, la session sort de cette liste et le module rejoint « Mes modules ».
    </p>
  </div>
</template>
