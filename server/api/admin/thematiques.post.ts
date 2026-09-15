import { enregistrerJournal } from '../../database/administration'
import {
  creerThematique,
  listerThematiques,
  majThematique,
  reordonnerThematiques,
} from '../../database/catalogue'
import { identifiantDepuis } from '../../utils/texte'
import { exigerSection } from '../../utils/session'

/**
 * Thématiques — création, publication, réordonnancement par glisser-déposer.
 *
 * Le réordonnancement touche `position` et jamais `numero` : le premier est
 * l'ordre d'affichage, le second le numéro que lit l'apprenant sur la fiche.
 * Les confondre, c'était interdire à deux thématiques d'échanger leur place.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const body = await readBody<{
    action: 'creer' | 'modifier' | 'reordonner'
    id?: string
    nom?: string
    numero?: number
    programme?: 'social-media' | 'entrepreneurs'
    phaseId?: string
    statut?: 'brouillon' | 'publie'
    ordre?: string[]
  }>(event)

  const auteur = `${admin.prenom} ${admin.nom}`

  switch (body.action) {
    case 'creer': {
      if (!body.nom?.trim()) {
        throw createError({ statusCode: 422, statusMessage: 'Le nom de la thématique est requis' })
      }
      if (!body.programme || !body.phaseId) {
        throw createError({ statusCode: 422, statusMessage: 'Programme et phase sont requis' })
      }
      const prefixe = body.programme === 'social-media' ? 'th-sm' : 'th-ent'
      const thematique = await creerThematique({
        id: identifiantDepuis(prefixe, body.nom),
        nom: body.nom.trim(),
        programme: body.programme,
        phaseId: body.phaseId,
      })
      await enregistrerJournal(auteur, 'a créé la thématique', thematique.nom, {
        type: 'contenu',
        objet: thematique.id,
      })
      break
    }

    case 'modifier': {
      if (!body.id) throw createError({ statusCode: 422, statusMessage: 'Thématique non précisée' })
      const thematique = await majThematique(body.id, {
        nom: body.nom?.trim(),
        numero: body.numero,
        statut: body.statut,
        phaseId: body.phaseId,
      })
      await enregistrerJournal(auteur, 'a modifié la thématique', thematique.nom, {
        type: 'contenu',
        objet: thematique.id,
      })
      break
    }

    case 'reordonner': {
      if (!body.phaseId || !body.ordre?.length) {
        throw createError({ statusCode: 422, statusMessage: 'Phase et ordre sont requis' })
      }
      await reordonnerThematiques(body.phaseId, body.ordre)
      break
    }
  }

  return { thematiques: await listerThematiques() }
})
