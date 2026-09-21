<script setup lang="ts">
import type { Formateur, Module, StatutCoachingPrive, Thematique } from '#shared/types'
import { compterPlaces } from '#shared/utils/compteurs'
import { dureeSessionEnHeures, PLACES_SESSION } from '#shared/utils/coaching'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Tableau de bord')

interface Carte {
  moduleId: string
  slug: string
  titre: string
  programme: 'social-media' | 'entrepreneurs'
  thematique: string
  formateur: string
  progression: number
  chapitresVus: number
  chapitresTotal: number
  termineLe: string | null
  certificat: string | null
  prochaineSession: {
    id: string
    date: string
    heure: string
    inscrit: boolean
    places: number
    inscrits: number
    joursAvant: number
  } | null
}

interface TableauDeBord {
  completionProfil: number
  cartes: Carte[]
  coachingPrive: { id: string; date: string; formateur: string; statut: StatutCoachingPrive } | null
  achats: { reference: string; date: string; total: number; libelle: string }[]
  planning: {
    id: string
    date: string
    heure: string
    dureeMinutes: number
    places: number
    inscrits: number
    thematique: string
    formateur: string
    joursAvant: number
    inscrit: boolean
  }[]
}

const auth = useAuthStore()
const route = useRoute()
const { data, refresh } = await useFetch<TableauDeBord>('/api/mon-espace')

// Le catalogue complet, pour le rail de découverte. L'endpoint public suffit :
// il écarte déjà les brouillons et joint formateur et thématique.
const { data: catalogue } = await useFetch<
  (Module & { formateur?: Formateur | null; thematique?: Thematique | null })[]
>('/api/modules', { default: () => [] })

const moduleIdsPossedes = computed(() => data.value?.cartes.map((c) => c.moduleId) ?? [])

const prenom = computed(() => auth.utilisateur?.prenom ?? '')
const feminin = computed(() => /[ae]$/i.test(prenom.value))

// Écran 4 du parcours de suppression : « Bon retour ! » — la connexion a
// annulé la suppression programmée.
const bonRetour = ref(route.query['bon-retour'] === '1' && Boolean(auth.utilisateur?.suppressionPrevueLe))
async function reprendre() {
  await $fetch('/api/mon-espace/compte/suppression', { method: 'DELETE' })
  await auth.rafraichir()
  bonRetour.value = false
  await navigateTo('/mon-espace', { replace: true })
  await refresh()
}

