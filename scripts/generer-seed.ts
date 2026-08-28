/**
 * Génère `supabase/seed.sql` à partir du jeu de démonstration de
 * `server/data/db.ts`, qui reste la source du contenu éditorial (18 modules,
 * fiches formateurs, articles) tant qu'aucun back-office ne le saisit.
 *
 *   npm run db:seed:generer
 *
 * Le fichier produit est versionné : il doit être relu comme du code. Node le
 * charge directement en TypeScript (dépouillement natif des types).
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { hacherMotDePasse } from '../server/utils/motDePasse.ts'
import {
  acces,
  articles,
  candidaturesFormateurs,
  certificats,
  demandesCoachingPrive,
  formateurs,
  journal,
  modules,
  notesFormateurs,
  personas,
  programmes,
  reglagesFinanciers,
  reglagesSeo,
  sessionsCoaching,
  sujetsSessions,
  thematiques,
  transactions,
  utilisateurs,
} from '../server/data/db.ts'

// --- Littéraux SQL ---------------------------------------------------------

/** Échappe une chaîne en littéral SQL. Les apostrophes typographiques du
 *  contenu français passent telles quelles ; seule `'` doit être doublée. */
function txt(valeur: string | null | undefined): string {
  if (valeur === null || valeur === undefined) return 'null'
  return `'${valeur.replace(/'/g, "''")}'`
}

function num(valeur: number | null | undefined): string {
  return valeur === null || valeur === undefined ? 'null' : String(valeur)
}

function bool(valeur: boolean | null | undefined): string {
  return valeur === null || valeur === undefined ? 'null' : valeur ? 'true' : 'false'
}

function tableau(valeurs: string[]): string {
  if (!valeurs.length) return `'{}'::text[]`
  return `array[${valeurs.map(txt).join(', ')}]::text[]`
}

/** Tableau d'un type énuméré : le cast doit porter le nom du type. */
function tableauEnum(valeurs: string[] | undefined, type: string): string {
  if (!valeurs?.length) return `'{}'::${type}[]`
  return `array[${valeurs.map(txt).join(', ')}]::${type}[]`
}

function json(valeur: unknown): string {
  return `${txt(JSON.stringify(valeur))}::jsonb`
}

/** Colonnes `seo_*` dépliées, dans l'ordre déclaré par le schéma. */
function seo(champs: Record<string, unknown> | undefined): string {
  const s = champs ?? {}
  return [
    txt(s.motClePrincipal as string | undefined),
    txt(s.title as string | undefined),
    txt(s.metaDescription as string | undefined),
    txt(s.ogTitle as string | undefined),
    txt(s.ogDescription as string | undefined),
    txt(s.ogImage as string | undefined),
    txt(s.canonical as string | undefined),
    // `indexable` est non nul en base : l'absence vaut « indexable ».
    bool(s.indexable !== false),
  ].join(', ')
}

const COLONNES_SEO =
  'seo_mot_cle_principal, seo_title, seo_meta_description, seo_og_title, ' +
  'seo_og_description, seo_og_image, seo_canonical, seo_indexable'

/**
 * Mot de passe unique des comptes de démonstration. Il est haché ici, à la
 * génération : le seed ne contient jamais de mot de passe en clair. À changer
 * impérativement avant toute mise en ligne publique — il est écrit dans le
 * README et sur l'écran de connexion.
 */
const MOT_DE_PASSE_DEMO = 'Masterclass2026!'

// --- Assemblage ------------------------------------------------------------

const blocs: string[] = []

function inserer(table: string, colonnes: string, lignes: string[], commentaire?: string) {
  if (!lignes.length) return
  const entete = commentaire ? `-- ${commentaire}\n` : ''
  blocs.push(
    `${entete}insert into ${table} (${colonnes}) values\n${lignes
      .map((l) => `  (${l})`)
      .join(',\n')};`,
  )
}

inserer(
  'programmes',
  `id, slug, nom, surtitre_hero, h1_variable, description_hero, cta_hero, ` +
    `description_programme, description_carte, couleur, ${COLONNES_SEO}`,
  programmes.map((p) =>
    [
      txt(p.id),
      txt(p.slug),
      txt(p.nom),
      txt(p.surtitreHero),
      txt(p.h1Variable),
      txt(p.descriptionHero),
      txt(p.ctaHero),
      txt(p.descriptionProgramme),
      txt(p.descriptionCarte),
      txt(p.couleur),
      seo(p.seo),
    ].join(', '),
  ),
  'Programmes',
)

inserer(
  'thematiques',
  'id, numero, nom, programme',
  thematiques.map((t) => [txt(t.id), num(t.numero), txt(t.nom), txt(t.programme)].join(', ')),
  'Thématiques — sections des pages programme',
)

