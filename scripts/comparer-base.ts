/**
 * Compare le contenu du dépôt à celui de la base en ligne.
 *
 *   npm run db:comparer
 *
 * `server/data/db.ts` installe une base neuve ; le contenu éditorial se pilote
 * ensuite dans l'administration. Les deux dérivent donc forcément l'un de
 * l'autre, et c'est normal. Ce script ne synchronise rien : il dit ce qui
 * diffère, pour qu'une dérive soit un choix et non une surprise.
 *
 * Sort en code 1 dès qu'un écart est trouvé — utilisable en intégration.
 *
 * Lit `.env` : SUPABASE_URL et SUPABASE_SECRET_KEY.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { formateurs, modules, programmes, thematiques } from '../server/data/db.ts'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')

// --- Connexion --------------------------------------------------------------

const env: Record<string, string | undefined> = { ...process.env }
const fichierEnv = join(RACINE, '.env')
if (existsSync(fichierEnv)) {
  for (const ligne of readFileSync(fichierEnv, 'utf8').split('\n')) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1]! in env)) env[m[1]!] = m[2]!.replace(/^["']|["']$/g, '')
  }
}

const url = env.SUPABASE_URL
const cle = env.SUPABASE_SECRET_KEY
if (!url || !cle) {
  console.error('SUPABASE_URL et SUPABASE_SECRET_KEY sont requis dans .env')
  process.exit(1)
}

/**
 * Lecture par l'API REST plutôt que par `@supabase/supabase-js` : la librairie
 * refuse la requête quand l'horloge du poste devance celle du serveur
 * (« JWT issued at future »), ce qui n'a rien à voir avec la comparaison.
 */
async function lire(table: string): Promise<Record<string, unknown>[]> {
  const reponse = await fetch(`${url}/rest/v1/${table}?select=*&limit=10000`, {
    headers: { apikey: cle!, authorization: `Bearer ${cle}` },
  })
  if (!reponse.ok) {
    console.error(`Lecture de « ${table} » impossible : ${reponse.status} ${await reponse.text()}`)
    process.exit(1)
  }
  return (await reponse.json()) as Record<string, unknown>[]
}

// --- Rapport ----------------------------------------------------------------

const GRIS = '[90m'
const ROUGE = '[31m'
const VERT = '[32m'
const JAUNE = '[33m'
const NORMAL = '[0m'

let ecarts = 0

/** Une ligne de rapport par champ divergent, tronquée pour rester lisible. */
function ecart(cle: string, champ: string, depot: unknown, enBase: unknown) {
  ecarts++
  const court = (v: unknown) => {
    const s = Array.isArray(v) ? v.join(' · ') : String(v ?? '∅')
    return s.length > 72 ? `${s.slice(0, 71)}…` : s
  }
  console.log(`  ${JAUNE}≠${NORMAL} ${cle} · ${champ}`)
  console.log(`      dépôt ${GRIS}${court(depot)}${NORMAL}`)
  console.log(`      base  ${GRIS}${court(enBase)}${NORMAL}`)
}

function manquant(signe: '+' | '−', cle: string, precision: string) {
  ecarts++
  const couleur = signe === '+' ? VERT : ROUGE
  console.log(`  ${couleur}${signe}${NORMAL} ${cle} ${GRIS}${precision}${NORMAL}`)
}

/**
 * Confronte deux collections indexées par identifiant.
 * `champs` associe le nom de colonne en base à la valeur attendue côté dépôt.
 */
function comparer<T>(
  titre: string,
  cotedepot: T[],
  coteBase: Record<string, unknown>[],
  identifiant: (element: T) => string,
  champs: (element: T) => Record<string, unknown>,
) {
  console.log(`\n${titre}`)
  const parId = new Map(coteBase.map((l) => [String(l.id), l]))
  const vus = new Set<string>()

  for (const element of cotedepot) {
    const id = identifiant(element)
    vus.add(id)
    const ligne = parId.get(id)
    if (!ligne) {
      manquant('+', id, '— dans le dépôt, absent de la base')
      continue
    }
    for (const [colonne, attendu] of Object.entries(champs(element))) {
      const trouve = ligne[colonne]
      const memeValeur = Array.isArray(attendu)
        ? JSON.stringify(attendu) === JSON.stringify(trouve ?? [])
        : (attendu ?? null) === (trouve ?? null)
      if (!memeValeur) ecart(id, colonne, attendu, trouve)
    }
  }

  for (const ligne of coteBase)
    if (!vus.has(String(ligne.id)))
      manquant('−', String(ligne.id), '— en base, absent du dépôt')
}

