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

const filtre = ref<'toutes' | 'publiee' | 'annonce' | 'brouillon'>('toutes')
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

const ONGLETS = [
  { cle: 'toutes', libelle: 'Toutes' },
  { cle: 'publiee', libelle: 'Publiées' },
  { cle: 'annonce', libelle: 'Annonces' },
  { cle: 'brouillon', libelle: 'Brouillons' },
] as const

const pastille = 'rounded-full px-2.5 py-1 text-[11px] font-bold'
</script>

<template>
  <div v-if="arbre">
    <h1 class="font-title text-[26px] font-light">Fiches commerciales</h1>
    <p class="mt-1.5 max-w-[720px] text-[13.5px] text-discret">
      La page de vente d’un module : titre, promesse, points forts, formateur, informations
      pratiques. Elle se publie indépendamment du module pédagogique et de l’offre — une fiche peut
      être en ligne en « Annonce » avant qu’un seul chapitre ne soit filmé.
    </p>

    <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-2" role="group">
        <button
          v-for="o in ONGLETS"
          :key="o.cle"
          class="rounded-full border px-4 py-2 text-[13px] font-bold"
          :class="filtre === o.cle ? 'border-social bg-social text-white' : 'border-ligne bg-white text-texte'"
          :aria-pressed="filtre === o.cle"
          @click="filtre = o.cle"
        >
          {{ o.libelle }}
          <span class="font-normal">({{ o.cle === 'toutes' ? lignes.length : compte(o.cle) }})</span>
        </button>
      </div>
      <label class="block">
        <span class="sr-only">Rechercher une fiche</span>
        <input
          v-model="recherche"
          type="search"
          placeholder="Rechercher un module ou un formateur"
          class="w-[280px] max-w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none"
        >
      </label>
    </div>

    <div class="mt-4 overflow-x-auto rounded-[14px] border border-ligne-douce bg-white">
      <table class="w-full min-w-[720px] text-left text-[13.5px]">
        <thead class="border-b border-ligne-claire text-[12px] uppercase tracking-[0.06em] text-discret">
          <tr>
            <th scope="col" class="px-5 py-3 font-bold">Module</th>
            <th scope="col" class="px-5 py-3 font-bold">Formateur</th>
            <th scope="col" class="px-5 py-3 font-bold">Fiche</th>
            <th scope="col" class="px-5 py-3 font-bold">Contenu</th>
            <th scope="col" class="px-5 py-3 font-bold">Offre</th>
            <th scope="col" class="px-5 py-3 font-bold"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ligne-claire">
          <tr v-for="l in visibles" :key="l.id">
            <td class="px-5 py-3">
              <p class="font-bold text-encre">Module {{ numeroModule(l.numero) }} · {{ l.titre }}</p>
              <p class="mt-0.5 text-[12px] text-discret">
                <span :style="{ color: l.couleur }">{{ l.programme }}</span> · {{ l.thematique }}
                <template v-if="l.dateLancement"> · lancement {{ dateCourte(l.dateLancement) }}</template>
              </p>
            </td>
            <td class="px-5 py-3 text-texte">{{ l.formateur }}</td>
            <td class="px-5 py-3">
              <span :class="[pastille, l.fiche === 'publiee' ? 'bg-succes-voile text-succes' : l.fiche === 'annonce' ? 'bg-alerte-voile text-alerte' : 'bg-fond-voile text-discret']">
                {{ LIBELLES[l.fiche] }}
              </span>
            </td>
            <td class="px-5 py-3">
              <span :class="[pastille, l.contenu === 'pret' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte']">
                {{ l.contenu === 'pret' ? 'Prêt' : 'En préparation' }}
              </span>
            </td>
            <td class="px-5 py-3">
              <span :class="[pastille, l.offre === 'ouverte' ? 'bg-social-voile text-social' : 'bg-fond-voile text-discret']">
                {{ l.offre === 'ouverte' ? 'Ouverte' : 'Fermée' }}
              </span>
            </td>
            <td class="px-5 py-3 text-right whitespace-nowrap">
              <NuxtLink :to="`/admin/fiche/${l.id}`" class="text-social underline">Modifier</NuxtLink>
              <NuxtLink :to="`/modules/${l.slug}`" class="ml-3 text-discret underline">Voir</NuxtLink>
            </td>
          </tr>
          <tr v-if="!visibles.length">
            <td colspan="6" class="px-5 py-8 text-center text-discret">Aucune fiche ne correspond.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
