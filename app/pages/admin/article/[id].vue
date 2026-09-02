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

const CATEGORIES: CategorieArticle[] = ['Social Média', 'Entrepreneuriat', 'Actualités E-Masterclass Big Five']

const onglet = ref<'contenu' | 'referencement'>('contenu')
const erreur = ref('')
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
    <NuxtLink to="/admin/blog" class="text-[12.5px] text-discret hover:underline">← Blog</NuxtLink>
    <div class="mt-2 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-title text-[26px] font-light">{{ nouveau ? 'Nouvel article' : fiche.titre }}</h1>
        <p class="mt-1 text-[12.5px] text-discret">
          <span
            class="mr-2 rounded-full px-2.5 py-1 text-[11px] font-bold"
            :class="data.article?.statut === 'publie' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte'"
          >
            {{ data.article?.statut === 'publie' ? 'Publié' : 'Brouillon' }}
          </span>
          <template v-if="data.article?.publieLe">publié le {{ formatDate(data.article.publieLe) }} · </template>
          <span v-if="!nouveau" class="font-mono">/blog/{{ data.article?.slug }}</span>
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UiBaseButton v-if="data.article?.statut === 'publie'" taille="sm" variante="contour" :to="`/blog/${data.article.slug}`">Voir</UiBaseButton>
        <UiBaseButton taille="sm" variante="contour" :disabled="enCours" @click="enregistrer()">Enregistrer</UiBaseButton>
        <UiBaseButton v-if="data.article?.statut !== 'publie'" taille="sm" :disabled="enCours || !fiche.titre" @click="enregistrer('publie')">Publier</UiBaseButton>
        <UiBaseButton v-else taille="sm" variante="sombre" :disabled="enCours" @click="enregistrer('brouillon')">Dépublier</UiBaseButton>
      </div>
    </div>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-[#fdeeee] px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>
    <p v-if="succes" class="mt-4 rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[14px] text-succes">{{ succes }}</p>

    <div class="mt-5 flex flex-wrap gap-2 border-b border-ligne-douce" role="tablist">
      <button
        v-for="o in [{ cle: 'contenu', libelle: 'Contenu' }, { cle: 'referencement', libelle: 'Référencement et partage' }]"
        :key="o.cle"
        role="tab"
        :aria-selected="onglet === o.cle"
        :disabled="o.cle === 'referencement' && nouveau"
        class="-mb-px border-b-2 px-3.5 py-2.5 text-[13.5px] font-bold disabled:opacity-40"
        :class="onglet === o.cle ? 'border-social text-social' : 'border-transparent text-discret hover:text-encre'"
        @click="onglet = o.cle as typeof onglet"
      >
        {{ o.libelle }}
      </button>
    </div>

    <section v-if="onglet === 'contenu'" class="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
      <div class="space-y-4">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Titre *</span>
          <input v-model="fiche.titre" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[15px]" @blur="slugDepuisTitre">
        </label>
        <label v-if="nouveau" class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">URL *</span>
          <div class="flex items-center gap-1 font-mono text-[13px]">
            <span class="text-discret">/blog/</span>
            <input v-model="fiche.slug" required class="flex-1 rounded-[10px] border border-ligne px-3 py-2 text-[13px]">
          </div>
          <p class="mt-1 text-[12px] text-discret">Modifiable ensuite depuis l’onglet Référencement, avec redirection automatique.</p>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Introduction (chapô)</span>
          <textarea v-model="fiche.chapo" rows="3" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Corps de l’article</span>
          <textarea v-model="fiche.contenu" rows="18" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 font-mono text-[13.5px]" />
          <span class="mt-1 block text-[12px] text-discret">Titres H2/H3 en Markdown (##, ###). Le temps de lecture est recalculé à l’enregistrement.</span>
        </label>
      </div>

      <aside class="space-y-4">
        <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Catégorie</span>
            <select v-model="fiche.categorie" class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
              <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label class="mt-4 block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Auteur</span>
            <select v-model="fiche.auteurId" class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
              <option v-for="a in data.auteurs" :key="a.id" :value="a.id">{{ a.nom }}</option>
            </select>
          </label>
          <label class="mt-4 flex items-center gap-2 text-[14px]">
            <input v-model="fiche.aLaUne" type="checkbox" class="accent-social"> Article à la une
          </label>
        </div>

        <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Image principale</span>
            <input v-model="fiche.image" placeholder="/images/blog/…" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[13px]">
          </label>
          <label class="mt-3 block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Texte alternatif</span>
            <input v-model="fiche.imageAlt" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[13px]">
          </label>
        </div>

        <fieldset class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <legend class="px-1 text-[13px] font-bold text-texte">Modules liés</legend>
          <div class="max-h-64 space-y-1.5 overflow-y-auto">
            <label v-for="m in data.modules" :key="m.id" class="flex items-start gap-2 text-[13px]">
              <input v-model="fiche.modulesLies" type="checkbox" :value="m.id" class="mt-0.5 accent-social">
              <span>{{ m.titre }}</span>
            </label>
          </div>
        </fieldset>
      </aside>
    </section>

    <section v-else-if="data.article" class="mt-6 max-w-[620px]">
      <AdminPanneauReferencement
        :id="data.article.id"
        :libelle="data.article.titre"
        :chemin="`/blog/${data.article.slug}`"
        :seo="data.article.seo"
        :autres="data.autres"
        integre
        @enregistre="refresh()"
      />
    </section>
  </div>
</template>
