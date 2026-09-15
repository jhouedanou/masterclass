<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Performances — administration')

// Les champs à `null` sont ceux dont la collecte passe par Google Tag Manager :
// tant que l'intégration n'est pas faite, l'écran affiche « — » plutôt qu'un
// chiffre qui n'aurait aucune source.
const programme = ref('')
const moduleId = ref('')
const pays = ref('')
const mois = ref('')

// Changer de programme rend le module choisi caduc : le laisser filtrerait sur
// un module absent de la liste, et l'écran se viderait sans raison visible.
watch(programme, () => (moduleId.value = ''))

const { data } = await useFetch<{
  ca: number
  evolutionCa: number | null
  ventes: number
  modulesParAcheteur: number
  visites: number | null
  visiteursUniques: number | null
  tauxConversion: number | null
  repartitionProgramme: { socialMedia: number; entrepreneurs: number }
  topPays: string | null
  ltv: number
  appareils: { mobile: number; desktop: number } | null
  topSource: string | null
  directReferents: number | null
  pageLaPlusVue: string | null
  acheteurs: number
  nouveaux: number
  recurrents: number
  caQuotidien: number[]
  moisDisponibles: string[]
  paysDisponibles: (string | undefined)[]
  modulesDisponibles: { id: string; titre: string; programme: string }[]
  ventesParModule: { titre: string; ventes: number; ca: number }[]
  ventesParPays: { pays: string; ventes: number; ca: number }[]
  moyensPaiement: { moyen: string; ventes: number; part: number }[]
  meilleursClients: { nom: string; pays: string; ca: number; modules: number }[]
  retention: number | null
  funnel: {
    visites: number | null
    fichesVues: number | null
    commandes: number
    paiements: number
    echecs: number
  }
}>('/api/admin/performances', {
  query: computed(() => ({
    programme: programme.value || undefined,
    module: moduleId.value || undefined,
    pays: pays.value || undefined,
    mois: mois.value || undefined,
  })),
})

const max = computed(() => Math.max(...(data.value?.caQuotidien ?? [1]), 1))

type Onglet = 'resume' | 'funnel' | 'ventes' | 'visites' | 'clients'
const onglet = ref<Onglet>('resume')
const ONGLETS: { valeur: Onglet; libelle: string }[] = [
  { valeur: 'resume', libelle: 'Résumé' },
  { valeur: 'funnel', libelle: 'Funnel & conversion' },
  { valeur: 'ventes', libelle: 'Ventes' },
  { valeur: 'visites', libelle: 'Visites' },
  { valeur: 'clients', libelle: 'Clients' },
]

