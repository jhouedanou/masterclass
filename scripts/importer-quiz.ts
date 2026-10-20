/**
 * Importe les quiz livrés par Big Five avec les modules pilotes.
 *
 *   npm run quiz:importer
 *   npm run db:appliquer -- supabase/rattrapage-quiz-pilotes.sql
 *
 * Lit `MODULES VIDEOS/videosAmettreJour/1080P/<PROG>/<MODULE>/QUIZ/<MODULE>_QUIZ.json`
 * (schéma `emasterclass-quiz/1.1`) et écrit `supabase/rattrapage-quiz-pilotes.sql`.
 *
 * Le module de la plateforme est celui de `FICHES[code].id`
 * (`server/data/modulesPilotes.ts`). Chaque renvoi « Revoir le chapitre N »
 * est contrôlé contre `medias/pilotes/manifeste.json` : le chapitre doit
 * exister et l'instant tomber dans sa durée. `Cnn` y vaut `chapitres.position`
 * (C00 = 0), qui est aussi le `?chapitre=` du lecteur.
 *
 * Le fichier produit est une seule transaction, rejouable : le quiz est mis à
 * jour en place, ses questions remplacées. Les tentatives des apprenants ne
 * sont jamais touchées — elles ne référencent les questions que par leur code
 * (Q01…), qui ne change pas d'une version à l'autre.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FICHES } from '../server/data/modulesPilotes.ts'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const LIVRAISON = join(RACINE, 'MODULES VIDEOS/videosAmettreJour/1080P')
const MANIFESTE = join(RACINE, 'medias/pilotes/manifeste.json')
const SORTIE_SQL = join(RACINE, 'supabase/rattrapage-quiz-pilotes.sql')

/** Règles annoncées par le LISEZ-MOI : un quiz qui s'en écarte n'est pas importé
 *  en silence, la plateforme ne sait appliquer que celles-là. */
const REGLES = {
  nb_questions: 10,
  nb_propositions: 4,
  bonnes_reponses_par_question: 1,
  bareme_total: 100,
  seuil_reussite_pourcent: 100,
  tentatives_max_par_jour: 3,
}

interface QuizLivre {
  schema: string
  module: { id: string; titre: string }
  version: string
  statut: string
  regles: Record<string, unknown>
  questions: {
    id: string
    niveau?: string
    competence?: string
    enonce: string
    options: { id: string; texte: string }[]
    bonne_reponse: string
    justification: string
    piste_si_erreur: string
    references: { chapitre: string; numero: number; titre: string; fichier: string; debut_s: number; libelle: string }[]
  }[]
}

const manifeste = JSON.parse(readFileSync(MANIFESTE, 'utf8')) as Record<
  string,
  { position: number; titre: string; nom: string; dureeSecondes: number }
>

function lireQuiz(): { chemin: string; quiz: QuizLivre }[] {
  const trouves: { chemin: string; quiz: QuizLivre }[] = []
  for (const programme of readdirSync(LIVRAISON)) {
    const dossierProgramme = join(LIVRAISON, programme)
    if (!statSync(dossierProgramme).isDirectory()) continue
    for (const module of readdirSync(dossierProgramme)) {
      const dossierQuiz = join(dossierProgramme, module, 'QUIZ')
      let fichiers: string[]
      try {
        fichiers = readdirSync(dossierQuiz).filter((f) => f.endsWith('_QUIZ.json'))
      } catch {
        continue
      }
      for (const f of fichiers) {
        const chemin = join(dossierQuiz, f)
        trouves.push({ chemin, quiz: JSON.parse(readFileSync(chemin, 'utf8')) as QuizLivre })
      }
    }
  }
  return trouves.sort((a, b) => a.quiz.module.id.localeCompare(b.quiz.module.id))
}

const erreurs: string[] = []
function exiger(condition: unknown, message: string): asserts condition {
  if (!condition) erreurs.push(message)
}

const sql = (v: string | null | undefined) => (v == null ? 'null' : `'${v.replace(/'/g, "''")}'`)
const json = (v: unknown) => `${sql(JSON.stringify(v))}::jsonb`

const lignes: string[] = [
  '-- ---------------------------------------------------------------------------',
  '-- Quiz des modules pilotes (livraison Big Five du 20/10)',
  '--',
  '-- FICHIER GÉNÉRÉ : ne pas éditer à la main.',
  '-- Régénération : npm run quiz:importer',
  '-- Application  : npm run db:appliquer -- supabase/rattrapage-quiz-pilotes.sql',
  '--',
  '-- Rejouable : quiz mis à jour en place, questions remplacées, tentatives des',
  '-- apprenants conservées. Exige la migration 40 (quiz_modules).',
  '-- ---------------------------------------------------------------------------',
  '',
  'begin;',
  '',
]

const bilan: string[] = []
const importes: string[] = []

