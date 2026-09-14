<script setup lang="ts">
import type { DemandeCoachingPrive, Formateur, SessionCoaching, Thematique } from '#shared/types'

/**
 * Salle de session Zoom (planche B, écran 11 ; planche D, écran 05).
 *
 * Le même écran sert l'apprenant et le formateur : l'API `/api/mon-espace/session/[id]`
 * décide seule du rôle (`hote` pour le formateur propriétaire de la session ou l'admin,
 * `participant` sinon) et `/api/zoom/signature` signe le jeton correspondant. Seuls les
 * liens de retour changent, d'où la propriété `espace`.
 */
const props = withDefaults(
  defineProps<{
    /** Identifiant de session, ou `prive-<demande>` pour une séance de coaching privé. */
    id: string
    espace?: 'apprenant' | 'formateur'
  }>(),
  { espace: 'apprenant' },
)

const { data, error } = await useFetch<{
  session: SessionCoaching | null
  demande: DemandeCoachingPrive | null
  thematique: Thematique | null
  formateur: Formateur | null
  modulesCouverts: { id: string; numero: number; titre: string; slug: string }[]
  participants: { id: string; nom: string }[]
  ressources: { titre: string; url: string; format: string }[]
  role: 'hote' | 'participant'
  salle: { ouverte: boolean; ouverture: string; fermeture: string; debut: string }
}>(() => `/api/mon-espace/session/${props.id}`)

if (!data.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: error.value?.statusMessage ?? 'Session introuvable',
    fatal: true,
  })
}

const privee = computed(() => Boolean(data.value?.demande))
const titre = computed(
  () =>
    data.value?.session?.titre ??
    (privee.value ? `Coaching privé — ${data.value?.formateur?.nom ?? ''}` : `${data.value?.thematique?.nom ?? ''} — questions-réponses et cas pratiques`),
)
usePagePrivee(titre.value)

const zoom = useZoom()
const racine = ref<HTMLElement | null>(null)
const autorisation = ref<Awaited<ReturnType<typeof demanderAutorisation>> | null>(null)
const erreurEntree = ref('')

/** Chrono « ● EN DIRECT · 00:42:17 » depuis le début prévu. */
const maintenant = ref(Date.now())
let horloge: ReturnType<typeof setInterval> | undefined
onMounted(() => (horloge = setInterval(() => (maintenant.value = Date.now()), 1000)))
onBeforeUnmount(() => {
  if (horloge) clearInterval(horloge)
  void zoom.quitter()
})
const enDirect = computed(() => maintenant.value >= new Date(data.value!.salle.debut).getTime())
const chrono = computed(() => {
  const ecart = Math.max(0, Math.floor((maintenant.value - new Date(data.value!.salle.debut).getTime()) / 1000))
  const h = String(Math.floor(ecart / 3600)).padStart(2, '0')
  const m = String(Math.floor((ecart % 3600) / 60)).padStart(2, '0')
  const s = String(ecart % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
})
const ouvertureLisible = computed(() =>
  new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(data.value!.salle.ouverture)),
)

async function demanderAutorisation() {
  return await $fetch<{
    mode: 'simulation' | 'live'
    signature: string
    sdkKey: string
    numeroReunion: string
    motDePasse: string
    nomAffiche: string
    email: string
    role: 0 | 1
    sujet: string
    lienSecours: string | null
    ouverture: string
  }>('/api/zoom/signature', {
    method: 'POST',
    body: privee.value ? { demandeId: data.value!.demande!.id } : { sessionId: data.value!.session!.id },
  })
}

async function entrer() {
  erreurEntree.value = ''
  try {
    autorisation.value = await demanderAutorisation()
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreurEntree.value = r.data?.statusMessage ?? r.statusMessage ?? 'Entrée impossible pour le moment.'
    return
  }
  if (autorisation.value.mode === 'simulation') {
    zoom.etat.value = 'en-salle'
    return
  }
  await nextTick()
  if (racine.value) await zoom.rejoindre(racine.value, autorisation.value)
}

/** Où l'on repart en quittant la salle, et libellé du lien d'en-tête. */
const retour = computed(() => {
  if (props.espace === 'formateur') return privee.value ? '/formateur/coaching-prive' : '/formateur/sessions'
  if (privee.value) return '/mon-espace/coaching-prive'
  return data.value?.modulesCouverts[0] ? `/mon-espace/module/${data.value.modulesCouverts[0].slug}` : '/mon-espace/sessions'
})
const libelleRetour = computed(() => {
  if (props.espace === 'formateur') return privee.value ? '← Retour au coaching privé' : '← Retour aux sessions'
  return privee.value || !data.value?.modulesCouverts.length ? '← Retour à l’espace' : '← Retour au module'
})

async function quitter() {
  await zoom.quitter()
  await navigateTo(retour.value)
}

