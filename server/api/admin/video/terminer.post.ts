import { enregistrerJournal } from '../../../database/administration'
import { majVideoChapitre, trouverChapitre } from '../../../database/catalogue'
import { mettreEnFile } from '../../../database/encodage'
import { inscrireVideo } from '../../../database/mediatheque'
import { cloreTeleversement, trouverTeleversement } from '../../../database/video'
import { lireDureeDepuisStockage, terminerDepot } from '../../../utils/video'
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

  // L'objet est maintenant assemblé : il peut dire sa durée lui-même. Celle
  // qu'avait annoncée le navigateur ne servait qu'à ouvrir le dépôt.
  const mesuree = await lireDureeDepuisStockage(suivi.cle, admin.id, getRequestURL(event).origin)
  const dureeSecondes = mesuree === null ? suivi.dureeSecondes : Math.round(mesuree)

  // Le fichier entre d'abord à la médiathèque : le chapitre le désigne
  // ensuite. L'ordre inverse laisserait un chapitre pointant une vidéo que la
  // médiathèque ignore, et son effacement échapperait au décompte des usages.
  const video = await inscrireVideo({
    cle: suivi.cle,
    nom: suivi.nomFichier,
    nomFichier: suivi.nomFichier,
    tailleOctets: fini.taille ?? suivi.tailleOctets,
    dureeSecondes,
    deposePar: admin.id,
  })

  await majVideoChapitre(suivi.chapitreId, {
    videoCle: suivi.cle,
    videoId: video.id,
    videoFormat: 'fichier',
    videoDureeSecondes: dureeSecondes,
    videoNomFichier: suivi.nomFichier,
    videoTailleOctets: fini.taille ?? suivi.tailleOctets,
  })
  await cloreTeleversement(uploadId, 'termine')

  // Le fichier part à l'encodage, et le chapitre n'attend pas : il est lisible
  // dès maintenant en `fichier`, et passera de lui-même au flux à plusieurs
  // débits quand l'exécutant aura fini. Un encodage qui échoue laisse donc un
  // chapitre lisible, pas un chapitre mort.
  //
  // L'échec de la mise en file ne fait pas échouer le dépôt : les octets sont
  // arrivés, le chapitre fonctionne, et la file se relance à la main depuis la
  // médiathèque.
  const travail = await mettreEnFile(video.id, suivi.cle).catch(() => null)

  // La vidéo que ce chapitre servait jusqu'ici n'est pas effacée : elle reste
  // à la médiathèque, d'où elle se rattache ailleurs ou se supprime
  // délibérément. Un dépôt de remplacement ne détruit donc plus rien.

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a déposé la vidéo du chapitre',
    `${chapitre?.libelle ?? ''} — ${suivi.nomFichier}`,
    { type: 'contenu', objet: suivi.chapitreId },
  )

  return {
    cle: suivi.cle,
    dureeSecondes,
    tailleOctets: fini.taille,
    encodageEnFile: Boolean(travail),
  }
})
