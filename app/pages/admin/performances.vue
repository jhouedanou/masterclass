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

/** La maquette compose chaque marche du funnel dans un violet qui s'éclaircit,
 *  puis bascule au vert sur le paiement abouti. Aucun de ces trois derniers tons
 *  n'a de jeton. */
const TEINTES_FUNNEL = ['bg-social', 'bg-[#9c5aa8]', 'bg-[#b98cc4]', 'bg-[#1fa855]']

const maxVentesModule = computed(() =>
  Math.max(...(data.value?.ventesParModule ?? []).map((l) => l.ventes), 1),
)
const maxVisitesJour = computed(() => Math.max(...(data.value?.visitesQuotidiennes ?? [1]), 1))
const maxNouveaux = computed(() =>
  Math.max(...(data.value?.nouveauxParSemaine ?? []).map((s) => s.nouveaux), 1),
)

const optionsMois = computed(() => [
  { valeur: '', libelle: '🗓 30 derniers jours' },
  ...(data.value?.moisDisponibles ?? []).map((m) => ({ valeur: m, libelle: `🗓 ${nomDuMois(m)}` })),
])
const optionsProgramme = [
  { valeur: '', libelle: 'Programme' },
  { valeur: 'social-media', libelle: 'Social Média' },
  { valeur: 'entrepreneurs', libelle: 'Entrepreneurs' },
]
const optionsModule = computed(() => [
  { valeur: '', libelle: 'Module' },
  ...(data.value?.modulesDisponibles ?? []).map((m) => ({ valeur: m.id, libelle: m.titre })),
])
const optionsPays = computed(() => [
  { valeur: '', libelle: 'Pays' },
  ...(data.value?.paysDisponibles ?? []).filter(Boolean).map((p) => ({ valeur: p!, libelle: p! })),
])
const optionsAppareil = computed(() => [
  { valeur: '', libelle: 'Appareil' },
  ...(data.value?.appareilsDisponibles ?? []).map((a) => ({ valeur: a, libelle: a })),
])
const optionsSource = computed(() => [
  { valeur: '', libelle: 'Source' },
  ...(data.value?.sourcesDisponibles ?? []).map((s) => ({ valeur: s, libelle: s })),
])

// Écarts de la maquette : 22 px pour une carte de contenu, titre de carte en
// Mulish gras 15 px — jamais en Jost, que la règle de base donnerait au `h2`.
const carte = 'rounded-[14px] border border-ligne-douce bg-white p-[22px]'
const titreCarte = 'font-sans text-[15px] font-bold'
const lienCarte = 'text-[12px] font-bold text-social'
/** Ligne de détail teintée des colonnes latérales (écrans 18b à 18e). */
const ligneVoile = 'flex items-center justify-between gap-3 rounded-[8px] bg-social-nuage px-3.5 py-2.5'
</script>

