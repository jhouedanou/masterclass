<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Performances — administration')

// Les champs à `null` sont ceux dont la collecte passe par Google Tag Manager :
// tant que l'intégration n'est pas faite, l'écran affiche « — » plutôt qu'un
// chiffre qui n'aurait aucune source.
const programme = ref('')
const moduleId = ref('')
const pays = ref('')
const appareil = ref('')
const source = ref('')
const mois = ref('')

// Changer de programme rend le module choisi caduc : le laisser filtrerait sur
// un module absent de la liste, et l'écran se viderait sans raison visible.
watch(programme, () => (moduleId.value = ''))

interface LigneConversion {
  visites: number | null
  ventes: number
  taux: number | null
}
interface Client {
  id: string
  nom: string
  pays: string
  nouveau: boolean
  recurrent: boolean
  ca: number
  achats: number
}

const { data } = await useFetch<{
  ca: number
  evolutionCa: number | null
  ventes: number
  modulesParAcheteur: number
  visites: number | null
  visiteursUniques: number | null
  pagesVues: number | null
  dureeMoyenne: string | null
  tauxConversion: number | null
  repartitionProgramme: {
    socialMedia: number
    entrepreneurs: number
    ventesSocialMedia: number
    ventesEntrepreneurs: number
  }
  topModule: { titre: string; ventes: number } | null
  topPays: string | null
  ltv: number
  meilleurAcheteur: { nom: string; ca: number } | null
  appareils: {
    mobile: number
    desktop: number
    partMobile: number
    partDesktop: number
    navigateurs: string
    partNavigateurs: number | null
  } | null
  topSource: string | null
  directReferents: number | null
  pageLaPlusVue: string | null
  acheteurs: number
  nouveaux: number
  recurrents: number
  caQuotidien: number[]
  moisDisponibles: string[]
  paysDisponibles: (string | undefined)[]
  appareilsDisponibles: string[]
  sourcesDisponibles: string[]
  modulesDisponibles: { id: string; titre: string; programme: string }[]
  modulesDistincts: { vendus: number; total: number }
  ventesParModule: { id: string; titre: string; programme: string; ventes: number; ca: number }[]
  ventesParPays: { pays: string; ventes: number; ca: number; part: number }[]
  moyensPaiement: { moyen: string; ventes: number; part: number }[]
  clients: Client[]
  nouveauxParSemaine: { semaine: string; nouveaux: number }[]
  clientsParPays: { pays: string; clients: number }[]
  clientsParProgramme: { socialMediaSeul: number; entrepreneursSeul: number; lesDeux: number }
  ltvBiProgrammes: number | null
  retention: number | null
  funnel: { visites: number | null; clics: number | null; comptes: number; paiements: number; echecs: number }
  conversionParAppareil: ({ appareil: string } & LigneConversion)[]
  conversionParPays: ({ pays: string } & LigneConversion)[]
  conversionParSource: ({ source: string } & LigneConversion)[]
  visitesQuotidiennes: number[] | null
  visitesParPays: { pays: string; visites: number }[] | null
  sources: { source: string; medium: string; visites: number }[] | null
}>('/api/admin/performances', {
  query: computed(() => ({
    programme: programme.value || undefined,
    module: moduleId.value || undefined,
    pays: pays.value || undefined,
    appareil: appareil.value || undefined,
    source: source.value || undefined,
    mois: mois.value || undefined,
  })),
})

const max = computed(() => Math.max(...(data.value?.caQuotidien ?? [1]), 1))

// Ordre des onglets de la maquette (écran 18).
const onglet = ref('resume')
const ONGLETS = [
  { cle: 'resume', libelle: 'Résumé' },
  { cle: 'ventes', libelle: 'Ventes' },
  { cle: 'visites', libelle: 'Visites' },
  { cle: 'clients', libelle: 'Clients' },
  { cle: 'funnel', libelle: 'Funnel & conversion' },
]

const sousOngletClients = ref('tous')
const clientsAffiches = computed(() =>
  (data.value?.clients ?? []).filter((c) =>
    sousOngletClients.value === 'nouveaux' ? c.nouveau : sousOngletClients.value === 'recurrents' ? c.recurrent : true,
  ),
)

