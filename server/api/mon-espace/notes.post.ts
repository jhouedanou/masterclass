import { notesFormateurs } from '../../data/db'
import { exigerUtilisateur } from '../../utils/session'

/** Notation du formateur après une séance — visible de l'admin et du formateur,
 *  jamais publiée sur le site. */
export default defineEventHandler(async (event) => {
  const utilisateur = exigerUtilisateur(event)
  const { formateurId, note, commentaire, origine } = await readBody<{
    formateurId: string
    note: number
    commentaire?: string
    origine: 'collective' | 'privee'
  }>(event)

  if (!formateurId || !note || note < 1 || note > 5) {
    throw createError({ statusCode: 422, statusMessage: 'Note comprise entre 1 et 5 requise' })
  }

  const entree = {
    id: `note-${notesFormateurs.length + 1}`,
    formateurId,
    utilisateurId: utilisateur.id,
    origine,
    note,
    commentaire: commentaire?.trim() || undefined,
    date: new Date().toISOString().slice(0, 10),
  }
  notesFormateurs.push(entree)
  return entree
})
