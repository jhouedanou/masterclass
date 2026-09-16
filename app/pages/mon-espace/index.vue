<script setup lang="ts">
import type { Formateur, Module, StatutCoachingPrive, Thematique } from '#shared/types'

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

    <EspaceBandeauProfil :completion="data.completionProfil" class="hidden lg:block" />
    <EspaceBandeauProfil :completion="data.completionProfil" compact class="lg:hidden" />

    <h1 class="mt-6 text-[28px] font-medium lg:text-[30px]">
      <span class="lg:hidden">Bonjour {{ prenom }}</span>
      <span class="hidden lg:inline">
        Bonjour {{ prenom }}, reprenez où vous vous étiez {{ feminin ? 'arrêtée' : 'arrêté' }}
      </span>
    </h1>

    <div class="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <!-- Cartes modules (planche B, écrans 01 et 07) -->
        <div v-if="data.cartes.length" class="grid gap-4 md:grid-cols-2">
          <article
            v-for="carte in data.cartes"
            :key="carte.moduleId"
            class="flex flex-col rounded-[14px] border border-ligne-douce bg-white p-5"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="surtitre" :class="carte.programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'">
                <span class="hidden lg:inline">{{ carte.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }} · </span>{{ carte.thematique }}
              </p>
              <span
                class="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold"
                :class="carte.progression === 100 ? 'bg-succes-voile text-succes' : carte.progression > 0 ? 'bg-social-voile text-social' : 'bg-fond-voile text-discret'"
              >
                {{ carte.progression === 100 ? 'Complété ✓' : carte.progression > 0 ? 'En cours' : 'Non commencé' }}
              </span>
            </div>
            <h2 class="mt-2 font-title text-[20px] leading-[1.25] font-light">{{ carte.titre }}</h2>
            <!-- 4 · Session imminente (planche B, écran 07) -->
            <p
              v-if="carte.progression < 100 && carte.prochaineSession && carte.prochaineSession.joursAvant <= 1"
              class="mt-2 rounded-[10px] bg-alerte-voile px-3 py-2 text-[13px] text-alerte"
            >
              🗓 Session de coaching {{ carte.prochaineSession.joursAvant === 0 ? 'aujourd’hui' : 'demain' }}
              {{ carte.prochaineSession.heure.replace(':', 'h') }} — {{ Math.max(0, carte.prochaineSession.places - carte.prochaineSession.inscrits) }} places restantes
            </p>
            <p class="mt-1.5 text-[13px] text-discret">
              {{ carte.formateur }} ·
              <template v-if="carte.progression === 100 && carte.termineLe">Terminé le {{ formatDate(carte.termineLe) }}</template>
              <template v-else-if="carte.prochaineSession">
                Prochaine session de coaching : {{ LIBELLE_JOUR(carte.prochaineSession.date) }}, {{ carte.prochaineSession.heure }}
              </template>
              <template v-else>Aucune session planifiée pour l’instant</template>
            </p>
            <div class="mt-auto flex items-center justify-between gap-3 pt-4">
              <span class="text-[13.5px] font-bold text-encre">
                <span class="lg:hidden">{{ carte.chapitresVus }}/{{ carte.chapitresTotal }}</span>
                <span class="hidden lg:inline">{{ carte.chapitresVus }} / {{ carte.chapitresTotal }} chapitres</span><span v-if="carte.progression === 100"> ✓</span>
              </span>
              <UiBaseButton
                v-if="carte.progression < 100 && carte.prochaineSession && carte.prochaineSession.joursAvant <= 1"
                to="/mon-espace/sessions"
                taille="sm"
                variante="contour"
              >
                Voir la session
              </UiBaseButton>
              <UiBaseButton
                v-else-if="carte.progression === 100"
                :to="carte.certificat ? `/certificats/${carte.certificat}` : '/mon-espace/certificats'"
                taille="sm"
                variante="sombre"
              >
                Mon certificat
              </UiBaseButton>
              <UiBaseButton v-else :to="`/mon-espace/module/${carte.slug}`" taille="sm">
                {{ carte.progression > 0 ? 'Continuer' : 'Commencer' }}
              </UiBaseButton>
            </div>
          </article>
        </div>
        <p v-else class="rounded-[14px] border border-dashed border-ligne p-8 text-center text-[14px] text-discret">
          Aucun module pour l’instant.
          <NuxtLink to="/modules" class="font-bold">Voir le catalogue</NuxtLink>.
        </p>

        <!-- Coaching privé + Historique d'achats (desktop) -->
        <div class="mt-6 hidden gap-4 md:grid md:grid-cols-2">
          <section class="rounded-[14px] border border-ligne-douce bg-white p-5">
            <h2 class="font-title text-[19px] font-light">Coaching privé</h2>
            <p class="mt-1 text-[13.5px] text-texte">
              Une session individuelle avec le formateur de votre choix, sur vos besoins précis.
            </p>
            <p v-if="data.coachingPrive" class="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-discret">
              Demande du {{ formatDate(data.coachingPrive.date) }} — {{ data.coachingPrive.formateur }}
              <span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="CLASSES_COACHING_PRIVE[data.coachingPrive.statut]">
                {{ LIBELLES_COACHING_PRIVE[data.coachingPrive.statut] }}
              </span>
            </p>
            <UiBaseButton to="/mon-espace/coaching-prive?nouvelle=1" class="mt-4" taille="sm" variante="contour">
              Demander un coaching privé
            </UiBaseButton>
          </section>
          <section class="rounded-[14px] border border-ligne-douce bg-white p-5">
            <h2 class="font-title text-[19px] font-light">Historique d’achats</h2>
            <ul v-if="data.achats.length" class="mt-3 divide-y divide-ligne-claire text-[13.5px]">
              <li v-for="achat in data.achats" :key="achat.reference" class="py-2">
                <p class="truncate text-encre">{{ achat.libelle }}</p>
                <p class="text-[12.5px] text-discret">{{ formatDate(achat.date) }} · {{ formatFcfa(achat.total) }}</p>
              </li>
            </ul>
            <p v-else class="mt-3 text-[13.5px] text-discret">Aucun achat pour l’instant.</p>
            <a :href="lienCommunaute" target="_blank" rel="noopener" class="mt-4 inline-block text-[14px] font-bold text-whatsapp hover:underline">
              Rejoindre la Communauté WhatsApp →
            </a>
          </section>
        </div>
      </div>

      <!-- Vos prochaines sessions de coaching -->
      <aside>
        <section class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <h2 class="font-title text-[19px] font-light">
            <span class="md:hidden">Prochaine coaching session</span>
            <span class="hidden md:inline lg:hidden">Prochaine session</span>
            <span class="hidden lg:inline">Vos prochaines sessions de coaching</span>
          </h2>
          <p class="mt-1 hidden text-[12.5px] text-discret lg:block">
            Sessions de coaching collectif de 2 h · 25 places · rappel 24 h avant par email et WhatsApp
          </p>
          <ul v-if="data.planning.length" class="mt-4 space-y-3">
            <li
              v-for="(session, i) in data.planning"
              :key="session.id"
              class="rounded-[12px] border border-ligne-claire p-3.5"
              :class="i > 0 && 'hidden lg:block'"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-[13px] font-bold text-encre">{{ LIBELLE_JOUR(session.date) }} · {{ session.heure }} GMT</p>
                <span class="rounded-full bg-fond-voile px-2 py-0.5 text-[11.5px] font-bold text-discret">
                  {{ session.joursAvant === 0 ? 'Aujourd’hui' : `J-${session.joursAvant}` }}
                </span>
              </div>
              <p class="mt-1 text-[13.5px] text-texte">
                <span class="hidden lg:inline">{{ session.thematique }} — </span>{{ session.formateur }}<span class="lg:hidden"> · Zoom</span>
              </p>
              <UiBaseButton
                :to="session.inscrit && session.joursAvant === 0 ? `/mon-espace/session/${session.id}` : '/mon-espace/sessions'"
                taille="sm"
                class="mt-3 w-full"
                :variante="session.inscrit && session.joursAvant === 0 ? 'social' : 'contour'"
                :disabled="data.completionProfil < 100"
              >
                {{ session.inscrit ? 'Rejoindre — actif le jour J' : 'Réserver ma place' }}
              </UiBaseButton>
            </li>
          </ul>
          <p v-else class="mt-4 text-[13.5px] text-discret">Aucune session à venir pour vos modules.</p>
          <EspaceVerrouProfil :completion="data.completionProfil" class="mt-4" />
        </section>
      </aside>
    </div>

    <!-- Hors de la grille : le rail occupe toute la largeur disponible. -->
    <EspaceCarouselModules :modules="catalogue" :module-ids-possedes="moduleIdsPossedes" />
  </div>
</template>
