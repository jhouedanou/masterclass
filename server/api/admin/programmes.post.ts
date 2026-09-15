import { enregistrerJournal } from '../../database/administration'
import { listerProgrammes, majProgramme } from '../../database/catalogue'
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
    slug: string
    nom?: string
    couleur?: string
    statut?: 'brouillon' | 'publie'
    descriptionCarte?: string
    descriptionProgramme?: string
  }>(event)

  if (!body.slug) throw createError({ statusCode: 422, statusMessage: 'Programme non précisé' })
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
