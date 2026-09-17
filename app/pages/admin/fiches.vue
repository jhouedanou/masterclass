<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Fiches commerciales — administration')

interface ModuleArbre {
  id: string
  slug: string
  numero: number
  titre: string
  fiche: string
  contenu: string
  offre: string
  dateLancement: string | null
  formateur: string
  prixFcfa: number
}
interface ProgrammeArbre {
  slug: string
  nom: string
  couleur: string
  phases: { thematiques: { nom: string; modules: ModuleArbre[] }[] }[]
}

const { data: arbre } = await useFetch<ProgrammeArbre[]>('/api/admin/contenus')

/** La fiche commerciale est un objet du module, pas de la thématique : la vue
 *  est donc une liste à plat, thématique en simple repère. */
const lignes = computed(() =>
  (arbre.value ?? []).flatMap((p) =>
    p.phases.flatMap((ph) =>
      ph.thematiques.flatMap((t) =>
        t.modules.map((m) => ({ ...m, programme: p.nom, couleur: p.couleur, thematique: t.nom })),
      ),
    ),
  ),
)

type CleFiltre = 'toutes' | 'publiee' | 'annonce' | 'brouillon'

const filtre = ref<CleFiltre>('toutes')
const recherche = ref('')

const visibles = computed(() =>
  lignes.value.filter((l) => {
    if (filtre.value !== 'toutes' && l.fiche !== filtre.value) return false
    const q = recherche.value.trim().toLowerCase()
    return !q || l.titre.toLowerCase().includes(q) || l.formateur.toLowerCase().includes(q)
  }),
)

const compte = (cle: string) => lignes.value.filter((l) => l.fiche === cle).length

const LIBELLES: Record<string, string> = {
  publiee: 'Publiée',
  annonce: 'Annonce',
  brouillon: 'Brouillon',
}

const dateCourte = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

const ONGLETS = computed<{ cle: CleFiltre; libelle: string; compteur: number }[]>(() => [
  { cle: 'toutes', libelle: 'Toutes', compteur: lignes.value.length },
  { cle: 'publiee', libelle: 'Publiées', compteur: compte('publiee') },
  { cle: 'annonce', libelle: 'Annonces', compteur: compte('annonce') },
  { cle: 'brouillon', libelle: 'Brouillons', compteur: compte('brouillon') },
])

// Rayon et chemise des pastilles de statut, identiques sur les quatre planches.
const pastille = 'rounded-full px-[9px] py-[3px] text-[11px] font-bold'
</script>

<template>
  <div v-if="arbre">
    <h1 class="font-title text-[24px] font-light">Fiches commerciales</h1>
    <p class="mt-1.5 max-w-[720px] text-[13px] text-discret">
      La page de vente d’un module : titre, promesse, points forts, formateur, informations
      pratiques. Elle se publie indépendamment du module pédagogique et de l’offre — une fiche peut
      être en ligne en « Annonce » avant qu’un seul chapitre ne soit filmé.
    </p>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <UiOnglets
        :onglets="ONGLETS"
        :model-value="filtre"
        @update:model-value="filtre = $event as CleFiltre"
      />
      <label class="ml-auto inline-flex items-center rounded-full border border-ligne bg-white px-3.5 py-2">
        <span class="sr-only">Rechercher une fiche</span>
        <input
          v-model="recherche"
          type="search"
          placeholder="Rechercher un module ou un formateur…"
          class="w-[240px] max-w-full bg-transparent text-[12px] font-semibold focus:outline-none"
        >
      </label>
    </div>

    <AdminTableauSimple
      class="mt-4"
      :colonnes="['Module', 'Formateur', 'Fiche', 'Contenu', 'Offre', 'Action']"
      :largeurs="['auto', '150px', '110px', '130px', '100px', '120px']"
      largeur-min="820px"
    >
      <tr v-for="l in visibles" :key="l.id">
        <td class="px-4 py-3">
          <p class="font-bold text-encre">Module {{ numeroModule(l.numero) }} · {{ l.titre }}</p>
          <p class="mt-0.5 font-mono text-[11px] text-discret">
            <span :style="{ color: l.couleur }">{{ l.programme }}</span> · {{ l.thematique }}
            <template v-if="l.dateLancement"> · lancement {{ dateCourte(l.dateLancement) }}</template>
          </p>
        </td>
        <td class="px-4 py-3 text-[12px] text-texte">{{ l.formateur }}</td>
        <td class="px-4 py-3">
          <span :class="[pastille, l.fiche === 'publiee' ? 'bg-succes-voile text-succes' : l.fiche === 'annonce' ? 'bg-alerte-voile text-alerte' : 'bg-fond-voile text-discret']">
            {{ LIBELLES[l.fiche] }}
          </span>
        </td>
        <td class="px-4 py-3">
          <span :class="[pastille, l.contenu === 'pret' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte']">
            {{ l.contenu === 'pret' ? 'Prêt' : 'En préparation' }}
          </span>
        </td>
        <td class="px-4 py-3">
          <span :class="[pastille, l.offre === 'ouverte' ? 'bg-social-voile text-social' : 'bg-fond-voile text-discret']">
            {{ l.offre === 'ouverte' ? 'Ouverte' : 'Fermée' }}
          </span>
        </td>
        <td class="px-4 py-3 whitespace-nowrap">
          <NuxtLink :to="`/admin/fiche/${l.id}`" class="text-[12.5px] font-bold">Modifier</NuxtLink>
          <NuxtLink :to="`/modules/${l.slug}`" class="ml-3 text-[12.5px] font-bold text-discret">Voir</NuxtLink>
        </td>
      </tr>
      <tr v-if="!visibles.length">
        <td colspan="6" class="px-4 py-8 text-center text-discret">Aucune fiche ne correspond.</td>
      </tr>
    </AdminTableauSimple>
  </div>
</template>
