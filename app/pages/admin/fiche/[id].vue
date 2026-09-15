<script setup lang="ts">
import type { Formateur, Module, Thematique } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

interface ChapitreFiche {
  id: string
  position: number
  libelle: string
  titre: string
}

const route = useRoute()
const { data, refresh } = await useFetch<{
  module: Module
  chapitres: ChapitreFiche[]
  thematiques: Thematique[]
  formateurs: Formateur[]
}>(() => `/api/admin/module/${route.params.id}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Module introuvable', fatal: true })
}

usePagePrivee(`${data.value.module.titre} — fiche commerciale`)

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

const champ =
  'w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none'
const bloc = 'mt-5 rounded-[14px] border border-ligne-douce bg-white p-5'
const surtitre = 'text-[11.5px] font-bold uppercase tracking-[0.1em] text-social'
const aide = 'mt-1.5 text-[12.5px] text-discret'
</script>

<template>
  <div v-if="data">
    <NuxtLink to="/admin/contenus" class="text-[13px] text-discret hover:underline">← Modules &amp; chapitres</NuxtLink>

    <div class="mt-3 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-title text-[26px] font-light">Fiche commerciale — {{ data.module.titre }}</h1>
        <p class="mt-1.5 text-[13px] text-discret">
          {{ data.module.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }} ·
          {{ nomThematique }} · Module {{ numeroModule(data.module.numero) }}
        </p>
      </div>
      <div class="flex gap-2">
        <UiBaseButton :to="`/modules/${data.module.slug}`" taille="sm" variante="contour">Prévisualiser</UiBaseButton>
        <UiBaseButton taille="sm" :disabled="enCours" @click="enregistrer">
          {{ enCours ? 'Enregistrement…' : 'Enregistrer et publier' }}
        </UiBaseButton>
      </div>
    </div>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-[#fdeeee] px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>
    <p v-if="succes" class="mt-4 rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[14px] text-succes">{{ succes }}</p>

    <div class="mt-2 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div>
        <section :class="bloc">
          <p :class="surtitre">Bloc 1 · Titre du module</p>
          <input v-model="fiche.titre" class="mt-2.5" :class="champ">
          <p :class="aide">Titre affiché en H1 sur la fiche publique.</p>
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 2 · La promesse</p>
          <input v-model="fiche.promesse" class="mt-2.5" :class="champ">
          <p :class="aide">Sous le titre, en une phrase — le bénéfice concret.</p>
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 3 · Pourquoi ce module ?</p>
          <UiChampTexteRiche v-model="fiche.pourquoi" class="mt-2.5" />
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 4 · Ce que vous construisez pendant le module</p>
          <UiChampTexteRiche v-model="fiche.livrable" class="mt-2.5" />
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 5 · Les objectifs du module</p>
          <textarea v-model="fiche.acquis" rows="4" class="mt-2.5" :class="champ" />
          <p :class="aide">Une ligne = une puce sur la fiche publique.</p>
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 6 · À qui s’adresse ce module ?</p>
          <textarea v-model="fiche.pourQui" rows="4" class="mt-2.5" :class="champ" />
          <p :class="aide">« Pour qui » — une ligne = une puce.</p>
          <label class="mt-4 block">
            <span class="mb-1.5 block text-[13px] font-bold">Prérequis</span>
            <input v-model="fiche.prerequis" :class="champ">
          </label>
          <p :class="aide">
            Affiché dans l’encart noir « À qui s’adresse ce module ? » de la fiche publique, colonne
            Prérequis.
          </p>
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 7 · Les points forts du module</p>
          <textarea v-model="fiche.pointsForts" rows="4" class="mt-2.5" :class="champ" />
          <p :class="aide">Une ligne = un point fort.</p>
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 8 · Votre formateur</p>
          <select v-model="fiche.formateurId" class="mt-2.5" :class="champ">
            <option v-for="f in data.formateurs" :key="f.id" :value="f.id">
              {{ f.nom }} — {{ f.expertise }}
            </option>
          </select>
          <p :class="aide">Photo, bio et ancre repris automatiquement du profil formateur.</p>
        </section>

        <section :class="bloc">
          <p :class="surtitre">Bloc 9 · Informations pratiques</p>
          <div class="mt-2.5 grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold">Format</span>
              <input
                :value="`Module de ${data.module.dureeMinutes} min · vidéo d’intro + chapitres`"
                disabled
                :class="[champ, 'bg-fond-voile text-discret']"
              >
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold">Coaching session incluse</span>
              <input value="Oui — session de coaching avec le formateur" disabled :class="[champ, 'bg-fond-voile text-discret']">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold">Prix (repris de l’offre)</span>
              <input :value="formatFcfa(data.module.prixFcfa, true)" disabled :class="[champ, 'bg-fond-voile text-discret']">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold">Accès</span>
              <input value="À vie" disabled :class="[champ, 'bg-fond-voile text-discret']">
            </label>
          </div>
          <p :class="aide">
            Prix et accès sont synchronisés — ils se modifient dans l’offre commerciale, pas ici.
          </p>
        </section>

        <!-- Repris du module pédagogique : édité à l'écran 09, jamais ici -->
        <section class="mt-5 rounded-[14px] border border-dashed border-ligne bg-white p-5">
          <p :class="surtitre">Le programme du module — synchronisé</p>
          <ul class="mt-3 flex flex-col gap-1.5">
            <li v-for="c in data.chapitres" :key="c.id" class="text-[13.5px] text-texte">
              <span class="font-bold uppercase tracking-[0.06em] text-discret">{{ c.libelle }}</span>
              · {{ c.titre }}
            </li>
            <li v-if="!data.chapitres.length" class="text-[13.5px] text-discret">
              Aucun chapitre : le programme restera vide sur la fiche publique.
            </li>
          </ul>
          <p :class="aide">
            Repris automatiquement du module pédagogique — affiché sur la fiche publique entre
            « À qui s’adresse ce module ? » et « Les objectifs du module ».
          </p>
        </section>
      </div>

      <aside class="h-fit xl:sticky xl:top-6">
        <section class="mt-5 rounded-[14px] border border-ligne-douce bg-white p-5">
          <h2 class="font-title text-[17px] font-light">Statut de publication</h2>
          <div class="mt-3 flex flex-col gap-3">
            <label class="flex items-start gap-2.5">
              <input v-model="fiche.statut" type="radio" value="brouillon" class="mt-1">
              <span class="text-[13.5px]"><span class="font-bold">Brouillon</span> — invisible sur le site</span>
            </label>
            <label class="flex items-start gap-2.5">
              <input v-model="fiche.statut" type="radio" value="disponible" class="mt-1">
              <span class="text-[13.5px]"><span class="font-bold">Publiée</span> — achat ouvert</span>
            </label>
            <label class="flex items-start gap-2.5">
              <input v-model="fiche.statut" type="radio" value="annonce" class="mt-1">
              <span class="text-[13.5px]">
                <span class="font-bold">Annonce</span> — « Bientôt disponible »
                <span class="mt-0.5 block text-[12.5px] text-discret">
                  Pour annoncer une formation avant l’ouverture des ventes.
                </span>
              </span>
            </label>
            <label class="flex items-start gap-2.5">
              <input v-model="fiche.statut" type="radio" value="en-preparation" class="mt-1">
              <span class="text-[13.5px]"><span class="font-bold">En préparation</span> — offre fermée</span>
            </label>
          </div>

          <div v-if="fiche.statut === 'annonce'" class="mt-4 border-t border-ligne-claire pt-4">
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold">Date de lancement (mode Annonce)</span>
              <input v-model="fiche.dateLancement" type="date" :class="champ">
            </label>
            <label class="mt-3 flex items-center gap-2.5 text-[13.5px]">
              <input v-model="fiche.prixMasque" type="checkbox">
              Masquer le prix jusqu’au lancement
            </label>
            <p :class="aide">
              En mode Annonce : badge « Bientôt disponible », bouton d’achat inactif, prix masquable,
              CTA « Être prévenu du lancement » (email / WhatsApp).
            </p>
          </div>
        </section>

        <section class="mt-4 rounded-[14px] border border-ligne-douce bg-white p-5">
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-title text-[17px] font-light">Offre commerciale</h2>
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-bold"
              :class="data.module.statut === 'disponible' ? 'bg-social-voile text-social' : 'bg-fond-voile text-discret'"
            >
              {{ data.module.statut === 'disponible' ? 'Ouverte' : 'Fermée' }}
            </span>
          </div>
          <NuxtLink :to="`/admin/module/${data.module.id}?onglet=offre`" class="mt-2 inline-block text-[13px] text-social underline">
            Gérer l’offre →
          </NuxtLink>
        </section>

        <section class="mt-4 rounded-[14px] border border-ligne-claire bg-fond-voile p-5">
          <p class="text-[13px] font-bold text-encre">Séparation stricte</p>
          <p class="mt-1.5 text-[12.5px] text-texte">
            Fiche commerciale (copywriting) · module pédagogique (contenus) · offre commerciale
            (prix &amp; ouverture). Publier la fiche ne publie ni le module ni l’offre.
          </p>
        </section>
      </aside>
    </div>
  </div>
</template>
