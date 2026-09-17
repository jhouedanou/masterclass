import { enregistrerJournal } from '../../database/administration'
import {
  enregistrerVersion,
  majBlocVitrine,
  trouverBlocVitrine,
} from '../../database/backoffice'
import type { CleBlocVitrineSql, StatutPublicationSql } from '../../database/types'
import { exigerSection } from '../../utils/session'
import { assainirContenuCms } from '../../utils/texteRiche'

/**
 * Enregistre un bloc du site vitrine. L'état précédent part dans l'historique
 * avant l'écriture : c'est ce qui permet la restauration en un clic.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'cms-site-vitrine')
  const body = await readBody<{
    cle: CleBlocVitrineSql
    contenu?: Record<string, unknown>
    statut?: StatutPublicationSql
    publieDu?: string | null
    publieAu?: string | null
  }>(event)

  const actuel = await trouverBlocVitrine(body.cle)
  if (!actuel) throw createError({ statusCode: 404, statusMessage: 'Bloc introuvable' })

  const auteur = `${admin.prenom} ${admin.nom}`
  await enregistrerVersion({
    entite: 'blocs_vitrine',
    entiteId: actuel.cle,
    libelle: actuel.libelle,
    contenu: { contenu: actuel.contenu, statut: actuel.statut },
    auteur,
  })

  // Le HTML saisi est assaini ici, comme pour les articles et les modules : la
  // base ne doit jamais contenir de balisage qu'on n'accepterait pas d'afficher.
  const champs = body.contenu
    ? { ...body, contenu: assainirContenuCms(body.contenu) as Record<string, unknown> }
    : body
  const bloc = await majBlocVitrine(body.cle, champs, auteur)
  await enregistrerJournal(auteur, 'a modifié le site vitrine', bloc.libelle)
  return bloc
})
