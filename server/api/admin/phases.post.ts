import { enregistrerJournal } from '../../database/administration'
import { creerPhase, listerPhases, majPhase, supprimerPhase } from '../../database/catalogue'
import { exigerSection } from '../../utils/session'

/**
 * Phases d'un programme — le niveau que l'écran 02 intercale entre le
 * programme et ses thématiques.
 *
 * Une phase naît en brouillon et se publie séparément : publier un parent ne
 * publie jamais ses enfants, règle énoncée au bas de l'arbre de la maquette.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const body = await readBody<{
    action: 'creer' | 'modifier' | 'supprimer'
    id?: string
    programme?: 'social-media' | 'entrepreneurs'
    nom?: string
    statut?: 'brouillon' | 'publie'
    dateOuverture?: string | null
  }>(event)

  const auteur = `${admin.prenom} ${admin.nom}`

  switch (body.action) {
    case 'creer': {
      if (!body.programme) {
        throw createError({ statusCode: 422, statusMessage: 'Programme non précisé' })
      }
      if (!body.nom?.trim()) {
        throw createError({ statusCode: 422, statusMessage: 'Le nom de la phase est requis' })
      }
      const phase = await creerPhase({
        programme: body.programme,
        nom: body.nom.trim(),
        dateOuverture: body.dateOuverture ?? null,
      })
      await enregistrerJournal(auteur, 'a créé la phase', phase.nom, { type: 'contenu', objet: phase.id })
      break
    }

    case 'modifier': {
      if (!body.id) throw createError({ statusCode: 422, statusMessage: 'Phase non précisée' })
      const phase = await majPhase(body.id, {
        nom: body.nom?.trim(),
        statut: body.statut,
        dateOuverture: body.dateOuverture,
      })
      await enregistrerJournal(auteur, 'a modifié la phase', phase.nom, { type: 'contenu', objet: phase.id })
      break
    }

    case 'supprimer': {
      if (!body.id) throw createError({ statusCode: 422, statusMessage: 'Phase non précisée' })
      await supprimerPhase(body.id)
      await enregistrerJournal(auteur, 'a supprimé la phase', body.id, { type: 'contenu', objet: body.id })
      break
    }
  }

  return { phases: await listerPhases() }
})
