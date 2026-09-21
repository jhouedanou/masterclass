import { lireReglagesAttestation } from '../../database/administration'
import { listerFormateurs } from '../../database/catalogue'
import { exigerAdmin } from '../../utils/session'

/**
 * L'onglet « Attestations » des paramètres : la griffe de la direction, et
 * celle de chaque formateur.
 *
 * Les formateurs sont rendus ici plutôt que repris de `/api/admin/formateurs`
 * : cet écran n'a besoin que du nom et de la griffe, là où l'autre rend la
 * fiche entière — bio, référencement, tarif de coaching.
 */
export default defineEventHandler(async (event) => {
  await exigerAdmin(event)
  const [reglages, formateurs] = await Promise.all([
    lireReglagesAttestation(),
    listerFormateurs(),
  ])

  return {
    reglages,
    formateurs: formateurs.map((f) => ({
      id: f.id,
      nom: f.nom,
      signature: f.signature ?? '',
    })),
  }
})
