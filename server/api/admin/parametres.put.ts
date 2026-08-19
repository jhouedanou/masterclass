import { enregistrerJournal, reglagesFinanciers } from '../../data/db'
import { exigerAdmin } from '../../utils/session'

/** La répartition Big Five / formateur n'est modifiable que par l'admin principal. */
export default defineEventHandler(async (event) => {
  const admin = exigerAdmin(event, true)
  const body = await readBody<Partial<typeof reglagesFinanciers>>(event)

  if (
    body.partFormateurPourcent !== undefined &&
    body.partBigFivePourcent !== undefined &&
    body.partFormateurPourcent + body.partBigFivePourcent !== 100
  ) {
    throw createError({ statusCode: 422, statusMessage: 'La répartition doit totaliser 100 %' })
  }

  Object.assign(reglagesFinanciers, body)
  enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a modifié les paramètres financiers',
    `répartition ${reglagesFinanciers.partBigFivePourcent}/${reglagesFinanciers.partFormateurPourcent}, frais ${reglagesFinanciers.fraisPaiementPourcent} %`,
  )
  return reglagesFinanciers
})
