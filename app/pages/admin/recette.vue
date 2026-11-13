<script setup lang="ts">
import type { ControleRecette, Recette, ResultatRecette, StatutRecette } from '#shared/types'
import type { ColonneCsv } from '~/utils/csv'

/**
 * Recette partagée : chaque testeur marque chaque contrôle OK, KO ou Passé,
 * avec une note ; tout le monde voit les résultats des autres. Ouverte à tout
 * compte d'administration — un compte de contenu sans section sert de compte
 * testeur. Les contrôles sont décrits dans `server/data/recette.ts`.
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

/** Texte avec les segments entre accents graves rendus en chasse fixe. */
const segments = (texte: string) => texte.split(/`([^`]+)`/).map((s, i) => ({ mono: i % 2 === 1, texte: s }))

const quand = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

function exporter() {
  const index = new Map(controles.value.map((c) => [c.k, c]))
  const lignes = resultats.value.filter((r) => vue.value === 'equipe' || r.testeurId === moi.value)
  exporterCsv(
    `recette-${data.value?.version ?? ''}-${vue.value}`,
    [
      { cle: 'controle', libelle: 'Contrôle' },
      { cle: (r) => index.get(r.controle)?.qui ?? '', libelle: 'Qui' },
      { cle: (r) => index.get(r.controle)?.etape ?? '', libelle: 'Étape' },
      { cle: 'testeur', libelle: 'Testeur' },
      { cle: (r) => LIBELLE[r.statut], libelle: 'Résultat' },
      { cle: 'note', libelle: 'Note' },
      { cle: (r) => r.majLe.slice(0, 16).replace('T', ' '), libelle: 'Date (UTC)' },
    ] satisfies ColonneCsv<ResultatRecette>[],
    [...lignes].sort((a, b) => a.controle.localeCompare(b.controle, 'fr', { numeric: true })),
  )
}

// Les résultats des autres arrivent sans recharger : rafraîchissement discret.
let minuterie: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  minuterie = setInterval(() => {
    if (!occupe.value && document.visibilityState === 'visible') refresh()
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
      utilisé, l’appareil, l’heure.
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

    <section class="mt-7 rounded-[14px] border border-ligne-douce bg-white px-5 py-4">
      <h2 class="text-[11px] font-bold tracking-[0.08em] text-discret uppercase">Anomalies signalées</h2>
      <p v-if="!anomalies.length" class="mt-3 text-[13px] text-discret">Aucune pour l’instant.</p>
      <ul v-else class="mt-1">
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
