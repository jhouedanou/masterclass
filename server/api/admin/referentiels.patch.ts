import { enregistrerJournal } from '../../database/administration'
import { majReferentiel } from '../../database/referentiels'
import { exigerAdmin } from '../../utils/session'

/** Renomme, réordonne ou (dés)active une valeur. La clé n'est pas modifiable :
 *  les fiches apprenant pointent dessus, et c'est ce qui rend le renommage
 *  rétroactif sur toutes les fiches. */
export default defineEventHandler(async (event) => {
  const admin = await exigerAdmin(event)
  const body = await readBody<{ id?: string; libelle?: string; ordre?: number; actif?: boolean }>(event)

  if (!body.id) {
    throw createError({ statusCode: 422, statusMessage: 'Entrée non précisée' })
  }
  if (body.libelle !== undefined && !body.libelle.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Intitulé vide' })
  }

  const entree = await majReferentiel(body.id, {
    libelle: body.libelle?.trim(),
    ordre: body.ordre,
    actif: body.actif,
  })
  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    body.actif === false ? 'a désactivé une valeur de référentiel' : 'a modifié une valeur de référentiel',
    `${entree.categorie} · ${entree.libelle} (${entree.cle})`,
  )
  return entree
})
