<script setup lang="ts">
/**
 * Formulaires du CMS, un par type de bloc.
 *
 * Le JSON brut marchait, mais il demandait de connaître la forme attendue et
 * une virgule de trop suffisait à tout bloquer — ce n'est pas ce qu'on demande
 * à quelqu'un qui vient changer une accroche. Les blocs sans forme stable
 * gardent le JSON, faute de mieux.
 */
const props = defineProps<{
  cle: string
  contenu: Record<string, unknown>
}>()

const emit = defineEmits<{ maj: [contenu: Record<string, unknown>] }>()

type Slide = {
  accroche: string
  description: string
  cta: string
  programme: string
  imageFond: string
  imageVisuel: string
  altFond: string
  altVisuel: string
}
type Chiffre = { valeur: string; libelle: string }
type DocLegal = { cle: string; titre: string; maj: string; corps: string }

/** Les cinq documents de la planche A, écran 09, dans l'ordre du sommaire. */
const DOCUMENTS_LEGAUX: { cle: string; titre: string }[] = [
  { cle: 'cgv', titre: 'Conditions générales de vente' },
  { cle: 'mentions-legales', titre: 'Mentions légales' },
  { cle: 'cgu', titre: 'Conditions générales d’utilisation' },
  { cle: 'confidentialite', titre: 'Politique de confidentialité' },
  { cle: 'cookies', titre: 'Politique de cookies' },
]

/** Copie locale : le parent ne reçoit que des états complets, jamais une
 *  frappe intermédiaire. */
const local = reactive<Record<string, unknown>>(JSON.parse(JSON.stringify(props.contenu ?? {})))
watch(local, () => emit('maj', JSON.parse(JSON.stringify(local))), { deep: true })

const slides = computed<Slide[]>(() => (local.slides as Slide[]) ?? [])
const chiffres = computed<Chiffre[]>(() => (local.chiffres as Chiffre[]) ?? [])

function ajouterSlide() {
  local.slides = [
    ...slides.value,
    {
      accroche: '',
      description: '',
      cta: '',
      programme: 'social-media',
      imageFond: '',
      imageVisuel: '',
      altFond: '',
      altVisuel: '',
    },
  ]
}
function retirerSlide(i: number) {
  local.slides = slides.value.filter((_, index) => index !== i)
}
function deplacerSlide(i: number, sens: -1 | 1) {
  const copie = [...slides.value]
  const cible = i + sens
  if (cible < 0 || cible >= copie.length) return
  ;[copie[i], copie[cible]] = [copie[cible]!, copie[i]!]
  local.slides = copie
}

/**
 * Les documents légaux étaient stockés comme une simple liste de clés. On les
 * normalise en objets complets, en conservant l'ordre du sommaire : le juriste
 * rend ses textes document par document, et rien ne doit disparaître entre
 * deux livraisons.
 */
const documentsLegaux = computed<DocLegal[]>(() => {
  const enregistres = (local.documents ?? []) as (DocLegal | string)[]
  return DOCUMENTS_LEGAUX.map((attendu) => {
    const trouve = enregistres.find((d) =>
      typeof d === 'string' ? d === attendu.cle : d.cle === attendu.cle,
    )
    if (!trouve || typeof trouve === 'string') {
      return { cle: attendu.cle, titre: attendu.titre, maj: '', corps: '' }
    }
    return { ...trouve, titre: trouve.titre || attendu.titre }
  })
})

const legalOuvert = ref(DOCUMENTS_LEGAUX[0]!.cle)

function majDocumentLegal(cle: string, champ: 'titre' | 'maj' | 'corps', valeur: string) {
  local.documents = documentsLegaux.value.map((d) => (d.cle === cle ? { ...d, [champ]: valeur } : d))
}

function ajouterChiffre() {
  local.chiffres = [...chiffres.value, { valeur: '', libelle: '' }]
}
function retirerChiffre(i: number) {
  local.chiffres = chiffres.value.filter((_, index) => index !== i)
}

