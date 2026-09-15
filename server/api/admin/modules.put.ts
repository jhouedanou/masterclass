import { enregistrerJournal } from '../../database/administration'
import { enregistrerVersion } from '../../database/backoffice'
import { majModule, trouverModule } from '../../database/catalogue'
import { assainirHtml } from '../../utils/texteRiche'
import { exigerSection } from '../../utils/session'

/**
 * Édition d'un module. L'ouverture de l'offre — le passage à « disponible » —
 * est bloquée tant que la fiche n'est pas prête, comme le veut la maquette :
 * un module vide ne doit pas pouvoir être mis en vente.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const body = await readBody<{ id: string } & Record<string, unknown>>(event)

  const actuel = await trouverModule(body.id)
  if (!actuel) throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })

  if (body.statut === 'disponible') {
    const manques: string[] = []
    if (!(body.promesse ?? actuel.promesse)) manques.push('la promesse')
    if (!(body.pourquoi ?? actuel.pourquoi)) manques.push('le « pourquoi »')
    if (!actuel.chapitres.length) manques.push('au moins un chapitre')
    if (manques.length) {
      throw createError({
        statusCode: 409,
        statusMessage: `Impossible d'ouvrir l'offre : il manque ${manques.join(', ')}.`,
      })
    }
  }

  const auteur = `${admin.prenom} ${admin.nom}`
  await enregistrerVersion({
    entite: 'modules',
    entiteId: actuel.id,
    libelle: actuel.titre,
    contenu: { ...actuel, chapitres: undefined },
    auteur,
  })

  const { id, ...champs } = body

  // `pourquoi` et `livrable` sortent de l'éditeur riche et s'affichent en
  // `v-html` sur la fiche publique : c'est ici, à l'écriture, que le balisage
  // est ramené à une liste blanche. Rien n'est réexaminé à l'affichage.
  for (const cle of ['pourquoi', 'livrable'] as const) {
    if (typeof champs[cle] === 'string') champs[cle] = assainirHtml(champs[cle] as string)
  }

  const modifie = await majModule(id, champs as never)

  if (body.statut && body.statut !== actuel.statut) {
    await enregistrerJournal(
      auteur,
      body.statut === 'disponible' ? 'a ouvert l’offre du module' : 'a changé le statut du module',
      `${modifie.titre} — ${body.statut}`,
    )
  } else {
    await enregistrerJournal(auteur, 'a modifié le module', modifie.titre)
  }

  return modifie
})
