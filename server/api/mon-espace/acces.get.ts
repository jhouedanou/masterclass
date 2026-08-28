import { listerFormateurs, listerModules, listerThematiques } from '../../database/catalogue'
import { listerAccesUtilisateur } from '../../database/comptes'
import { exigerUtilisateur } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)

  const [acces, modules, formateurs, thematiques] = await Promise.all([
    listerAccesUtilisateur(utilisateur.id),
    listerModules(),
    listerFormateurs(),
    listerThematiques(),
  ])

  return acces.map((a) => {
    const moduleTrouve = modules.find((m) => m.id === a.moduleId) ?? null
    return {
      ...a,
      module: moduleTrouve,
      formateur: moduleTrouve
        ? (formateurs.find((f) => f.id === moduleTrouve.formateurId) ?? null)
        : null,
      thematique: moduleTrouve
        ? (thematiques.find((t) => t.id === moduleTrouve.thematiqueId) ?? null)
        : null,
    }
  })
})
