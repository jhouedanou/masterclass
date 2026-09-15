<script setup lang="ts">
import { rendreTexteRiche } from '#shared/utils/texteRiche'

/**
 * Éditeur de texte mis en forme du back-office.
 *
 * Le champ émet du HTML, assaini côté serveur à l'enregistrement
 * (`server/utils/texteRiche.ts`) : rien de ce qui sort d'ici n'est cru sur
 * parole, car ces contenus s'affichent ensuite en `v-html` sur des pages
 * publiques.
 *
 * `document.execCommand` est officiellement déprécié mais reste la seule voie
 * universellement disponible pour un `contenteditable`, et son remplaçant n'a
 * jamais vu le jour. Tous les navigateurs visés l'appliquent.
 */
const props = defineProps<{
  modelValue?: string | null
  disabled?: boolean
  id?: string
  placeholder?: string
  /** Hauteur minimale, en pixels. */
  hauteur?: number
}>()
const emit = defineEmits<{ 'update:modelValue': [valeur: string] }>()

const zone = ref<HTMLElement | null>(null)
const actif = reactive<Record<string, boolean>>({})

const OUTILS = [
  { cle: 'bold', libelle: 'G', titre: 'Gras', classe: 'font-bold' },
  { cle: 'italic', libelle: 'I', titre: 'Italique', classe: 'italic' },
  { cle: 'formatBlock:h2', libelle: 'T1', titre: 'Titre de niveau 2', classe: '' },
  { cle: 'formatBlock:h3', libelle: 'T2', titre: 'Titre de niveau 3', classe: '' },
  { cle: 'insertUnorderedList', libelle: '•—', titre: 'Liste à puces', classe: '' },
  { cle: 'insertOrderedList', libelle: '1—', titre: 'Liste numérotée', classe: '' },
] as const

function appliquer(cle: string) {
  if (props.disabled) return
  zone.value?.focus()
  const [commande, valeur] = cle.split(':')
  // Un titre déjà appliqué se retire en repassant au paragraphe.
  if (commande === 'formatBlock' && actif[cle]) {
    document.execCommand('formatBlock', false, 'p')
  } else {
    document.execCommand(commande!, false, valeur)
  }
  publier()
  releverEtat()
}

function effacerMiseEnForme() {
  if (props.disabled) return
  zone.value?.focus()
  document.execCommand('removeFormat')
  document.execCommand('formatBlock', false, 'p')
  publier()
  releverEtat()
}

/** Éclaire les boutons selon ce qui est sous le curseur. */
function releverEtat() {
  if (!zone.value) return
  for (const outil of OUTILS) {
    const [commande, valeur] = outil.cle.split(':')
    try {
      actif[outil.cle] =
        commande === 'formatBlock'
          ? document.queryCommandValue('formatBlock').toLowerCase() === valeur
          : document.queryCommandState(commande!)
    } catch {
      actif[outil.cle] = false
    }
  }
}

function publier() {
  const html = zone.value?.innerHTML ?? ''
  // Un éditeur vide laisse un `<br>` ou un paragraphe creux : on ne veut pas
  // qu'un champ vidé compte comme renseigné.
  emit('update:modelValue', html.replace(/<[^>]+>|&nbsp;|\s/g, '') ? html : '')
}

/**
 * Le collage arrive en texte brut. Sans cela, un copier-coller depuis Word ou
 * une page web déverse des styles et des balises étrangères que l'assainisseur
 * retirera de toute façon — autant ne pas les montrer entre-temps.
 */
function coller(evenement: ClipboardEvent) {
  evenement.preventDefault()
  const texte = evenement.clipboardData?.getData('text/plain') ?? ''
  document.execCommand('insertText', false, texte)
  publier()
}

/**
 * Le contenu n'est réinjecté que s'il diffère vraiment de ce qui est affiché :
 * réécrire `innerHTML` à chaque frappe replacerait le curseur au début.
 */
function synchroniser() {
  const attendu = rendreTexteRiche(props.modelValue)
  if (zone.value && zone.value.innerHTML !== attendu) zone.value.innerHTML = attendu
}

onMounted(synchroniser)
watch(() => props.modelValue, synchroniser)
</script>

<template>
  <div class="rounded-[10px] border border-ligne bg-white focus-within:border-social">
    <div class="flex flex-wrap items-center gap-1 border-b border-ligne-claire p-1.5">
      <button
        v-for="outil in OUTILS"
        :key="outil.cle"
        type="button"
        :disabled="disabled"
        :title="outil.titre"
        :aria-label="outil.titre"
        :aria-pressed="actif[outil.cle] === true"
        class="min-w-8 rounded-[6px] px-2 py-1 text-[13px] transition disabled:opacity-40"
        :class="[outil.classe, actif[outil.cle] ? 'bg-social-voile text-social' : 'text-texte hover:bg-fond-voile']"
        @mousedown.prevent
        @click="appliquer(outil.cle)"
      >
        {{ outil.libelle }}
      </button>
      <span class="mx-1 h-4 w-px bg-ligne-claire" />
      <button
        type="button"
        :disabled="disabled"
        title="Effacer la mise en forme"
        aria-label="Effacer la mise en forme"
        class="rounded-[6px] px-2 py-1 text-[13px] text-discret transition hover:bg-fond-voile disabled:opacity-40"
        @mousedown.prevent
        @click="effacerMiseEnForme"
      >
        ⌫
      </button>
    </div>

    <!-- `editorial` porte déjà le style des titres, listes et paragraphes du
         site : ce qu'on voit ici est ce que verra le visiteur. -->
    <div
      :id="id"
      ref="zone"
      class="editorial px-3.5 py-2.5 text-[14px] focus:outline-none"
      :class="disabled && 'opacity-60'"
      :style="{ minHeight: `${hauteur ?? 140}px` }"
      :contenteditable="!disabled"
      role="textbox"
      aria-multiline="true"
      :data-vide="placeholder"
      @input="publier"
      @paste="coller"
      @keyup="releverEtat"
      @mouseup="releverEtat"
      @focus="releverEtat"
    />
  </div>
</template>

<style scoped>
/* Repère de champ vide : un `contenteditable` n'a pas de `placeholder`. */
[contenteditable]:empty::before {
  content: attr(data-vide);
  color: var(--color-discret);
}
</style>