/** Repli pour les blocs qui n'ont pas de forme stable. */
const json = ref(JSON.stringify(props.contenu ?? {}, null, 2))
const jsonInvalide = ref(false)
watch(json, (v) => {
  try {
    emit('maj', JSON.parse(v))
    jsonInvalide.value = false
  } catch {
    jsonInvalide.value = true
  }
})

const champ =
  'w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none'
const TYPE = ['banniere', 'accueil', 'annonce']
</script>

<template>
  <div>
    <!-- Bannière : le carrousel de l'accueil -->
    <div v-if="cle === 'banniere'">
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold">Accroche fixe</span>
        <input v-model="local.accrocheFixe as string" :class="champ">
        <span class="mt-1 block text-[12px] text-discret">
          Première moitié du H1, identique sur tous les slides.
        </span>
      </label>

      <label class="mt-4 block max-w-[220px]">
        <span class="mb-1.5 block text-[13px] font-bold">Durée d’affichage (secondes)</span>
        <input v-model.number="local.dureeSecondes as number" type="number" min="2" max="30" :class="champ">
      </label>

      <p class="mt-5 text-[13px] font-bold">Slides</p>
      <div class="mt-2 flex flex-col gap-3">
        <article
          v-for="(slide, i) in slides"
          :key="i"
          class="rounded-[12px] border border-ligne-claire p-4"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-[12.5px] font-bold text-discret">Slide {{ i + 1 }}</p>
            <div class="flex items-center gap-1.5">
              <button class="rounded-[8px] border border-ligne px-2 py-1 text-[12px]" :disabled="i === 0" @click="deplacerSlide(i, -1)">↑</button>
              <button class="rounded-[8px] border border-ligne px-2 py-1 text-[12px]" :disabled="i === slides.length - 1" @click="deplacerSlide(i, 1)">↓</button>
              <button class="ml-2 text-[12.5px] text-erreur underline" @click="retirerSlide(i)">Retirer</button>
            </div>
          </div>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1.5 block text-[12.5px] font-bold">Accroche</span>
              <input v-model="slide.accroche" :class="champ">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[12.5px] font-bold">Programme</span>
              <select v-model="slide.programme" :class="champ">
                <option value="social-media">Social Média</option>
                <option value="entrepreneurs">Entrepreneurs</option>
              </select>
            </label>
            <label class="block sm:col-span-2">
              <span class="mb-1.5 block text-[12.5px] font-bold">Description</span>
              <textarea v-model="slide.description" rows="2" :class="champ" />
              <span class="mt-1 block text-[12px] text-discret">
                Paragraphe sous le titre. Vide, la description du programme est reprise.
              </span>
            </label>
            <label class="block sm:col-span-2">
              <span class="mb-1.5 block text-[12.5px] font-bold">Libellé du bouton</span>
              <input v-model="slide.cta" :class="champ">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[12.5px] font-bold">Image de fond</span>
              <input v-model="slide.imageFond" placeholder="/images/hero/…" :class="champ">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[12.5px] font-bold">Texte alternatif de l’image de fond</span>
              <input v-model="slide.altFond" :class="champ">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[12.5px] font-bold">Visuel <span class="font-normal text-discret">(facultatif)</span></span>
              <input v-model="slide.imageVisuel" :class="champ">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[12.5px] font-bold">Texte alternatif du visuel</span>
              <input v-model="slide.altVisuel" :class="champ">
            </label>
          </div>
        </article>
      </div>
      <button class="mt-3 text-[12.5px] text-social underline" @click="ajouterSlide">＋ Ajouter un slide</button>
    </div>

    <!-- Accueil : les chiffres clés -->
    <div v-else-if="cle === 'accueil'">
      <p class="text-[13px] font-bold">Chiffres clés</p>
      <div class="mt-2 flex flex-col gap-2">
        <div v-for="(chiffre, i) in chiffres" :key="i" class="flex flex-wrap items-end gap-3">
          <label class="block w-[140px]">
            <span class="mb-1.5 block text-[12.5px] font-bold">Valeur</span>
            <input v-model="chiffre.valeur" :class="champ">
          </label>
          <label class="block min-w-[200px] flex-1">
            <span class="mb-1.5 block text-[12.5px] font-bold">Libellé</span>
            <input v-model="chiffre.libelle" :class="champ">
          </label>
          <button class="pb-3 text-[12.5px] text-erreur underline" @click="retirerChiffre(i)">Retirer</button>
        </div>
      </div>
      <button class="mt-3 text-[12.5px] text-social underline" @click="ajouterChiffre">＋ Ajouter un chiffre</button>
    </div>

    <!-- Annonce : le bandeau global, programmable par dates -->
    <div v-else-if="cle === 'annonce'">
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold">Texte du bandeau</span>
        <input v-model="local.texte as string" :class="champ">
        <span class="mt-1 block text-[12px] text-discret">
          Vide, le bandeau ne s’affiche pas, quel que soit le statut.
        </span>
      </label>
      <label class="mt-4 block">
        <span class="mb-1.5 block text-[13px] font-bold">Lien <span class="font-normal text-discret">(facultatif)</span></span>
        <input v-model="local.lien as string" placeholder="/modules/…" :class="champ">
      </label>
    </div>

    <!-- Pages légales : cinq documents, un corps par document -->
    <div v-else-if="cle === 'legales'">
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold">Note interne</span>
        <input v-model="local.note as string" :class="champ">
        <span class="mt-1 block text-[12px] text-discret">
          Visible du back-office seulement, jamais sur le site.
        </span>
      </label>

      <div class="mt-5 flex flex-wrap gap-2">
        <button
          v-for="doc in documentsLegaux"
          :key="doc.cle"
          class="rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold"
          :class="
            doc.cle === legalOuvert
              ? 'border-social bg-social text-white'
              : 'border-ligne bg-white text-texte'
          "
          @click="legalOuvert = doc.cle"
        >
          {{ doc.titre }}
          <span v-if="!doc.corps" class="ml-1 font-normal opacity-70">— vide</span>
        </button>
      </div>

      <template v-for="doc in documentsLegaux" :key="doc.cle">
        <div v-if="doc.cle === legalOuvert" class="mt-4 rounded-[12px] border border-ligne-claire p-4">
          <div class="grid gap-3 sm:grid-cols-[1fr_200px]">
            <label class="block">
              <span class="mb-1.5 block text-[12.5px] font-bold">Titre affiché</span>
              <input
                :value="doc.titre"
                :class="champ"
                @input="majDocumentLegal(doc.cle, 'titre', ($event.target as HTMLInputElement).value)"
              >
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[12.5px] font-bold">Dernière mise à jour</span>
              <input
                :value="doc.maj"
                placeholder="1er août 2026"
                :class="champ"
                @input="majDocumentLegal(doc.cle, 'maj', ($event.target as HTMLInputElement).value)"
              >
            </label>
          </div>
          <div class="mt-3">
            <span class="mb-1.5 block text-[12.5px] font-bold">Corps du document</span>
            <UiChampTexteRiche
              :model-value="doc.corps"
              @update:model-value="majDocumentLegal(doc.cle, 'corps', $event)"
            />
            <span class="mt-1 block text-[12px] text-discret">
              Titres et paragraphes. Le HTML est assaini avant publication. Tant que le corps est
              vide, la page affiche son avertissement de texte à fournir.
            </span>
          </div>
        </div>
      </template>
    </div>

    <!-- Les blocs sans forme stable gardent le JSON -->
    <div v-else>
      <p class="text-[12.5px] text-discret">
        Ce bloc n’a pas de forme fixe : il se modifie en JSON.
      </p>
      <textarea
        v-model="json"
        rows="10"
        class="mt-2 w-full rounded-[10px] border px-3 py-2.5 font-mono text-[12.5px] focus:outline-none"
        :class="jsonInvalide ? 'border-erreur' : 'border-ligne focus:border-social'"
      />
      <p v-if="jsonInvalide" class="mt-1 text-[12.5px] text-erreur">JSON invalide — rien ne sera enregistré.</p>
    </div>
  </div>
</template>