const LIBELLE_JOUR = (date: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${date}T00:00:00`))

const lienCommunaute = lienWhatsApp('Bonjour, je souhaite rejoindre la Communauté E-Masterclass Big Five.')

/**
 * La planche 07 donne cinq états à la carte module et colore le surtitre selon
 * l'état — pas selon le programme, comme le faisait la phase précédente.
 */
function etatCarte(carte: Carte) {
  if (carte.progression === 100) return 'complete'
  if (carte.prochaineSession && carte.prochaineSession.joursAvant <= 1) return 'imminente'
  return carte.progression > 0 ? 'en-cours' : 'nouveau'
}
const COULEUR_SURTITRE = {
  complete: 'text-succes',
  imminente: 'text-alerte',
  'en-cours': 'text-social',
  nouveau: 'text-discret',
} as const
</script>

<template>
  <div v-if="data">
    <!-- Écran 4 — Réactivation -->
    <div v-if="bonRetour" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <div class="w-full max-w-md rounded-carte bg-white p-8 text-center">
        <p class="text-[36px]" aria-hidden="true">👋</p>
        <h2 class="mt-2 font-title text-[26px] font-light">Bon retour, {{ prenom }} !</h2>
        <p class="mt-3 text-[15px] text-texte">
          Votre connexion a annulé la suppression. Tous vos modules et certificats sont intacts.
        </p>
        <UiBaseButton class="mt-6" taille="lg" @click="reprendre">Reprendre ma formation</UiBaseButton>
      </div>
    </div>

    <EspaceBandeauProfil :completion="data.completionProfil" class="mb-7 hidden lg:flex" />
    <EspaceBandeauProfil :completion="data.completionProfil" compact class="mb-5 lg:hidden" />

    <div class="grid gap-7 lg:grid-cols-[1fr_400px] lg:items-start">
      <div>
        <!-- Le titre appartient à la colonne de gauche : c'est ce qui fait
             remonter le panneau de planning à sa hauteur, comme dans la maquette. -->
        <h1 class="mb-5 text-[28px] font-light lg:text-[30px]">
          <span class="lg:hidden">Bonjour {{ prenom }}</span>
          <span class="hidden lg:inline">
            Bonjour {{ prenom }}, reprenez où vous vous étiez {{ feminin ? 'arrêtée' : 'arrêté' }}
          </span>
        </h1>

        <!-- Cartes modules (planche B, écrans 01 et 07) -->
        <div v-if="data.cartes.length" class="flex flex-col gap-4">
          <article
            v-for="carte in data.cartes"
            :key="carte.moduleId"
            class="grid gap-[18px] rounded-carte border border-ligne-douce bg-white p-6 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div class="min-w-0">
              <div class="mb-2 flex flex-wrap items-center gap-2.5">
                <p class="surtitre" :class="COULEUR_SURTITRE[etatCarte(carte)]">
                  <span class="hidden lg:inline">{{ carte.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }} · </span>{{ carte.thematique }}
                </p>
                <span
                  class="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold"
                  :class="carte.progression === 100 ? 'bg-succes-voile text-succes' : carte.progression > 0 ? 'bg-social-voile text-social' : 'bg-fond-voile text-discret'"
                >
                  {{ carte.progression === 100 ? 'Complété ✓' : carte.progression > 0 ? 'En cours' : 'Non commencé' }}
                </span>
              </div>
              <h2 class="mb-1.5 font-title text-[21px] leading-[1.25] font-light">{{ carte.titre }}</h2>
              <!-- 4 · Session imminente (planche B, écran 07) -->
              <p
                v-if="etatCarte(carte) === 'imminente' && carte.prochaineSession"
                class="mb-2 rounded-[8px] bg-alerte-voile px-2.5 py-2 text-[12px] font-bold text-alerte"
              >
                🗓 Session de coaching {{ carte.prochaineSession.joursAvant === 0 ? 'aujourd’hui' : 'demain' }}
                {{ carte.prochaineSession.heure.replace(':', 'h') }} — {{ compterPlaces(Math.max(0, carte.prochaineSession.places - carte.prochaineSession.inscrits)) }} restantes
              </p>
              <p class="mb-3 text-[13.5px] text-discret">
                {{ carte.formateur }} ·
                <template v-if="carte.progression === 100 && carte.termineLe">Terminé le {{ formatDate(carte.termineLe) }}</template>
                <template v-else-if="carte.prochaineSession">
                  Prochaine session de coaching : {{ LIBELLE_JOUR(carte.prochaineSession.date) }}, {{ carte.prochaineSession.heure }}
                </template>
                <template v-else>Aucune session planifiée pour l’instant</template>
              </p>
              <!-- La jauge manquait : la maquette la donne à chaque carte. -->
              <div class="flex items-center gap-3">
                <div
                  class="h-2 flex-1 overflow-hidden rounded-full"
                  :class="carte.progression === 100 ? 'bg-succes-voile' : 'bg-piste'"
                >
                  <div
                    class="h-full rounded-full"
                    :class="carte.progression === 100 ? 'bg-whatsapp' : 'bg-social'"
                    :style="{ width: `${carte.progression}%` }"
                  />
                </div>
                <span class="text-[13px] font-bold" :class="carte.progression === 100 ? 'text-succes' : 'text-encre'">
                  <span class="lg:hidden">{{ carte.chapitresVus }}/{{ carte.chapitresTotal }}</span>
                  <span class="hidden lg:inline">{{ carte.chapitresVus }} / {{ carte.chapitresTotal }} chapitres</span>
                </span>
              </div>
            </div>
            <UiBaseButton
              v-if="etatCarte(carte) === 'imminente'"
              to="/mon-espace/sessions"
              taille="sm"
            >
              Voir la session
            </UiBaseButton>
            <!-- Module terminé : le certificat d'abord, mais pas seul. Ce
                 bouton était la seule issue de la carte, si bien qu'aller
                 revoir un chapitre demandait de repasser par le catalogue —
                 un module achevé n'est pas un module fermé. -->
            <div v-else-if="carte.progression === 100" class="flex shrink-0 flex-col items-stretch gap-2">
              <UiBaseButton
                :to="carte.certificat ? `/certificats/${carte.certificat}` : '/mon-espace/certificats'"
                taille="sm"
                variante="succes"
              >
                Mon certificat
              </UiBaseButton>
              <UiBaseButton :to="`/mon-espace/module/${carte.slug}`" taille="sm" variante="contour">
                Revoir le module
              </UiBaseButton>
            </div>
            <UiBaseButton v-else :to="`/mon-espace/module/${carte.slug}`" taille="sm" variante="sombre">
              {{ carte.progression > 0 ? 'Continuer' : 'Commencer' }}
            </UiBaseButton>
          </article>
        </div>
        <p v-else class="rounded-carte border border-dashed border-ligne p-8 text-center text-[14px] text-discret">
          Aucun module pour l’instant.
          <NuxtLink to="/modules" class="font-bold">Voir le catalogue</NuxtLink>.
        </p>

        <!-- Coaching privé + Historique d'achats (desktop) -->
        <div class="mt-4 hidden gap-4 md:grid md:grid-cols-2">
          <section class="rounded-carte border border-ligne-douce bg-white p-6">
            <h2 class="mb-2 font-title text-[18px] font-light">Coaching privé</h2>
            <p class="mb-3.5 text-[13.5px] leading-[1.6] text-texte">
              Une session individuelle avec le formateur de votre choix, sur vos besoins précis.
            </p>
            <div
              v-if="data.coachingPrive"
              class="mb-3.5 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-fond-clair px-3.5 py-3 text-[13px]"
            >
              <span>Demande du {{ formatDate(data.coachingPrive.date) }} — {{ data.coachingPrive.formateur }}</span>
              <span class="rounded-full px-2.5 py-1 text-[11.5px] font-bold" :class="CLASSES_COACHING_PRIVE[data.coachingPrive.statut]">
                {{ LIBELLES_COACHING_PRIVE[data.coachingPrive.statut] }}
              </span>
            </div>
            <UiBaseButton to="/mon-espace/coaching-prive?nouvelle=1" taille="sm" variante="contour">
              Demander un coaching privé
            </UiBaseButton>
          </section>
          <section class="rounded-carte border border-ligne-douce bg-white p-6">
            <h2 class="mb-3 font-title text-[18px] font-light">Historique d’achats</h2>
            <ul v-if="data.achats.length" class="flex flex-col gap-2.5 text-[13.5px]">
              <li v-for="achat in data.achats" :key="achat.reference" class="flex justify-between gap-3">
                <span class="truncate text-encre">{{ achat.libelle }}</span>
                <span class="shrink-0 text-discret">{{ formatDate(achat.date) }} · {{ formatFcfa(achat.total) }}</span>
              </li>
            </ul>
            <p v-else class="text-[13.5px] text-discret">Aucun achat pour l’instant.</p>
            <div class="mt-3.5 border-t border-ligne-claire pt-3">
              <a :href="lienCommunaute" target="_blank" rel="noopener" class="text-[13px] font-bold text-whatsapp hover:underline">
                Rejoindre la Communauté WhatsApp →
              </a>
            </div>
          </section>
        </div>
      </div>

      <!-- Vos prochaines sessions de coaching -->
      <aside>
        <!-- La maquette pose ce planning sur un panneau noir, pas sur une carte
             blanche : c'est lui qui ancre la colonne de droite de l'écran 01. -->
        <section class="sur-sombre rounded-[18px] bg-encre p-[26px] text-white">
          <h2 class="mb-1 font-title text-[19px] font-light text-white">
            <span class="md:hidden">Prochaine coaching session</span>
            <span class="hidden md:inline lg:hidden">Prochaine session</span>
            <span class="hidden lg:inline">Vos prochaines sessions de coaching</span>
          </h2>
          <p class="mb-[18px] hidden text-[12.5px] text-nuit-clair lg:block">
            Sessions de coaching collectif de {{ dureeSessionEnHeures() }} · {{ compterPlaces(PLACES_SESSION) }} ·
            rappel 24 h avant par email et WhatsApp
          </p>
          <ul v-if="data.planning.length" class="flex flex-col gap-3">
            <li
              v-for="(session, i) in data.planning"
              :key="session.id"
              class="rounded-champ bg-encre-800 p-4"
              :class="i > 0 && 'hidden lg:block'"
            >
              <div class="mb-1.5 flex items-center justify-between gap-2">
                <p class="text-[14.5px] font-bold">{{ LIBELLE_JOUR(session.date) }} · {{ session.heure }} GMT</p>
                <span class="shrink-0 rounded-full bg-nuit-pastille px-2.5 py-1 text-[11px] font-bold text-social-clair">
                  {{ session.joursAvant === 0 ? 'Aujourd’hui' : `J-${session.joursAvant}` }}
                </span>
              </div>
              <p class="mb-2.5 text-[13px] text-ligne-grise">
                <span class="hidden lg:inline">{{ session.thematique }} — </span>{{ session.formateur }}<span class="lg:hidden"> · Zoom</span>
              </p>
              <UiBaseButton
                :to="session.inscrit && session.joursAvant === 0 ? `/mon-espace/session/${session.id}` : '/mon-espace/sessions'"
                taille="sm"
                class="w-full"
                :variante="session.inscrit
                  ? (session.joursAvant === 0 ? 'social' : 'verrouille-sombre')
                  : 'contour-clair'"
                :disabled="data.completionProfil < 100"
              >
                {{ session.inscrit ? 'Rejoindre — actif le jour J' : 'Réserver ma place' }}
              </UiBaseButton>
            </li>
          </ul>
          <p v-else class="text-[13.5px] text-nuit-clair">Aucune session à venir pour vos modules.</p>
          <EspaceVerrouProfil :completion="data.completionProfil" variante="sombre" class="mt-4 block" />
        </section>
      </aside>
    </div>

    <!-- Hors de la grille : le rail occupe toute la largeur disponible. -->
    <EspaceCarouselModules :modules="catalogue" :module-ids-possedes="moduleIdsPossedes" />
  </div>
</template>
