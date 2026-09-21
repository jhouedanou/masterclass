<script setup lang="ts">
/**
 * Griffe au pied des attestations : celle de la direction, ou celle d'un
 * formateur.
 *
 * Deux façons de la donner, et une seule route au bout. Le tracé à la souris
 * sort du canevas en PNG à fond transparent, que l'on envoie comme un fichier
 * ordinaire : le serveur ne distingue pas une griffe dessinée d'une griffe
 * déposée, et il n'y a donc qu'un chemin à tenir juste des deux côtés.
 *
 * Le canevas est dessiné à deux fois sa taille d'affichage. Une signature finit
 * imprimée, et un tracé rendu à la résolution de l'écran s'y voit crénelé — la
 * page d'attestation la réduit ensuite à 48 pixels de haut, où seule la finesse
 * du trait d'origine se remarque.
 */
const props = defineProps<{
  /** Griffe actuelle, chaîne vide tant que rien n'est déposé. */
  modelValue: string
  /** Sous la ligne de signature, sur le document. */
  legende: string
  /** Formateur concerné ; absent, c'est la direction qui signe. */
  formateurId?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const RESOLUTION = 2
const LARGEUR = 420
const HAUTEUR = 150

const canevas = ref<HTMLCanvasElement | null>(null)
const champFichier = ref<HTMLInputElement | null>(null)
const mode = ref<'apercu' | 'trace'>('apercu')
const enCours = ref(false)
const erreur = ref('')
/** Vrai dès le premier trait : sans lui, « Enregistrer » enverrait une image
 *  vide, qui remplacerait une griffe existante par du transparent. */
const traceCommence = ref(false)

let dessine = false

function contexte(): CanvasRenderingContext2D | null {
  const ctx = canevas.value?.getContext('2d') ?? null
  if (!ctx) return null
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 2.5 * RESOLUTION
  ctx.strokeStyle = '#111827'
  return ctx
}

/** Coordonnées dans le canevas, quelle que soit sa taille à l'écran : le
 *  canevas est mis à l'échelle par CSS, et les coordonnées de l'évènement sont
 *  celles de la page. */
function point(evenement: PointerEvent): [number, number] {
  const cadre = canevas.value!.getBoundingClientRect()
  return [
    ((evenement.clientX - cadre.left) / cadre.width) * LARGEUR * RESOLUTION,
    ((evenement.clientY - cadre.top) / cadre.height) * HAUTEUR * RESOLUTION,
  ]
}

function commencer(evenement: PointerEvent) {
  const ctx = contexte()
  if (!ctx) return
  // La capture suit le pointeur hors du canevas : sans elle, un trait qui
  // déborde reprend là où il rentre, avec un saut au milieu de la griffe.
  canevas.value!.setPointerCapture(evenement.pointerId)
  dessine = true
  traceCommence.value = true
  ctx.beginPath()
  ctx.moveTo(...point(evenement))
}

function tracer(evenement: PointerEvent) {
  if (!dessine) return
  const ctx = contexte()
  if (!ctx) return
  ctx.lineTo(...point(evenement))
  ctx.stroke()
}

function terminer() {
  dessine = false
}

function effacer() {
  const ctx = contexte()
  if (!ctx || !canevas.value) return
  // `clearRect` et non un remplissage blanc : le fond doit rester transparent,
  // le document imprimant la griffe sur son propre papier.
  ctx.clearRect(0, 0, canevas.value.width, canevas.value.height)
  traceCommence.value = false
}

function ouvrirTrace() {
  mode.value = 'trace'
  erreur.value = ''
  nextTick(effacer)
}

/** Le tuyau unique : tout part en `multipart`, tracé comme fichier. */
async function envoyer(fichier: Blob, nom: string) {
  enCours.value = true
  erreur.value = ''
  try {
    const corps = new FormData()
    corps.append('signature', fichier, nom)
    const reponse = await $fetch<{ signature: string }>('/api/admin/attestation/signature', {
      method: 'POST',
      body: corps,
      query: props.formateurId ? { formateur: props.formateurId } : undefined,
    })
    emit('update:modelValue', reponse.signature)
    mode.value = 'apercu'
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreur.value = r.data?.statusMessage ?? r.statusMessage ?? 'Envoi de la griffe impossible.'
  } finally {
    enCours.value = false
  }
}

function enregistrerTrace() {
  canevas.value?.toBlob((blob) => {
    if (blob) void envoyer(blob, 'signature.png')
  }, 'image/png')
}

function deposerFichier(evenement: Event) {
  const champ = evenement.target as HTMLInputElement
  const fichier = champ.files?.[0]
  if (fichier) void envoyer(fichier, fichier.name)
  champ.value = ''
}

async function retirer() {
  enCours.value = true
  erreur.value = ''
  try {
    await $fetch('/api/admin/attestation/signature', {
      method: 'DELETE',
      query: props.formateurId ? { formateur: props.formateurId } : undefined,
    })
    emit('update:modelValue', '')
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreur.value = r.data?.statusMessage ?? r.statusMessage ?? 'Retrait impossible.'
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <div class="rounded-[12px] border border-ligne-douce bg-white p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-[14px] font-bold text-encre">{{ legende }}</p>
        <p class="mt-0.5 text-[12.5px] text-discret">
          {{ modelValue ? 'Griffe déposée' : 'Aucune griffe — le document n’imprime que la ligne' }}
        </p>
      </div>
      <div v-if="mode === 'apercu'" class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-full border-[1.5px] border-ligne px-4 py-2 text-[12.5px] font-bold text-texte transition hover:bg-fond-clair disabled:opacity-50"
          :disabled="enCours"
          @click="ouvrirTrace"
        >
          Signer à la souris
        </button>
        <button
          type="button"
          class="rounded-full border-[1.5px] border-ligne px-4 py-2 text-[12.5px] font-bold text-texte transition hover:bg-fond-clair disabled:opacity-50"
          :disabled="enCours"
          @click="champFichier?.click()"
        >
          {{ enCours ? 'Envoi…' : 'Déposer une image' }}
        </button>
        <button
          v-if="modelValue"
          type="button"
          class="rounded-full border-[1.5px] border-erreur px-4 py-2 text-[12.5px] font-bold text-erreur transition hover:bg-[#fdeeee] disabled:opacity-50"
          :disabled="enCours"
          @click="retirer"
        >
          Retirer
        </button>
      </div>
    </div>

    <input
      ref="champFichier"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="sr-only"
      @change="deposerFichier"
    >

    <!-- Aperçu tel qu'il s'imprimera : la griffe posée sur sa ligne, avec la
         légende dessous. Le damier rappelle la transparence — une image à fond
         blanc se verra ici comme un rectangle, avant d'être découverte sur le
         document. -->
    <div v-if="mode === 'apercu'" class="mt-4 flex justify-center rounded-[10px] bg-fond-clair py-5">
      <div class="text-center">
        <img
          v-if="modelValue"
          :src="modelValue"
          alt=""
          class="mx-auto h-12 w-auto object-contain"
          style="background-image: linear-gradient(45deg, #e9ecef 25%, transparent 25%, transparent 75%, #e9ecef 75%), linear-gradient(45deg, #e9ecef 25%, transparent 25%, transparent 75%, #e9ecef 75%); background-size: 12px 12px; background-position: 0 0, 6px 6px"
        >
        <div class="mx-auto w-40 border-t border-encre/50" :class="modelValue ? 'mt-1' : 'mt-12'" />
        <p class="mt-1.5 text-[12px] font-bold text-encre">{{ legende }}</p>
      </div>
    </div>

    <div v-else class="mt-4">
      <canvas
        ref="canevas"
        :width="LARGEUR * RESOLUTION"
        :height="HAUTEUR * RESOLUTION"
        class="w-full max-w-[420px] cursor-crosshair touch-none rounded-[10px] border-[1.5px] border-dashed border-ligne bg-white"
        :style="{ aspectRatio: `${LARGEUR} / ${HAUTEUR}` }"
        @pointerdown="commencer"
        @pointermove="tracer"
        @pointerup="terminer"
        @pointercancel="terminer"
      />
      <p class="mt-1.5 text-[12px] text-discret">
        Tracez votre signature dans le cadre. Le fond reste transparent.
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <UiBaseButton taille="sm" :disabled="!traceCommence || enCours" @click="enregistrerTrace">
          {{ enCours ? 'Envoi…' : 'Enregistrer la griffe' }}
        </UiBaseButton>
        <button
          type="button"
          class="rounded-full border-[1.5px] border-ligne px-4 py-2 text-[12.5px] font-bold text-texte transition hover:bg-fond-clair"
          @click="effacer"
        >
          Effacer
        </button>
        <button
          type="button"
          class="rounded-full px-4 py-2 text-[12.5px] font-bold text-discret transition hover:text-encre"
          @click="mode = 'apercu'"
        >
          Annuler
        </button>
      </div>
    </div>

    <p v-if="erreur" class="mt-3 text-[12.5px] font-bold text-erreur">{{ erreur }}</p>
  </div>
</template>
