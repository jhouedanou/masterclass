import { enregistrerJournal } from '../../database/administration'
import { cloreTeleversement, televersementsEchus } from '../../database/video'
import { abandonnerDepot } from '../../utils/video'

/**
 * Dépôts de vidéo restés en plan.
 *
 * Un téléversement abandonné ne disparaît pas de lui-même : les parts déjà
 * poussées occupent le stockage et sont facturées tant qu'elles ne sont pas
 * explicitement abandonnées, sans que rien ne les montre nulle part. Vingt-
 * quatre heures laissent largement le temps de reprendre un dépôt interrompu
 * — au-delà, il est perdu.
 */
const DELAI_ABANDON_HEURES = 24

export async function purgerTeleversements() {
  const echus = await televersementsEchus(DELAI_ABANDON_HEURES)

  for (const depot of echus) {
    // L'abandon chez le diffuseur peut échouer sur un dépôt déjà nettoyé de
    // son côté : la ligne doit être close quand même, sinon la purge
    // repasserait dessus tous les jours.
    await abandonnerDepot(depot.cle, depot.uploadId, 'tache').catch(() => undefined)
    await cloreTeleversement(depot.uploadId, 'abandonne')
    await enregistrerJournal(
      'Tâche planifiée',
      'a abandonné un téléversement vidéo resté en plan',
      `${depot.nomFichier} — ${depot.cle}`,
      { type: 'contenu', objet: depot.chapitreId },
    )
  }

  return { abandonnes: echus.length }
}

export default defineTask({
  meta: {
    name: 'video:purger',
    description: 'Abandonne les téléversements vidéo restés en plan au-delà de 24 h',
  },
  run: async () => ({ result: await purgerTeleversements() }),
})
