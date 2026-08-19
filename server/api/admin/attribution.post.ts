import { acces, enregistrerJournal, modules, utilisateurs } from '../../data/db'
import { exigerAdmin } from '../../utils/session'

/**
 * Attribution d'un accès gratuit : distincte d'un achat, motif obligatoire,
 * action journalisée et apprenant notifié.
 */
export default defineEventHandler(async (event) => {
  const admin = exigerAdmin(event)
  const { utilisateurId, moduleId, motif } = await readBody<{
    utilisateurId: string
    moduleId: string
    motif: string
  }>(event)

  if (!motif?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Le motif est obligatoire' })
  }

  const apprenant = utilisateurs.find((u) => u.id === utilisateurId)
  const moduleTrouve = modules.find((m) => m.id === moduleId)
  if (!apprenant || !moduleTrouve) {
    throw createError({ statusCode: 404, statusMessage: 'Apprenant ou module introuvable' })
  }
  if (acces.some((a) => a.utilisateurId === utilisateurId && a.moduleId === moduleId)) {
    throw createError({ statusCode: 409, statusMessage: 'Cet apprenant possède déjà ce module' })
  }

  acces.push({
    moduleId,
    utilisateurId,
    progression: 0,
    acheteLe: new Date().toISOString().slice(0, 10),
    termineLe: null,
  })

  enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a attribué un accès gratuit',
    `${apprenant.prenom} ${apprenant.nom} — ${moduleTrouve.titre} (motif : ${motif})`,
  )

  return { ok: true, notifie: true }
})
