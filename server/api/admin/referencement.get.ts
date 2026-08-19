import { CHEMINS_PRIORITAIRES, detecterDoublons, inventaireReferencement } from '../../utils/seo'
import { redirections } from '../../data/db'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler((event) => {
  const utilisateur = exigerAdmin(event)
  const entrees = inventaireReferencement()

  return {
    entrees,
    doublons: detecterDoublons(entrees),
    // Spec §3 : Title et Meta description obligatoires sur les pages prioritaires.
    manquants: entrees
      .filter((e) => CHEMINS_PRIORITAIRES.includes(e.chemin))
      .filter((e) => !e.seo.title || !e.seo.metaDescription)
      .map((e) => e.chemin),
    redirections,
    // Le front masque les champs réservés en fonction de ce rôle (spec §13).
    role: utilisateur.role,
  }
})
