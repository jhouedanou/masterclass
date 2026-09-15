import type { CategorieReferentiel } from '#shared/utils/referentiels'
import { CATEGORIES, cleDepuisLibelle, cleValide } from '#shared/utils/referentiels'
import { enregistrerJournal } from '../../database/administration'
import { creerReferentiel } from '../../database/referentiels'
import { exigerAdmin } from '../../utils/session'

/** Ajoute une valeur au référentiel. La clé est dérivée du libellé, pour que
 *  deux administrateurs saisissant le même mot produisent la même clé. */
export default defineEventHandler(async (event) => {
  const admin = await exigerAdmin(event)
  const body = await readBody<{ categorie?: CategorieReferentiel; libelle?: string; ordre?: number }>(event)

  const libelle = (body.libelle ?? '').trim()
  if (!libelle) {
    throw createError({ statusCode: 422, statusMessage: 'Intitulé manquant' })
  }
  if (!CATEGORIES.some((c) => c.valeur === body.categorie)) {
    throw createError({ statusCode: 422, statusMessage: 'Catégorie inconnue' })
  }

  const cle = cleDepuisLibelle(libelle)
  if (!cleValide(cle)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Intitulé sans lettre ni chiffre : impossible d’en tirer une clé',
    })
  }

  const entree = await creerReferentiel({
    categorie: body.categorie as CategorieReferentiel,
    cle,
    libelle,
    ordre: body.ordre,
  })
  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a ajouté une valeur de référentiel',
    `${entree.categorie} · ${entree.libelle} (${entree.cle})`,
  )
  return entree
})
