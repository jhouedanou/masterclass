import { listerComptesAdmin } from '../../database/comptes'
import { exigerSection, sectionsEffectives } from '../../utils/session'

/** Sections proposées à la création d'un compte, dans l'ordre de la maquette. */
const SECTIONS = [
  { cle: 'administration-acces', libelle: 'Administration des accès', note: 'Permet de créer, modifier et révoquer d’autres comptes admin. À réserver aux personnes de confiance ; toute action est journalisée.' },
  { cle: 'cms-site-vitrine', libelle: 'CMS Site vitrine' },
  { cle: 'fiches-commerciales', libelle: 'Fiches commerciales' },
  { cle: 'modules-chapitres', libelle: 'Modules & chapitres' },
  { cle: 'offres-commerciales', libelle: 'Offres commerciales' },
  { cle: 'formateurs', libelle: 'Formateurs' },
  { cle: 'calendrier-sessions', libelle: 'Calendrier des sessions' },
  { cle: 'coaching-prive', libelle: 'Coaching privé' },
  { cle: 'candidatures-formateurs', libelle: 'Candidatures formateurs' },
  { cle: 'ressources-scripts', libelle: 'Ressources & scripts' },
  { cle: 'blog', libelle: 'Blog — articles' },
  { cle: 'referencement-contenu', libelle: 'Référencement (SEO) — contenu', note: 'Title, meta description, partage, images et textes alternatifs.' },
  { cle: 'referencement-avance', libelle: 'Référencement — réglages avancés', note: 'Slugs publiés, indexation, canonicals — réservé aux administrateurs supérieurs.' },
  { cle: 'historique-versions', libelle: 'Historique & versions' },
  { cle: 'statistiques-performance', libelle: 'Statistiques de performance' },
  { cle: 'performances-marketing', libelle: 'Performances (marketing)', note: 'CA agrégé visible — droit distinct de « Transactions ».' },
  { cle: 'transactions-paiements', libelle: 'Transactions & paiements', note: 'Décoché par défaut — validation explicite d’un administrateur supérieur requise.' },
] as const

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerSection(event, 'administration-acces')
  const comptes = await listerComptesAdmin()

  return {
    sections: SECTIONS,
    role: utilisateur.role,
    mesSections: sectionsEffectives(utilisateur),
    comptes: comptes.map((c) => ({
      id: c.id,
      nom: `${c.prenom} ${c.nom}`,
      email: c.email,
      whatsapp: c.whatsapp ?? '',
      role: c.role,
      sections: c.role === 'admin-superieur' ? 'toutes' : (c.sectionsAutorisees ?? []),
      // Un compte ne peut pas se révoquer lui-même : cela laisserait la
      // plateforme sans personne pour rouvrir les droits.
      revocable: c.id !== utilisateur.id,
    })),
  }
})
