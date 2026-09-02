import type { PreferencesNotifications } from '#shared/types'
import { majPreferencesNotifications } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'

/** Préférences de notification (planche B, écran 11). */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const body = await readBody<Partial<PreferencesNotifications>>(event)

  const actuelles = utilisateur.preferencesNotifications ?? {
    email: true,
    whatsapp: true,
    rappelsSessions: true,
    nouveautes: false,
  }
  const preferences: PreferencesNotifications = {
    email: typeof body.email === 'boolean' ? body.email : actuelles.email,
    whatsapp: typeof body.whatsapp === 'boolean' ? body.whatsapp : actuelles.whatsapp,
    rappelsSessions: typeof body.rappelsSessions === 'boolean' ? body.rappelsSessions : actuelles.rappelsSessions,
    nouveautes: typeof body.nouveautes === 'boolean' ? body.nouveautes : actuelles.nouveautes,
  }
  return await majPreferencesNotifications(utilisateur.id, preferences)
})
