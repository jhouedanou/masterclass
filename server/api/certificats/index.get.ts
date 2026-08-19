import { certificats } from '../../data/db'
import { exigerUtilisateur } from '../../utils/session'

export default defineEventHandler((event) => {
  const utilisateur = exigerUtilisateur(event)
  return certificats.filter((c) => c.utilisateurId === utilisateur.id)
})
