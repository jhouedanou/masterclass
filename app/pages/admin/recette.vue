<script setup lang="ts">
import type { AnomalieRecette, ControleRecette, Recette, ResultatRecette, StatutRecette } from '#shared/types'
import type { ColonneCsv } from '~/utils/csv'

/**
 * Recette partagée : chaque testeur marque chaque contrôle OK, KO ou Passé,
 * avec une note ; tout le monde voit les résultats des autres. Ouverte à tout
 * compte d'administration — un compte de contenu sans section sert de compte
 * testeur. Les contrôles sont décrits dans `server/data/recette.ts`.
 *
 * Ce qui sort de la liste (une page qui casse, un écran oublié) se signale en
 * bas de page, comme anomalie libre : elle n'est rattachée à aucun contrôle.
 */
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Recette — administration')

const auth = useAuthStore()
const { annoncer } = useToasts()
const { data, refresh, error } = await useFetch<Recette>('/api/admin/recette')

/** Tous les résultats, ou seulement les miens (les pastilles des autres disparaissent). */
const vue = ref<'equipe' | 'moi'>('equipe')
/** Ce qu'on garde à l'écran : tout, ce qu'il me reste à jouer, ou les KO. */
const filtre = ref<'tout' | 'a-faire' | 'ko'>('tout')

const moi = computed(() => auth.utilisateur?.id ?? '')
const controles = computed(() => data.value?.sections.flatMap((s) => s.controles) ?? [])
const cles = computed(() => new Set(controles.value.map((c) => c.k)))
/** Les résultats d'un contrôle retiré de la liste ne comptent plus. */
const resultats = computed(() => (data.value?.resultats ?? []).filter((r) => cles.value.has(r.controle)))

const parControle = computed(() => {
  const index: Record<string, ResultatRecette[]> = {}
  for (const r of resultats.value) (index[r.controle] ??= []).push(r)
  return index
})
const mien = (k: string) => parControle.value[k]?.find((r) => r.testeurId === moi.value) ?? null
const autres = (k: string) =>
  vue.value === 'moi' ? [] : (parControle.value[k] ?? []).filter((r) => r.testeurId !== moi.value)

const faits = computed(() => controles.value.filter((c) => mien(c.k)).length)
const totaux = computed(() => {
  const t = { ok: 0, ko: 0, passe: 0, testeurs: new Set<string>() }
  for (const r of resultats.value) {
    t[r.statut] += 1
    t.testeurs.add(r.testeurId)
  }
  return t
})
const anomalies = computed(() =>
  resultats.value.filter((r) => r.statut === 'ko' && (vue.value === 'equipe' || r.testeurId === moi.value)),
)
/** Anomalies libres : les ouvertes d'abord, puis les corrigées, chacune de la plus récente à la plus ancienne. */
const anomaliesLibres = computed(() =>
  (data.value?.anomalies ?? [])
    .filter((a) => vue.value === 'equipe' || a.testeurId === moi.value)
    .sort((a, b) => Number(!!a.corrigeeLe) - Number(!!b.corrigeeLe)),
)
const anomaliesOuvertes = computed(() => (data.value?.anomalies ?? []).filter((a) => !a.corrigeeLe).length)

function retenu(c: ControleRecette) {
  if (filtre.value === 'a-faire') return !mien(c.k)
  if (filtre.value === 'ko') {
    return vue.value === 'moi'
      ? mien(c.k)?.statut === 'ko'
      : (parControle.value[c.k] ?? []).some((r) => r.statut === 'ko')
  }
  return true
}
const sections = computed(() =>
  (data.value?.sections ?? [])
    .map((s) => ({ ...s, controles: s.controles.filter(retenu) }))
    .filter((s) => s.controles.length),
)

const STATUTS: StatutRecette[] = ['ok', 'ko', 'passe']
const LIBELLE: Record<StatutRecette, string> = { ok: 'OK', ko: 'KO', passe: 'Passé' }
const CLASSE: Record<StatutRecette, string> = {
  ok: 'bg-succes-voile text-succes-fonce',
  ko: 'bg-erreur-voile text-erreur-fonce',
  passe: 'bg-fond-voile text-discret',
}

const notes = reactive<Record<string, string>>({})
const occupe = ref<string | null>(null)

