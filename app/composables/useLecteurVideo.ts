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
 * Le temps visionné se compte en secondes de film vues, pas en secondes
 * passées devant l'écran : on additionne ce dont le curseur avance pendant la
 * lecture, et un saut — clavier, rail, ou simple reprise plus loin — n'y ajoute
 * rien. C'est ce qui permet à la progression du module de refléter un
 * visionnage réel.
 *
 * Le compter à la montre paraissait revenir au même. Il n'en est rien dès que
 * la vitesse quitte 1× : une heure de cours vue à 2× ne prend qu'une demi-heure
 * de montre, et se voyait donc créditée de moitié. La barre propose jusqu'à 2×,
 * si bien que le réglage pénalisait en silence celui qui s'en servait — et que
 * les cent pour cent devenaient inatteignables.
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
  /** Secondes déjà créditées par le serveur pour le chapitre qui se charge.
   *  Sans elle, une reprise repart de zéro — voir `creditAcquis`. */
  dejaVues?: () => number
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
  /**
   * Définitions réellement proposées par le flux, de la plus basse à la plus
   * haute. Vide hors HLS — un fichier unique n'en offre qu'une — et vide aussi
   * sur la lecture native de Safari, qui choisit seule et n'expose rien.
   * C'est ce qui permet à la barre de ne montrer un choix que là où il existe.
   */
  const niveaux = ref<{ index: number; hauteur: number }[]>([])
  /** Définition imposée par l'apprenant, `-1` tant qu'il laisse faire. */
  const niveauChoisi = ref(-1)
  /** Vitesse de lecture. Un ref, et non un réglage à sens unique : la barre de
   *  contrôles de la maquette l'affiche autant qu'elle la change. */
  const vitesse = ref(1)
  /**
   * Volume et coupure du son.
   *
   * La barre de contrôles remplace les contrôles natifs dès qu'on est sur un
   * écran large avec une souris : sans ces deux-là, il n'y avait plus aucun
   * moyen de baisser le son sans passer par le système.
   *
   * Le réglage se retient d'un chapitre à l'autre et d'une session à l'autre —
   * personne ne veut remettre le volume à chaque vidéo. Il vit dans le
   * navigateur de l'apprenant, pas en base : c'est une commodité, pas une
   * donnée.
   */
  const CLE_VOLUME = 'emc-volume'
  const volume = ref(1)
  const muet = ref(false)
  /** Suit l'état réel du plein écran : la touche Échap en sort sans passer par
   *  notre bouton, et un booléen basculé à la main mentirait alors. */
  const pleinEcran = ref(false)
  /**
   * Vrai quand le navigateur a refusé une lecture que nous avions demandée.
   *
   * Cela arrive : onglet passé en arrière-plan, interaction trop ancienne,
   * réglage d'économie d'énergie. Sans ce témoin, l'apprenant se retrouvait
   * devant une image figée après un enchaînement, sans rien à cliquer — la
   * promesse rejetée était avalée par un `catch` muet.
   */
  const lectureRefusee = ref(false)

  let hls: HlsType | null = null
  /** Dernière position *du média* retenue pour le décompte, `null` tant qu'il
   *  n'y a rien à comparer — à l'arrêt, pendant un déplacement, au chargement. */
  let dernierePosition: number | null = null
  let secondesEnvoyees = 0
  /**
   * Secondes déjà créditées pour ce chapitre avant que la séance ne commence.
   *
   * Le relevé est un *total* de chapitre, pas un compte de séance : la base ne
   * retient que la plus grande valeur reçue (`greatest`). Envoyer les seules
   * secondes de la séance rendait donc toute reprise stérile — un chapitre de
   * 13 minutes vu en deux fois, 9 minutes puis 4, restait crédité de 9 : la
   * seconde séance, plus courte que la première, n'écrasait rien.
   *
   * Il ne peut que baisser, jamais monter : un déplacement en arrière le
   * ramène au point visé, faute de quoi revoir le début d'un chapitre
   * gonflerait un total déjà acquis. Le `greatest` du serveur protège de cette
   * baisse — elle ne fait pas reculer ce qui est enregistré.
   */
  const creditAcquis = ref(0)
  /** Point le plus avancé atteint dans le chapitre depuis son chargement. */
  const positionMax = ref(0)
  /** Position à restaurer après un renouvellement d'autorisation : changer la
   *  source d'une balise vidéo remet le curseur à zéro. */
  let repriseApres: number | null = null
  let reprendreLecture = false
  /** Lecture demandée pour la source qui arrive — enchaînement, ou choix dans
   *  le sommaire. Distincte de `reprendreLecture`, qui ne sert qu'au
   *  renouvellement d'autorisation : confondre les deux ferait repartir une
   *  vidéo que l'apprenant avait mise en pause avant l'expiration. */
  let lectureDemandee = false
  /**
   * Chapitre auquel se rapporte le cumul courant.
   *
   * `options.position()` ne peut pas servir au moment de l'envoi : `charger()`
   * est déclenché par un veilleur qui s'exécute *après* le changement d'index,
   * si bien que le vidage du compteur porterait les secondes du chapitre qu'on
   * quitte au crédit de celui qu'on ouvre.
   */
  let positionRelevee: number | null = null

  /** Toutes les dix secondes vues : assez fréquent pour ne rien perdre d'une
   *  session interrompue, assez rare pour ne pas inonder le serveur. */
  const PAS_ENVOI_SECONDES = 10

  /**
   * Relevés enchaînés plutôt que menés de front.
   *
   * Une vidéo qui va au bout tire `pause` puis `ended` dans la même bouffée,
   * et chacun déclenche un relevé. Lancés ensemble, le second trouvait le
   * compteur déjà réservé par le premier et repartait aussitôt, sans attendre
   * sa réponse : `progression` gardait la valeur d'avant la fin du chapitre,
   * juste à l'instant où la page s'en sert pour décider si le module est
   * bouclé. Enchaînés, le second attend — et n'a le plus souvent plus rien à
   * envoyer, ce qui est exactement ce qu'on veut de lui.
   */
  let fileEnvois: Promise<void> = Promise.resolve()

  function envoyerVisionnage(): Promise<void> {
    // `relever` ne rejette jamais : la chaîne ne peut pas se rompre.
    fileEnvois = fileEnvois.then(relever)
    return fileEnvois
  }

  async function relever() {
    const aEnvoyer = Math.floor(secondesCumulees.value)
    if (aEnvoyer <= secondesEnvoyees) return
    secondesEnvoyees = aEnvoyer

    try {
      const reponse = await $fetch<{ progression: number }>('/api/mon-espace/visionnage', {
        method: 'POST',
        body: {
          moduleId: options.moduleId(),
          position: positionRelevee ?? options.position(),
          secondesVues: aEnvoyer,
        },
      })
      progression.value = reponse.progression
    } catch {
      // Un relevé perdu n'est pas un incident : le cumul est renvoyé au
      // prochain envoi, et la base ne retient que la plus grande valeur.
      secondesEnvoyees = 0
    }
  }

  /**
   * Total vu du chapitre en cours : le crédit déjà acquis plus la séance.
   *
   * C'est ce que le relevé envoie, et donc ce que l'écran doit montrer.
   * `secondesVues` seul ferait retomber la pastille d'un chapitre repris au
   * niveau de la seule séance en cours, alors que le serveur en sait plus.
   *
   * Le total est borné par le point le plus avancé atteint : on ne peut pas
   * avoir vu plus de secondes distinctes que le curseur n'a parcouru de
   * chapitre. C'est ce qui empêche le crédit acquis de s'ajouter à des
   * secondes qui le recouvrent — rouvrir depuis le sommaire un chapitre vu à
   * moitié le fait repartir de zéro, et sans cette borne les quatre premières
   * minutes auraient été comptées deux fois.
   */
  const secondesCumulees = computed(() =>
    Math.min(creditAcquis.value + secondesVues.value, positionMax.value),
  )

  function surTemps() {
    const element = video.value
    if (!element) return

    const position = element.currentTime
    positionSecondes.value = position
    if (position > positionMax.value) positionMax.value = position

    if (!element.paused && !element.seeking) {
      if (dernierePosition !== null) {
        const avance = position - dernierePosition
        // Le plafond est exprimé en secondes de montre, converties en secondes
        // de média : à 2×, deux secondes écoulées font quatre secondes de film,
        // et un plafond fixe aurait rejeté du visionnage parfaitement réel.
        // Il reste sous les cinq secondes du saut clavier (`avancerDe`), qui
        // doit continuer d'être refusé.
        const plafond = 2 * (element.playbackRate || 1)
        if (avance > 0 && avance < plafond) secondesVues.value += avance
      }
      dernierePosition = position
    } else {
      dernierePosition = null
    }

    // Comparé au même étalon que `secondesEnvoyees`, qui retient un total de
    // chapitre : mesurer le pas sur la seule séance retarderait tous les
    // relevés d'une reprise du montant déjà acquis.
    if (Math.floor(secondesCumulees.value) >= secondesEnvoyees + PAS_ENVOI_SECONDES) {
      void envoyerVisionnage()
    }
  }

  /**
   * Lance la lecture en traitant le refus plutôt qu'en l'avalant.
   *
   * Toutes les relances passent par ici : l'enchaînement, le choix d'un
   * chapitre, la reprise après renouvellement d'autorisation.
   */
  async function lancerLecture() {
    const element = video.value
    if (!element) return
    try {
      await element.play()
      lectureRefusee.value = false
    } catch {
      // Un refus n'est pas une erreur de chargement : la vidéo est là, c'est
      // le navigateur qui exige un geste. On le dit, la page offre le bouton.
      lectureRefusee.value = true
    }
  }

  /** Demande que la prochaine source démarre d'elle-même. Posé par l'appelant,
   *  jamais déduit : un chapitre ouvert depuis la page module ne doit pas
   *  partir tout seul, celui qui suit un enchaînement doit. */
  function lireDesQuePret() {
    lectureDemandee = true
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
    // Ce qui a été vu depuis le dernier envoi part maintenant : les compteurs
    // sont remis à zéro trois lignes plus bas, et jusqu'ici un changement de
    // chapitre en pleine lecture emportait avec lui jusqu'à dix secondes de
    // visionnage — plus l'enchaînement marchait, plus il rognait la
    // progression qu'il est censé faire avancer.
    await envoyerVisionnage()
    detruire()
    erreur.value = null
    lectureRefusee.value = false
    erreurRenouvelable.value = false
    positionSecondes.value = 0
    positionMax.value = 0
    secondesVues.value = 0
    creditAcquis.value = Math.max(0, Math.round(options.dejaVues?.() ?? 0))
    // Le crédit acquis est déjà chez le serveur : le tenir pour envoyé évite
    // un premier relevé qui ne lui apprendrait rien.
    secondesEnvoyees = creditAcquis.value
    dernierePosition = null
    niveaux.value = []
    niveauChoisi.value = -1
    qualite.value = null
    // Désormais le cumul se rapporte au chapitre qu'on ouvre.
    positionRelevee = options.position()

    if (!element || !source) {
      // La demande meurt avec le chargement qu'elle visait. La laisser vivre
      // ferait partir tout seul un chargement ultérieur que personne n'a
      // demandé — au retour d'une autorisation, par exemple.
      lectureDemandee = false
      return
    }
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
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Une définition par hauteur : un flux peut porter deux variantes de
        // même taille à des débits différents, et proposer « 720p » deux fois
        // dans la barre n'aurait aucun sens pour l'apprenant.
        const parHauteur = new Map<number, number>()
        hls?.levels.forEach((niveau, index) => {
          if (niveau.height && !parHauteur.has(niveau.height)) parHauteur.set(niveau.height, index)
        })
        niveaux.value = [...parHauteur.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([hauteur, index]) => ({ index, hauteur }))
      })
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

  /**
   * Impose une définition, ou rend la main au choix automatique avec `-1`.
   *
   * `capLevelToPlayerSize` borne le mode automatique à ce que la fenêtre peut
   * afficher — c'est ce qui évite qu'un téléphone tire du 1080p. Le choix
   * manuel passe outre : `currentLevel` court-circuite la sélection
   * automatique, et donc le plafond avec elle. C'est voulu — un réglage qui
   * n'obéit pas en fenêtre réduite ne se comprendrait pas.
   */
  function choisirNiveau(index: number) {
    if (!hls) return
    niveauChoisi.value = index
    hls.currentLevel = index
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
    const cible = duree ? Math.min(Math.max(0, secondes), duree - 0.25) : Math.max(0, secondes)
    element.currentTime = cible
    // Revenir en arrière rend une partie du crédit acquis : sans cela, revoir
    // les trois premières minutes d'un chapitre à moitié vu les ajouterait à
    // un total qui les comptait déjà. Le crédit ne remonte pas quand on saute
    // en avant — un passage non regardé n'a pas à être payé.
    creditAcquis.value = Math.min(creditAcquis.value, Math.floor(cible))
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
    if (element.paused) void lancerLecture()
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

  /** Le volume se réapplique à chaque nouvelle source : poser un `src` remet la
   *  balise à ses valeurs par défaut, comme pour `playbackRate`. */
  function appliquerVolume() {
    if (!video.value) return
    video.value.volume = volume.value
    video.value.muted = muet.value
  }

  watch([volume, muet], () => {
    appliquerVolume()
    try {
      localStorage.setItem(CLE_VOLUME, JSON.stringify({ volume: volume.value, muet: muet.value }))
    } catch {
      /* stockage indisponible : le réglage ne vaut que pour cette session */
    }
  })

  onMounted(() => {
    try {
      const garde = JSON.parse(localStorage.getItem(CLE_VOLUME) ?? 'null')
      if (garde && typeof garde.volume === 'number') {
        volume.value = Math.min(1, Math.max(0, garde.volume))
        muet.value = Boolean(garde.muet)
      }
    } catch {
      /* réglage illisible : on reste au volume plein */
    }
  })

  /** Le son coupé se rallume à un volume audible : rallumer à zéro donnerait
   *  un bouton qui ne fait rien. */
  function basculerMuet() {
    if (!muet.value && volume.value === 0) return
    muet.value = !muet.value
    if (!muet.value && volume.value === 0) volume.value = 0.5
  }

  const gestionnaires = {
    onPlay: () => {
      enLecture.value = true
      // Le point de départ est pris ici, et non au premier `timeupdate` : celui-ci
      // arrive un quart de seconde plus tard, qui serait perdu à chaque reprise.
      dernierePosition = video.value?.currentTime ?? null
    },
    onPause: () => {
      enLecture.value = false
      dernierePosition = null
      void envoyerVisionnage()
    },
    onEnded: async () => {
      enLecture.value = false
      // Le relevé part *avant* de prévenir la page, et on l'attend : c'est lui
      // qui rend `progression` juste. La page s'en sert pour savoir si le
      // module est bouclé, et la réponse arrivait après sa décision — le
      // dernier chapitre se terminait donc toujours sur la progression d'avant.
      await envoyerVisionnage()
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
      appliquerVolume()
      // Renouvellement d'autorisation en cours de lecture : on reprend là où
      // l'apprenant en était, et on ne redémarre que si la vidéo tournait.
      if (repriseApres !== null && video.value) {
        video.value.currentTime = repriseApres
        if (reprendreLecture) void lancerLecture()
        repriseApres = null
        reprendreLecture = false
        // La reprise a tranché pour cette source : elle rejoue si la vidéo
        // tournait, et pas autrement. Une demande d'enchaînement encore en
        // attente n'a plus d'objet, et survivrait jusqu'au chargement suivant.
        lectureDemandee = false
      } else if (lectureDemandee) {
        // L'enchaînement s'arrêtait ici : le chapitre suivant se chargeait puis
        // restait en pause, après un décompte qui venait d'annoncer « Lecture
        // dans 1 seconde ». Rien ne relançait la balise.
        lectureDemandee = false
        void lancerLecture()
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
    volume,
    muet,
    basculerMuet,
    gestionnaires,
    enLecture,
    chargement,
    erreur,
    erreurRenouvelable,
    positionSecondes,
    dureeSecondes,
    secondesVues,
    secondesCumulees,
    progression,
    qualite,
    niveaux,
    niveauChoisi,
    choisirNiveau,
    lireDesQuePret,
    lancerLecture,
    lectureRefusee,
  }
}