<template>
  <div v-if="data">
    <!-- En-tête : titre et filtres sur une même ligne (maquette, écran 18). -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[24px] font-light">Performances</h1>
      <div class="flex flex-wrap gap-2.5">
        <UiFiltrePilule v-model="mois" etiquette="Période" :options="optionsMois" />
        <UiFiltrePilule v-model="programme" etiquette="Programme" :options="optionsProgramme" />
        <UiFiltrePilule v-model="moduleId" etiquette="Module" :options="optionsModule" />
        <UiFiltrePilule v-model="pays" etiquette="Pays" :options="optionsPays" />
        <UiFiltrePilule v-model="appareil" etiquette="Appareil" :options="optionsAppareil" />
        <UiFiltrePilule v-model="source" etiquette="Source" :options="optionsSource" />
      </div>
    </div>

    <UiOnglets v-model="onglet" :onglets="ONGLETS" class="mt-4" />

    <!-- 18 · Résumé -->
    <template v-if="onglet === 'resume'">
      <div class="mt-[22px] grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCarteIndicateur
          libelle="Chiffre d’affaires"
          :valeur="formatNombre(data.ca)"
          unite="FCFA"
          :detail="
            data.evolutionCa === null
              ? 'aucune vente sur la période précédente'
              : `${data.evolutionCa > 0 ? '+' : ''}${data.evolutionCa} % vs période précédente`
          "
          :detail-accent="(data.evolutionCa ?? 0) > 0"
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

      <section class="mt-5" :class="carte">
        <div class="flex items-center justify-between gap-3">
          <h2 :class="titreCarte">Chiffre d’affaires quotidien</h2>
          <span class="text-[12px] text-discret">FCFA / jour</span>
        </div>
        <div
          class="mt-4 flex h-[120px] items-end gap-[5px]"
          role="img"
          aria-label="Histogramme du chiffre d’affaires quotidien"
        >
          <!-- La maquette ne teinte en violet plein que la journée de pointe. -->
          <div
            v-for="(valeur, i) in data.caQuotidien"
            :key="i"
            class="flex-1 rounded-t-[4px]"
            :class="valeur === max ? 'bg-social' : 'bg-social-bordure'"
            :style="{ height: `${(valeur / max) * 100}%` }"
            :title="`${formatNombre(valeur)} FCFA`"
          />
        </div>
        <!-- La série n'est pas datée côté serveur : la légende n'annonce que ses
             bornes et le pic, plutôt que d'inventer des dates. -->
        <div class="mt-2 flex justify-between gap-3 text-[11px] text-discret-clair">
          <span>Début de période</span>
          <span>Pic : {{ formatFcfa(max) }}</span>
          <span>Aujourd’hui</span>
        </div>
      </section>

      <div class="mt-5 grid gap-4 lg:grid-cols-3">
        <section :class="carte">
          <div class="flex items-center justify-between gap-3">
            <h2 :class="titreCarte">Ventes</h2>
            <button :class="lienCarte" @click="onglet = 'ventes'">Onglet Ventes →</button>
          </div>
          <dl class="mt-3.5 flex flex-col gap-2.5 text-[13px]">
            <div class="flex justify-between gap-3">
              <dt class="text-discret">Par programme</dt>
              <dd class="font-bold">
                <span class="text-social">SM {{ data.repartitionProgramme.socialMedia }} %</span> ·
                <span class="text-entrepreneurs">ENT {{ data.repartitionProgramme.entrepreneurs }} %</span>
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-discret">Top module</dt>
              <dd class="truncate font-bold">{{ data.topModule ? `${data.topModule.titre} (${data.topModule.ventes})` : '—' }}</dd>
            </div>
            <div class="flex justify-between gap-3"><dt class="text-discret">Top pays</dt><dd class="font-bold">{{ data.topPays ?? '—' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-discret">Revenu / apprenant (LTV)</dt><dd class="font-bold">{{ formatFcfa(data.ltv) }}</dd></div>
          </dl>
        </section>

        <section :class="carte">
          <div class="flex items-center justify-between gap-3">
            <h2 :class="titreCarte">Visites</h2>
            <button :class="lienCarte" @click="onglet = 'visites'">Onglet Visites →</button>
          </div>
          <dl class="mt-3.5 flex flex-col gap-2.5 text-[13px]">
            <div class="flex justify-between gap-3">
              <dt class="text-discret">Appareils</dt>
              <dd class="font-bold">
                <template v-if="data.appareils">Mobile {{ data.appareils.partMobile }} % · Desktop {{ data.appareils.partDesktop }} %</template>
                <template v-else>—</template>
              </dd>
            </div>
            <div class="flex justify-between gap-3"><dt class="text-discret">Top source</dt><dd class="font-bold">{{ data.topSource ?? '—' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-discret">Direct / référents</dt><dd class="font-bold">{{ pourcent(data.directReferents) }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-discret">Page la plus vue</dt><dd class="font-bold">{{ data.pageLaPlusVue ?? '—' }}</dd></div>
          </dl>
        </section>

        <section :class="carte">
          <div class="flex items-center justify-between gap-3">
            <h2 :class="titreCarte">Clients</h2>
            <button :class="lienCarte" @click="onglet = 'clients'">Onglet Clients →</button>
          </div>
          <dl class="mt-3.5 flex flex-col gap-2.5 text-[13px]">
            <div class="flex justify-between gap-3"><dt class="text-discret">Acheteurs total</dt><dd class="font-bold">{{ data.acheteurs }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-discret">Nouveaux (période)</dt><dd class="font-bold">{{ data.nouveaux }}</dd></div>
            <div class="flex justify-between gap-3">
              <dt class="text-discret">Récurrents (2 modules +)</dt>
              <dd class="font-bold">{{ data.recurrents }} ({{ pourcent(data.retention) }})</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-discret">Meilleur acheteur</dt>
              <dd class="font-bold">{{ data.meilleurAcheteur ? `${data.meilleurAcheteur.nom} · ${formatFranc(data.meilleurAcheteur.ca)}` : '—' }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <!-- Bandeau de bas d'écran : une carte blanche, pas un paragraphe libre. -->
      <div class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-ligne-douce bg-white px-[18px] py-3 text-[12px] text-discret">
        <span>
          Collecte via
          <NuxtLink to="/admin/tracking" class="font-bold text-inherit hover:underline">Google Tag Manager</NuxtLink> :
          Meta Pixel + API Conversions (CAPI) · Google Analytics 4 · TikTok Pixel · LinkedIn Insight —
          événements dédupliqués côté serveur.
        </span>
        <span>
          Détail des échecs de paiement : section
          <NuxtLink to="/admin/transactions" class="font-bold text-inherit hover:underline">Transactions</NuxtLink>
          (accès restreint) →
        </span>
      </div>
    </template>

    <!-- 18b · Funnel & conversion -->
    <div v-if="onglet === 'funnel'" class="mt-[22px] grid items-start gap-4 lg:grid-cols-[1.25fr_1fr]">
      <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 :class="titreCarte">Funnel d’achat — 4 étapes</h2>
        <ol class="mt-4.5 flex flex-col gap-3">
          <li v-for="(etape, i) in etapesFunnel" :key="etape.libelle">
            <div class="mb-1.5 flex justify-between gap-3 text-[13px]">
              <b>{{ etape.libelle }}</b>
              <span>
                <b>{{ nombre(etape.valeur) }}</b> · {{ etape.partBase }}
                <span v-if="etape.perte" class="font-bold" :class="etape.perte === ATTENTE ? 'text-discret' : 'text-erreur'">{{ etape.perte }}</span>
              </span>
            </div>
            <!-- Barre à largeur proportionnelle, minimum 52 px pour que la
                 dernière marche reste lisible (maquette). -->
            <div
              class="h-[26px] rounded-[8px]"
              :class="TEINTES_FUNNEL[i]"
              :style="{ width: `${Math.min(100, etape.largeur)}%`, minWidth: '52px' }"
            />
          </li>
        </ol>
        <p class="mt-4 rounded-[10px] border border-alerte-bordure bg-alerte-pale px-[15px] py-3 text-[12.5px] leading-relaxed text-alerte-fonce">
          <template v-if="data.funnel.comptes">
            Plus grosse perte : étape 3 → 4 ({{ Math.round((1 - data.funnel.paiements / data.funnel.comptes) * 100) }} %
            des tunnels engagés n’aboutissent pas).
          </template>
          <template v-else>Les deux premières étapes attendent la collecte d’audience.</template>
          Détail des motifs d’échec de paiement dans
          <NuxtLink to="/admin/transactions" class="font-bold text-inherit hover:underline">Transactions</NuxtLink>
          (accès restreint).
        </p>
      </section>

      <div class="flex flex-col gap-4">
        <section :class="carte">
          <h2 :class="titreCarte">Conversion par appareil</h2>
          <div class="mt-3 flex flex-col gap-2.5 text-[13px]">
            <div v-for="l in data.conversionParAppareil" :key="l.appareil" :class="ligneVoile">
              <span>{{ l.appareil === 'Mobile' ? '📱' : '💻' }} {{ l.appareil }}</span>
              <span><b>{{ nombre(l.visites) }} visites</b> · {{ l.ventes }} ventes · <b class="text-social">{{ pourcent(l.taux) }}</b></span>
            </div>
          </div>
        </section>
        <section :class="carte">
          <h2 :class="titreCarte">Conversion par pays</h2>
          <div class="mt-3 flex flex-col gap-2.5 text-[13px]">
            <div v-for="l in data.conversionParPays" :key="l.pays" :class="ligneVoile">
              <span>{{ l.pays }}</span>
              <span>{{ nombre(l.visites) }} · {{ l.ventes }} · <b class="text-social">{{ pourcent(l.taux) }}</b></span>
            </div>
            <p v-if="!data.conversionParPays.length" class="text-discret">—</p>
          </div>
        </section>
        <section :class="carte">
          <h2 :class="titreCarte">Conversion par source</h2>
          <div class="mt-3 flex flex-col gap-2.5 text-[13px]">
            <div v-for="l in data.conversionParSource" :key="l.source" :class="ligneVoile">
              <span>{{ l.source }}</span>
              <span>{{ nombre(l.visites) }} · {{ l.ventes }} · <b class="text-social">{{ pourcent(l.taux) }}</b></span>
            </div>
            <p v-if="!data.conversionParSource.length" class="text-discret">— (collecte à brancher)</p>
          </div>
        </section>
      </div>
    </div>

    <!-- 18c · Ventes -->
    <template v-if="onglet === 'ventes'">
      <div class="mt-[22px] grid gap-[14px] sm:grid-cols-2 lg:grid-cols-5">
        <AdminCarteIndicateur libelle="Chiffre d’affaires" :valeur="formatNombre(data.ca)" unite="F" taille="md" />
        <AdminCarteIndicateur libelle="Total des ventes" :valeur="String(data.ventes)" taille="md" />
        <AdminCarteIndicateur libelle="Modules distincts vendus" :valeur="`${data.modulesDistincts.vendus} / ${data.modulesDistincts.total}`" taille="md" />
        <AdminCarteIndicateur libelle="Modules / acheteur" :valeur="data.modulesParAcheteur.toString().replace('.', ',')" taille="md" />
        <AdminCarteIndicateur libelle="Revenu / apprenant (LTV)" :valeur="formatNombre(data.ltv)" unite="F" taille="md" />
      </div>

      <div class="mt-5 grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section :class="carte">
          <h2 :class="titreCarte">Ventes par module</h2>
          <div class="mt-3.5 flex flex-col gap-2.5 text-[13px]">
            <div
              v-for="l in data.ventesParModule.slice(0, 5)"
              :key="l.id"
              class="grid items-center gap-3 sm:grid-cols-[1fr_130px_90px]"
            >
              <span class="truncate">
                <b :class="l.programme === 'entrepreneurs' ? 'text-entrepreneurs' : 'text-social'">
                  {{ l.programme === 'entrepreneurs' ? 'ENT' : 'SM' }}
                </b> · {{ l.titre }}
              </span>
              <span class="hidden h-[7px] rounded-full bg-piste sm:block">
                <span
                  class="block h-full rounded-full"
                  :class="l.programme === 'entrepreneurs' ? 'bg-entrepreneurs' : 'bg-social'"
                  :style="{ width: `${(l.ventes / maxVentesModule) * 100}%` }"
                />
              </span>
              <b class="text-right">{{ l.ventes }} · {{ formatFranc(l.ca) }}</b>
            </div>
            <p v-if="!data.ventesParModule.length" class="py-6 text-center text-discret">Aucune vente sur la période.</p>
            <NuxtLink to="/admin/contenus" class="text-[12.5px] font-bold text-social">
              Voir les {{ data.modulesDistincts.total }} modules →
            </NuxtLink>
          </div>
        </section>

        <div class="flex flex-col gap-4">
          <section :class="carte">
            <h2 :class="titreCarte">Ventes par programme</h2>
            <div class="mt-3.5 flex h-[22px] w-full overflow-hidden rounded-full bg-piste">
              <div class="h-full bg-social" :style="{ width: `${data.repartitionProgramme.socialMedia}%` }" />
              <div class="h-full bg-entrepreneurs" :style="{ width: `${data.repartitionProgramme.entrepreneurs}%` }" />
            </div>
            <div class="mt-2.5 flex flex-wrap justify-between gap-2 text-[12.5px]">
              <span><b class="text-social">■</b> Social Média — {{ data.repartitionProgramme.ventesSocialMedia }} ({{ data.repartitionProgramme.socialMedia }} %)</span>
              <span><b class="text-entrepreneurs">■</b> Entrepreneurs — {{ data.repartitionProgramme.ventesEntrepreneurs }} ({{ data.repartitionProgramme.entrepreneurs }} %)</span>
            </div>
          </section>

          <section :class="carte">
            <h2 :class="titreCarte">Ventes par pays</h2>
            <div class="mt-3 flex flex-col gap-2.5 text-[13px]">
              <div v-for="l in data.ventesParPays" :key="l.pays" :class="ligneVoile">
                <span>{{ l.pays }}</span>
                <b>{{ l.ventes }} · {{ formatFranc(l.ca) }} ({{ l.part }} %)</b>
              </div>
              <p v-if="!data.ventesParPays.length" class="text-discret">Aucune vente sur la période.</p>
            </div>
          </section>

          <section :class="carte">
            <h2 :class="titreCarte">Moyens de paiement</h2>
            <div class="mt-3 flex flex-col gap-2.5 text-[13px]">
              <div v-for="l in data.moyensPaiement" :key="l.moyen" class="flex justify-between gap-3">
                <span>{{ l.moyen }}</span>
                <b>{{ l.part }} %</b>
              </div>
              <p v-if="!data.moyensPaiement.length" class="text-discret">Aucune vente sur la période.</p>
            </div>
          </section>
        </div>
      </div>
    </template>

    <!-- 18d · Visites -->
    <template v-if="onglet === 'visites'">
      <div class="mt-[22px] grid gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
        <AdminCarteIndicateur libelle="Visites" :valeur="nombre(data.visites)" taille="md" />
        <AdminCarteIndicateur libelle="Visiteurs uniques" :valeur="nombre(data.visiteursUniques)" taille="md" />
        <AdminCarteIndicateur libelle="Pages vues" :valeur="nombre(data.pagesVues)" taille="md" />
        <AdminCarteIndicateur libelle="Durée moyenne" :valeur="data.dureeMoyenne ?? ATTENTE" taille="md" />
      </div>

      <section class="mt-5" :class="carte">
        <h2 :class="titreCarte">Visites quotidiennes</h2>
        <template v-if="data.visitesQuotidiennes">
          <div class="mt-3.5 flex h-[100px] items-end gap-[5px]" role="img" aria-label="Histogramme des visites quotidiennes">
            <div
              v-for="(valeur, i) in data.visitesQuotidiennes"
              :key="i"
              class="flex-1 rounded-t-[4px]"
              :class="valeur === maxVisitesJour ? 'bg-entrepreneurs' : 'bg-entrepreneurs-bordure'"
              :style="{ height: `${(valeur / maxVisitesJour) * 100}%` }"
            />
          </div>
          <p class="mt-2 text-right text-[11px] text-discret-clair">Pic : {{ nombre(maxVisitesJour) }} visites</p>
        </template>
        <p v-else class="mt-3 text-[13px] text-discret">
          — Ces mesures proviendront de Google Tag Manager. Tant que la collecte n’est pas branchée dans
          <NuxtLink to="/admin/tracking" class="font-bold text-inherit hover:underline">Tracking &amp; pixels</NuxtLink>,
          elles restent vides — aucune valeur n’est estimée.
        </p>
      </section>

      <div class="mt-5 grid gap-4 lg:grid-cols-3">
        <section :class="carte">
          <h2 :class="titreCarte">Visites par pays</h2>
          <div class="mt-3 flex flex-col gap-2.5 text-[13px]">
            <div v-for="l in data.visitesParPays ?? []" :key="l.pays" :class="ligneVoile">
              <span>{{ l.pays }}</span><b>{{ nombre(l.visites) }}</b>
            </div>
            <p v-if="!data.visitesParPays" class="text-discret">—</p>
          </div>
        </section>
        <section :class="carte">
          <h2 :class="titreCarte">Appareils &amp; navigateurs</h2>
          <div class="mt-3 flex flex-col gap-2.5 text-[13px]">
            <div :class="ligneVoile">
              <span>📱 Mobile</span>
              <b>{{ data.appareils ? `${nombre(data.appareils.mobile)} (${data.appareils.partMobile} %)` : '—' }}</b>
            </div>
            <div :class="ligneVoile">
              <span>💻 Desktop</span>
              <b>{{ data.appareils ? `${nombre(data.appareils.desktop)} (${data.appareils.partDesktop} %)` : '—' }}</b>
            </div>
            <!-- Dernière ligne sans fond dans la maquette : c'est une précision,
                 pas une mesure du même rang. -->
            <div class="flex items-center justify-between gap-3 px-3.5 pt-1.5 text-discret">
              <span class="truncate">{{ data.appareils?.navigateurs || '—' }}</span>
              <b class="shrink-0">{{ pourcent(data.appareils?.partNavigateurs) }}</b>
            </div>
          </div>
        </section>
        <section :class="carte">
          <h2 :class="titreCarte">Sources</h2>
          <div class="mt-3 flex flex-col gap-2.5 text-[13px]">
            <div v-for="l in data.sources ?? []" :key="l.source" :class="ligneVoile">
              <span>{{ l.source }}</span><b>{{ nombre(l.visites) }}</b>
            </div>
            <p v-if="!data.sources" class="text-discret">—</p>
          </div>
        </section>
      </div>
    </template>

    <!-- 18e · Clients -->
    <template v-if="onglet === 'clients'">
      <div class="mt-[22px] grid gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
        <AdminCarteIndicateur libelle="Acheteurs total" :valeur="String(data.acheteurs)" taille="md" />
        <AdminCarteIndicateur libelle="Nouveaux (période)" :valeur="String(data.nouveaux)" taille="md" />
        <AdminCarteIndicateur libelle="Récurrents (2 modules +)" :valeur="String(data.recurrents)" taille="md" />
        <AdminCarteIndicateur libelle="Taux de rétention" :valeur="pourcent(data.retention)" detail="ont racheté un 2e module" taille="md" />
      </div>

      <div class="mt-5 grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div class="flex flex-col gap-4">
          <section :class="carte">
            <h2 :class="titreCarte">Nouveaux acheteurs par semaine</h2>
            <div class="mt-3.5 flex h-[90px] items-end gap-2.5" role="img" aria-label="Nouveaux acheteurs par semaine">
              <div
                v-for="s in data.nouveauxParSemaine"
                :key="s.semaine"
                class="flex-1 rounded-t-[6px]"
                :class="s.nouveaux === maxNouveaux ? 'bg-social' : 'bg-social-bordure'"
                :style="{ height: `${(s.nouveaux / maxNouveaux) * 100}%` }"
              />
            </div>
            <div class="mt-2 flex justify-between gap-2 text-[11px] text-discret-clair">
              <span v-for="s in data.nouveauxParSemaine" :key="s.semaine">{{ s.semaine }} · {{ s.nouveaux }}</span>
            </div>
          </section>

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
            <h3 class="mt-3.5 font-sans text-[13.5px] font-bold">Meilleurs clients</h3>
            <div class="mt-2.5 flex flex-col gap-2.5 text-[13px]">
              <div v-for="c in clientsAffiches.slice(0, 10)" :key="c.id" :class="ligneVoile">
                <span class="flex items-center gap-2.5">
                  <span class="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-social text-[11px] font-extrabold text-white">{{ initiales(c.nom) }}</span>
                  <span><b>{{ c.nom }}</b> · {{ c.achats }} achat{{ c.achats > 1 ? 's' : '' }}</span>
                </span>
                <b class="shrink-0">{{ formatFcfa(c.ca) }}</b>
              </div>
              <p v-if="!clientsAffiches.length" class="py-6 text-center text-discret">Aucun achat sur la période.</p>
            </div>
          </section>
        </div>

        <div class="flex flex-col gap-4">
          <section :class="carte">
            <h2 :class="titreCarte">Clients par pays</h2>
            <div class="mt-3 flex flex-col gap-2.5 text-[13px]">
              <div v-for="l in data.clientsParPays" :key="l.pays" :class="ligneVoile">
                <span>{{ l.pays }}</span><b>{{ l.clients }}</b>
              </div>
              <p v-if="!data.clientsParPays.length" class="text-discret">—</p>
            </div>
          </section>
          <section :class="carte">
            <h2 :class="titreCarte">Clients par programme</h2>
            <div class="mt-3 flex flex-col gap-2.5 text-[13px]">
              <div class="flex justify-between gap-3">
                <span class="font-bold text-social">Social Média uniquement</span><b>{{ data.clientsParProgramme.socialMediaSeul }}</b>
              </div>
              <div class="flex justify-between gap-3">
                <span class="font-bold text-entrepreneurs">Entrepreneurs uniquement</span><b>{{ data.clientsParProgramme.entrepreneursSeul }}</b>
              </div>
              <div class="flex justify-between gap-3">
                <span>Les deux programmes</span><b>{{ data.clientsParProgramme.lesDeux }}</b>
              </div>
            </div>
            <p v-if="data.ltvBiProgrammes !== null" class="mt-3 text-[12px] leading-relaxed text-discret">
              Les clients bi-programmes ont un LTV moyen de {{ formatFcfa(data.ltvBiProgrammes) }} — cible prioritaire des relances.
            </p>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
