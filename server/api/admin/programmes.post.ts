import { enregistrerJournal } from '../../database/administration'
import { creerProgramme, listerProgrammes, majProgramme } from '../../database/catalogue'
import { exigerSection } from '../../utils/session'

/**
 * Édition d'un programme — nom, couleur d'accent, publication.
 *
 * Le slug n'est pas modifiable et aucun programme ne se crée ici : c'est un
 * type énuméré en base, pivot de six tables, et l'application branche sur ses
 * deux valeurs pour choisir la couleur, le libellé et le jeu de champs du
 * profil apprenant. En ajouter un troisième est une migration, pas un
 * formulaire.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const body = await readBody<{
    action?: 'creer'
    slug: string
    nom?: string
    couleur?: string
    statut?: 'brouillon' | 'publie'
    descriptionCarte?: string
    descriptionProgramme?: string
  }>(event)

  if (!body.slug) throw createError({ statusCode: 422, statusMessage: 'Programme non précisé' })

  // « + Nouveau programme » (écran 02) : un programme vide, en brouillon.
  if (body.action === 'creer') {
    if (!/^[a-z0-9-]+$/.test(body.slug)) {
      throw createError({ statusCode: 422, statusMessage: 'Le slug n’admet que des minuscules, chiffres et tirets' })
    }
    if (!body.nom?.trim()) throw createError({ statusCode: 422, statusMessage: 'Le nom du programme est requis' })
    if (body.couleur !== undefined && !/^#[0-9a-fA-F]{6}$/.test(body.couleur)) {
      throw createError({ statusCode: 422, statusMessage: 'La couleur attendue est au format #RRGGBB' })
    }
    const programme = await creerProgramme({
      slug: body.slug,
      nom: body.nom.trim(),
      couleur: body.couleur ?? '#6d28d9',
    })
    await enregistrerJournal(
      `${admin.prenom} ${admin.nom}`,
      'a créé le programme',
      programme.nom,
      { type: 'contenu', objet: programme.id },
    )
    return { programmes: await listerProgrammes() }
  }
  if (body.nom !== undefined && !body.nom.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Le nom du programme est requis' })
  }
  // La couleur devient un fond de pastille et un `style` inline : la contraindre
  // ici évite d'avoir à s'en défier à l'affichage.
  if (body.couleur !== undefined && !/^#[0-9a-fA-F]{6}$/.test(body.couleur)) {
    throw createError({ statusCode: 422, statusMessage: 'La couleur attendue est au format #RRGGBB' })
  }

  const programme = await majProgramme(body.slug, {
    nom: body.nom?.trim(),
    couleur: body.couleur,
    statut: body.statut,
    descriptionCarte: body.descriptionCarte,
    descriptionProgramme: body.descriptionProgramme,
  })

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a modifié le programme',
    programme.nom,
    { type: 'contenu', objet: programme.id },
  )

  return { programmes: await listerProgrammes() }
})
