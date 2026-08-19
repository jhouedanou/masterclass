import { acces, certificats, formateurs, modules, programmes, thematiques } from '../../data/db'
import { exigerUtilisateur } from '../../utils/session'

const CODE_PROGRAMME: Record<string, string> = {
  entrepreneurs: 'ENT',
  'social-media': 'SOM',
}

/** Certificat de participation délivré une fois le module réalisé. */
export default defineEventHandler(async (event) => {
  const utilisateur = exigerUtilisateur(event)
  const { moduleId } = await readBody<{ moduleId: string }>(event)

  const ligne = acces.find((a) => a.utilisateurId === utilisateur.id && a.moduleId === moduleId)
  if (!ligne || ligne.progression < 100) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Le module doit être réalisé intégralement avant la délivrance',
    })
  }

  const existant = certificats.find(
    (c) => c.utilisateurId === utilisateur.id && c.moduleId === moduleId,
  )
  if (existant) return existant

  const moduleTrouve = modules.find((m) => m.id === moduleId)!
  const programme = programmes.find((p) => p.slug === moduleTrouve.programme)!
  const thematique = thematiques.find((t) => t.id === moduleTrouve.thematiqueId)!
  const formateur = formateurs.find((f) => f.id === moduleTrouve.formateurId)!

  const annee = new Date().getFullYear()
  const code = CODE_PROGRAMME[programme.slug] ?? 'GEN'
  const sequence = String(certificats.length + 129).padStart(6, '0')

  const certificat = {
    numero: `EMBF-${code}-${annee}-${sequence}`,
    utilisateurId: utilisateur.id,
    moduleId,
    prenomNom: `${utilisateur.prenom} ${utilisateur.nom}`,
    titreModule: moduleTrouve.titre,
    programme: programme.nom,
    thematique: thematique.nom,
    formateur: formateur.nom,
    dureeMinutes: moduleTrouve.dureeMinutes,
    dateRealisation: ligne.termineLe ?? new Date().toISOString().slice(0, 10),
    dateDelivrance: new Date().toISOString().slice(0, 10),
    tauxCompletion: 100,
  }
  certificats.push(certificat)
  return certificat
})
