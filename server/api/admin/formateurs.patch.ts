import type { ProgrammeSlug } from '#shared/types'
import { enregistrerJournal } from '../../database/administration'
import { listerFormateurs, majFormateur, reordonnerFormateurs } from '../../database/catalogue'
import { exigerSection } from '../../utils/session'

/**
 * Édition et réordonnancement des fiches formateurs (écran 11).
 *
 * L'ordre touche la page publique `/formateurs` : c'est celui que voit le
 * visiteur, pas un simple confort d'administration.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'formateurs')
  const body = await readBody<{
    action: 'modifier' | 'reordonner'
    id?: string
    nom?: string
    expertise?: string
    bio?: string
    photoAlt?: string
    programmePrincipal?: ProgrammeSlug
    ficheComplete?: boolean
    ordre?: string[]
  }>(event)

  const auteur = `${admin.prenom} ${admin.nom}`

  if (body.action === 'reordonner') {
    if (!body.ordre?.length) {
      throw createError({ statusCode: 422, statusMessage: 'Ordre manquant' })
    }
    await reordonnerFormateurs(body.ordre)
    await enregistrerJournal(auteur, 'a réordonné les formateurs', `${body.ordre.length} fiches`, {
      type: 'contenu',
    })
    return { formateurs: await listerFormateurs() }
  }

  if (!body.id) throw createError({ statusCode: 422, statusMessage: 'Formateur non précisé' })
  if (body.nom !== undefined && !body.nom.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Le nom est requis' })
  }
  if (body.expertise !== undefined && !body.expertise.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'L’expertise est requise' })
  }

  const formateur = await majFormateur(body.id, {
    nom: body.nom?.trim(),
    expertise: body.expertise?.trim(),
    bio: body.bio?.trim(),
    photoAlt: body.photoAlt?.trim(),
    programmePrincipal: body.programmePrincipal,
    ficheComplete: body.ficheComplete,
  })

  await enregistrerJournal(auteur, 'a modifié la fiche du formateur', formateur.nom, {
    type: 'contenu',
    objet: formateur.id,
  })

  return { formateurs: await listerFormateurs() }
})
