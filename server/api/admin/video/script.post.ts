import { enregistrerJournal } from '../../../database/administration'
import { majScriptChapitre, trouverChapitre } from '../../../database/catalogue'
import { analyserSousTitres } from '../../../utils/soustitres'
import { exigerSection } from '../../../utils/session'

/** Un SRT d'une heure pèse quelques dizaines de kilo-octets : un mégaoctet
 *  laisse une marge confortable et reste très en deçà du plafond applicatif. */
const TAILLE_MAXIMALE = 1024 * 1024
const EXTENSIONS = ['srt', 'vtt']

/**
 * Import de la transcription d'un chapitre.
 *
 * Contrairement à la vidéo, le fichier passe bien par ici : quelques dizaines
 * de kilo-octets ne posent aucun problème, et le texte doit de toute façon
 * être analysé côté serveur pour être rangé en base.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'ressources-scripts')

  const annonce = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (annonce > TAILLE_MAXIMALE * 1.1) {
    throw createError({ statusCode: 413, statusMessage: 'Fichier trop lourd : 1 Mo maximum' })
  }

  const parties = await readMultipartFormData(event)
  const chapitreId = parties?.find((p) => p.name === 'chapitreId')?.data?.toString('utf8') ?? ''
  const fichier = parties?.find((p) => p.name === 'fichier' && p.filename)

  if (!chapitreId) throw createError({ statusCode: 422, statusMessage: 'Chapitre non précisé' })
  if (!fichier?.data?.length) {
    throw createError({ statusCode: 422, statusMessage: 'Aucun fichier reçu' })
  }
  // `content-length` vient du client : il ne prouve rien, on revérifie sur les
  // octets réellement reçus.
  if (fichier.data.length > TAILLE_MAXIMALE) {
    throw createError({ statusCode: 413, statusMessage: 'Fichier trop lourd : 1 Mo maximum' })
  }

  const nomFichier = fichier.filename ?? 'transcription'
  const extension = nomFichier.split('.').pop()?.toLowerCase() ?? ''
  if (!EXTENSIONS.includes(extension)) {
    throw createError({
      statusCode: 415,
      statusMessage: 'Format refusé : un fichier .srt ou .vtt est attendu.',
    })
  }

  const chapitre = await trouverChapitre(chapitreId)
  if (!chapitre) throw createError({ statusCode: 404, statusMessage: 'Chapitre introuvable' })

  const lignes = analyserSousTitres(fichier.data.toString('utf8'))
  // Un fichier vide, un .txt renommé ou une transcription sans horodatage
  // donnent zéro passage : mieux vaut le dire que d'effacer un script existant
  // par un import silencieusement inutile.
  if (!lignes.length) {
    throw createError({
      statusCode: 422,
      statusMessage:
        'Aucun passage horodaté trouvé : ce fichier n’est pas un sous-titre SRT ou VTT.',
    })
  }

  await majScriptChapitre(chapitreId, {
    script: lignes,
    format: extension as 'srt' | 'vtt',
    nomFichier,
  })

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a importé la transcription du chapitre',
    `${chapitre.libelle} — ${nomFichier} (${lignes.length} passages)`,
    { type: 'contenu', objet: chapitreId },
  )

  // Le nombre de passages est la seule preuve immédiate que le fichier était
  // le bon : un import silencieux ne dirait rien d'un décalage de piste.
  return { lignes: lignes.length, nomFichier, format: extension }
})
