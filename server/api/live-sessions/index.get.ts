import { listerFormateurs } from '../../database/catalogue'
import { listerLiveSessions } from '../../database/live'
import { formateurPublic } from '../../utils/public'
import { debutSession } from '../../utils/zoom'

/**
 * Live Sessions publiées, à venir d'abord (de la plus proche à la plus
 * lointaine), puis les six dernières passées. `limite` sert à l'accueil, qui
 * n'affiche que les prochaines. Les liens Zoom ne sortent jamais d'ici.
 */
export default defineEventHandler(async (event) => {
  const { limite } = getQuery(event) as { limite?: string }
  const [sessions, formateurs] = await Promise.all([listerLiveSessions(), listerFormateurs()])
  const parFormateur = new Map(formateurs.map((f) => [f.id, formateurPublic(f)]))
  const maintenant = Date.now()

  const visibles = sessions
    .filter((s) => s.statut === 'publiee' || s.statut === 'terminee')
    .map((s) => {
      const fin = debutSession(s.date, s.heure).getTime() + s.dureeMinutes * 60_000
      return { ...s, passee: s.statut === 'terminee' || fin < maintenant, formateur: parFormateur.get(s.formateurId) ?? null }
    })

  const aVenir = visibles.filter((s) => !s.passee)
  const passees = visibles.filter((s) => s.passee).reverse().slice(0, 6)
  const n = Number(limite)
  return {
    aVenir: Number.isInteger(n) && n > 0 ? aVenir.slice(0, n) : aVenir,
    passees: limite ? [] : passees,
  }
})
