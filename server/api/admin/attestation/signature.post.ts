import { lireReglagesAttestation, majReglagesAttestation } from '../../../database/administration'
import { majFormateur, trouverFormateur } from '../../../database/catalogue'
import {
  SEAU_SIGNATURES,
  cheminDansSeau,
  effacerImage,
  lireImageDeposee,
  televerserImage,
  urlPhoto,
} from '../../../utils/photos'
import { exigerAdmin } from '../../../utils/session'

/**
 * Dépôt d'une griffe, pour la direction ou pour un formateur.
 *
 * Une seule route pour les deux : ce qui les sépare tient au champ où l'adresse
 * est rangée, tout le reste — lecture du `multipart`, contrôle du format et du
 * poids, dépôt dans le seau, effacement de l'ancienne — leur est commun.
 *
 * Le tracé à la souris passe par ici aussi. Le canevas exporte un PNG à fond
 * transparent, que la page envoie comme un fichier ordinaire : rien ne
 * distingue une griffe dessinée d'une griffe déposée, ni à l'arrivée ni en
 * base, et il n'y a donc qu'un chemin de code à tenir juste.
 *
 * Le formateur se désigne par `?formateur=`, et non par un champ du
 * formulaire : le corps est un `multipart` déjà lu par `lireImageDeposee`, et
 * le reparcourir pour un identifiant reviendrait à l'analyser deux fois.
 * Paramètre absent, c'est la direction qui signe.
 */
export default defineEventHandler(async (event) => {
  await exigerAdmin(event)

  const formateurId = (getQuery(event).formateur as string | undefined)?.trim() || null
  const formateur = formateurId ? await trouverFormateur(formateurId) : null
  if (formateurId && !formateur) {
    throw createError({ statusCode: 404, statusMessage: 'Formateur introuvable' })
  }

  const { contenu, format } = await lireImageDeposee(event, SEAU_SIGNATURES, 'signature')
  const chemin = await televerserImage(
    SEAU_SIGNATURES,
    formateurId ? `formateurs/${formateurId}` : 'direction',
    contenu,
    format,
  )

  // La base garde une adresse affichable, pas un chemin dans le seau : c'est
  // la convention de `formateurs.photo`, et elle survit à un changement de
  // projet Supabase sans réécrire les lignes.
  const url = urlPhoto(SEAU_SIGNATURES, chemin)
  if (!url) {
    await effacerImage(SEAU_SIGNATURES, chemin)
    throw createError({ statusCode: 500, statusMessage: 'Adresse du stockage introuvable' })
  }

  const ancienne = formateur ? formateur.signature : (await lireReglagesAttestation()).signature

  try {
    if (formateurId) await majFormateur(formateurId, { signature: url })
    else await majReglagesAttestation({ signature: url })
  } catch (erreur) {
    // La base a refusé : le fichier tout juste déposé n'est rattaché à rien.
    await effacerImage(SEAU_SIGNATURES, chemin)
    throw erreur
  }

  // L'ancienne griffe ne part qu'une fois la nouvelle en place.
  await effacerImage(SEAU_SIGNATURES, cheminDansSeau(SEAU_SIGNATURES, ancienne))
  return { signature: url }
})
