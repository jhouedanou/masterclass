import { enregistrerJournal, majReglagesFinanciers } from '../../database/administration'
import type { ReglagesFinanciers } from '../../database/mappers'
import { exigerAdmin } from '../../utils/session'

/** La répartition Big Five / formateur n'est modifiable que par l'admin principal. */
export default defineEventHandler(async (event) => {
  const admin = await exigerAdmin(event, true)
  const body = await readBody<Partial<ReglagesFinanciers>>(event)

  if (
    body.partFormateurPourcent !== undefined &&
    body.partBigFivePourcent !== undefined &&
    body.partFormateurPourcent + body.partBigFivePourcent !== 100
  ) {
    throw createError({ statusCode: 422, statusMessage: 'La répartition doit totaliser 100 %' })
  }

  const reglages = await majReglagesFinanciers(body)
  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a modifié les paramètres financiers',
    `répartition ${reglages.partBigFivePourcent}/${reglages.partFormateurPourcent}, frais ${reglages.fraisPaiementPourcent} %`,
  )
  return reglages
})
