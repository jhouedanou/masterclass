/**
 * Dépôt d'une vidéo de chapitre, du navigateur vers le diffuseur.
 *
 * Le fichier ne passe jamais par l'application : il part en parts de seize
 * mégaoctets directement vers le stockage, seul chemin possible quand une
 * requête applicative plafonne à quatre mégaoctets et demi. L'application ne
 * voit que le plan de contrôle — ouvrir, relever, finaliser.
 *
 * Deux choix méritent d'être dits.
 *
 * `XMLHttpRequest` plutôt que `fetch` pour pousser les parts : `fetch` n'expose
 * aucune progression à l'émission, et les contournements par flux sont réservés
 * à un navigateur. Sur sept cents mégaoctets, une barre qui ne bouge qu'à
 * chaque part terminée — toutes les quarante à cent vingt secondes selon le
 * lien — est indiscernable d'une panne.
 *
 * Trois parts en vol, pas davantage : au-delà, un lien montant ouest-africain
 * sature, le débit total ne monte plus et chaque coupure coûte trois fois plus
 * de re-téléversement.
 */

interface Part {
  n: number
  etag: string
}

interface MemoireLocale {
  cle: string
  uploadId: string
  taillePart: number
  nbParts: number
  parts: Part[]
  urlPart: string
  fichier: { nom: string; taille: number; modifieLe: number }
}

const PARALLELISME = 3
const REPRISES_PAR_PART = 5
const DELAI_SANS_PROGRESSION = 120_000
const TAILLE_MAXIMALE = 2 * 1024 * 1024 * 1024
const TAILLE_MINIMALE = 1024 * 1024
/** Le miroir serveur ne part pas à chaque part : toutes les quatre suffit à
 *  rendre une reprise possible sans multiplier les allers-retours. */
const PARTS_ENTRE_DEUX_RELEVES = 4

export type EtatDepot = 'inactif' | 'controle' | 'envoi' | 'finalisation' | 'termine' | 'erreur'

