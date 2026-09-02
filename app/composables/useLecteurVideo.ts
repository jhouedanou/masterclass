import Hls from 'hls.js'

/**
 * Lecteur HLS et relevé du temps réellement visionné.
 *
 * Deux chemins de lecture cohabitent, sans que la page ait à s'en soucier :
 * hls.js sur la plupart des navigateurs, et la lecture native de Safari sur
 * iPhone, qui n'expose pas les extensions de média nécessaires à hls.js.
 * Les manifestes étant déjà réécrits par le diffuseur, les deux reçoivent des
 * URL autorisées sans traitement particulier.
 *
 * Le temps visionné se compte à la montre, pas au curseur : on additionne le
 * temps écoulé pendant la lecture, et une avance rapide n'y ajoute rien. C'est
 * ce qui permet à la progression du module de refléter un visionnage réel.
 */
export function useLecteurVideo(options: {
  moduleId: () => string
  position: () => number
  source: () => string | null
}) {
  const video = ref<HTMLVideoElement | null>(null)
  const enLecture = ref(false)
  const chargement = ref(false)
  const erreur = ref<string | null>(null)
  const positionSecondes = ref(0)
  const dureeSecondes = ref(0)
  const secondesVues = ref(0)
  const progression = ref<number | null>(null)

  let hls: Hls | null = null
  let dernierInstant = 0
  let secondesEnvoyees = 0

  /** Toutes les dix secondes vues : assez fréquent pour ne rien perdre d'une
   *  session interrompue, assez rare pour ne pas inonder le serveur. */
  const PAS_ENVOI_SECONDES = 10

  async function envoyerVisionnage() {
    const aEnvoyer = Math.floor(secondesVues.value)
    if (aEnvoyer <= secondesEnvoyees) return
    secondesEnvoyees = aEnvoyer

    try {
      const reponse = await $fetch<{ progression: number }>('/api/mon-espace/visionnage', {
        method: 'POST',
        body: { moduleId: options.moduleId(), position: options.position(), secondesVues: aEnvoyer },
      })
      progression.value = reponse.progression
    } catch {
      // Un relevé perdu n'est pas un incident : le cumul est renvoyé au
      // prochain envoi, et la base ne retient que la plus grande valeur.
      secondesEnvoyees = 0
    }
  }

  function surTemps() {
    const element = video.value
    if (!element) return

    positionSecondes.value = element.currentTime
    if (!element.paused && !element.seeking) {
      const maintenant = performance.now()
      if (dernierInstant) {
        const ecoule = (maintenant - dernierInstant) / 1000
        // Un écart aberrant signale un onglet mis en veille, pas du visionnage.
        if (ecoule > 0 && ecoule < 2) secondesVues.value += ecoule
      }
      dernierInstant = maintenant
    } else {
      dernierInstant = 0
    }

    if (Math.floor(secondesVues.value) >= secondesEnvoyees + PAS_ENVOI_SECONDES) {
      void envoyerVisionnage()
    }
  }

  function detruire() {
    hls?.destroy()
    hls = null
  }

  function charger() {
    const element = video.value
    const source = options.source()
    detruire()
    erreur.value = null
    positionSecondes.value = 0
    secondesVues.value = 0
    secondesEnvoyees = 0
    dernierInstant = 0

    if (!element || !source) return
    chargement.value = true

    if (Hls.isSupported()) {
      hls = new Hls({ capLevelToPlayerSize: true, startLevel: -1 })
      hls.loadSource(source)
      hls.attachMedia(element)
      hls.on(Hls.Events.ERROR, (_, donnees) => {
        if (!donnees.fatal) return
        // Une coupure réseau se rattrape ; le reste est définitif.
        if (donnees.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad()
        else if (donnees.type === Hls.ErrorTypes.MEDIA_ERROR) hls?.recoverMediaError()
        else {
          erreur.value = 'La vidéo n’a pas pu être chargée. Rechargez la page pour réessayer.'
          chargement.value = false
        }
      })
    } else if (element.canPlayType('application/vnd.apple.mpegurl')) {
      element.src = source
    } else {
      erreur.value = 'Ce navigateur ne sait pas lire ce format. Essayez Chrome, Firefox ou Safari à jour.'
      chargement.value = false
    }
  }

  function brancher(element: HTMLVideoElement | null) {
    video.value = element
    if (element) charger()
  }

  function allerA(secondes: number) {
    if (video.value) video.value.currentTime = secondes
  }

  function vitesse(valeur: number) {
    if (video.value) video.value.playbackRate = valeur
  }

  const gestionnaires = {
    onPlay: () => {
      enLecture.value = true
      dernierInstant = performance.now()
    },
    onPause: () => {
      enLecture.value = false
      dernierInstant = 0
      void envoyerVisionnage()
    },
    onEnded: () => {
      enLecture.value = false
      void envoyerVisionnage()
    },
    onTimeupdate: surTemps,
    onLoadedmetadata: () => {
      chargement.value = false
      dureeSecondes.value = video.value?.duration ?? 0
    },
  }

  onBeforeUnmount(() => {
    void envoyerVisionnage()
    detruire()
  })

  return {
    brancher,
    charger,
    allerA,
    vitesse,
    gestionnaires,
    enLecture,
    chargement,
    erreur,
    positionSecondes,
    dureeSecondes,
    secondesVues,
    progression,
  }
}