const nomDuMois = (valeur: string) =>
  new Date(`${valeur}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

/** Un indicateur sans source se lit « — », jamais zéro : l'absence de mesure
 *  n'est pas une mesure nulle. */
const ATTENTE = '—'
const nombre = (valeur: number | null | undefined) =>
  valeur === null || valeur === undefined ? ATTENTE : new Intl.NumberFormat('fr-FR').format(valeur)
const pourcent = (valeur: number | null | undefined) =>
  valeur === null || valeur === undefined ? ATTENTE : `${valeur.toString().replace('.', ',')} %`
const franc = (valeur: number) => `${new Intl.NumberFormat('fr-FR').format(valeur)} F`
const initiales = (nom: string) =>
  nom
    .split(' ')
    .map((m) => m[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** Étapes du funnel d'achat (écran 18b) avec la déperdition d'une marche à
 *  l'autre : « −N % » quand les deux marches sont mesurées, « — » sinon. */
const etapesFunnel = computed(() => {
  const f = data.value?.funnel
  if (!f) return []
  const brutes = [
    { libelle: '1 · Visite d’une fiche module', valeur: f.visites },
    { libelle: '2 · Clic « Acheter ce module »', valeur: f.clics },
    { libelle: '3 · Compte créé + récap validé', valeur: f.comptes as number | null },
    { libelle: '4 · Paiement réussi (FeexPay)', valeur: f.paiements as number | null },
  ]
  const base = brutes.find((e) => e.valeur !== null)?.valeur ?? null
  return brutes.map((etape, i) => {
    const precedente = brutes[i - 1]?.valeur ?? null
    const perte =
      i > 0 && etape.valeur !== null && precedente !== null && precedente > 0
        ? `−${Math.round((1 - etape.valeur / precedente) * 100)} %`
        : i > 0
          ? ATTENTE
          : ''
    const partBase =
      etape.valeur !== null && base ? `${Math.round((etape.valeur / base) * 100)} %` : ATTENTE
    return { ...etape, perte, partBase, largeur: etape.valeur !== null && base ? (etape.valeur / base) * 100 : 0 }
  })
})

const carte = 'rounded-[14px] border border-ligne-douce bg-white p-6'
const titre2 = 'font-title text-[19px] font-light'
const select = 'rounded-full border border-ligne bg-white px-3.5 py-2'
</script>

<template>
  <div v-if="data">
    <h1 class="font-title text-[26px] font-light">Performances</h1>

    <div class="mt-5 flex flex-wrap gap-2 text-[13px]">
      <select v-model="mois" :class="select" aria-label="Période">
        <option value="">🗓 30 derniers jours</option>
        <option v-for="m in data.moisDisponibles" :key="m" :value="m">🗓 {{ nomDuMois(m) }}</option>
      </select>
      <select v-model="programme" :class="select" aria-label="Programme">
        <option value="">Programme ▾</option>
        <option value="social-media">Social Média</option>
        <option value="entrepreneurs">Entrepreneurs</option>
      </select>
      <select v-model="moduleId" class="max-w-[260px]" :class="select" aria-label="Module">
        <option value="">Module ▾</option>
        <option v-for="m in data.modulesDisponibles" :key="m.id" :value="m.id">{{ m.titre }}</option>
      </select>
      <select v-model="pays" :class="select" aria-label="Pays">
        <option value="">Pays ▾</option>
        <option v-for="p in data.paysDisponibles" :key="p" :value="p">{{ p }}</option>
      </select>
      <select v-model="appareil" :class="select" aria-label="Appareil">
        <option value="">Appareil ▾</option>
        <option v-if="!data.appareilsDisponibles.length" value="" disabled>—</option>
        <option v-for="a in data.appareilsDisponibles" :key="a" :value="a">{{ a }}</option>
      </select>
      <select v-model="source" :class="select" aria-label="Source">
        <option value="">Source ▾</option>
        <option v-if="!data.sourcesDisponibles.length" value="" disabled>—</option>
        <option v-for="s in data.sourcesDisponibles" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>

    <UiOnglets v-model="onglet" :onglets="ONGLETS" class="mt-4" />

    <!-- 18 · Résumé -->
    <template v-if="onglet === 'resume'">
      <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCarteIndicateur
          libelle="Chiffre d’affaires"
          :valeur="formatFcfa(data.ca)"
          :detail="
            data.evolutionCa === null
              ? 'aucune vente sur la période précédente'
              : `${data.evolutionCa > 0 ? '+' : ''}${data.evolutionCa} % vs période précédente`
          "
        />
        <AdminCarteIndicateur
          libelle="Ventes (modules)"
          :valeur="String(data.ventes)"
          :detail="`${data.modulesParAcheteur.toString().replace('.', ',')} module / acheteur`"
        />
        <AdminCarteIndicateur
          libelle="Visites"
          :valeur="nombre(data.visites)"
          :detail="`${nombre(data.visiteursUniques)} visiteurs uniques`"
        />
        <AdminCarteIndicateur
          libelle="Taux de conversion"
          :valeur="pourcent(data.tauxConversion)"
          detail="visite → paiement réussi"
        />
      </div>

      <section class="mt-6" :class="carte">
        <div class="flex items-baseline justify-between gap-3">
          <h2 :class="titre2">Chiffre d’affaires quotidien</h2>
          <span class="text-[12px] text-discret">FCFA / jour</span>
        </div>
        <div class="mt-5 flex h-40 items-end gap-1.5" role="img" aria-label="Histogramme du chiffre d’affaires quotidien">
          <div
            v-for="(valeur, i) in data.caQuotidien"
            :key="i"
            class="flex-1 rounded-t-[3px] bg-social"
            :style="{ height: `${(valeur / max) * 100}%` }"
            :title="`${new Intl.NumberFormat('fr-FR').format(valeur)} FCFA`"
          />
        </div>
        <p class="mt-3 text-[12px] text-discret">— pic : {{ formatFcfa(max) }}</p>
      </section>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <section :class="carte">
          <div class="flex items-baseline justify-between gap-3">
            <h2 :class="titre2">Ventes</h2>
            <button class="text-[12.5px] text-social underline" @click="onglet = 'ventes'">Onglet Ventes →</button>
          </div>
          <dl class="mt-4 space-y-2 text-[13.5px]">
            <div class="flex justify-between gap-3">
              <dt class="text-discret">Par programme</dt>
              <dd>SM {{ data.repartitionProgramme.socialMedia }} % · ENT {{ data.repartitionProgramme.entrepreneurs }} %</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-discret">Top module</dt>
              <dd class="truncate">{{ data.topModule ? `${data.topModule.titre} (${data.topModule.ventes})` : '—' }}</dd>
            </div>
            <div class="flex justify-between gap-3"><dt class="text-discret">Top pays</dt><dd>{{ data.topPays ?? '—' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-discret">Revenu / apprenant (LTV)</dt><dd>{{ formatFcfa(data.ltv) }}</dd></div>
          </dl>
        </section>

        <section :class="carte">
          <div class="flex items-baseline justify-between gap-3">
            <h2 :class="titre2">Visites</h2>
            <button class="text-[12.5px] text-social underline" @click="onglet = 'visites'">Onglet Visites →</button>
          </div>
          <dl class="mt-4 space-y-2 text-[13.5px]">
            <div class="flex justify-between gap-3">
              <dt class="text-discret">Appareils</dt>
              <dd>
                <template v-if="data.appareils">Mobile {{ data.appareils.partMobile }} % · Desktop {{ data.appareils.partDesktop }} %</template>
                <template v-else>—</template>
              </dd>
            </div>
            <div class="flex justify-between gap-3"><dt class="text-discret">Top source</dt><dd>{{ data.topSource ?? '—' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-discret">Direct / référents</dt><dd>{{ pourcent(data.directReferents) }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-discret">Page la plus vue</dt><dd class="font-mono text-[12.5px]">{{ data.pageLaPlusVue ?? '—' }}</dd></div>
          </dl>
        </section>

        <section :class="carte">
          <div class="flex items-baseline justify-between gap-3">
            <h2 :class="titre2">Clients</h2>
            <button class="text-[12.5px] text-social underline" @click="onglet = 'clients'">Onglet Clients →</button>
          </div>
          <dl class="mt-4 space-y-2 text-[13.5px]">
            <div class="flex justify-between gap-3"><dt class="text-discret">Acheteurs total</dt><dd>{{ data.acheteurs }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-discret">Nouveaux (période)</dt><dd>{{ data.nouveaux }}</dd></div>
            <div class="flex justify-between gap-3">
              <dt class="text-discret">Récurrents (2 modules +)</dt>
              <dd>{{ data.recurrents }} ({{ pourcent(data.retention) }})</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-discret">Meilleur acheteur</dt>
              <dd>{{ data.meilleurAcheteur ? `${data.meilleurAcheteur.nom} · ${franc(data.meilleurAcheteur.ca)}` : '—' }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <p class="mt-5 text-[12.5px] text-discret">
        Collecte via Google Tag Manager : Meta Pixel + API Conversions (CAPI) · Google Analytics 4 ·
        TikTok Pixel · LinkedIn Insight — événements dédupliqués côté serveur.
        <NuxtLink to="/admin/tracking" class="underline">Relier le tracking →</NuxtLink>
      </p>
    </template>

    <!-- 18b · Funnel & conversion -->
    <template v-if="onglet === 'funnel'">
      <section class="mt-5" :class="carte">
        <h2 :class="titre2">Funnel d’achat — 4 étapes</h2>
        <ol class="mt-5 flex flex-col gap-3">
          <li v-for="etape in etapesFunnel" :key="etape.libelle" class="flex flex-wrap items-center gap-4">
            <span class="w-[240px] shrink-0 text-[13.5px] text-texte">{{ etape.libelle }}</span>
            <div class="h-7 min-w-[40px] flex-1 overflow-hidden rounded-[6px] bg-fond-voile">
              <div class="h-full rounded-[6px] bg-social" :style="{ width: `${Math.min(100, etape.largeur)}%` }" />
            </div>
            <span class="w-[130px] shrink-0 text-right text-[13.5px] font-bold">{{ nombre(etape.valeur) }} · {{ etape.partBase }}</span>
            <span class="w-[56px] shrink-0 text-right text-[12.5px]" :class="etape.perte === ATTENTE ? 'text-discret' : 'text-erreur'">{{ etape.perte }}</span>
          </li>
        </ol>
        <p class="mt-5 border-t border-ligne-claire pt-4 text-[13px] text-discret">
          <template v-if="data.funnel.comptes">
            Plus grosse perte : étape 3 → 4 ({{ Math.round((1 - data.funnel.paiements / data.funnel.comptes) * 100) }} %
            des tunnels engagés n’aboutissent pas).
          </template>
          <template v-else>Les deux premières étapes attendent la collecte d’audience.</template>
          Détail des motifs d’échec de paiement dans
          <NuxtLink to="/admin/transactions" class="underline">Transactions</NuxtLink> (accès restreint).
        </p>
      </section>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <section :class="carte">
          <h2 :class="titre2">Conversion par appareil</h2>
          <ul class="mt-4 space-y-2 text-[13.5px]">
            <li v-for="l in data.conversionParAppareil" :key="l.appareil" class="flex justify-between gap-3">
              <span>{{ l.appareil === 'Mobile' ? '📱' : '💻' }} {{ l.appareil }}</span>
              <span class="text-discret">{{ nombre(l.visites) }} visites · {{ l.ventes }} ventes · {{ pourcent(l.taux) }}</span>
            </li>
          </ul>
        </section>
        <section :class="carte">
          <h2 :class="titre2">Conversion par pays</h2>
          <ul class="mt-4 space-y-2 text-[13.5px]">
            <li v-for="l in data.conversionParPays" :key="l.pays" class="flex justify-between gap-3">
              <span>{{ l.pays }}</span>
              <span class="text-discret">{{ nombre(l.visites) }} · {{ l.ventes }} · {{ pourcent(l.taux) }}</span>
            </li>
            <li v-if="!data.conversionParPays.length" class="text-discret">—</li>
          </ul>
        </section>
        <section :class="carte">
          <h2 :class="titre2">Conversion par source</h2>
          <ul class="mt-4 space-y-2 text-[13.5px]">
            <li v-for="l in data.conversionParSource" :key="l.source" class="flex justify-between gap-3">
              <span>{{ l.source }}</span>
              <span class="text-discret">{{ nombre(l.visites) }} · {{ l.ventes }} · {{ pourcent(l.taux) }}</span>
            </li>
            <li v-if="!data.conversionParSource.length" class="text-discret">— (collecte à brancher)</li>
          </ul>
        </section>
      </div>
    </template>

    <!-- 18c · Ventes -->
    <template v-if="onglet === 'ventes'">
      <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AdminCarteIndicateur libelle="Chiffre d’affaires" :valeur="franc(data.ca)" />
        <AdminCarteIndicateur libelle="Total des ventes" :valeur="String(data.ventes)" />
        <AdminCarteIndicateur libelle="Modules distincts vendus" :valeur="`${data.modulesDistincts.vendus} / ${data.modulesDistincts.total}`" />
        <AdminCarteIndicateur libelle="Modules / acheteur" :valeur="data.modulesParAcheteur.toString().replace('.', ',')" />
        <AdminCarteIndicateur libelle="Revenu / apprenant (LTV)" :valeur="franc(data.ltv)" />
      </div>

      <div class="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr]">
        <section :class="carte">
          <h2 :class="titre2">Ventes par module</h2>
          <ul class="mt-3 divide-y divide-ligne-claire text-[13.5px]">
            <li v-for="l in data.ventesParModule.slice(0, 5)" :key="l.id" class="flex justify-between gap-3 py-2.5">
              <span><span class="text-discret">{{ l.programme }} ·</span> {{ l.titre }}</span>
              <span class="shrink-0 font-bold">{{ l.ventes }} · {{ franc(l.ca) }}</span>
            </li>
            <li v-if="!data.ventesParModule.length" class="py-6 text-center text-discret">Aucune vente sur la période.</li>
          </ul>
          <NuxtLink to="/admin/contenus" class="mt-3 inline-block text-[13px] text-social underline">
            Voir les {{ data.modulesDistincts.total }} modules →
          </NuxtLink>
        </section>

        <div class="flex flex-col gap-6">
          <section :class="carte">
            <h2 :class="titre2">Ventes par programme</h2>
            <div class="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-fond-voile">
              <div class="h-full bg-social" :style="{ width: `${data.repartitionProgramme.socialMedia}%` }" />
              <div class="h-full bg-entrepreneurs" :style="{ width: `${data.repartitionProgramme.entrepreneurs}%` }" />
            </div>
            <p class="mt-3 text-[13px]">
              <span class="text-social">■</span> Social Média — {{ data.repartitionProgramme.ventesSocialMedia }} ({{ data.repartitionProgramme.socialMedia }} %)
              <span class="ml-3 text-entrepreneurs">■</span> Entrepreneurs — {{ data.repartitionProgramme.ventesEntrepreneurs }} ({{ data.repartitionProgramme.entrepreneurs }} %)
            </p>
          </section>

          <section :class="carte">
            <h2 :class="titre2">Ventes par pays</h2>
            <ul class="mt-3 flex flex-col gap-2 text-[13.5px]">
              <li v-for="l in data.ventesParPays" :key="l.pays" class="flex justify-between gap-3">
                <span class="text-texte">{{ l.pays }}</span>
                <span class="text-discret">{{ l.ventes }} · {{ franc(l.ca) }} ({{ l.part }} %)</span>
              </li>
              <li v-if="!data.ventesParPays.length" class="text-discret">Aucune vente sur la période.</li>
            </ul>
          </section>

          <section :class="carte">
            <h2 :class="titre2">Moyens de paiement</h2>
            <ul class="mt-3 flex flex-col gap-2.5 text-[13.5px]">
              <li v-for="l in data.moyensPaiement" :key="l.moyen">
                <div class="flex justify-between gap-3">
                  <span class="text-texte">{{ l.moyen }}</span>
                  <span class="text-discret">{{ l.part }} %</span>
                </div>
                <div class="mt-1 h-1.5 w-full rounded-full bg-fond-voile">
                  <div class="h-full rounded-full bg-social" :style="{ width: `${l.part}%` }" />
                </div>
              </li>
              <li v-if="!data.moyensPaiement.length" class="text-discret">Aucune vente sur la période.</li>
            </ul>
          </section>
        </div>
      </div>
    </template>

    <!-- 18d · Visites -->
    <template v-if="onglet === 'visites'">
      <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCarteIndicateur libelle="Visites" :valeur="nombre(data.visites)" />
        <AdminCarteIndicateur libelle="Visiteurs uniques" :valeur="nombre(data.visiteursUniques)" />
        <AdminCarteIndicateur libelle="Pages vues" :valeur="nombre(data.pagesVues)" />
        <AdminCarteIndicateur libelle="Durée moyenne" :valeur="data.dureeMoyenne ?? ATTENTE" />
      </div>

      <section class="mt-6" :class="carte">
        <h2 :class="titre2">Visites quotidiennes</h2>
        <div v-if="data.visitesQuotidiennes" class="mt-5 flex h-40 items-end gap-1.5" role="img" aria-label="Histogramme des visites quotidiennes">
          <div
            v-for="(valeur, i) in data.visitesQuotidiennes"
            :key="i"
            class="flex-1 rounded-t-[3px] bg-social"
            :style="{ height: `${(valeur / Math.max(...data.visitesQuotidiennes, 1)) * 100}%` }"
          />
        </div>
        <p v-else class="mt-4 text-[13px] text-discret">
          — Ces mesures proviendront de Google Tag Manager. Tant que la collecte n’est pas branchée dans
          <NuxtLink to="/admin/tracking" class="underline">Tracking &amp; pixels</NuxtLink>, elles restent vides — aucune valeur n’est estimée.
        </p>
      </section>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <section :class="carte">
          <h2 :class="titre2">Visites par pays</h2>
          <ul class="mt-4 space-y-2 text-[13.5px]">
            <li v-for="l in data.visitesParPays ?? []" :key="l.pays" class="flex justify-between gap-3">
              <span>{{ l.pays }}</span><span class="text-discret">{{ nombre(l.visites) }}</span>
            </li>
            <li v-if="!data.visitesParPays" class="text-discret">—</li>
          </ul>
        </section>
        <section :class="carte">
          <h2 :class="titre2">Appareils &amp; navigateurs</h2>
          <ul class="mt-4 space-y-2 text-[13.5px]">
            <li class="flex justify-between gap-3">
              <span>📱 Mobile</span>
              <span class="text-discret">{{ data.appareils ? `${nombre(data.appareils.mobile)} (${data.appareils.partMobile} %)` : '—' }}</span>
            </li>
            <li class="flex justify-between gap-3">
              <span>💻 Desktop</span>
              <span class="text-discret">{{ data.appareils ? `${nombre(data.appareils.desktop)} (${data.appareils.partDesktop} %)` : '—' }}</span>
            </li>
            <li class="flex justify-between gap-3 border-t border-ligne-claire pt-2">
              <span class="truncate">{{ data.appareils?.navigateurs || '—' }}</span>
              <span class="shrink-0 text-discret">{{ pourcent(data.appareils?.partNavigateurs) }}</span>
            </li>
          </ul>
          <p v-if="data.appareils" class="mt-3 text-[12px] text-discret">D’après les appareils journalisés à la connexion.</p>
        </section>
        <section :class="carte">
          <h2 :class="titre2">Sources</h2>
          <table class="mt-4 w-full text-[13.5px]">
            <thead class="text-[12px] tracking-wider text-discret uppercase">
              <tr><th class="pb-2 text-left font-bold">Medium</th><th class="pb-2 text-right font-bold">Référents</th></tr>
            </thead>
            <tbody>
              <tr v-for="l in data.sources ?? []" :key="l.source">
                <td class="py-1">{{ l.source }}</td><td class="py-1 text-right text-discret">{{ nombre(l.visites) }}</td>
              </tr>
              <tr v-if="!data.sources"><td colspan="2" class="py-1 text-discret">—</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    </template>

    <!-- 18e · Clients -->
    <template v-if="onglet === 'clients'">
      <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCarteIndicateur libelle="Acheteurs total" :valeur="String(data.acheteurs)" />
        <AdminCarteIndicateur libelle="Nouveaux (période)" :valeur="String(data.nouveaux)" />
        <AdminCarteIndicateur libelle="Récurrents (2 modules +)" :valeur="String(data.recurrents)" />
        <AdminCarteIndicateur libelle="Taux de rétention" :valeur="pourcent(data.retention)" detail="ont racheté un 2e module" />
      </div>

      <section class="mt-6" :class="carte">
        <h2 :class="titre2">Nouveaux acheteurs par semaine</h2>
        <div class="mt-4 flex h-28 items-end gap-3" role="img" aria-label="Nouveaux acheteurs par semaine">
          <div v-for="s in data.nouveauxParSemaine" :key="s.semaine" class="flex flex-1 flex-col items-center gap-1">
            <div
              class="w-full rounded-t-[4px] bg-social"
              :style="{ height: `${(s.nouveaux / Math.max(...data.nouveauxParSemaine.map((x) => x.nouveaux), 1)) * 88}px` }"
            />
            <span class="text-[12px] text-discret">{{ s.semaine }} · {{ s.nouveaux }}</span>
          </div>
        </div>
      </section>

      <div class="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr]">
        <section :class="carte">
          <UiOnglets
            v-model="sousOngletClients"
            taille="sm"
            :onglets="[
              { cle: 'tous', libelle: 'Tous les clients' },
              { cle: 'nouveaux', libelle: 'Nouveaux' },
              { cle: 'recurrents', libelle: 'Récurrents' },
            ]"
          />
          <h3 class="mt-4 text-[13px] font-bold">Meilleurs clients</h3>
          <ul class="mt-2 divide-y divide-ligne-claire text-[13.5px]">
            <li v-for="c in clientsAffiches.slice(0, 10)" :key="c.id" class="flex items-center gap-3 py-2.5">
              <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-fond-voile text-[11px] font-bold text-social">{{ initiales(c.nom) }}</span>
              <span class="flex-1">{{ c.nom }} · {{ c.achats }} achat{{ c.achats > 1 ? 's' : '' }}</span>
              <span class="font-bold">{{ formatFcfa(c.ca) }}</span>
            </li>
            <li v-if="!clientsAffiches.length" class="py-6 text-center text-discret">Aucun achat sur la période.</li>
          </ul>
        </section>

        <div class="flex flex-col gap-6">
          <section :class="carte">
            <h2 :class="titre2">Clients par pays</h2>
            <ul class="mt-3 flex flex-col gap-2 text-[13.5px]">
              <li v-for="l in data.clientsParPays" :key="l.pays" class="flex justify-between gap-3">
                <span>{{ l.pays }}</span><span class="text-discret">{{ l.clients }}</span>
              </li>
              <li v-if="!data.clientsParPays.length" class="text-discret">—</li>
            </ul>
          </section>
          <section :class="carte">
            <h2 :class="titre2">Clients par programme</h2>
            <ul class="mt-3 flex flex-col gap-2 text-[13.5px]">
              <li class="flex justify-between gap-3"><span>Social Média uniquement</span><span class="text-discret">{{ data.clientsParProgramme.socialMediaSeul }}</span></li>
              <li class="flex justify-between gap-3"><span>Entrepreneurs uniquement</span><span class="text-discret">{{ data.clientsParProgramme.entrepreneursSeul }}</span></li>
              <li class="flex justify-between gap-3"><span>Les deux programmes</span><span class="text-discret">{{ data.clientsParProgramme.lesDeux }}</span></li>
            </ul>
            <p v-if="data.ltvBiProgrammes !== null" class="mt-3 text-[12px] text-discret">
              Les clients bi-programmes ont un LTV moyen de {{ formatFcfa(data.ltvBiProgrammes) }} — cible prioritaire des relances.
            </p>
          </section>
        </div>
      </div>
    </template>

    <p class="mt-5 text-[12.5px] text-discret">
      Détail des échecs de paiement : section
      <NuxtLink to="/admin/transactions" class="underline">Transactions</NuxtLink> (accès restreint) →
    </p>
  </div>
</template>
