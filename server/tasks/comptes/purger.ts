import { enregistrerJournal } from '../../database/administration'
import { purgerTentativesVerification } from '../../database/commerce'
import { purgerTentativesPubliques } from '../../database/debit'
import { listerSuppressionsEchues, listerSuppressionsJ3, marquerSupprime } from '../../database/comptes'
import { notifierCompte } from '../../utils/notifications'

/**
 * Suppression différée (planche B, écran 12) : les comptes dont la date de
 * suppression est passée sont supprimés pour de bon (suppression douce :
 * e-mail libéré, écritures comptables conservées) ; ceux qui tombent dans
 * trois jours reçoivent un rappel.
 *
 * La même passe vide les comptages de débit de plus de vingt-quatre heures —
 * consultations de la page de vérification publique et appels aux routes
 * publiques d'écriture : passé la fenêtre de comptage, ce ne serait plus qu'un
 * journal d'adresses IP sans usage.
 */
export async function purgerComptes() {
  const [echus, rappels] = await Promise.all([listerSuppressionsEchues(), listerSuppressionsJ3()])

  for (const compte of rappels) {
    await notifierCompte(compte, 'suppression-rappel', {
      prenom: compte.prenom,
      date: new Date(compte.suppressionPrevueLe!).toLocaleDateString('fr-FR'),
    })
  }
  for (const compte of echus) {
    await marquerSupprime(compte.id)
    await enregistrerJournal('Tâche planifiée', 'a supprimé définitivement un compte apprenant échu', compte.id, {
      type: 'compte',
      objet: 'apprenant',
    })
  }
  const [verifications, appelsPublics] = await Promise.all([
    purgerTentativesVerification(),
    purgerTentativesPubliques(),
  ])

  return { supprimes: echus.length, rappels: rappels.length, verifications, appelsPublics }
}

export default defineTask({
  meta: { name: 'comptes:purger', description: 'Supprime les comptes échus et rappelle à J-3' },
  run: async () => ({ result: await purgerComptes() }),
})
