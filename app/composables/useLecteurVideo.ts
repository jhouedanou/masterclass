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
  /** Vrai quand l'erreur courante se lève en redemandant une autorisation —
   *  c'est-à-dire seulement quand la précédente a expiré. Toute autre erreur
   *  est définitive : la renouveler ne ferait que rejouer le même refus. */
  const erreurRenouvelable = ref(false)
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

  /**
   * Message d'un refus définitif du diffuseur, `null` si la requête mérite
   * d'être réessayée.
   *
   * Le Worker renvoie le motif en clair dans le corps de sa réponse
   * (« Lecture refusée — autorisation expirée »), ce qui permet de distinguer
   * l'autorisation périmée — l'onglet est resté ouvert au-delà des quatre
   * heures, et recharger suffit — d'une signature que le diffuseur n'accepte
   * pas, qui relève de l'équipe.
   */
  function motifRefus(code?: number, texte?: string): { message: string; renouvelable: boolean } | null {
    if (code === undefined) return null
    if (code === 404) {
      return {
        message: 'Cette vidéo est introuvable sur le serveur de diffusion. Signalez-le à l’équipe.',
        renouvelable: false,
      }
    }
    if (code !== 401 && code !== 403) return null
    if (texte?.includes('expirée')) {
      return { message: 'Autorisation de lecture expirée — renouvellement en cours…', renouvelable: true }
    }
    return {
      message:
        'Lecture refusée : votre autorisation n’a pas été acceptée. Rechargez la page ; si le refus persiste, signalez-le à l’équipe.',
      renouvelable: false,
    }
  }

  function charger() {
    const element = video.value
    const source = options.source()
    detruire()
    erreur.value = null
    erreurRenouvelable.value = false
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

        // Un refus du diffuseur se reconnaît avant tout le reste : il arrive
        // sous l'étiquette « erreur réseau », mais réessayer ne le lèvera
        // jamais. Sans ce tri, `startLoad()` relançait indéfiniment une requête
        // refusée, sans message ni arrêt du voyant de chargement.
        const refus = motifRefus(donnees.response?.code, donnees.response?.text)
        if (refus) {
          hls?.stopLoad()
          erreurRenouvelable.value = refus.renouvelable
          erreur.value = refus.message
          chargement.value = false
          return
        }

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
    erreurRenouvelable,
    positionSecondes,
    dureeSecondes,
    secondesVues,
    progression,
  }
}
