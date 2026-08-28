import {
  listerFormateurs,
  listerModules,
  listerProgrammes,
  listerThematiques,
} from '../../database/catalogue'
import { exigerSection } from '../../utils/session'

/** Arbre Programme → Thématique → Module, avec la séparation fiche / contenu / offre. */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'modules-chapitres')

  const [programmes, thematiques, modules, formateurs] = await Promise.all([
    listerProgrammes(),
    listerThematiques(),
    listerModules(),
    listerFormateurs(),
  ])

  return programmes.map((p) => ({
    id: p.id,
    slug: p.slug,
    nom: p.nom,
    couleur: p.couleur,
    thematiques: thematiques
      .filter((t) => t.programme === p.slug)
      .sort((a, b) => a.numero - b.numero)
      .map((t) => ({
        ...t,
        modules: modules
          .filter((m) => m.thematiqueId === t.id)
          .sort((a, b) => a.numero - b.numero)
          .map((m) => ({
            id: m.id,
            slug: m.slug,
            numero: m.numero,
            titre: m.titre,
            statut: m.statut,
            nbChapitres: m.chapitres.length,
            formateur: formateurs.find((f) => f.id === m.formateurId)?.nom ?? '',
            // Trois objets indépendants : fiche commerciale, module pédagogique, offre.
            fiche: m.statut === 'brouillon' ? 'brouillon' : 'publiee',
            contenu: m.statut === 'disponible' ? 'pret' : 'en-preparation',
            offre: m.statut === 'disponible' ? 'ouverte' : 'fermee',
            prixFcfa: m.prixFcfa,
          })),
      })),
  }))
})