inserer(
  'formateurs',
  `id, slug, nom, expertise, bio, programme_principal, photo, fiche_complete, ` +
    `coaching_prive_fcfa_heure, ${COLONNES_SEO}`,
  formateurs.map((f) =>
    [
      txt(f.id),
      txt(f.slug),
      txt(f.nom),
      txt(f.expertise),
      txt(f.bio),
      txt(f.programmePrincipal),
      txt(f.photo),
      bool(f.ficheComplete),
      num(f.coachingPriveFcfaHeure),
      seo(f.seo),
    ].join(', '),
  ),
  'Formateurs',
)

inserer(
  'modules',
  `id, slug, numero, titre, programme, thematique_id, formateur_id, promesse, pourquoi, ` +
    `pour_qui, prerequis, acquis, livrable, faq, duree_minutes, prix_fcfa, statut, ` +
    `publie_le, ${COLONNES_SEO}`,
  modules.map((m) =>
    [
      txt(m.id),
      txt(m.slug),
      num(m.numero),
      txt(m.titre),
      txt(m.programme),
      txt(m.thematiqueId),
      txt(m.formateurId),
      txt(m.promesse),
      txt(m.pourquoi),
      tableau(m.pourQui),
      txt(m.prerequis),
      tableau(m.acquis),
      txt(m.livrable),
      json(m.faq),
      num(m.dureeMinutes),
      num(m.prixFcfa),
      txt(m.statut),
      txt(m.publieLe),
      seo(m.seo),
    ].join(', '),
  ),
  'Modules — 9 par programme',
)

inserer(
  'chapitres',
  'module_id, position, libelle, titre, duree_minutes, script',
  modules.flatMap((m) =>
    m.chapitres.map((c, i) =>
      [
        txt(m.id),
        num(i),
        txt(c.libelle),
        txt(c.titre),
        num(c.dureeMinutes),
        json(c.script ?? []),
      ].join(', '),
    ),
  ),
  'Chapitres — position 0 pour l’introduction',
)

// Une empreinte par compte : chacune porte son propre sel.
const empreintes = new Map<string, string>()
for (const u of utilisateurs) {
  empreintes.set(u.id, await hacherMotDePasse(MOT_DE_PASSE_DEMO))
}

inserer(
  'utilisateurs',
  'id, prenom, nom, email, whatsapp, pays, role, fiche_completee, formateur_id, ' +
    'mot_de_passe_hache, sections_autorisees',
  utilisateurs.map((u) =>
    [
      txt(u.id),
      txt(u.prenom),
      txt(u.nom),
      txt(u.email),
      txt(u.whatsapp),
      txt(u.pays),
      txt(u.role),
      bool(u.ficheCompletee === true),
      txt(u.formateurId),
      txt(empreintes.get(u.id)),
      tableauEnum(u.sectionsAutorisees, 'section_admin'),
    ].join(', '),
  ),
  'Comptes de démonstration — mot de passe commun, voir README',
)

inserer(
  'personas',
  'utilisateur_id, age, secteur, experience, reseaux, objectif',
  Object.entries(personas).map(([id, p]) =>
    [txt(id), num(p.age), txt(p.secteur), txt(p.experience), txt(p.reseaux), txt(p.objectif)].join(
      ', ',
    ),
  ),
  'Personas apprenants transmis aux formateurs',
)

inserer(
  'acces',
  'utilisateur_id, module_id, progression, achete_le, termine_le',
  acces.map((a) =>
    [txt(a.utilisateurId), txt(a.moduleId), num(a.progression), txt(a.acheteLe), txt(a.termineLe)].join(
      ', ',
    ),
  ),
  'Accès acquis',
)

inserer(
  'sessions_coaching',
  'id, thematique_id, programme, formateur_id, date_seance, heure, duree_minutes, places, ' +
    'inscrits, presents, statut',
  sessionsCoaching.map((s) =>
    [
      txt(s.id),
      txt(s.thematiqueId),
      txt(s.programme),
      txt(s.formateurId),
      txt(s.date),
      txt(s.heure),
      num(s.dureeMinutes),
      num(s.places),
      num(s.inscrits),
      num(s.presents),
      txt(s.statut),
    ].join(', '),
  ),
  'Sessions de coaching collectif. `inscrits` porte les inscriptions de\n-- démonstration, qui n’ont pas de ligne dans inscriptions_sessions.',
)

// Les sujets de démonstration impliquent une inscription : sans elle, une
// réservation buterait sur l'unicité de `sujets_sessions` au lieu de répondre
// « déjà inscrit ». Le déclencheur de comptage est neutralisé le temps de
// l'insertion pour que `inscrits`, saisi plus haut, reste la valeur affichée.
const inscriptions = [...new Map(
  sujetsSessions.map((s) => [`${s.sessionId}|${s.utilisateurId}`, s]),
).values()]

