<script setup lang="ts">
import type { Formateur, Module, Thematique } from '#shared/types'

/**
 * Éditeur des neuf blocs de la fiche commerciale (planche C, écran 02B).
 * Rendu par la page `/admin/fiche/[id]` et par l'onglet « Fiche commerciale »
 * de l'éditeur de module (écran 09), en mode `integre` : l'en-tête de page
 * s'efface, l'onglet a déjà le sien.
 */
const props = defineProps<{ id: string; integre?: boolean }>()
/** L'éditeur de module recharge ses données quand la fiche est enregistrée. */
const emit = defineEmits<{ enregistre: [] }>()

interface ChapitreFiche {
  id: string
  position: number
  libelle: string
  titre: string
}

const { data, refresh } = await useFetch<{
  module: Module
  chapitres: ChapitreFiche[]
  thematiques: Thematique[]
  formateurs: Formateur[]
}>(() => `/api/admin/module/${props.id}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Module introuvable', fatal: true })
}

const erreur = ref('')
const succes = ref('')
const enCours = ref(false)

/** Les neuf blocs de la maquette, à plat : la fiche est un formulaire, pas un
 *  arbre. Une ligne = une puce sur la fiche publique. */
const fiche = reactive({
  titre: '',
  promesse: '',
  pourquoi: '',
  livrable: '',
  acquis: '',
  pourQui: '',
  prerequis: '',
  pointsForts: '',
  formateurId: '',
  statut: 'brouillon' as Module['statut'],
  dateLancement: '',
  prixMasque: false,
})

watchEffect(() => {
  const m = data.value?.module
  if (!m) return
  Object.assign(fiche, {
    titre: m.titre,
    promesse: m.promesse,
    pourquoi: m.pourquoi,
    livrable: m.livrable,
    acquis: m.acquis.join('\n'),
    pourQui: m.pourQui.join('\n'),
    prerequis: m.prerequis,
    pointsForts: m.pointsForts.join('\n'),
    formateurId: m.formateurId,
    statut: m.statut,
    dateLancement: m.dateLancement ?? '',
    prixMasque: m.prixMasque,
  })
})

const lignes = (v: string) => v.split('\n').map((l) => l.trim()).filter(Boolean)

async function enregistrer() {
  erreur.value = ''
  succes.value = ''
  enCours.value = true
  try {
    await $fetch('/api/admin/modules', {
      method: 'PUT',
      body: {
        id: data.value!.module.id,
        titre: fiche.titre,
        promesse: fiche.promesse,
        pourquoi: fiche.pourquoi,
        livrable: fiche.livrable,
        acquis: lignes(fiche.acquis),
        pourQui: lignes(fiche.pourQui),
        prerequis: fiche.prerequis,
        pointsForts: lignes(fiche.pointsForts),
        formateurId: fiche.formateurId,
        statut: fiche.statut,
        // Une date de lancement n'a de sens qu'en mode Annonce ; la laisser
        // traîner ferait mentir la fiche une fois le module publié.
        dateLancement: fiche.statut === 'annonce' ? fiche.dateLancement || null : null,
        prixMasque: fiche.statut === 'annonce' ? fiche.prixMasque : false,
      },
    })
    await refresh()
    emit('enregistre')
    succes.value = 'Fiche enregistrée.'
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'L’enregistrement a échoué.'
  } finally {
    enCours.value = false
  }
}

const nomThematique = computed(
  () => data.value?.thematiques.find((t) => t.id === data.value?.module.thematiqueId)?.nom ?? '',
)

// L'écran 02B dessine des champs à filet épais (1,5 px) et des cartes plus
// serrées que le reste du back-office : 12 px de rayon, 18/20 de chemise.
const champ =
  'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-3 text-[14px] focus:border-social focus:outline-none'
const bloc = 'rounded-[12px] border border-ligne-douce bg-white px-5 py-[18px]'
const surtitre = 'text-[11px] font-bold uppercase tracking-[0.1em] text-social'
const aide = 'mt-[7px] text-[11.5px] text-discret'
const etiquette = 'mb-1.5 block text-[12px] font-bold'

/** Les trois statuts que l'écran 02B propose. « En préparation » se règle
 *  depuis l'onglet « Offre & prix », qui le pose en fermant l'offre. */
const STATUTS: { valeur: Module['statut']; titre: string; suite: string }[] = [
  { valeur: 'brouillon', titre: 'Brouillon', suite: ' — invisible sur le site' },
  { valeur: 'disponible', titre: 'Publiée', suite: ' — achat ouvert' },
  { valeur: 'annonce', titre: 'Annonce', suite: ' — « Bientôt disponible »' },
]
</script>

<template>
  <div v-if="data">
    <template v-if="!props.integre">
      <!-- Fil d'Ariane de l'écran 09, repris ici : la fiche s'ouvre depuis
           l'arbre des contenus, et il faut pouvoir y revenir. -->
      <p class="text-[12px] text-discret">
        <NuxtLink to="/admin/contenus" class="text-inherit hover:underline">Modules &amp; chapitres</NuxtLink>
        / {{ data.module.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }}
        / {{ nomThematique }} / Module {{ numeroModule(data.module.numero) }} /
      </p>

      <div class="mt-1 flex flex-wrap items-center justify-between gap-4">
        <h1 class="font-title text-[24px] font-light">Fiche commerciale — {{ data.module.titre }}</h1>
        <div class="flex gap-2.5">
          <UiBaseButton :to="`/modules/${data.module.slug}`" taille="sm" variante="contour">Prévisualiser</UiBaseButton>
          <UiBaseButton taille="sm" :disabled="enCours" @click="enregistrer">
            {{ enCours ? 'Enregistrement…' : 'Enregistrer et publier' }}
          </UiBaseButton>
        </div>
      </div>
    </template>
    <div v-else class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="font-sans text-[15px] font-bold">Fiche commerciale</h2>
      <div class="flex gap-2.5">
        <UiBaseButton :to="`/admin/fiche/${data.module.id}`" taille="sm" variante="contour">Ouvrir en pleine page</UiBaseButton>
        <UiBaseButton taille="sm" :disabled="enCours" @click="enregistrer">
          {{ enCours ? 'Enregistrement…' : 'Enregistrer et publier' }}
        </UiBaseButton>
      </div>
    </div>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-erreur-voile px-4 py-3 text-[13px] text-erreur">{{ erreur }}</p>
    <p v-if="succes" class="mt-4 rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[13px] text-succes">{{ succes }}</p>

    <div class="mt-[18px] grid items-start gap-5 lg:grid-cols-[1fr_420px]">
      <div class="flex flex-col gap-3">
        <section :class="bloc">
          <p :class="surtitre">Bloc 1 · Titre du module</p>
          <input v-model="fiche.titre" class="mt-2" :class="champ">
          <p :class="aide">Titre affiché en H1 sur la fiche publique.</p>
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 2 · La promesse</p>
          <input v-model="fiche.promesse" class="mt-2" :class="champ">
          <p :class="aide">Sous le titre, en une phrase — le bénéfice concret.</p>
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 3 · Pourquoi ce module ?</p>
          <UiChampTexteRiche v-model="fiche.pourquoi" class="mt-2" />
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 4 · Ce que vous construisez pendant le module</p>
          <UiChampTexteRiche v-model="fiche.livrable" class="mt-2" />
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 5 · Les objectifs du module</p>
          <textarea v-model="fiche.acquis" rows="4" class="mt-2" :class="champ" />
          <p :class="aide">Une ligne = une puce sur la fiche publique.</p>
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 6 · À qui s’adresse ce module ?</p>
          <textarea v-model="fiche.pourQui" rows="4" class="mt-2" :class="champ" />
          <p class="mt-[7px] mb-3 text-[11.5px] text-discret">« Pour qui » — une ligne = une puce.</p>
          <label class="block">
            <span :class="etiquette">Prérequis</span>
            <input v-model="fiche.prerequis" :class="champ">
          </label>
          <p :class="aide">
            Affiché dans l’encart noir « À qui s’adresse ce module ? » de la fiche publique, colonne
            Prérequis.
          </p>
        </section>

        <!-- Le programme est repris du module pédagogique (écran 09), jamais
             édité ici ; la maquette l'intercale entre les blocs 6 et 7. -->
        <section class="rounded-[12px] border border-dashed border-ligne-pointillee bg-fond-clair px-5 py-[18px]">
          <p class="text-[11px] font-bold tracking-[0.1em] text-discret uppercase">Le programme du module — synchronisé</p>
          <ul class="mt-2 flex flex-col gap-1.5">
            <li v-for="c in data.chapitres" :key="c.id" class="text-[13px] text-texte">
              {{ c.libelle }} · {{ c.titre }}
            </li>
            <li v-if="!data.chapitres.length" class="text-[13px] text-discret">
              Aucun chapitre : le programme restera vide sur la fiche publique.
            </li>
          </ul>
          <p class="mt-2 text-[11.5px] text-discret">
            Repris automatiquement du module pédagogique — affiché sur la fiche publique entre
            « À qui s’adresse ce module ? » et « Les objectifs du module ».
          </p>
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 7 · Les points forts du module</p>
          <textarea v-model="fiche.pointsForts" rows="4" class="mt-2" :class="champ" />
          <p :class="aide">Une ligne = un point fort.</p>
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 8 · Votre formateur</p>
          <select v-model="fiche.formateurId" class="mt-2" :class="champ">
            <option v-for="f in data.formateurs" :key="f.id" :value="f.id">
              {{ f.nom }} — {{ f.expertise }}
            </option>
          </select>
          <p :class="aide">Photo, bio et ancre repris automatiquement du profil formateur.</p>
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 9 · Informations pratiques</p>
          <div class="mt-2 grid gap-2.5 sm:grid-cols-2">
            <label class="block">
              <span :class="etiquette">Format</span>
              <input
                :value="`Module de ${data.module.dureeMinutes} min · vidéo d’intro + chapitres`"
                disabled
                :class="[champ, 'bg-fond-clair text-discret']"
              >
            </label>
            <label class="block">
              <span :class="etiquette">Coaching session incluse</span>
              <input value="Oui — session de coaching avec le formateur" disabled :class="[champ, 'bg-fond-clair text-discret']">
            </label>
            <label class="block">
              <span :class="etiquette">Prix (repris de l’offre)</span>
              <input :value="formatFcfa(data.module.prixFcfa, true)" disabled :class="[champ, 'bg-fond-clair text-discret']">
            </label>
            <label class="block">
              <span :class="etiquette">Accès</span>
              <input value="À vie" disabled :class="[champ, 'bg-fond-clair text-discret']">
            </label>
          </div>
          <p :class="aide">
            Prix et accès sont synchronisés — ils se modifient dans l’offre commerciale, pas ici.
          </p>
        </section>
      </div>

      <aside class="flex h-fit flex-col gap-4 xl:sticky xl:top-6">
        <section class="rounded-[12px] border border-ligne-douce bg-white px-5 py-[18px]">
          <h2 class="font-sans text-[15px] font-bold">Statut de publication</h2>
          <!-- Chaque statut est une case cliquable entière, pas un point de
               radio isolé : la maquette encadre le libellé avec le bouton. -->
          <div class="mt-3 flex flex-col gap-[9px] text-[13.5px]">
            <label
              v-for="choix in STATUTS"
              :key="choix.valeur"
              class="flex items-start gap-2.5 rounded-[10px] border-[1.5px] px-3.5 py-[11px]"
              :class="fiche.statut === choix.valeur ? 'border-social bg-social-nuage' : 'border-ligne'"
            >
              <input v-model="fiche.statut" type="radio" :value="choix.valeur" class="mt-0.5 size-4 accent-social">
              <span>
                <span class="font-bold">{{ choix.titre }}</span>{{ choix.suite }}
                <span v-if="choix.valeur === 'annonce'" class="mt-0.5 block text-[11.5px] text-discret">
                  Pour annoncer une formation avant l’ouverture des ventes.
                </span>
              </span>
            </label>
          </div>

          <div
            v-if="fiche.statut === 'annonce'"
            class="mt-3 rounded-[10px] border border-dashed border-ligne-pointillee px-[15px] py-[13px] text-[12px] text-discret"
          >
            <label class="block">
              <span class="mb-1.5 block text-[12px] font-bold text-texte">Date de lancement (mode Annonce)</span>
              <input v-model="fiche.dateLancement" type="date" :class="champ">
            </label>
            <label class="mt-2 flex items-center gap-2.5 text-[12px] font-semibold text-texte">
              <input v-model="fiche.prixMasque" type="checkbox" class="size-4 accent-social">
              Masquer le prix jusqu’au lancement
            </label>
            <p class="mt-2 leading-[1.6]">
              En mode Annonce : badge « Bientôt disponible », bouton d’achat inactif, prix masquable,
              CTA « Être prévenu du lancement » (email / WhatsApp).
            </p>
          </div>
        </section>

        <section class="rounded-[12px] border border-ligne-douce bg-white px-5 py-[18px]">
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-sans text-[15px] font-bold">Offre commerciale</h2>
            <span
              class="rounded-full px-[9px] py-[3px] text-[11px] font-bold"
              :class="data.module.statut === 'disponible' ? 'bg-succes-voile text-succes' : 'bg-fond-voile text-discret'"
            >
              {{ data.module.statut === 'disponible' ? 'Ouverte' : 'Fermée' }}
            </span>
          </div>
          <p class="mt-2 text-[12.5px] leading-[1.6] text-texte">
            {{ formatFcfa(data.module.prixFcfa, true) }} ·
            {{ data.module.statut === 'disponible' ? 'offre ouverte' : 'offre fermée' }}. Ouverture
            bloquée tant que la fiche n’est pas publiée ou le module non « Prêt ». Fermer l’offre ne
            retire jamais les accès acquis.
            <NuxtLink :to="`/admin/module/${data.module.id}?onglet=offre`" class="font-bold">Gérer l’offre →</NuxtLink>
          </p>
        </section>

        <section class="rounded-[12px] border border-social-bordure-tendre bg-social-nuage px-5 py-4 text-[12.5px] leading-[1.7] text-texte">
          <b class="text-social">Séparation stricte</b> — fiche commerciale (copywriting) · module
          pédagogique (contenus, écran 09) · offre commerciale (prix &amp; ouverture). Publier la
          fiche ne publie ni le module ni l’offre.
        </section>
      </aside>
    </div>
  </div>
</template>