// --- Comparaisons -----------------------------------------------------------

const [programmesBase, thematiquesBase, formateursBase, modulesBase, chapitresBase] =
  await Promise.all([
    lire('programmes'),
    lire('thematiques'),
    lire('formateurs'),
    lire('modules'),
    lire('chapitres'),
  ])

comparer(
  'Programmes',
  programmes,
  programmesBase,
  (p) => p.id,
  (p) => ({
    slug: p.slug,
    nom: p.nom,
    couleur: p.couleur,
    description_hero: p.descriptionHero,
  }),
)

comparer(
  'Thématiques',
  thematiques,
  thematiquesBase,
  (t) => t.id,
  (t) => ({ numero: t.numero, nom: t.nom, programme: t.programme, phase_id: t.phaseId }),
)

comparer(
  'Formateurs',
  formateurs,
  formateursBase,
  (f) => f.id,
  (f) => ({
    slug: f.slug,
    nom: f.nom,
    expertise: f.expertise,
    programme_principal: f.programmePrincipal,
  }),
)

comparer(
  'Modules',
  modules,
  modulesBase,
  (m) => m.id,
  (m) => ({
    slug: m.slug,
    numero: m.numero,
    titre: m.titre,
    programme: m.programme,
    thematique_id: m.thematiqueId,
    formateur_id: m.formateurId,
    statut: m.statut,
    prix_fcfa: m.prixFcfa,
    duree_minutes: m.dureeMinutes,
  }),
)

// Les chapitres n'ont pas d'identifiant stable côté dépôt : ils se repèrent
// par module et position, comme partout ailleurs dans le projet.
console.log('\nChapitres')
const chapitresParModule = new Map<string, Record<string, unknown>[]>()
for (const c of chapitresBase) {
  const liste = chapitresParModule.get(String(c.module_id)) ?? []
  liste.push(c)
  chapitresParModule.set(String(c.module_id), liste)
}

for (const module of modules) {
  const enBase = (chapitresParModule.get(module.id) ?? []).sort(
    (a, b) => Number(a.position) - Number(b.position),
  )
  if (!enBase.length && !chapitresParModule.has(module.id)) continue

  if (enBase.length !== module.chapitres.length)
    ecart(module.id, 'nombre de chapitres', module.chapitres.length, enBase.length)

  module.chapitres.forEach((chapitre, position) => {
    const ligne = enBase.find((c) => Number(c.position) === position)
    if (!ligne) {
      manquant('+', `${module.id} · ch${String(position).padStart(2, '0')}`, `— « ${chapitre.titre} »`)
      return
    }
    const repere = `${module.id} · ch${String(position).padStart(2, '0')}`
    if (chapitre.titre !== ligne.titre) ecart(repere, 'titre', chapitre.titre, ligne.titre)
    if (chapitre.libelle !== ligne.libelle) ecart(repere, 'libelle', chapitre.libelle, ligne.libelle)
    // Les vidéos sont déposées depuis l'administration, qui forge la clé : une
    // clé en base et rien dans le dépôt est le cas normal, pas un écart. Seule
    // une clé déclarée des deux côtés et différente mérite d'être signalée.
    if (chapitre.videoCle && chapitre.videoCle !== ligne.video_cle)
      ecart(repere, 'video_cle', chapitre.videoCle, ligne.video_cle)
  })
}

// --- Verdict ----------------------------------------------------------------

console.log()
if (ecarts === 0) {
  console.log(`${VERT}✓${NORMAL} dépôt et base en ligne disent la même chose.`)
  process.exit(0)
}
console.log(`${JAUNE}${ecarts} écart(s)${NORMAL} entre le dépôt et la base en ligne.`)
console.log(
  `${GRIS}+ présent dans le dépôt seulement · − présent en base seulement · ≠ valeurs différentes${NORMAL}`,
)
console.log(
  `${GRIS}Un écart n'est pas une erreur : le contenu s'édite dans l'administration, le dépôt n'installe que la base neuve.${NORMAL}`,
)
process.exit(1)