async function envoyer(k: string, statut: StatutRecette | null, note: string) {
  await $fetch(`/api/admin/recette/${k}`, { method: 'PUT', body: { statut, note } })
  await refresh()
}

/** Cliquer à nouveau sur son propre résultat l'efface. */
async function marquer(k: string, statut: StatutRecette) {
  if (occupe.value || !data.value?.pret) return
  const actuel = mien(k)
  occupe.value = k
  try {
    await envoyer(k, actuel?.statut === statut ? null : statut, notes[k] ?? actuel?.note ?? '')
  } catch (e) {
    annoncer(messageErreurApi(e, 'Résultat non enregistré'), 'erreur')
  } finally {
    occupe.value = null
  }
}

async function noter(k: string) {
  const actuel = mien(k)
  if (!actuel || (notes[k] ?? actuel.note) === actuel.note) return
  try {
    await envoyer(k, actuel.statut, notes[k] ?? '')
    annoncer('Note enregistrée')
  } catch (e) {
    annoncer(messageErreurApi(e, 'Note non enregistrée'), 'erreur')
  }
}

/** La note se saisit pour un KO ou un contrôle passé, et reste visible une fois écrite. */
const noteVisible = (k: string) => {
  const r = mien(k)
  return !!r && (r.statut !== 'ok' || !!r.note)
}

// --- Anomalies libres ---------------------------------------------------------

const signalement = reactive({ page: '', description: '' })
const signalementEnCours = ref(false)
const anomalieOccupee = ref<string | null>(null)

async function signaler() {
  const description = signalement.description.trim()
  if (!description || signalementEnCours.value || !data.value?.anomaliesPretes) return
  signalementEnCours.value = true
  try {
    await $fetch('/api/admin/recette/anomalies', {
      method: 'POST',
      body: { page: signalement.page, description },
    })
    signalement.page = ''
    signalement.description = ''
    annoncer('Anomalie signalée')
    await refresh()
  } catch (e) {
    annoncer(messageErreurApi(e, 'Anomalie non signalée'), 'erreur')
  } finally {
    signalementEnCours.value = false
  }
}

async function basculerCorrigee(a: AnomalieRecette) {
  if (anomalieOccupee.value) return
  anomalieOccupee.value = a.id
  try {
    await $fetch(`/api/admin/recette/anomalies/${a.id}`, { method: 'PATCH', body: { corrigee: !a.corrigeeLe } })
    await refresh()
  } catch (e) {
    annoncer(messageErreurApi(e, 'Anomalie non mise à jour'), 'erreur')
  } finally {
    anomalieOccupee.value = null
  }
}

async function retirer(a: AnomalieRecette) {
  if (anomalieOccupee.value || !window.confirm('Retirer cette anomalie ? Elle disparaîtra pour toute l’équipe.')) return
  anomalieOccupee.value = a.id
  try {
    await $fetch(`/api/admin/recette/anomalies/${a.id}`, { method: 'DELETE' })
    annoncer('Anomalie retirée')
    await refresh()
  } catch (e) {
    annoncer(messageErreurApi(e, 'Anomalie non retirée'), 'erreur')
  } finally {
    anomalieOccupee.value = null
  }
}