if (inscriptions.length) {
  blocs.push(
    [
      '-- Inscriptions détaillées, déduites des sujets soumis',
      'alter table inscriptions_sessions disable trigger inscriptions_sessions_compteur;',
      'insert into inscriptions_sessions (session_id, utilisateur_id, inscrit_le) values',
      inscriptions
        .map((s) => `  (${txt(s.sessionId)}, ${txt(s.utilisateurId)}, ${txt(s.soumisLe)})`)
        .join(',\n') + ';',
      'alter table inscriptions_sessions enable trigger inscriptions_sessions_compteur;',
    ].join('\n'),
  )
}

inserer(
  'sujets_sessions',
  'id, session_id, utilisateur_id, apprenant, preoccupation, attente, soumis_le',
  sujetsSessions.map((s) =>
    [
      txt(s.id),
      txt(s.sessionId),
      txt(s.utilisateurId),
      txt(s.apprenant),
      txt(s.preoccupation),
      txt(s.attente),
      txt(s.soumisLe),
    ].join(', '),
  ),
  'Sujets soumis avant séance',
)

inserer(
  'notes_formateurs',
  'id, formateur_id, utilisateur_id, origine, note, commentaire, date_note',
  notesFormateurs.map((n) =>
    [
      txt(n.id),
      txt(n.formateurId),
      txt(n.utilisateurId),
      txt(n.origine),
      num(n.note),
      txt(n.commentaire),
      txt(n.date),
    ].join(', '),
  ),
  'Notes des apprenants',
)

inserer(
  'articles',
  `id, slug, titre, chapo, contenu, auteur_id, categorie, image, image_alt, statut, ` +
    `publie_le, temps_lecture_minutes, a_la_une, ${COLONNES_SEO}`,
  articles.map((a) =>
    [
      txt(a.id),
      txt(a.slug),
      txt(a.titre),
      txt(a.chapo),
      txt(a.contenu),
      txt(a.auteurId),
      txt(a.categorie),
      txt(a.image),
      txt(a.imageAlt),
      txt(a.statut),
      txt(a.publieLe),
      num(a.tempsLectureMinutes),
      bool(a.aLaUne),
      seo(a.seo),
    ].join(', '),
  ),
  'Articles du blog',
)

inserer(
  'articles_modules',
  'article_id, module_id',
  articles.flatMap((a) => a.modulesLies.map((m) => [txt(a.id), txt(m)].join(', '))),
  'Modules mis en avant au bas des articles',
)

inserer(
  'transactions',
  'reference, utilisateur_id, module_id, moyen, montant, statut, date_transaction',
  transactions.map((t) =>
    [
      txt(t.reference),
      txt(t.utilisateurId),
      txt(t.moduleId),
      txt(t.moyen),
      num(t.montant),
      txt(t.statut),
      txt(t.date),
    ].join(', '),
  ),
  'Transactions du prestataire de paiement',
)

inserer(
  'certificats',
  `numero, utilisateur_id, module_id, prenom_nom, titre_module, programme, thematique, ` +
    `formateur, duree_minutes, date_realisation, date_delivrance, taux_completion`,
  certificats.map((c) =>
    [
      txt(c.numero),
      txt(c.utilisateurId),
      txt(c.moduleId),
      txt(c.prenomNom),
      txt(c.titreModule),
      txt(c.programme),
      txt(c.thematique),
      txt(c.formateur),
      num(c.dureeMinutes),
      txt(c.dateRealisation),
      txt(c.dateDelivrance),
      num(c.tauxCompletion),
    ].join(', '),
  ),
  'Certificats déjà délivrés',
)

inserer(
  'demandes_coaching_prive',
  'id, utilisateur_id, apprenant, module_id, besoins, disponibilites, heures, statut, creneau, recue_le',
  demandesCoachingPrive.map((d) =>
    [
      txt(d.id),
      txt(d.utilisateurId),
      txt(d.apprenant),
      txt(d.moduleId),
      txt(d.besoins),
      txt(d.disponibilites),
      num(d.heures),
      txt(d.statut),
      txt(d.creneau),
      txt(d.recueLe),
    ].join(', '),
  ),
  'Demandes de coaching privé',
)

inserer(
  'candidatures_formateurs',
  'id, nom, expertise, message, whatsapp, lien, statut, recue_le',
  candidaturesFormateurs.map((c) =>
    [
      txt(c.id),
      txt(c.nom),
      txt(c.expertise),
      txt(c.message),
      txt(c.whatsapp),
      txt(c.lien),
      txt(c.statut),
      txt(c.recueLe),
    ].join(', '),
  ),
  'Candidatures formateurs',
)

inserer(
  'journal',
  'id, auteur, action, cible, date_entree',
  journal.map((j) =>
    [txt(j.id), txt(j.auteur), txt(j.action), txt(j.cible), txt(j.date)].join(', '),
  ),
  'Journal d’administration',
)

