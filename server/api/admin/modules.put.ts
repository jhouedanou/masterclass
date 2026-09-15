import { enregistrerJournal } from '../../database/administration'
import { enregistrerVersion, listerVersions } from '../../database/backoffice'
import { majModule, trouverModule } from '../../database/catalogue'
import { assainirHtml } from '../../utils/texteRiche'
import { exigerSection } from '../../utils/session'

/**
 * Édition d'un module. L'ouverture de l'offre — le passage à « disponible » —
 * est bloquée tant que la fiche n'est pas prête, comme le veut la maquette :
 * un module vide ne doit pas pouvoir être mis en vente.
 */
/** Deux enregistrements automatiques rapprochés ne méritent pas deux versions :
 *  au-delà de ce délai, en revanche, on a changé d'avis, pas de frappe. */
const INTERVALLE_VERSION_MINUTES = 10

export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const body = await readBody<{ id: string; autosave?: boolean } & Record<string, unknown>>(event)

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

  // L'éditeur enregistre tout seul, toutes les secondes et demie. Sans ce
  // tri, une séance de rédaction laisserait des centaines d'entrées dans
  // l'onglet Historique et dans le journal d'administration, où plus personne
  // ne retrouverait la modification qui compte.
  const derniere = (await listerVersions('modules', actuel.id, 1))[0]
  const versionRecente =
    derniere &&
    derniere.auteur === auteur &&
    Date.now() - new Date(derniere.creeLe).getTime() < INTERVALLE_VERSION_MINUTES * 60 * 1000

  if (!body.autosave || !versionRecente) {
    await enregistrerVersion({
      entite: 'modules',
      entiteId: actuel.id,
      libelle: actuel.titre,
      contenu: { ...actuel, chapitres: undefined },
      auteur,
    })
  }

  const { id, autosave, ...champs } = body

  // `pourquoi` et `livrable` sortent de l'éditeur riche et s'affichent en
  // `v-html` sur la fiche publique : c'est ici, à l'écriture, que le balisage
  // est ramené à une liste blanche. Rien n'est réexaminé à l'affichage.
  for (const cle of ['pourquoi', 'livrable'] as const) {
    if (typeof champs[cle] === 'string') champs[cle] = assainirHtml(champs[cle] as string)
  }

  const modifie = await majModule(id, champs as never)

  if (body.statut && body.statut !== actuel.statut) {
    // Un changement de statut se journalise toujours, autosave ou non : c'est
    // une décision, pas une frappe.
    await enregistrerJournal(
      auteur,
      body.statut === 'disponible' ? 'a ouvert l’offre du module' : 'a changé le statut du module',
      `${modifie.titre} — ${body.statut}`,
    )
  } else if (!autosave) {
    await enregistrerJournal(auteur, 'a modifié le module', modifie.titre)
  }

  return modifie
})
