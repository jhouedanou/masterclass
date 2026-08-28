import { enregistrerJournal } from '../../database/administration'
import {
  enregistrerVersion,
  majBlocVitrine,
  trouverBlocVitrine,
} from '../../database/backoffice'
import type { CleBlocVitrineSql, StatutPublicationSql } from '../../database/types'
import { exigerSection } from '../../utils/session'

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

  const bloc = await majBlocVitrine(body.cle, body, auteur)
  await enregistrerJournal(auteur, 'a modifié le site vitrine', bloc.libelle)
  return bloc
})