export function useTeleversementVideo() {
  const etat = ref<EtatDepot>('inactif')
  const progression = ref(0)
  const debitKoS = ref(0)
  const resteSecondes = ref<number | null>(null)
  const erreur = ref('')
  const nomFichier = ref('')
  const repriseDisponible = ref<MemoireLocale | null>(null)

  let annule = false
  const enVol = new Set<XMLHttpRequest>()

  const memoire = (chapitreId: string) => `emc-televersement-${chapitreId}`

  function lireMemoire(chapitreId: string): MemoireLocale | null {
    try {
      const brut = localStorage.getItem(memoire(chapitreId))
      return brut ? (JSON.parse(brut) as MemoireLocale) : null
    } catch {
      // Navigation privée, stockage refusé : la reprise passe alors par le
      // miroir serveur, elle n'est pas perdue.
      return null
    }
  }

  function ecrireMemoire(chapitreId: string, valeur: MemoireLocale | null) {
    try {
      if (valeur) localStorage.setItem(memoire(chapitreId), JSON.stringify(valeur))
      else localStorage.removeItem(memoire(chapitreId))
    } catch {
      // Sans mémoire locale, le dépôt fonctionne quand même.
    }
  }

  /**
   * Les quatre octets qui suivent la taille de la première boîte disent
   * « ftyp » sur un MP4. Ni l'extension ni le type déclaré ne prouvent rien.
   */
  async function estUnMp4(fichier: File): Promise<boolean> {
    const entete = new Uint8Array(await fichier.slice(4, 8).arrayBuffer())
    return String.fromCharCode(...entete) === 'ftyp'
  }

  /**
   * « Optimisé pour le web » veut dire une chose précise : la table des
   * matières du fichier — la boîte `moov` — est placée en tête. Derrière les
   * données, le navigateur doit tout télécharger avant la première image, et
   * se déplacer dans la vidéo devient impossible. C'est la case « Web
   * Optimized » de HandBrake, et rien ne la signale après coup.
   */
  async function moovEnTete(fichier: File): Promise<boolean> {
    const tete = new DataView(await fichier.slice(0, 1024 * 1024).arrayBuffer())
    let position = 0
    while (position + 8 <= tete.byteLength) {
      const taille = tete.getUint32(position)
      const type = String.fromCharCode(
        tete.getUint8(position + 4),
        tete.getUint8(position + 5),
        tete.getUint8(position + 6),
        tete.getUint8(position + 7),
      )
      if (type === 'moov') return true
      if (type === 'mdat') return false
      // Une boîte de taille nulle ou étendue : on ne sait plus avancer, et
      // refuser sur un doute serait pire que de laisser passer.
      if (taille < 8) return true
      position += taille
    }
    // La table n'est pas dans le premier méga-octet : elle est donc derrière.
    return false
  }

  /**
   * Durée mesurée par le navigateur, faute de pouvoir la lire côté serveur.
   *
   * Sur un MP4 en flux, `duration` vaut souvent `Infinity` tant qu'on n'a pas
   * cherché loin dans le fichier. Le contournement consiste à demander une
   * position absurde, attendre que la durée se corrige, puis revenir.
   */
  function mesurerDuree(fichier: File): Promise<number> {
    return new Promise((resoudre, rejeter) => {
      const url = URL.createObjectURL(fichier)
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true

      const terminer = (issue: () => void) => {
        URL.revokeObjectURL(url)
        video.remove()
        issue()
      }

      video.onloadedmetadata = () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          const duree = video.duration
          terminer(() => resoudre(duree))
          return
        }
        video.ondurationchange = () => {
          if (Number.isFinite(video.duration) && video.duration > 0) {
            const duree = video.duration
            video.ondurationchange = null
            terminer(() => resoudre(duree))
          }
        }
        video.currentTime = 1e101
      }

      // Le contrôle le plus utile de la chaîne : si le navigateur de la
      // personne qui dépose ne décode pas ce fichier, aucun apprenant ne le
      // lira. Autant le découvrir avant sept cents mégaoctets.
      video.onerror = () =>
        terminer(() =>
          rejeter(
            new Error(
              'Ce fichier n’est pas lisible par votre navigateur : réexportez-le en MP4 (H.264 / AAC).',
            ),
          ),
        )

      video.src = url
    })
  }

  function pousserPart(
    url: string,
    numero: number,
    morceau: Blob,
    surOctets: (octets: number) => void,
  ): Promise<Part> {
    return new Promise((resoudre, rejeter) => {
      const xhr = new XMLHttpRequest()
      enVol.add(xhr)
      xhr.open('PUT', `${url}&n=${numero}`)
      xhr.timeout = DELAI_SANS_PROGRESSION
      xhr.responseType = 'json'
      xhr.setRequestHeader('content-type', 'application/octet-stream')

      let precedent = 0
      xhr.upload.onprogress = (e) => {
        surOctets(e.loaded - precedent)
        precedent = e.loaded
      }
      xhr.onload = () => {
        enVol.delete(xhr)
        if (xhr.status >= 200 && xhr.status < 300) {
          // L'étiquette est lue dans le corps plutôt que dans l'en-tête : sans
          // `ETag` exposé par le partage entre origines, l'en-tête revient
          // vide et la finalisation devient impossible sans que rien ne le
          // signale.
          const reponse = xhr.response as { etag?: string } | null
          if (reponse?.etag) resoudre({ n: numero, etag: reponse.etag })
          else rejeter(new Error('Étiquette de part absente'))
        } else {
          const details = (xhr.response as { erreur?: string } | null)?.erreur
          rejeter(Object.assign(new Error(details ?? `Part ${numero} refusée`), { statut: xhr.status }))
        }
      }
      xhr.onerror = () => {
        enVol.delete(xhr)
        rejeter(new Error('Coupure réseau'))
      }
      xhr.ontimeout = () => {
        enVol.delete(xhr)
        rejeter(new Error('Aucune progression depuis deux minutes'))
      }
      xhr.onabort = () => {
        enVol.delete(xhr)
        rejeter(Object.assign(new Error('Interrompu'), { interrompu: true }))
      }
      xhr.send(morceau)
    })
  }

  const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms))

  async function deposer(chapitreId: string, moduleId: string, fichier: File) {
    annule = false
    erreur.value = ''
    progression.value = 0
    nomFichier.value = fichier.name
    etat.value = 'controle'

    try {
      if (fichier.size < TAILLE_MINIMALE) throw new Error('Fichier vide ou trop petit.')
      if (fichier.size > TAILLE_MAXIMALE) {
        throw new Error('Fichier au-delà de 2 Go : réexportez-le dans une qualité plus raisonnable.')
      }
      if (!(await estUnMp4(fichier))) {
        throw new Error('Ce fichier n’est pas un MP4, quelle que soit son extension.')
      }
      if (!(await moovEnTete(fichier))) {
        throw new Error(
          'Cette vidéo n’est pas optimisée pour le web : dans HandBrake, cochez « Web Optimized » et réexportez. Sans cela, l’apprenant doit télécharger tout le fichier avant la première image.',
        )
      }
      const dureeSecondes = await mesurerDuree(fichier)

      const ouverture = await $fetch<{
        cle: string
        uploadId: string
        taillePart: number
        nbParts: number
        urlPart: string
      }>('/api/admin/video/ouvrir', {
        method: 'POST',
        body: { chapitreId, moduleId, nomFichier: fichier.name, tailleOctets: fichier.size, dureeSecondes },
      })

      const memo: MemoireLocale = {
        ...ouverture,
        parts: [],
        fichier: { nom: fichier.name, taille: fichier.size, modifieLe: fichier.lastModified },
      }
      ecrireMemoire(chapitreId, memo)
      await envoyer(chapitreId, fichier, memo)
    } catch (e) {
      if (!annule) {
        etat.value = 'erreur'
        erreur.value = messageDErreur(e)
      }
    }
  }

  async function reprendre(chapitreId: string, fichier: File) {
    const memo = repriseDisponible.value
    if (!memo) return
    // Un fichier différent portant le même nom produirait un MP4 corrompu,
    // indétectable jusqu'à la lecture : les trois repères doivent concorder.
    if (
      memo.fichier.nom !== fichier.name ||
      memo.fichier.taille !== fichier.size ||
      memo.fichier.modifieLe !== fichier.lastModified
    ) {
      etat.value = 'erreur'
      erreur.value = `Ce n’est pas le même fichier : sélectionnez « ${memo.fichier.nom} » pour reprendre, ou annulez le téléversement.`
      return
    }
    annule = false
    erreur.value = ''
    nomFichier.value = fichier.name
    await envoyer(chapitreId, fichier, memo).catch((e) => {
      if (!annule) {
        etat.value = 'erreur'
        erreur.value = messageDErreur(e)
      }
    })
  }

  async function envoyer(chapitreId: string, fichier: File, memo: MemoireLocale) {
    etat.value = 'envoi'
    const faites = new Map(memo.parts.map((p) => [p.n, p]))
    let octetsEnvoyes = faites.size * memo.taillePart
    const depart = Date.now()
    let url = memo.urlPart

    const majProgression = (octets: number) => {
      octetsEnvoyes += octets
      progression.value = Math.min(99, Math.round((octetsEnvoyes / fichier.size) * 100))
      const ecoule = (Date.now() - depart) / 1000
      if (ecoule > 1) {
        debitKoS.value = Math.round(octetsEnvoyes / 1024 / ecoule)
        const restant = fichier.size - octetsEnvoyes
        resteSecondes.value = debitKoS.value ? Math.round(restant / 1024 / debitKoS.value) : null
      }
    }

    const aFaire = Array.from({ length: memo.nbParts }, (_, i) => i + 1).filter((n) => !faites.has(n))
    let depuisDernierReleve = 0

    async function traiter(numero: number) {
      const debut = (numero - 1) * memo.taillePart
      // `slice` est paresseux : les sept cents mégaoctets ne sont jamais tous
      // en mémoire, contrairement à ce que ferait un `arrayBuffer()`.
      const morceau = fichier.slice(debut, Math.min(debut + memo.taillePart, fichier.size))

      for (let essai = 0; essai < REPRISES_PAR_PART; essai++) {
        if (annule) throw Object.assign(new Error('Interrompu'), { interrompu: true })
        try {
          const part = await pousserPart(url, numero, morceau, majProgression)
          faites.set(numero, part)
          memo.parts = [...faites.values()].sort((a, b) => a.n - b.n)
          ecrireMemoire(chapitreId, memo)

          if (++depuisDernierReleve >= PARTS_ENTRE_DEUX_RELEVES) {
            depuisDernierReleve = 0
            await $fetch('/api/admin/video/progression', {
              method: 'POST',
              body: { uploadId: memo.uploadId, parts: memo.parts },
            }).catch(() => undefined)
          }
          return
        } catch (e) {
          if ((e as { interrompu?: boolean }).interrompu) throw e
          // Un refus d'autorisation en cours de route, c'est le jeton qui a
          // expiré : sept cents mégaoctets dépassent volontiers l'heure.
          if ((e as { statut?: number }).statut === 403 && essai === 0) {
            const frais = await $fetch<{ urlPart: string }>('/api/admin/video/jeton', {
              method: 'POST',
              body: { uploadId: memo.uploadId },
            })
            url = frais.urlPart
            memo.urlPart = frais.urlPart
            ecrireMemoire(chapitreId, memo)
            continue
          }
          if (essai === REPRISES_PAR_PART - 1) throw e
          await attendre(1000 * 2 ** essai)
        }
      }
    }

    // Trois parts en vol : au-delà, le lien montant sature sans rien gagner.
    const files = Array.from({ length: PARALLELISME }, async () => {
      for (;;) {
        const numero = aFaire.shift()
        if (numero === undefined) return
        await traiter(numero)
      }
    })
    await Promise.all(files)

    etat.value = 'finalisation'
    await $fetch('/api/admin/video/terminer', {
      method: 'POST',
      body: { uploadId: memo.uploadId, parts: memo.parts },
    })

    ecrireMemoire(chapitreId, null)
    repriseDisponible.value = null
    progression.value = 100
    etat.value = 'termine'
  }

  async function annuler(chapitreId: string, uploadId?: string) {
    annule = true
    for (const xhr of enVol) xhr.abort()
    enVol.clear()
    const id = uploadId ?? lireMemoire(chapitreId)?.uploadId
    if (id) {
      await $fetch('/api/admin/video/abandonner', {
        method: 'POST',
        body: { uploadId: id },
      }).catch(() => undefined)
    }
    ecrireMemoire(chapitreId, null)
    repriseDisponible.value = null
    etat.value = 'inactif'
    progression.value = 0
  }

  /** Un dépôt interrompu se retrouve au retour : le `File`, lui, n'est pas
   *  persistable — il faut resélectionner le même fichier. */
  function chercherReprise(chapitreId: string) {
    repriseDisponible.value = lireMemoire(chapitreId)
  }

  function messageDErreur(e: unknown): string {
    const avecMessage = e as { statusMessage?: string; message?: string }
    return avecMessage.statusMessage ?? avecMessage.message ?? 'Le téléversement a échoué.'
  }

  return {
    etat: readonly(etat),
    progression: readonly(progression),
    debitKoS: readonly(debitKoS),
    resteSecondes: readonly(resteSecondes),
    erreur,
    nomFichier: readonly(nomFichier),
    repriseDisponible: readonly(repriseDisponible),
    deposer,
    reprendre,
    annuler,
    chercherReprise,
  }
}
