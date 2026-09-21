// `hls.js` pèse 640 ko et ne sert qu'aux chapitres diffusés en HLS. L'import
// statique le faisait charger avec la page de lecture même quand le chapitre
// est un MP4 unique, cas que `charger()` traite dix lignes plus haut sans lui.
// Le type seul est importé ici ; le module vient au moment où il sert.
import type HlsType from 'hls.js'

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
  /** Forme de la vidéo, donnée par le serveur. On ne la devine pas à
   *  l'extension de l'URL : celle-ci porte une chaîne de requête, et la règle
   *  deviendrait implicite le jour où elle changerait. */
  format: () => 'hls' | 'fichier' | null
  /** Appelé quand la vidéo arrive au bout. C'est le seul moment où l'on sait
   *  qu'un chapitre est fini, et donc qu'on peut proposer le suivant. */
  surFin?: () => void
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
  /** Niveau de qualité servi par le streaming adaptatif (« 480p »), affiché « Auto 480p ». */
  const qualite = ref<string | null>(null)
  /** Vitesse de lecture. Un ref, et non un réglage à sens unique : la barre de
   *  contrôles de la maquette l'affiche autant qu'elle la change. */
  const vitesse = ref(1)
  /** Suit l'état réel du plein écran : la touche Échap en sort sans passer par
   *  notre bouton, et un booléen basculé à la main mentirait alors. */
  const pleinEcran = ref(false)

  let hls: HlsType | null = null
  let dernierInstant = 0
  let secondesEnvoyees = 0
  /** Position à restaurer après un renouvellement d'autorisation : changer la
   *  source d'une balise vidéo remet le curseur à zéro. */
  let repriseApres: number | null = null
  let reprendreLecture = false

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

  /**
   * Recharge la source en gardant la place.
   *
   * Un fichier de sept cents mégaoctets se lit sur plus de quatre heures quand
   * l'apprenant fait des pauses ; passé ce délai l'autorisation périme et les
   * requêtes de plage suivantes échouent en plein visionnage. La page renouvelle
   * alors l'autorisation, et c'est ici qu'on évite de renvoyer l'apprenant au
   * début du chapitre.
   */
  function rechargerEnPlace() {
    repriseApres = video.value?.currentTime ?? 0
    reprendreLecture = Boolean(video.value && !video.value.paused)
    void charger()
  }

  async function charger() {
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

    // Un fichier unique se lit sans hls.js : la balise vidéo suffit, et le
    // diffuseur répond aux requêtes de plage pour permettre le déplacement.
    if (options.format() === 'fichier') {
      element.src = source
      return
    }

    const { default: Hls } = await import('hls.js')

    if (Hls.isSupported()) {
      hls = new Hls({ capLevelToPlayerSize: true, startLevel: -1 })
      hls.loadSource(source)
      hls.attachMedia(element)
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, donnees) => {
        const niveau = hls?.levels[donnees.level]
        if (niveau?.height) qualite.value = `${niveau.height}p`
      })
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

  /**
   * Erreur remontée par la balise vidéo elle-même, seule voie quand hls.js
   * n'est pas dans la boucle.
   *
   * `MediaError` ne porte aucun code HTTP : impossible d'y distinguer une
   * autorisation expirée d'un fichier absent. On redemande donc le premier
   * octet du fichier pour obtenir un vrai statut, et on réutilise le même tri
   * que la voie HLS — le renouvellement automatique continue alors de
   * fonctionner sans y toucher.
   */
  async function surErreurElement() {
    const source = options.source()
    if (!source || options.format() !== 'fichier') return

    chargement.value = false
    try {
      const reponse = await fetch(source, { headers: { Range: 'bytes=0-0' } })
      if (!reponse.ok) {
        const refus = motifRefus(reponse.status, await reponse.text())
        if (refus) {
          erreurRenouvelable.value = refus.renouvelable
          erreur.value = refus.message
          return
        }
      }
    } catch {
      erreur.value = 'La vidéo n’a pas pu être chargée. Vérifiez votre connexion.'
      return
    }

    // Le contrôle vient de réussir : le fichier est là et l'autorisation tient.
    // On en concluait que le navigateur ne savait pas décoder le format — et on
    // envoyait l'apprenant signaler un problème d'appareil pour une vidéo
    // parfaitement standard, alors que la requête précédente avait simplement
    // échoué en route (un 503 du diffuseur, une coupure, une plage refusée).
    //
    // Ce que le contrôle prouve, c'est l'inverse : au moment où il s'exécute,
    // tout va bien. L'échec était donc passager, et la bonne réponse est de
    // proposer une reprise plutôt que d'accuser l'appareil.
    //
    // Le codec n'est mis en cause que si le navigateur le dit lui-même —
    // `MEDIA_ERR_SRC_NOT_SUPPORTED` et `MEDIA_ERR_DECODE` sont les deux seuls
    // cas où il l'affirme.
    const code = video.value?.error?.code
    const formatEnCause =
      code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || code === MediaError.MEDIA_ERR_DECODE

    if (formatEnCause) {
      erreur.value =
        'Cette vidéo n’est pas lisible par votre navigateur — signalez-le à l’équipe en précisant votre appareil.'
      return
    }

    erreurRenouvelable.value = true
    erreur.value = 'La lecture s’est interrompue. Relancez-la : le fichier est bien en ligne.'
  }

  function brancher(element: HTMLVideoElement | null) {
    video.value = element
    if (element) void charger()
  }

  /**
   * Déplace le curseur, en restant à l'intérieur du chapitre.
   *
   * Le quart de seconde retranché n'est pas décoratif : un clic à l'extrême
   * droite du rail poserait `currentTime = duration`, ce que le navigateur
   * traite comme une fin de lecture — le chapitre se serait marqué terminé sur
   * un simple déplacement.
   */
  function allerA(secondes: number) {
    const element = video.value
    if (!element) return
    const duree = element.duration || dureeSecondes.value
    element.currentTime = duree ? Math.min(Math.max(0, secondes), duree - 0.25) : Math.max(0, secondes)
  }

  /** Déplacement relatif, pour les flèches du clavier. */
  function avancerDe(delta: number) {
    allerA(positionSecondes.value + delta)
  }

  /**
   * Lecture ou pause. On passe par la balise et rien d'autre : `play()` et
   * `pause()` émettent les évènements que `gestionnaires` écoute déjà, donc le
   * relevé de visionnage part sur pause exactement comme avec les contrôles
   * natifs.
   */
  function basculerLecture() {
    const element = video.value
    if (!element) return
    if (element.paused) void element.play().catch(() => undefined)
    else element.pause()
  }

  function surPleinEcran() {
    pleinEcran.value = Boolean(document.fullscreenElement)
  }

  /**
   * Plein écran sur la scène entière, pour que la barre de contrôles y suive.
   * Safari iOS refuse le plein écran sur autre chose que la balise vidéo : il
   * reprend alors ses propres contrôles, ce qui reste préférable à un bouton
   * sans effet.
   */
  function basculerPleinEcran(conteneur: HTMLElement | null) {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }
    if (conteneur?.requestFullscreen) {
      void conteneur.requestFullscreen().catch(() => undefined)
      return
    }
    const element = video.value as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
    element?.webkitEnterFullscreen?.()
  }

  onMounted(() => document.addEventListener('fullscreenchange', surPleinEcran))
  onBeforeUnmount(() => document.removeEventListener('fullscreenchange', surPleinEcran))

  watch(vitesse, (valeur) => {
    if (video.value) video.value.playbackRate = valeur
  })

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
      options.surFin?.()
    },
    onTimeupdate: surTemps,
    onLoadedmetadata: () => {
      chargement.value = false
      dureeSecondes.value = video.value?.duration ?? 0
      // Un MP4 n'a qu'une définition, et hls.js — seul à renseigner `qualite`
      // jusqu'ici — n'entre pas en jeu pour lui. Sans cette ligne, le lecteur
      // annonçait « Auto 480p » sur un fichier en 1080p, par un repli écrit en
      // dur dans les contrôles.
      if (options.format() === 'fichier' && video.value?.videoHeight) {
        qualite.value = `${video.value.videoHeight}p`
      }
      // Poser une nouvelle source remet `playbackRate` à 1 : sans cette ligne,
      // un renouvellement d'autorisation ramenait la vidéo en 1× alors que la
      // barre affichait toujours 1.25×.
      if (video.value) video.value.playbackRate = vitesse.value
      // Renouvellement d'autorisation en cours de lecture : on reprend là où
      // l'apprenant en était, et on ne redémarre que si la vidéo tournait.
      if (repriseApres !== null && video.value) {
        video.value.currentTime = repriseApres
        if (reprendreLecture) void video.value.play().catch(() => undefined)
        repriseApres = null
        reprendreLecture = false
      }
    },
    onError: surErreurElement,
  }

  onBeforeUnmount(() => {
    void envoyerVisionnage()
    detruire()
  })

  return {
    brancher,
    charger,
    rechargerEnPlace,
    allerA,
    avancerDe,
    basculerLecture,
    basculerPleinEcran,
    pleinEcran,
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
    qualite,
  }
}
