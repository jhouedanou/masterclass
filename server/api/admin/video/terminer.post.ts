import { enregistrerJournal } from '../../../database/administration'
import { majVideoChapitre, trouverChapitre } from '../../../database/catalogue'
import { cloreTeleversement, trouverTeleversement } from '../../../database/video'
import { supprimerObjet, terminerDepot } from '../../../utils/video'
import { exigerSection } from '../../../utils/session'

/**
 * Finalisation d'un dépôt.
 *
 * Le contrôle des parts n'est pas une formalité : le stockage d'objets accepte
 * une liste incomplète et produit alors un fichier tronqué — parfaitement
 * lisible, qui s'arrête au milieu d'une phrase, et dont rien ne signale qu'il
 * est amputé. Seule la vérification que les numéros couvrent 1..n sans trou
 * l'attrape.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const { uploadId, parts } = await readBody<{
    uploadId: string
    parts: { n: number; etag: string }[]
  }>(event)

  const suivi = await trouverTeleversement(uploadId)
  if (!suivi) throw createError({ statusCode: 404, statusMessage: 'Téléversement introuvable' })
  if (suivi.statut !== 'en-cours') {
    throw createError({ statusCode: 409, statusMessage: 'Ce téléversement est déjà clos.' })
  }

  const numeros = new Set((parts ?? []).map((p) => p.n))
  const manquantes: number[] = []
  for (let n = 1; n <= suivi.nbParts; n++) if (!numeros.has(n)) manquantes.push(n)
  if (manquantes.length) {
    throw createError({
      statusCode: 409,
      statusMessage: `${manquantes.length} part(s) manquante(s) sur ${suivi.nbParts} — le fichier serait tronqué. Reprenez le téléversement.`,
    })
  }

  const ordonnees = [...parts].sort((a, b) => a.n - b.n)
  const fini = await terminerDepot(suivi.cle, uploadId, admin.id, ordonnees)

  const chapitre = await trouverChapitre(suivi.chapitreId)
  const ancienneCle = chapitre?.video_cle ?? null

  await majVideoChapitre(suivi.chapitreId, {
    videoCle: suivi.cle,
    videoFormat: 'fichier',
    videoDureeSecondes: suivi.dureeSecondes,
    videoNomFichier: suivi.nomFichier,
    videoTailleOctets: fini.taille ?? suivi.tailleOctets,
  })
  await cloreTeleversement(uploadId, 'termine')

  // L'ancienne vidéo ne part qu'une fois la nouvelle en place : l'inverse
  // laisserait le chapitre muet si la finalisation échouait.
  if (ancienneCle && ancienneCle !== suivi.cle) {
    await supprimerObjet(ancienneCle, admin.id).catch(() => undefined)
  }

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a déposé la vidéo du chapitre',
    `${chapitre?.libelle ?? ''} — ${suivi.nomFichier}`,
    { type: 'contenu', objet: suivi.chapitreId },
  )

  return { cle: suivi.cle, dureeSecondes: suivi.dureeSecondes, tailleOctets: fini.taille }
})