for (const { chemin, quiz } of lireQuiz()) {
  const code = quiz.module.id
  const contexte = `${code} (${chemin.slice(RACINE.length + 1)})`
  const fiche = FICHES[code]
  exiger(fiche, `${contexte} : module absent de server/data/modulesPilotes.ts`)
  if (!fiche) continue

  exiger(quiz.schema === 'emasterclass-quiz/1.1', `${contexte} : schéma ${quiz.schema} inattendu`)
  exiger(quiz.statut === 'valide', `${contexte} : statut « ${quiz.statut} », « valide » attendu`)
  for (const [cle, valeur] of Object.entries(REGLES)) {
    exiger(quiz.regles[cle] === valeur, `${contexte} : règle ${cle} = ${quiz.regles[cle]}, ${valeur} attendu`)
  }
  exiger(quiz.questions.length === REGLES.nb_questions, `${contexte} : ${quiz.questions.length} questions`)

  const codes = new Set<string>()
  quiz.questions.forEach((q, i) => {
    const ici = `${contexte} ${q.id}`
    exiger(/^Q\d\d$/.test(q.id) && !codes.has(q.id), `${ici} : identifiant invalide ou en double`)
    codes.add(q.id)
    exiger(q.enonce?.trim() && q.justification?.trim() && q.piste_si_erreur?.trim(), `${ici} : texte manquant`)
    exiger(
      q.options.length === 4 && q.options.map((o) => o.id).join('') === 'ABCD' && q.options.every((o) => o.texte?.trim()),
      `${ici} : quatre options A à D attendues`,
    )
    exiger(q.options.some((o) => o.id === q.bonne_reponse), `${ici} : bonne réponse ${q.bonne_reponse} hors des options`)
    exiger(q.references.length > 0, `${ici} : aucun chapitre à revoir`)
    for (const r of q.references) {
      const chapitre = manifeste[`${code}-${r.chapitre}`]
      exiger(chapitre, `${ici} : chapitre ${r.chapitre} absent du manifeste`)
      if (!chapitre) continue
      exiger(chapitre.position === r.numero, `${ici} : ${r.chapitre} est en position ${chapitre.position}, pas ${r.numero}`)
      exiger(chapitre.nom === r.fichier, `${ici} : fichier ${r.fichier} ≠ ${chapitre.nom}`)
      exiger(r.debut_s >= 0 && r.debut_s < chapitre.dureeSecondes, `${ici} : ${r.debut_s} s hors de ${r.chapitre}`)
    }
    exiger(i + 1 === Number(q.id.slice(1)), `${ici} : questions hors d'ordre`)
  })

  const moduleId = fiche.id
  importes.push(moduleId)
  lignes.push(
    `-- ${code} → ${moduleId}`,
    `insert into quiz (module_id, code, version, seuil_reussite, tentatives_par_jour)`,
    `values (${sql(moduleId)}, ${sql(code)}, ${sql(quiz.version)}, ${REGLES.seuil_reussite_pourcent}, ${REGLES.tentatives_max_par_jour})`,
    `on conflict (module_id) do update`,
    `  set code = excluded.code, version = excluded.version,`,
    `      seuil_reussite = excluded.seuil_reussite, tentatives_par_jour = excluded.tentatives_par_jour;`,
    `delete from quiz_questions where module_id = ${sql(moduleId)};`,
    `insert into quiz_questions`,
    `  (module_id, position, code, niveau, competence, enonce, options, bonne_reponse, justification, piste_si_erreur, renvois)`,
    `values`,
    quiz.questions
      .map((q, i) =>
        [
          `  (${sql(moduleId)}, ${i + 1}, ${sql(q.id)}, ${sql(q.niveau)}, ${sql(q.competence)},`,
          `   ${sql(q.enonce)},`,
          `   ${json(q.options.map((o) => ({ id: o.id, texte: o.texte })))},`,
          `   ${sql(q.bonne_reponse)}, ${sql(q.justification)}, ${sql(q.piste_si_erreur)},`,
          `   ${json(q.references.map((r) => ({ position: r.numero, titre: r.titre, debut_s: r.debut_s, libelle: r.libelle })))})`,
        ].join('\n'),
      )
      .join(',\n') + ';',
    '',
  )
  bilan.push(`${code.padEnd(8)} → ${moduleId}  ${quiz.questions.length} questions, ${quiz.questions.reduce((n, q) => n + q.references.length, 0)} renvois`)
}

if (!importes.length) erreurs.push(`Aucun quiz trouvé sous ${LIVRAISON.slice(RACINE.length + 1)}`)

if (erreurs.length) {
  console.error(`✗ ${erreurs.length} anomalie(s) dans la livraison — rien n'est écrit :\n`)
  for (const e of erreurs) console.error(`  · ${e}`)
  process.exit(1)
}

lignes.push(
  '-- Contrôle : un quiz complet par module importé, sinon tout est annulé.',
  'do $$',
  'begin',
  `  if exists (select 1 from quiz z where z.module_id in (${importes.map(sql).join(', ')})`,
  `             and (select count(*) from quiz_questions q where q.module_id = z.module_id) <> ${REGLES.nb_questions}) then`,
  `    raise exception 'Quiz incomplet après import';`,
  '  end if;',
  'end;',
  '$$;',
  '',
  'commit;',
  '',
)

writeFileSync(SORTIE_SQL, lignes.join('\n'), 'utf8')
console.log(bilan.join('\n'))
console.log(`\n✓ ${bilan.length} quiz → ${SORTIE_SQL.slice(RACINE.length + 1)}`)
