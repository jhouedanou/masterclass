import { creerTemoignage, majTemoignage, supprimerTemoignage } from '../../database/backoffice'
import { exigerSection } from '../../utils/session'

/** Création, modification et retrait d'un témoignage — l'ordre est manuel. */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'cms-site-vitrine')
  const body = await readBody<{
    action: 'creer' | 'modifier' | 'supprimer'
    id?: string
    auteur?: string
    role?: string
    texte?: string
    position?: number
    publie?: boolean
  }>(event)

  if (body.action === 'supprimer') {
    if (!body.id) throw createError({ statusCode: 422, statusMessage: 'Témoignage non précisé' })
    await supprimerTemoignage(body.id)
    return { ok: true }
  }

  if (body.action === 'modifier') {
    if (!body.id) throw createError({ statusCode: 422, statusMessage: 'Témoignage non précisé' })
    return await majTemoignage(body.id, {
      auteur: body.auteur,
      role: body.role,
      texte: body.texte,
      position: body.position,
      publie: body.publie,
    })
  }

  if (!body.auteur?.trim() || !body.texte?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Auteur et texte sont requis' })
  }
  return await creerTemoignage({
    auteur: body.auteur.trim(),
    role: body.role?.trim() ?? '',
    texte: body.texte.trim(),
    position: body.position,
  })
})
