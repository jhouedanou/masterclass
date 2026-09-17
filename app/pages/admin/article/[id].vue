<script setup lang="ts">
import type { Article, CategorieArticle } from '#shared/types'

/**
 * Éditeur d'article (planche C, écran 22) : contenu d'un côté, onglet
 * « Référencement et partage » de l'autre — le même panneau que la liste SEO.
 * Parcours 05 de la planche E : rédaction → référencement → publication.
 */
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const nouveau = computed(() => route.params.id === 'nouveau')

const { data, refresh } = await useFetch<{
  article: Article | null
  auteurs: { id: string; nom: string }[]
  modules: { id: string; titre: string; programme: string }[]
  autres: { id: string; title?: string; metaDescription?: string }[]
}>(() => `/api/admin/articles/${route.params.id}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Article introuvable', fatal: true })
}

usePagePrivee(nouveau.value ? 'Nouvel article' : `${data.value.article?.titre} — édition`)

// Écran 22 : filets de 1,5 px, chemise 12/14, étiquettes 12,5 px en gras.
const champ =
  'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-3 text-[13.5px] focus:border-social focus:outline-none'
const etiquette = 'mb-1.5 block text-[12.5px] font-bold'

const CATEGORIES: CategorieArticle[] = ['Social Média', 'Entrepreneuriat', 'Actualités E-Masterclass Big Five']

const onglet = ref<'contenu' | 'referencement' | 'publication'>('contenu')
const ONGLETS = computed(() => [
  { cle: 'contenu', libelle: 'Contenu' },
  { cle: 'referencement', libelle: 'Référencement et partage' },
  { cle: 'publication', libelle: 'Publication' },
])

/** Le texte alternatif est obligatoire avant publication (écran 22) : une
 *  image sans description n'a rien à faire sur une page publique. */
const altManquant = computed(() => Boolean(fiche.image) && !fiche.imageAlt.trim())
const erreur = ref('')
const { annoncer } = useToasts()
const succes = ref('')
const enCours = ref(false)

const fiche = reactive({
  titre: '',
  slug: '',
  chapo: '',
  contenu: '',
  auteurId: '',
  categorie: 'Social Média' as CategorieArticle,
  image: '',
  imageAlt: '',
  aLaUne: false,
  modulesLies: [] as string[],
  publieLe: '',
})

watchEffect(() => {
  const a = data.value?.article
  if (!a) {
    if (!fiche.auteurId) fiche.auteurId = data.value?.auteurs[0]?.id ?? ''
    return
  }
  Object.assign(fiche, {
    titre: a.titre,
    slug: a.slug,
    chapo: a.chapo,
    contenu: a.contenu,
    auteurId: a.auteurId,
    categorie: a.categorie,
    image: a.image,
    imageAlt: a.imageAlt,
    aLaUne: a.aLaUne,
    modulesLies: [...a.modulesLies],
    publieLe: a.publieLe?.slice(0, 10) ?? '',
  })
})

function slugDepuisTitre() {
  if (!nouveau.value || fiche.slug) return
  fiche.slug = fiche.titre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function enregistrer(statut?: 'brouillon' | 'publie') {
  erreur.value = ''
  succes.value = ''
  if (statut === 'publie' && altManquant.value) {
    erreur.value = 'Texte alternatif obligatoire avant publication : décrivez l’image principale.'
    annoncer('Texte alternatif obligatoire avant publication : décrivez l’image principale.', 'erreur')
    onglet.value = 'contenu'
    return
  }
  enCours.value = true
  try {
    if (nouveau.value) {
      const cree = await $fetch<Article>('/api/admin/articles', {
        method: 'POST',
        body: {
          slug: fiche.slug,
          titre: fiche.titre,
          chapo: fiche.chapo,
          contenu: fiche.contenu,
          auteurId: fiche.auteurId,
          categorie: fiche.categorie,
        },
      })
      // Les champs que la création ne prend pas passent par une mise à jour.
      await $fetch('/api/admin/articles', {
        method: 'PUT',
        body: {
          id: cree.id,
          image: fiche.image || undefined,
          imageAlt: fiche.imageAlt || undefined,
          aLaUne: fiche.aLaUne,
          modulesLies: fiche.modulesLies,
          statut: statut ?? 'brouillon',
        },
      })
      await navigateTo(`/admin/article/${cree.id}`)
      return
    }
    await $fetch('/api/admin/articles', {
      method: 'PUT',
      body: {
        id: data.value!.article!.id,
        titre: fiche.titre,
        chapo: fiche.chapo,
        contenu: fiche.contenu,
        auteurId: fiche.auteurId,
        categorie: fiche.categorie,
        image: fiche.image,
        imageAlt: fiche.imageAlt,
        aLaUne: fiche.aLaUne,
        modulesLies: fiche.modulesLies,
        // La date de publication se corrige depuis l'onglet Publication ;
        // vide, elle est laissée au serveur (posée à la première publication).
        ...(fiche.publieLe ? { publieLe: new Date(`${fiche.publieLe}T09:00:00`).toISOString() } : {}),
        ...(statut ? { statut } : {}),
      },
    })
    succes.value =
      statut === 'publie'
        ? 'Article publié : il apparaît dans le blog et dans le sitemap.'
        : statut === 'brouillon'
          ? 'Article dépublié : il n’est plus visible ni indexable.'
          : 'Enregistré. La version précédente reste restaurable.'
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'L’enregistrement a échoué.'
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <div v-if="data">
    <p class="text-[12px] text-discret">
      <NuxtLink to="/admin/blog" class="text-inherit hover:underline">Blog</NuxtLink> /
    </p>
    <h1 class="mt-1 font-title text-[24px] font-light">{{ nouveau ? 'Nouvel article' : fiche.titre }}</h1>
    <p class="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-discret">
      <span
        class="rounded-full px-2.5 py-1 text-[11px] font-bold"
        :class="data.article?.statut === 'publie' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte'"
      >
        {{ data.article?.statut === 'publie' ? 'Publié' : 'Brouillon' }}
      </span>
      <template v-if="data.article?.publieLe">publié le {{ formatDate(data.article.publieLe) }} ·</template>
      <span v-if="!nouveau" class="font-mono">/blog/{{ data.article?.slug }}</span>
    </p>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-erreur-voile px-4 py-3 text-[13px] text-erreur">{{ erreur }}</p>
    <p v-if="succes" class="mt-4 rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[13px] text-succes">{{ succes }}</p>

    <UiOnglets
      class="mt-4"
      accent="social"
      :onglets="ONGLETS"
      :model-value="onglet"
      @update:model-value="onglet = ($event === 'referencement' && nouveau ? 'contenu' : $event) as typeof onglet"
    />

    <section v-if="onglet === 'contenu'" class="mt-4 max-w-[620px] rounded-[14px] border border-ligne-douce bg-white p-[22px]">
      <div class="flex flex-col gap-3">
        <label class="block">
          <span :class="etiquette">Titre de l’article (H1)</span>
          <input v-model="fiche.titre" required :class="champ" @blur="slugDepuisTitre">
        </label>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span :class="etiquette">Catégorie</span>
            <select v-model="fiche.categorie" :class="[champ, 'bg-white text-texte']">
              <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label class="block">
            <span :class="etiquette">Auteur</span>
            <select v-model="fiche.auteurId" :class="[champ, 'bg-white text-texte']">
              <option v-for="a in data.auteurs" :key="a.id" :value="a.id">{{ a.nom }}</option>
            </select>
          </label>
        </div>

        <label v-if="nouveau" class="block">
          <span :class="etiquette">URL</span>
          <div class="flex items-center gap-1 font-mono">
            <span class="text-[13px] text-discret">/blog/</span>
            <input v-model="fiche.slug" required :class="[champ, 'font-mono text-[13px]']">
          </div>
          <span class="mt-[7px] block text-[11.5px] text-discret">
            Modifiable ensuite depuis l’onglet Référencement, avec redirection automatique.
          </span>
        </label>

        <label class="block">
          <span :class="etiquette">Introduction</span>
          <textarea v-model="fiche.chapo" rows="3" :class="champ" />
        </label>

        <!-- Zone d'image : la maquette la dessine en pointillé, le texte
             alternatif juste en dessous — il conditionne la publication. -->
        <div class="rounded-[12px] border-[1.5px] border-dashed border-ligne-pointillee p-4 text-center text-[12.5px] leading-[1.6] text-discret">
          ⬆ Image principale (WebP 1200×675)
          <span class="mt-1 block text-[11.5px]" :class="altManquant && 'text-alerte'">
            Texte alternatif obligatoire avant publication
          </span>
          <input v-model="fiche.image" placeholder="/images/blog/…" :class="[champ, 'mt-2.5 text-[13px]']">
        </div>

        <label class="block">
          <span :class="etiquette">Texte alternatif de l’image</span>
          <input
            v-model="fiche.imageAlt"
            :required="Boolean(fiche.image)"
            :class="[champ, altManquant && 'border-alerte']"
          >
        </label>

        <div class="block">
          <span id="champ-contenu" :class="etiquette">Corps de l’article</span>
          <UiChampTexteRiche
            v-model="fiche.contenu"
            aria-labelledby="champ-contenu"
            :hauteur="420"
            placeholder="Éditeur riche : H2, H3, paragraphes, listes, liens vers les modules."
          />
          <span class="mt-[7px] block text-[11.5px] text-discret">
            Le temps de lecture est recalculé à l’enregistrement.
          </span>
        </div>

        <fieldset class="rounded-[10px] border-[1.5px] border-ligne px-3.5 py-3">
          <legend class="px-1 text-[12.5px] font-bold">Modules liés</legend>
          <div class="max-h-64 space-y-1.5 overflow-y-auto">
            <label v-for="m in data.modules" :key="m.id" class="flex items-start gap-2.5 text-[13px]">
              <input v-model="fiche.modulesLies" type="checkbox" :value="m.id" class="mt-0.5 size-4 accent-social">
              <span>{{ m.titre }}</span>
            </label>
          </div>
        </fieldset>

        <div class="flex flex-wrap gap-2.5">
          <UiBaseButton
            v-if="data.article?.statut !== 'publie'"
            taille="sm"
            variante="sombre"
            :disabled="enCours || !fiche.titre || altManquant"
            @click="enregistrer('publie')"
          >
            Publier
          </UiBaseButton>
          <UiBaseButton v-else taille="sm" variante="sombre" :disabled="enCours" @click="enregistrer('brouillon')">
            Dépublier
          </UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" :disabled="enCours" @click="enregistrer()">
            Enregistrer le brouillon
          </UiBaseButton>
          <UiBaseButton
            v-if="data.article?.statut === 'publie'"
            taille="sm"
            variante="contour"
            :to="`/blog/${data.article.slug}`"
          >
            Prévisualiser
          </UiBaseButton>
        </div>
      </div>
    </section>

    <!-- Publication (écran 22) : statut, date, à la une, catégorie -->
    <section v-else-if="onglet === 'publication'" class="mt-4 max-w-[620px]">
      <div class="rounded-[14px] border border-ligne-douce bg-white p-[22px]">
        <dl class="grid gap-3 text-[13.5px] sm:grid-cols-2">
          <div>
            <dt class="text-discret">Statut</dt>
            <dd>
              <span
                class="rounded-full px-2.5 py-1 text-[11px] font-bold"
                :class="data.article?.statut === 'publie' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte'"
              >
                {{ data.article?.statut === 'publie' ? 'Publié' : 'Brouillon' }}
              </span>
            </dd>
          </div>
          <div>
            <dt class="text-discret">URL</dt>
            <dd class="font-mono text-[12.5px]">{{ fiche.slug ? `/blog/${fiche.slug}` : 'slug à définir' }}</dd>
          </div>
        </dl>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-[12.5px] font-bold">Date de publication</span>
            <input v-model="fiche.publieLe" type="date" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
            <span class="mt-1 block text-[12px] text-discret">Posée à la première publication si laissée vide.</span>
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[12.5px] font-bold">Catégorie</span>
            <select v-model="fiche.categorie" class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
              <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label class="flex items-center gap-2 text-[14px] sm:col-span-2">
            <input v-model="fiche.aLaUne" type="checkbox" class="accent-social"> Article à la une
          </label>
        </div>
        <p v-if="altManquant" class="mt-4 rounded-[10px] border border-alerte bg-alerte-voile p-3 text-[13px] text-alerte">
          Texte alternatif obligatoire avant publication — à renseigner dans l’onglet Contenu.
        </p>
        <div class="mt-5 flex flex-wrap gap-2">
          <UiBaseButton v-if="data.article?.statut !== 'publie'" taille="sm" :disabled="enCours || !fiche.titre || altManquant" @click="enregistrer('publie')">Publier</UiBaseButton>
          <UiBaseButton v-else taille="sm" variante="sombre" :disabled="enCours" @click="enregistrer('brouillon')">Dépublier</UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" :disabled="enCours" @click="enregistrer()">Enregistrer le brouillon</UiBaseButton>
          <UiBaseButton v-if="data.article?.statut === 'publie'" taille="sm" variante="contour" :to="`/blog/${data.article.slug}`">Prévisualiser</UiBaseButton>
        </div>
      </div>
    </section>

    <section v-else-if="data.article" class="mt-4 max-w-[620px]">
      <AdminPanneauReferencement
        :id="data.article.id"
        :libelle="data.article.titre"
        :chemin="`/blog/${data.article.slug}`"
        :seo="data.article.seo"
        :statut="data.article.statut"
        :autres="data.autres"
        integre
        @enregistre="refresh()"
      />
    </section>
  </div>
</template>