/** Texte avec les segments entre accents graves rendus en chasse fixe. */
const segments = (texte: string) => texte.split(/`([^`]+)`/).map((s, i) => ({ mono: i % 2 === 1, texte: s }))

const quand = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

interface LigneExport {
  controle: string
  qui: string
  etape: string
  testeur: string
  resultat: string
  note: string
  date: string
}

/** Les résultats par contrôle, puis les anomalies libres (« Hors liste »). */
function exporter() {
  const index = new Map(controles.value.map((c) => [c.k, c]))
  const utc = (iso: string) => iso.slice(0, 16).replace('T', ' ')
  const lignes: LigneExport[] = [
    ...resultats.value
      .filter((r) => vue.value === 'equipe' || r.testeurId === moi.value)
      .sort((a, b) => a.controle.localeCompare(b.controle, 'fr', { numeric: true }))
      .map((r) => ({
        controle: r.controle,
        qui: index.get(r.controle)?.qui ?? '',
        etape: index.get(r.controle)?.etape ?? '',
        testeur: r.testeur,
        resultat: LIBELLE[r.statut],
        note: r.note,
        date: utc(r.majLe),
      })),
    ...anomaliesLibres.value.map((a) => ({
      controle: 'Hors liste',
      qui: '',
      etape: a.page,
      testeur: a.testeur,
      resultat: a.corrigeeLe ? 'Corrigée' : 'Ouverte',
      note: a.description,
      date: utc(a.creeLe),
    })),
  ]
  exporterCsv(
    `recette-${data.value?.version ?? ''}-${vue.value}`,
    [
      { cle: 'controle', libelle: 'Contrôle' },
      { cle: 'qui', libelle: 'Qui' },
      { cle: 'etape', libelle: 'Étape ou page' },
      { cle: 'testeur', libelle: 'Testeur' },
      { cle: 'resultat', libelle: 'Résultat' },
      { cle: 'note', libelle: 'Note' },
      { cle: 'date', libelle: 'Date (UTC)' },
    ] satisfies ColonneCsv<LigneExport>[],
    lignes,
  )
}

// Les résultats des autres arrivent sans recharger : rafraîchissement discret.
let minuterie: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  minuterie = setInterval(() => {
    if (!occupe.value && !anomalieOccupee.value && document.visibilityState === 'visible') refresh()
  }, 30_000)
})
onUnmounted(() => clearInterval(minuterie))
</script>

<template>
  <div v-if="error" class="rounded-[14px] border border-ligne-douce bg-white p-8 text-center">
    <p class="font-title text-[20px] font-light">La recette n’a pas pu être chargée</p>
    <button class="mt-4 rounded-full bg-social px-4 py-2 text-[13px] font-bold text-white" @click="refresh()">
      Réessayer
    </button>
  </div>

  <div v-else-if="data">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-title text-[24px] font-light">Recette</h1>
        <p class="mt-1 text-[13px] text-discret">
          Version du {{ data.version }} · {{ controles.length }} contrôles ·
          {{ totaux.testeurs.size }} testeur{{ totaux.testeurs.size > 1 ? 's' : '' }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="inline-flex overflow-hidden rounded-full border border-ligne bg-white text-[13px] font-semibold" role="group" aria-label="Résultats affichés">
          <button
            type="button"
            class="px-3.5 py-2"
            :class="vue === 'equipe' ? 'bg-social text-white' : 'text-texte hover:bg-fond-clair'"
            :aria-pressed="vue === 'equipe'"
            @click="vue = 'equipe'"
          >
            Toute l’équipe
          </button>
          <button
            type="button"
            class="border-l border-ligne px-3.5 py-2"
            :class="vue === 'moi' ? 'bg-social text-white' : 'text-texte hover:bg-fond-clair'"
            :aria-pressed="vue === 'moi'"
            @click="vue = 'moi'"
          >
            Mes résultats
          </button>
        </div>
        <UiFiltrePilule
          v-model="filtre"
          etiquette="Contrôles affichés"
          :options="[
            { valeur: 'tout', libelle: 'Tous les contrôles' },
            { valeur: 'a-faire', libelle: 'Reste à jouer' },
            { valeur: 'ko', libelle: 'KO seulement' },
          ]"
        />
        <button
          type="button"
          class="rounded-full border border-ligne bg-white px-3.5 py-2 text-[13px] font-semibold text-encre hover:bg-fond-clair"
          @click="exporter"
        >
          Exporter en CSV
        </button>
      </div>
    </div>

    <p
      v-if="!data.pret"
      class="mt-4 rounded-[14px] border border-alerte-bordure bg-alerte-pale px-5 py-4 text-[13px] leading-relaxed text-alerte-fonce"
      role="alert"
    >
      <b>Les résultats ne peuvent pas encore être enregistrés.</b> La table n’existe pas en base :
      exécuter <code class="font-mono text-[12px]">supabase/en-ligne/52-recette-resultats.sql</code> dans
      le SQL Editor de Supabase. La liste des contrôles reste consultable.
    </p>

    <div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-[14px] border border-ligne-douce bg-white p-4">
        <p class="text-[12.5px] text-discret">Votre avancement</p>
        <p class="mt-1.5 font-title text-[26px] leading-none font-light text-encre">
          {{ faits }} <span class="text-[15px] text-discret">/ {{ controles.length }}</span>
        </p>
        <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-fond-voile">
          <div
            class="h-full rounded-full bg-succes transition-[width]"
            :style="{ width: `${controles.length ? Math.round((faits / controles.length) * 100) : 0}%` }"
          />
        </div>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-4">
        <p class="text-[12.5px] text-discret">OK, toute l’équipe</p>
        <p class="mt-1.5 font-title text-[26px] leading-none font-light text-succes">{{ totaux.ok }}</p>
      </div>
      <div class="rounded-[14px] border bg-white p-4" :class="totaux.ko ? 'border-erreur' : 'border-ligne-douce'">
        <p class="text-[12.5px]" :class="totaux.ko ? 'text-erreur-fonce' : 'text-discret'">KO à traiter</p>
        <p class="mt-1.5 font-title text-[26px] leading-none font-light" :class="totaux.ko ? 'text-erreur' : 'text-encre'">
          {{ totaux.ko }}
        </p>
        <a v-if="anomaliesOuvertes" href="#anomalies" class="mt-2 block text-[12px] font-semibold text-erreur-fonce hover:underline">
          + {{ anomaliesOuvertes }} anomalie{{ anomaliesOuvertes > 1 ? 's' : '' }} hors liste
        </a>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-4">
        <p class="text-[12.5px] text-discret">Passés</p>
        <p class="mt-1.5 font-title text-[26px] leading-none font-light text-encre">{{ totaux.passe }}</p>
      </div>
    </div>

    <div class="mt-4 rounded-[14px] border border-social-bordure bg-social-nuage px-5 py-4 text-[13px] leading-relaxed text-texte">
      Site à tester :
      <a :href="data.adresse" target="_blank" rel="noopener" class="font-semibold text-social hover:underline">{{ data.adresse }}</a>.
      Jouez chaque étape, comparez à l’attendu, puis marquez <b>OK</b>, <b>KO</b> ou <b>Passé</b> (non joué).
      Cliquer à nouveau sur votre résultat l’efface. Un KO attend une note : ce qui s’est affiché, le compte
      utilisé, l’appareil, l’heure. Un problème qui ne correspond à aucun contrôle ?
      <a href="#anomalies" class="font-semibold text-social hover:underline">Signalez-le en bas de page</a>.
    </div>

    <section v-for="section in sections" :key="section.num" class="mt-7">
      <h2 class="font-title text-[19px] font-light text-encre">
        {{ section.num }}. {{ section.titre }}
        <span class="ml-1 font-sans text-[13px] text-discret">{{ section.contexte }}</span>
      </h2>

      <div class="mt-3 overflow-hidden rounded-[14px] border border-ligne-douce bg-white">
        <div class="hidden grid-cols-[48px_minmax(0,1.15fr)_minmax(0,1fr)_230px] gap-4 border-b border-ligne-claire bg-fond-clair px-5 py-2.5 text-[11px] font-bold tracking-[0.06em] text-discret uppercase lg:grid">
          <span>#</span>
          <span>Étape</span>
          <span>Résultat attendu</span>
          <span>Résultat</span>
        </div>

        <div
          v-for="c in section.controles"
          :key="c.k"
          class="grid gap-x-4 gap-y-2.5 border-b border-fond-voile px-5 py-4 text-[13.5px] last:border-0 lg:grid-cols-[48px_minmax(0,1.15fr)_minmax(0,1fr)_230px]"
          :class="mien(c.k)?.statut === 'ok' && 'bg-fond-clair'"
        >
          <span class="font-mono text-[11.5px] text-discret">{{ c.k }}</span>

          <div class="min-w-0">
            <p v-if="c.qui" class="mb-1 text-[11px] font-bold tracking-[0.06em] text-social uppercase">{{ c.qui }}</p>
            <p class="text-encre" :class="mien(c.k)?.statut === 'ok' && 'text-discret'">
              <template v-for="(seg, i) in segments(c.etape)" :key="i">
                <code v-if="seg.mono" class="rounded bg-fond-voile px-1 font-mono text-[12px]">{{ seg.texte }}</code>
                <template v-else>{{ seg.texte }}</template>
              </template>
            </p>
            <div v-if="c.lien || c.capture" class="mt-2 flex flex-wrap items-center gap-3 text-[12.5px] font-semibold">
              <a
                v-if="c.lien"
                :href="`${data.adresse}${c.lien}`"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 text-social hover:underline"
              >
                Ouvrir la page <Icon name="ph:arrow-square-out" size="13" aria-hidden="true" />
              </a>
              <a
                v-if="c.capture"
                :href="`/recette/${c.capture}`"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 text-social hover:underline"
              >
                <Icon name="ph:image" size="14" aria-hidden="true" /> Capture de référence
              </a>
            </div>
            <a
              v-if="c.capture"
              :href="`/recette/${c.capture}`"
              target="_blank"
              rel="noopener"
              class="mt-2 block w-[168px] overflow-hidden rounded-[8px] border border-ligne-douce"
            >
              <img
                :src="`/recette/${c.capture}`"
                :alt="`Capture de référence du contrôle ${c.k}`"
                width="168"
                height="105"
                loading="lazy"
                class="h-[105px] w-[168px] object-cover object-top"
              >
            </a>
          </div>

          <p class="min-w-0 text-texte">
            <span class="mb-1 block text-[11px] font-bold tracking-[0.06em] text-discret uppercase lg:hidden">Attendu</span>
            <template v-for="(seg, i) in segments(c.attendu)" :key="i">
              <code v-if="seg.mono" class="rounded bg-fond-voile px-1 font-mono text-[12px]">{{ seg.texte }}</code>
              <template v-else>{{ seg.texte }}</template>
            </template>
          </p>

          <div class="min-w-0">
            <div
              class="inline-flex overflow-hidden rounded-[8px] border border-ligne"
              role="group"
              :aria-label="`Résultat du contrôle ${c.k}`"
            >
              <button
                v-for="(statut, i) in STATUTS"
                :key="statut"
                type="button"
                class="px-3 py-1.5 text-[12px] font-bold disabled:opacity-50"
                :class="[
                  i > 0 && 'border-l border-ligne',
                  mien(c.k)?.statut === statut ? CLASSE[statut] : 'bg-white text-discret hover:bg-fond-clair',
                ]"
                :disabled="occupe === c.k || !data.pret"
                :aria-pressed="mien(c.k)?.statut === statut"
                @click="marquer(c.k, statut)"
              >
                {{ LIBELLE[statut] }}
              </button>
            </div>
            <textarea
              v-if="noteVisible(c.k)"
              v-model="notes[c.k]"
              :aria-label="`Note du contrôle ${c.k}`"
              :placeholder="mien(c.k)!.note || 'Ce qui s’est affiché, compte, appareil, heure'"
              maxlength="1000"
              class="mt-2 block min-h-[60px] w-full rounded-[8px] border border-ligne bg-white px-2.5 py-2 text-[12.5px] text-encre"
              @focus="notes[c.k] ??= mien(c.k)!.note"
              @blur="noter(c.k)"
            />
            <div v-if="autres(c.k).length" class="mt-2 flex flex-wrap gap-1">
              <span
                v-for="r in autres(c.k)"
                :key="r.testeurId"
                class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold"
                :class="CLASSE[r.statut]"
                :title="r.note || quand(r.majLe)"
              >
                {{ r.testeur }} · {{ LIBELLE[r.statut] }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p
        v-if="section.bloque"
        class="mt-2 rounded-[10px] bg-alerte-pale px-4 py-2.5 text-[12.5px] leading-relaxed text-alerte-fonce"
      >
        <b>Hors développement.</b>
        <template v-for="(seg, i) in segments(` ${section.bloque}`)" :key="i">
          <code v-if="seg.mono" class="font-mono text-[12px]">{{ seg.texte }}</code>
          <template v-else>{{ seg.texte }}</template>
        </template>
      </p>
    </section>

    <p v-if="!sections.length" class="mt-7 rounded-[14px] border border-ligne-douce bg-white py-10 text-center text-[13px] text-discret">
      Aucun contrôle dans ce filtre.
    </p>

    <section id="anomalies" class="mt-7 scroll-mt-6 rounded-[14px] border border-ligne-douce bg-white px-5 py-4">
      <h2 class="text-[11px] font-bold tracking-[0.08em] text-discret uppercase">Anomalies signalées</h2>

      <form class="mt-3 rounded-[10px] bg-fond-clair p-3" @submit.prevent="signaler">
        <p class="text-[13px] font-semibold text-encre">Signaler une anomalie hors liste</p>
        <p class="mt-0.5 text-[12.5px] text-discret">
          Ce que vous remarquez en dehors des contrôles : une page qui casse, un libellé faux, un écran oublié.
        </p>
        <div class="mt-2.5 grid gap-2 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] md:items-start">
          <label class="block">
            <span class="sr-only">Page ou écran concerné</span>
            <input
              v-model="signalement.page"
              type="text"
              maxlength="300"
              placeholder="Page ou écran (facultatif)"
              class="block w-full rounded-[8px] border border-ligne bg-white px-2.5 py-2 text-[13px] text-encre"
              :disabled="!data.anomaliesPretes"
            >
          </label>
          <label class="block">
            <span class="sr-only">Description de l’anomalie</span>
            <textarea
              v-model="signalement.description"
              required
              maxlength="2000"
              rows="2"
              placeholder="Ce qui s’est affiché, ce qui était attendu, compte, appareil, heure"
              class="block min-h-[40px] w-full rounded-[8px] border border-ligne bg-white px-2.5 py-2 text-[13px] text-encre"
              :disabled="!data.anomaliesPretes"
            />
          </label>
          <button
            type="submit"
            class="rounded-full bg-social px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
            :disabled="!data.anomaliesPretes || signalementEnCours || !signalement.description.trim()"
          >
            {{ signalementEnCours ? 'Envoi…' : 'Signaler' }}
          </button>
        </div>
        <p v-if="!data.anomaliesPretes" class="mt-2 text-[12.5px] text-alerte-fonce" role="alert">
          La table des anomalies n’existe pas en base : exécuter
          <code class="font-mono text-[12px]">supabase/en-ligne/53-recette-anomalies.sql</code>.
        </p>
      </form>

      <p v-if="!anomalies.length && !anomaliesLibres.length" class="mt-3 text-[13px] text-discret">Aucune pour l’instant.</p>
      <ul v-else class="mt-1">
        <li
          v-for="a in anomaliesLibres"
          :key="a.id"
          class="flex flex-wrap gap-x-3 gap-y-1.5 border-b border-fond-voile py-3 text-[13px] last:border-0 sm:flex-nowrap"
        >
          <span class="w-10 shrink-0 pt-0.5 text-[10.5px] leading-tight font-bold tracking-[0.04em] text-erreur-fonce uppercase" :class="a.corrigeeLe && 'text-discret'">
            Hors liste
          </span>
          <span class="min-w-0 flex-1" :class="a.corrigeeLe ? 'text-discret line-through' : 'text-encre'">
            <b>{{ a.testeur }}</b>
            <template v-if="a.page"> · <code class="rounded bg-fond-voile px-1 font-mono text-[12px]">{{ a.page }}</code></template>
            — <span class="whitespace-pre-line">{{ a.description }}</span>
          </span>
          <span class="flex shrink-0 items-start gap-2 text-[11.5px]">
            <span class="pt-0.5 text-discret">{{ quand(a.creeLe) }}</span>
            <button
              type="button"
              class="rounded-full border border-ligne px-2.5 py-0.5 font-semibold hover:bg-fond-clair disabled:opacity-50"
              :class="a.corrigeeLe ? 'text-discret' : 'text-succes-fonce'"
              :disabled="anomalieOccupee === a.id"
              @click="basculerCorrigee(a)"
            >
              {{ a.corrigeeLe ? 'Rouvrir' : 'Corrigée' }}
            </button>
            <button
              v-if="a.testeurId === moi"
              type="button"
              class="rounded-full px-1.5 py-0.5 text-discret hover:bg-fond-clair hover:text-erreur-fonce disabled:opacity-50"
              :disabled="anomalieOccupee === a.id"
              :aria-label="`Retirer l’anomalie signalée le ${quand(a.creeLe)}`"
              @click="retirer(a)"
            >
              <Icon name="ph:trash" size="14" aria-hidden="true" />
            </button>
          </span>
        </li>
        <li
          v-for="r in anomalies"
          :key="r.controle + r.testeurId"
          class="flex gap-3 border-b border-fond-voile py-3 text-[13px] last:border-0"
        >
          <span class="w-10 shrink-0 font-mono text-[11.5px] text-discret">{{ r.controle }}</span>
          <span class="min-w-0 flex-1 text-encre"><b>{{ r.testeur }}</b> — {{ r.note || 'sans détail' }}</span>
          <span class="shrink-0 text-[11.5px] text-discret">{{ quand(r.majLe) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
