import {
  enregistrerJournal,
  lireReglagesFinanciers,
  majReglagesFinanciers,
} from '../../database/administration'
import type { ReglagesFinanciers } from '../../database/mappers'
import { exigerAdmin } from '../../utils/session'

/** La répartition Big Five / formateur n'est modifiable que par l'admin principal. */
export default defineEventHandler(async (event) => {
  const admin = await exigerAdmin(event, true)
  const body = await readBody<Partial<ReglagesFinanciers>>(event)

  // Le contrôle ne s'appliquait que si les deux parts arrivaient ensemble :
  // `{ partFormateurPourcent: 90 }` seul passait, et c'est la contrainte
  // `check (… = 100)` de la base qui rattrapait — en 500 illisible. Les deux
  // parts se lisent donc désormais avec leur valeur courante à défaut.
  if (body.partFormateurPourcent !== undefined || body.partBigFivePourcent !== undefined) {
    const courants = await lireReglagesFinanciers()
    const formateur = body.partFormateurPourcent ?? courants.partFormateurPourcent
    const bigFive = body.partBigFivePourcent ?? courants.partBigFivePourcent
    if (formateur + bigFive !== 100) {
      throw createError({ statusCode: 422, statusMessage: 'La répartition doit totaliser 100 %' })
    }
  }

  const reglages = await majReglagesFinanciers(body)
  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a modifié les paramètres financiers',
    `répartition ${reglages.partBigFivePourcent}/${reglages.partFormateurPourcent}, frais ${reglages.fraisPaiementPourcent} %`,
  )
  return reglages
})
