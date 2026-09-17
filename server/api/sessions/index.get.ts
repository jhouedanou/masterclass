import { listerFormateurs, listerThematiques } from '../../database/catalogue'
import { listerSessions } from '../../database/coaching'
import { formateurPublic } from '../../utils/public'

/**
 * Calendrier public des séances de coaching collectif.
 *
 * L'animateur n'est joint que par ce que la page affiche : le nom et le
 * portrait. L'objet complet portait ses coordonnées internes — e-mail
 * professionnel et WhatsApp — sur une route non authentifiée.
 */
export default defineEventHandler(async () => {
  const [sessions, thematiques, formateurs] = await Promise.all([
    listerSessions(),
    listerThematiques(),
    listerFormateurs(),
  ])

  const parThematique = new Map(thematiques.map((t) => [t.id, t]))
  const parFormateur = new Map(formateurs.map((f) => [f.id, formateurPublic(f)]))

  // Un calendrier annonce ce qui vient. La route renvoyait toute la table,
  // séances passées comprises : la page s'allongeait d'une séance par mois,
  // indéfiniment, et ouvrait sur des dates révolues.
  const aujourdhui = new Date().toISOString().slice(0, 10)

  return sessions
    .filter((s) => s.date >= aujourdhui)
    .sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure))
    .map((s) => ({
      ...s,
      thematique: parThematique.get(s.thematiqueId) ?? null,
      formateur: parFormateur.get(s.formateurId) ?? null,
    }))
})