const nomDuMois = (valeur: string) =>
  new Date(`${valeur}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

/** Un indicateur sans source se lit « — », jamais zéro : l'absence de mesure
 *  n'est pas une mesure nulle. */
const ATTENTE = '—'
const nombre = (valeur: number | null | undefined) =>
  valeur === null || valeur === undefined ? ATTENTE : new Intl.NumberFormat('fr-FR').format(valeur)
const pourcent = (valeur: number | null | undefined) =>
  valeur === null || valeur === undefined ? ATTENTE : `${valeur.toString().replace('.', ',')} %`

/** Sans acheteur, la part n'est pas nulle : elle n'existe pas. */
const partRecurrents = computed(() =>
  data.value?.retention === null || data.value?.retention === undefined
    ? ATTENTE
    : `${data.value.retention} %`,
)
</script>

<template>
  <div v-if="data">
    <h1 class="font-title text-[26px] font-light">Performances</h1>
    <p class="mt-2 max-w-[820px] text-[12.5px] text-discret">
      Ventes, chiffre d’affaires et clients viennent de la base et sont exacts. Les mesures
      d’audience — visites, taux de conversion, appareils, sources — passent par Google Tag Manager,
      qui n’est pas encore relié : elles affichent « — » plutôt qu’un chiffre sans source.
      <NuxtLink to="/admin/tracking" class="underline">Relier le tracking →</NuxtLink>
    </p>

    <div class="mt-5 flex flex-wrap gap-2 text-[13px]">
      <select v-model="mois" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">30 derniers jours</option>
        <option v-for="m in data.moisDisponibles" :key="m" :value="m">{{ nomDuMois(m) }}</option>
      </select>
      <select v-model="programme" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous programmes</option>
        <option value="social-media">Social Média</option>
        <option value="entrepreneurs">Entrepreneurs</option>
      </select>
      <select v-model="moduleId" class="max-w-[260px] rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous modules</option>
        <option v-for="m in data.modulesDisponibles" :key="m.id" :value="m.id">{{ m.titre }}</option>
      </select>
      <select v-model="pays" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous pays</option>
        <option v-for="p in data.paysDisponibles" :key="p" :value="p">{{ p }}</option>
      </select>
      <span class="self-center text-[12.5px] text-discret">
        Appareil et source demanderont la collecte.
      </span>
    </div>

    <div class="mt-4 flex flex-wrap gap-2 text-[13px] font-bold" role="tablist">
      <button
        v-for="o in ONGLETS"
        :key="o.valeur"
        role="tab"
        :aria-selected="onglet === o.valeur"
        class="rounded-full border px-4 py-2"
        :class="onglet === o.valeur ? 'border-social bg-social text-white' : 'border-ligne bg-white text-texte'"
        @click="onglet = o.valeur"
      >
        {{ o.libelle }}
      </button>
    </div>

    <div v-if="onglet === 'resume'" class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        :detail="
          data.visiteursUniques === null
            ? 'collecte à brancher'
            : `${nombre(data.visiteursUniques)} visiteurs uniques`
        "
      />
      <AdminCarteIndicateur
        libelle="Taux de conversion"
        :valeur="pourcent(data.tauxConversion)"
        detail="visite → paiement réussi"
      />
    </div>

    <section v-if="onglet === 'resume'" class="mt-6 rounded-[14px] border border-ligne-douce bg-white p-6">
      <h2 class="font-title text-[19px] font-light">Chiffre d’affaires quotidien</h2>
      <div class="mt-5 flex h-40 items-end gap-1.5" role="img" aria-label="Histogramme du chiffre d’affaires quotidien">
        <div
          v-for="(valeur, i) in data.caQuotidien"
          :key="i"
          class="flex-1 rounded-t-[3px] bg-social"
          :style="{ height: `${(valeur / max) * 100}%` }"
          :title="`${new Intl.NumberFormat('fr-FR').format(valeur)} FCFA`"
        />
      </div>
      <p class="mt-3 text-[12px] text-discret">
        Meilleure journée de la période : {{ formatFcfa(max) }}.
      </p>
    </section>

    <div v-if="onglet === 'resume'" class="mt-6 grid gap-6 lg:grid-cols-3">
      <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Ventes</h2>
        <dl class="mt-4 space-y-2 text-[13.5px]">
          <div class="flex justify-between gap-3">
            <dt class="text-discret">Par programme</dt>
            <dd>SM {{ data.repartitionProgramme.socialMedia }} % · ENT {{ data.repartitionProgramme.entrepreneurs }} %</dd>
          </div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Top pays</dt><dd>{{ data.topPays ?? '—' }}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Revenu / apprenant</dt><dd>{{ formatFcfa(data.ltv) }}</dd></div>
        </dl>
      </section>

      <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Visites</h2>
        <dl class="mt-4 space-y-2 text-[13.5px]">
          <div class="flex justify-between gap-3">
            <dt class="text-discret">Appareils</dt>
            <dd>
              <template v-if="data.appareils">
                Mobile {{ data.appareils.mobile }} % · Desktop {{ data.appareils.desktop }} %
              </template>
              <template v-else>—</template>
            </dd>
          </div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Top source</dt><dd>{{ data.topSource ?? '—' }}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Direct / référents</dt><dd>{{ pourcent(data.directReferents) }}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Page la plus vue</dt><dd class="font-mono text-[12.5px]">{{ data.pageLaPlusVue ?? '—' }}</dd></div>
        </dl>
        <p class="mt-4 text-[12px] text-discret">
          Ces mesures proviendront de Google Tag Manager. Tant que la collecte n’est pas branchée,
          elles restent vides — aucune valeur n’est estimée.
        </p>
      </section>

      <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Clients</h2>
        <dl class="mt-4 space-y-2 text-[13.5px]">
          <div class="flex justify-between gap-3"><dt class="text-discret">Acheteurs total</dt><dd>{{ data.acheteurs }}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Nouveaux (période)</dt><dd>{{ data.nouveaux }}</dd></div>
          <div class="flex justify-between gap-3">
            <dt class="text-discret">Récurrents (2 modules +)</dt>
            <dd>{{ data.recurrents }} ({{ partRecurrents }})</dd>
          </div>
        </dl>
      </section>
    </div>

    <!-- 18b · Funnel & conversion -->
    <section v-if="onglet === 'funnel'" class="mt-5">
      <div class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Du visiteur au paiement</h2>
        <p class="mt-1 text-[12.5px] text-discret">
          Les deux premières marches viennent de la collecte d’audience. Les deux dernières
          viennent de la base et sont exactes.
        </p>
        <ol class="mt-5 flex flex-col gap-3">
          <li
            v-for="etape in [
              { libelle: 'Visites du site', valeur: data.funnel.visites },
              { libelle: 'Fiches module vues', valeur: data.funnel.fichesVues },
              { libelle: 'Commandes engagées', valeur: data.funnel.commandes },
              { libelle: 'Paiements réussis', valeur: data.funnel.paiements },
            ]"
            :key="etape.libelle"
            class="flex flex-wrap items-center gap-4"
          >
            <span class="w-[190px] shrink-0 text-[13.5px] text-texte">{{ etape.libelle }}</span>
            <div class="h-7 min-w-[40px] flex-1 overflow-hidden rounded-[6px] bg-fond-voile">
              <div
                v-if="etape.valeur !== null && data.funnel.commandes"
                class="h-full rounded-[6px] bg-social"
                :style="{ width: `${Math.min(100, (etape.valeur / data.funnel.commandes) * 100)}%` }"
              />
            </div>
            <span class="w-[70px] shrink-0 text-right font-bold">{{ nombre(etape.valeur) }}</span>
          </li>
        </ol>
        <p class="mt-5 border-t border-ligne-claire pt-4 text-[13.5px]">
          Sur la période : <b>{{ data.funnel.paiements }}</b> paiement(s) réussi(s) pour
          <b>{{ data.funnel.commandes }}</b> commande(s) engagée(s)
          <template v-if="data.funnel.echecs">
            · <span class="text-erreur">{{ data.funnel.echecs }} échec(s)</span>
          </template>
          <template v-if="data.funnel.commandes">
            — soit {{ Math.round((data.funnel.paiements / data.funnel.commandes) * 100) }} % de
            conversion au paiement.
          </template>
        </p>
        <p class="mt-2 text-[12.5px] text-discret">
          Le taux de conversion depuis la visite reste inconnu tant que l’audience n’est pas
          mesurée : il ne se déduit pas des commandes.
        </p>
      </div>
    </section>

    <!-- 18c · Ventes -->
    <section v-if="onglet === 'ventes'" class="mt-5 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Ventes par module</h2>
        <AdminTableauSimple class="mt-3" :colonnes="['Module', 'Ventes', 'Chiffre d’affaires']">
          <tr v-for="l in data.ventesParModule" :key="l.titre">
            <td class="px-4 py-3">{{ l.titre }}</td>
            <td class="px-4 py-3">{{ l.ventes }}</td>
            <td class="px-4 py-3 font-bold">{{ formatFcfa(l.ca) }}</td>
          </tr>
          <tr v-if="!data.ventesParModule.length">
            <td colspan="3" class="px-4 py-8 text-center text-discret">Aucune vente sur la période.</td>
          </tr>
        </AdminTableauSimple>
      </div>

      <div class="flex flex-col gap-6">
        <div class="rounded-[14px] border border-ligne-douce bg-white p-6">
          <h2 class="font-title text-[19px] font-light">Par pays</h2>
          <ul class="mt-3 flex flex-col gap-2 text-[13.5px]">
            <li v-for="l in data.ventesParPays" :key="l.pays" class="flex justify-between gap-3">
              <span class="text-texte">{{ l.pays }}</span>
              <span class="text-discret">{{ l.ventes }} · {{ formatFcfa(l.ca) }}</span>
            </li>
            <li v-if="!data.ventesParPays.length" class="text-discret">Aucune vente sur la période.</li>
          </ul>
        </div>

        <div class="rounded-[14px] border border-ligne-douce bg-white p-6">
          <h2 class="font-title text-[19px] font-light">Moyens de paiement</h2>
          <ul class="mt-3 flex flex-col gap-2.5 text-[13.5px]">
            <li v-for="l in data.moyensPaiement" :key="l.moyen">
              <div class="flex justify-between gap-3">
                <span class="text-texte">{{ l.moyen }}</span>
                <span class="text-discret">{{ l.ventes }} · {{ l.part }} %</span>
              </div>
              <div class="mt-1 h-1.5 w-full rounded-full bg-fond-voile">
                <div class="h-full rounded-full bg-social" :style="{ width: `${l.part}%` }" />
              </div>
            </li>
            <li v-if="!data.moyensPaiement.length" class="text-discret">Aucune vente sur la période.</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 18d · Visites -->
    <section v-if="onglet === 'visites'" class="mt-5">
      <div class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Audience</h2>
        <dl class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="m in [
            { libelle: 'Visites', valeur: nombre(data.visites) },
            { libelle: 'Visiteurs uniques', valeur: nombre(data.visiteursUniques) },
            { libelle: 'Taux de conversion', valeur: pourcent(data.tauxConversion) },
            { libelle: 'Top source', valeur: data.topSource ?? '—' },
            { libelle: 'Direct / référents', valeur: pourcent(data.directReferents) },
            { libelle: 'Page la plus vue', valeur: data.pageLaPlusVue ?? '—' },
          ]" :key="m.libelle" class="rounded-[12px] border border-ligne-claire p-4">
            <dt class="text-[12.5px] text-discret">{{ m.libelle }}</dt>
            <dd class="mt-1 font-title text-[22px] font-light">{{ m.valeur }}</dd>
          </div>
        </dl>
        <p class="mt-5 rounded-[10px] border border-alerte bg-alerte-voile p-4 text-[13px] text-alerte">
          Aucune de ces six mesures n’a de source aujourd’hui. Elles se rempliront d’elles-mêmes
          une fois Google Tag Manager relié dans
          <NuxtLink to="/admin/tracking" class="underline">Tracking &amp; pixels</NuxtLink> —
          d’ici là, un tiret vaut mieux qu’une estimation.
        </p>
      </div>
    </section>

    <!-- 18e · Clients -->
    <section v-if="onglet === 'clients'" class="mt-5 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Meilleurs clients de la période</h2>
        <AdminTableauSimple class="mt-3" :colonnes="['Apprenant', 'Pays', 'Modules', 'Total payé']">
          <tr v-for="c in data.meilleursClients" :key="c.nom">
            <td class="px-4 py-3 font-bold">{{ c.nom }}</td>
            <td class="px-4 py-3 text-discret">{{ c.pays || '—' }}</td>
            <td class="px-4 py-3">{{ c.modules }}</td>
            <td class="px-4 py-3">{{ formatFcfa(c.ca) }}</td>
          </tr>
          <tr v-if="!data.meilleursClients.length">
            <td colspan="4" class="px-4 py-8 text-center text-discret">Aucun achat sur la période.</td>
          </tr>
        </AdminTableauSimple>
      </div>

      <div class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Fidélité</h2>
        <dl class="mt-4 space-y-3 text-[13.5px]">
          <div class="flex justify-between gap-3"><dt class="text-discret">Acheteurs au total</dt><dd class="font-bold">{{ data.acheteurs }}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Nouveaux sur la période</dt><dd class="font-bold">{{ data.nouveaux }}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Revenus prendre un 2ᵉ module</dt><dd class="font-bold">{{ data.recurrents }}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Part de récurrents</dt><dd class="font-bold">{{ partRecurrents }}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Revenu par apprenant</dt><dd class="font-bold">{{ formatFcfa(data.ltv) }}</dd></div>
        </dl>
        <p class="mt-4 text-[12px] text-discret">
          C’est la seule mesure de fidélité que la base sait produire : elle compte les accès, pas
          les retours sur le site.
        </p>
      </div>
    </section>

    <p class="mt-5 text-[12.5px] text-discret">
      Détail des échecs de paiement :
      <NuxtLink to="/admin/transactions" class="underline">Transactions</NuxtLink> (accès restreint).
    </p>
  </div>
</template>