inserer(
  'reglages_financiers',
  'id, frais_paiement_pourcent, part_big_five_pourcent, part_formateur_pourcent, ' +
    'objectif_inscriptions_mensuel, objectif_ca_mensuel',
  [
    [
      'true',
      num(reglagesFinanciers.fraisPaiementPourcent),
      num(reglagesFinanciers.partBigFivePourcent),
      num(reglagesFinanciers.partFormateurPourcent),
      num(reglagesFinanciers.objectifInscriptionsMensuel),
      num(reglagesFinanciers.objectifCaMensuel),
    ].join(', '),
  ],
  'Réglages financiers — ligne unique',
)

inserer(
  'reglages_seo',
  'id, titre_par_defaut, gabarit_titre, description_par_defaut, image_sociale_par_defaut, ' +
    'google_search_console, ga4',
  [
    [
      'true',
      txt(reglagesSeo.titreParDefaut),
      txt(reglagesSeo.gabaritTitre),
      txt(reglagesSeo.descriptionParDefaut),
      txt(reglagesSeo.imageSocialeParDefaut),
      txt(reglagesSeo.googleSearchConsole),
      txt(reglagesSeo.ga4),
    ].join(', '),
  ],
  'Réglages SEO globaux — ligne unique',
)

// --- Séquences -------------------------------------------------------------

/** Repositionne un compteur au-delà des identifiants insérés ci-dessus, faute
 *  de quoi la première création applicative entrerait en collision. */
function recaler(sequence: string, dernier: number) {
  return `select setval('${sequence}', ${dernier}, true);`
}

const dernierCertificat = certificats
  .map((c) => Number.parseInt(c.numero.slice(-6), 10))
  .reduce((max, n) => (Number.isFinite(n) ? Math.max(max, n) : max), 128)

blocs.push(
  [
    '-- Compteurs des identifiants applicatifs',
    recaler('seq_session_coaching', sessionsCoaching.length),
    recaler('seq_sujet_session', sujetsSessions.length),
    recaler('seq_note_formateur', notesFormateurs.length),
    recaler('seq_entree_journal', journal.length),
    recaler('seq_demande_coaching_prive', demandesCoachingPrive.length),
    recaler('seq_candidature_formateur', candidaturesFormateurs.length),
    recaler('seq_certificat', dernierCertificat),
  ].join('\n'),
)

// --- Écriture --------------------------------------------------------------

const entete = `-- ---------------------------------------------------------------------------
-- Jeu de données initial — E-Masterclass Big Five
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Source : server/data/db.ts · Régénération : npm run db:seed:generer
--
-- Rejoué intégralement par \`supabase db reset\`. Pour l'appliquer à une base
-- déjà en place : npm run db:seed
-- ---------------------------------------------------------------------------

`

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const chemin = join(racine, 'supabase', 'seed.sql')
writeFileSync(chemin, entete + blocs.join('\n\n') + '\n', 'utf8')

/**
 * Rattrapage pour une base installée avant la migration d'authentification :
 * ses comptes n'ont pas de mot de passe et ne peuvent donc plus se connecter.
 * Le `where … is null` rend le script sans effet sur un compte déjà pourvu —
 * il ne peut pas écraser un mot de passe choisi par un utilisateur.
 */
const rattrapage = [
  '-- ---------------------------------------------------------------------------',
  '-- Rattrapage — mots de passe des comptes de démonstration',
  '--',
  '-- FICHIER GÉNÉRÉ : ne pas éditer à la main. Régénération : npm run db:seed:generer',
  '--',
  "-- À exécuter une seule fois, sur une base installée AVANT la migration",
  "-- d'authentification : ses comptes existaient sans mot de passe.",
  '--',
  '-- Sans effet sur un compte qui en a déjà un.',
  '-- ---------------------------------------------------------------------------',
  '',
  ...utilisateurs.map(
    (u) =>
      `update utilisateurs set mot_de_passe_hache = ${txt(empreintes.get(u.id))}\n` +
      ` where id = ${txt(u.id)} and mot_de_passe_hache is null;`,
  ),
  '',
  '-- Droits fins des comptes d\'administration.',
  ...utilisateurs
    .filter((u) => u.sectionsAutorisees?.length)
    .map(
      (u) =>
        `update utilisateurs set sections_autorisees = ${tableauEnum(u.sectionsAutorisees, 'section_admin')}\n` +
        ` where id = ${txt(u.id)} and cardinality(sections_autorisees) = 0;`,
    ),
].join('\n')

writeFileSync(join(racine, 'supabase', 'rattrapage-mots-de-passe.sql'), rattrapage + '\n', 'utf8')

const lignes = blocs.reduce((n, b) => n + b.split('\n').length, 0)
console.info(`seed.sql écrit — ${blocs.length} blocs, ${lignes} lignes`)