/** Contrôles simulés (mode simulation) : mêmes commandes que la salle Zoom. */
const micro = ref(true)
const camera = ref(false)
const main = ref(false)
const onglet = ref<'chat' | 'participants'>('chat')
const chat = ref<{ auteur: string; texte: string }[]>([])
const saisie = ref('')
const auth = useAuthStore()
function envoyerChat() {
  if (!saisie.value.trim()) return
  chat.value.push({ auteur: `${auth.utilisateur?.prenom ?? ''} ${auth.utilisateur?.nom?.[0] ?? ''}.`, texte: saisie.value.trim() })
  saisie.value = ''
}
</script>

<template>
  <div v-if="data" class="sur-sombre flex min-h-screen flex-col bg-encre text-white">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-encre-800 px-4 py-3 lg:px-6">
      <div class="min-w-0">
        <p class="truncate font-title text-[17px] font-light">{{ titre }}</p>
        <p class="text-[12.5px] text-[#8f8a9c]">
          {{ privee ? 'Coaching privé' : 'Coaching session' }} · {{ data.formateur?.nom }}
          <template v-if="!privee && data.modulesCouverts.length">
            · modules {{ data.modulesCouverts.map((m) => numeroModule(m.numero)).join(', ') }}
          </template>
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span
          class="rounded-full px-3 py-1.5 font-mono text-[12px] font-bold"
          :class="enDirect ? 'bg-[#3a1f22] text-[#ff6b6b]' : 'bg-encre-800 text-[#b9b4c4]'"
        >
          ● {{ enDirect ? 'EN DIRECT' : 'À VENIR' }} · {{ chrono }}
        </span>
        <NuxtLink :to="retour" class="hidden text-[13.5px] text-[#b9b4c4] hover:text-white lg:inline">{{ libelleRetour }}</NuxtLink>
      </div>
    </header>

    <!-- Avant l'entrée : vérification et bouton -->
    <div v-if="zoom.etat.value === 'inactif' || zoom.etat.value === 'erreur' || zoom.etat.value === 'termine'" class="grid flex-1 place-items-center p-6">
      <div class="w-full max-w-lg rounded-carte bg-encre-800 p-8 text-center">
        <p class="font-title text-[24px] font-light">{{ data.role === 'hote' ? 'Démarrer la session' : 'Rejoindre la session' }}</p>
        <p class="mt-3 text-[14px] text-[#b9b4c4]">
          <template v-if="data.salle.ouverte || data.role === 'hote'">
            La salle est ouverte. Micro et caméra vous seront demandés à l’entrée ; vous ne quittez pas la plateforme.
          </template>
          <template v-else>La salle ouvre 15 minutes avant le début, à {{ ouvertureLisible }}.</template>
        </p>
        <p v-if="erreurEntree" class="mt-3 text-[13.5px] text-[#ff6b6b]" role="alert">{{ erreurEntree }}</p>
        <p v-if="zoom.etat.value === 'erreur'" class="mt-3 text-[13.5px] text-[#ff6b6b]" role="alert">{{ zoom.message.value }}</p>
        <UiBaseButton class="mt-6" taille="lg" :disabled="!data.salle.ouverte && data.role !== 'hote'" @click="entrer">
          {{ data.role === 'hote' ? 'Démarrer la session' : 'Entrer dans la salle' }}
        </UiBaseButton>
        <p class="mt-6 text-[12.5px] text-[#8f8a9c]">
          Un problème de connexion ?
          <a v-if="autorisation?.lienSecours" :href="autorisation.lienSecours" target="_blank" rel="noopener" class="underline">Ouvrir dans l’application Zoom</a>
          <span v-else>Le lien « Ouvrir dans l’application Zoom » apparaît une fois l’entrée autorisée</span>
          (solution de secours uniquement).
        </p>
      </div>
    </div>

    <!-- Salle : Component View (desktop) rendue par le SDK, Client View plein écran sur mobile -->
    <div v-else class="grid flex-1 gap-4 p-4 lg:grid-cols-[1.6fr_1fr] lg:p-6">
      <div class="flex flex-col">
        <p v-if="zoom.etat.value === 'verification' || zoom.etat.value === 'connexion'" class="mb-3 text-[13px] text-[#b9b4c4]">
          {{ zoom.etat.value === 'verification' ? 'Vérification de la compatibilité et des autorisations micro / caméra…' : 'Connexion à la salle…' }}
          {{ zoom.message.value }}
        </p>
        <div ref="racine" class="relative min-h-[320px] w-full overflow-hidden rounded-carte bg-black" :class="autorisation?.mode === 'live' ? 'aspect-16/9' : ''">
          <!-- Salle simulée : mêmes repères que la maquette, sans flux Zoom. -->
          <div v-if="autorisation?.mode === 'simulation'" class="grid aspect-16/9 grid-cols-2 gap-2 p-2 sm:grid-cols-3">
            <div class="col-span-2 row-span-2 grid place-items-center rounded-[10px] bg-encre-800 text-[13.5px] text-[#b9b4c4] sm:col-span-2">
              <span>{{ data.formateur?.nom }} — formateur 🎙</span>
            </div>
            <div
              v-for="p in data.participants.slice(0, 4)"
              :key="p.id"
              class="grid place-items-center rounded-[10px] bg-encre-800 text-[12.5px] text-[#b9b4c4]"
            >
              {{ p.nom }}<span v-if="p.id === auth.utilisateur?.id && main"> ✋</span>
            </div>
            <div v-if="data.participants.length > 4" class="grid place-items-center rounded-[10px] bg-encre-800 text-[12.5px] text-[#b9b4c4]">
              + {{ data.participants.length - 4 }}
            </div>
            <p class="absolute top-3 left-3 rounded bg-black/50 px-2 py-1 text-[11px] text-white/70">Salle simulée (ZOOM_MODE=simulation)</p>
          </div>
        </div>
        <!-- Barre de contrôles (simulation) ; en live, les contrôles sont ceux du SDK -->
        <div v-if="autorisation?.mode === 'simulation'" class="mt-3 flex flex-wrap items-center justify-center gap-2 text-[13px]">
          <button type="button" class="rounded-full bg-encre-800 px-3.5 py-2" :class="!micro && 'text-[#ff6b6b]'" @click="micro = !micro">🎙 Micro</button>
          <button type="button" class="rounded-full bg-encre-800 px-3.5 py-2" :class="!camera && 'text-[#8f8a9c]'" @click="camera = !camera">🎥 Caméra</button>
          <button v-if="data.role === 'hote'" type="button" class="rounded-full bg-encre-800 px-3.5 py-2">🖥 Partager</button>
          <button type="button" class="rounded-full bg-encre-800 px-3.5 py-2" :class="main && 'bg-social'" @click="main = !main">✋ Main levée</button>
          <button type="button" class="rounded-full bg-encre-800 px-3.5 py-2">😀 Réactions</button>
          <span class="rounded-full bg-encre-800 px-3.5 py-2">👥 {{ data.participants.length + 1 }}</span>
          <button type="button" class="rounded-full bg-[#c03434] px-3.5 py-2 font-bold" @click="quitter">Quitter</button>
        </div>
        <div v-else class="mt-3 text-center">
          <button type="button" class="rounded-full bg-[#c03434] px-3.5 py-2 text-[13px] font-bold" @click="quitter">Quitter</button>
        </div>
      </div>

      <aside class="flex flex-col rounded-carte bg-encre-800 p-4">
        <div role="tablist" class="flex gap-1 border-b border-encre">
          <button type="button" role="tab" :aria-selected="onglet === 'chat'" class="-mb-px border-b-2 px-3 py-2 text-[13.5px] font-bold" :class="onglet === 'chat' ? 'border-social text-white' : 'border-transparent text-[#8f8a9c]'" @click="onglet = 'chat'">Chat</button>
          <button type="button" role="tab" :aria-selected="onglet === 'participants'" class="-mb-px border-b-2 px-3 py-2 text-[13.5px] font-bold" :class="onglet === 'participants' ? 'border-social text-white' : 'border-transparent text-[#8f8a9c]'" @click="onglet = 'participants'">Participants</button>
        </div>
        <div v-if="onglet === 'chat'" class="mt-3 flex min-h-[160px] flex-1 flex-col">
          <ul class="flex-1 space-y-2 text-[13px]">
            <li v-for="(m, i) in chat" :key="i"><b class="text-white">{{ m.auteur }}</b> <span class="text-[#b9b4c4]">{{ m.texte }}</span></li>
            <li v-if="!chat.length" class="text-[#8f8a9c]">
              {{ autorisation?.mode === 'live' ? 'Le chat de la salle est celui de Zoom, dans la fenêtre de la réunion.' : 'Aucun message pour l’instant.' }}
            </li>
          </ul>
          <form v-if="autorisation?.mode === 'simulation'" class="mt-3 flex gap-2" @submit.prevent="envoyerChat">
            <input v-model="saisie" placeholder="Écrire un message…" class="min-w-0 flex-1 rounded-[8px] bg-encre px-3 py-2 text-[13px] text-white">
            <button type="submit" class="rounded-[8px] bg-social px-3 py-2 text-[13px] font-bold">Envoyer</button>
          </form>
        </div>
        <ul v-else class="mt-3 space-y-1.5 text-[13.5px] text-[#b9b4c4]">
          <li>{{ data.formateur?.nom }} — formateur 🎙</li>
          <li v-for="p in data.participants" :key="p.id">{{ p.nom }}</li>
        </ul>

        <h2 class="mt-6 font-title text-[16px] font-light">Ressources du module</h2>
        <ul v-if="data.ressources.length" class="mt-2 space-y-1.5 text-[13px]">
          <li v-for="r in data.ressources" :key="r.url">
            <a :href="r.url" target="_blank" rel="noopener" class="text-[#b9b4c4] underline hover:text-white">{{ r.titre }} ({{ r.format }})</a>
          </li>
        </ul>
        <p v-else class="mt-2 text-[12.5px] text-[#8f8a9c]">Aucune ressource jointe.</p>

        <p class="mt-6 text-[12px] text-[#8f8a9c]">
          Un problème de connexion ?
          <a v-if="autorisation?.lienSecours" :href="autorisation.lienSecours" target="_blank" rel="noopener" class="underline">Ouvrir dans l’application Zoom</a>
          (solution de secours uniquement).
        </p>
      </aside>
    </div>
  </div>
</template>
