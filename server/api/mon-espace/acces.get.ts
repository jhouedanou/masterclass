import { acces, formateurs, modules, thematiques } from '../../data/db'
import { exigerUtilisateur } from '../../utils/session'

export default defineEventHandler((event) => {
  const utilisateur = exigerUtilisateur(event)
  return acces
    .filter((a) => a.utilisateurId === utilisateur.id)
    .map((a) => {
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
