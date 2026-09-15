/**
 * Contrôle la chaîne vidéo, sans réseau ni base.
 *
 *   npm run video:verifier
 *
 * Deux implémentations de la signature coexistent — l'application et le Worker
 * Cloudflare, qui ne peuvent pas partager de code. Une divergence entre elles
 * rendrait toutes les vidéos illisibles en production alors que tout
 * fonctionnerait en développement : c'est précisément le genre de panne que ce
 * contrôle attrape avant la mise en ligne.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHmac } from 'node:crypto'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')

let reussis = 0
let echoues = 0
const succes = (m) => (console.log(`  \x1b[32m✓\x1b[0m ${m}`), reussis++)
const echec = (m) => (console.log(`  \x1b[31m✗\x1b[0m ${m}`), echoues++)

// --- Le Worker signe-t-il comme l'application ? ------------------------------

console.log('\nSignature')

const worker = await import(join(RACINE, 'infra/worker-video/src/index.js'))
const source = readFileSync(join(RACINE, 'infra/worker-video/src/index.js'), 'utf8')

// Le module du Worker n'exporte que son gestionnaire ; on rejoue sa fonction
// de signature en la relisant, ce qui garantit qu'on teste bien son code.
const signerWorker = new Function(
  `${source.slice(source.indexOf('function messageASigner'), source.indexOf('async function verifierSignature'))}
   return signer`,
)()

const CAS = [
  ['demo-accroches-ch01', 1790000000, 'usr-aya'],
  ['mod-x-ch12', 1, 'usr-000000'],
  ['a-b-c', 2147483647, 'usr-éàü'],
]
const SECRET = 'secret-de-controle-e-masterclass-32-caracteres'

for (const [cle, expiration, utilisateur] of CAS) {
  const message = `${cle}.${expiration}.${utilisateur}`
  const attendue = createHmac('sha256', SECRET).update(message).digest('base64url')
  const obtenue = await signerWorker(message, SECRET)
  if (obtenue === attendue) succes(`worker et référence concordent — ${cle}`)
  else echec(`worker diverge sur ${cle} : ${obtenue} au lieu de ${attendue}`)
}

// --- Le Worker refuse-t-il ce qu'il doit refuser ? ---------------------------

console.log('\nRefus attendus')

const verifier = new Function(
  `${source.slice(source.indexOf('function messageASigner'), source.indexOf('export default'))}
   return verifierSignature`,
)()

const maintenant = 1790000000
const valide = await signerWorker(`demo.${maintenant + 100}.usr-aya`, SECRET)

const REFUS = [
  ['autorisation absente', 'demo/master.m3u8', {}],
  ['autorisation expirée', 'demo/master.m3u8', { e: maintenant - 1, u: 'usr-aya', s: valide }],
  ['signature invalide', 'demo/master.m3u8', { e: maintenant + 100, u: 'usr-aya', s: 'x'.repeat(43) }],
  // Une autorisation vaut pour un dossier, et pour lui seul.
  ['signature invalide', 'autre/master.m3u8', { e: maintenant + 100, u: 'usr-aya', s: valide }],
  // Le destinataire fait partie du message signé : on ne peut pas s'en réclamer d'un autre.
  ['signature invalide', 'demo/master.m3u8', { e: maintenant + 100, u: 'usr-moussa', s: valide }],
]

for (const [attendu, chemin, parametres] of REFUS) {
  const obtenu = await verifier(chemin, new URLSearchParams(parametres), SECRET, maintenant)
  if (obtenu === attendu) succes(`${chemin} → ${obtenu}`)
  else echec(`${chemin} — « ${attendu} » attendu, « ${obtenu} » reçu`)
}

const accepte = await verifier(
  'demo/720p/segment_0001.ts',
  new URLSearchParams({ e: String(maintenant + 100), u: 'usr-aya', s: valide }),
  SECRET,
  maintenant,
)
if (accepte === null) succes('segment du dossier autorisé → accepté')
else echec(`segment légitime refusé : ${accepte}`)

// --- Le jeton d'écriture est-il bien étanche à celui de lecture ? ------------
//
// Trois confusions doivent être impossibles : rejouer une autorisation de
// lecture en écriture, l'inverse, et se servir d'un jeton émis pour pousser
// des parts afin de supprimer l'objet. Les vérifier vaut mieux que les décrire.

console.log('\nJeton d’écriture')

const verifierEcritureWorker = new Function(
  `${source.slice(source.indexOf('function messageASigner'), source.indexOf('export default'))}
   return verifierEcriture`,
)()

const CLE = 'mod-essai-ch01-a1b2c3'
const UPLOAD = 'upload-de-controle'
const ECHEANCE = maintenant + 100

const jetonPart = await signerWorker(
  `ecriture.part.${CLE}.${UPLOAD}.${ECHEANCE}.usr-houefa`,
  SECRET,
)
const parametresPart = () =>
  new URLSearchParams({ e: String(ECHEANCE), u: 'usr-houefa', j: jetonPart })

const accepteEcriture = await verifierEcritureWorker(
  'part',
  CLE,
  UPLOAD,
  parametresPart(),
  SECRET,
  maintenant,
)
if (accepteEcriture === null) succes('jeton d’écriture légitime → accepté')
else echec(`jeton d’écriture légitime refusé : ${accepteEcriture}`)

// Le même jeton pour une autre action : refusé.
const autreAction = await verifierEcritureWorker(
  'objet',
  CLE,
  UPLOAD,
  parametresPart(),
  SECRET,
  maintenant,
)
if (autreAction === 'signature invalide') succes('jeton « part » refusé pour l’action « objet »')
else echec(`jeton « part » accepté pour « objet » : ${autreAction}`)

// Le même jeton pour un autre dépôt : refusé.
const autreDepot = await verifierEcritureWorker(
  'part',
  CLE,
  'un-autre-upload',
  parametresPart(),
  SECRET,
  maintenant,
)
if (autreDepot === 'signature invalide') succes('jeton refusé pour un autre téléversement')
else echec(`jeton accepté pour un autre téléversement : ${autreDepot}`)

// Une autorisation de lecture rejouée en écriture : refusée.
const jetonLecture = await signerWorker(`${CLE}.${ECHEANCE}.usr-houefa`, SECRET)
const lectureEnEcriture = await verifierEcritureWorker(
  'part',
  CLE,
  UPLOAD,
  new URLSearchParams({ e: String(ECHEANCE), u: 'usr-houefa', j: jetonLecture }),
  SECRET,
  maintenant,
)
if (lectureEnEcriture === 'signature invalide') succes('autorisation de lecture refusée en écriture')
else echec(`autorisation de lecture acceptée en écriture : ${lectureEnEcriture}`)

// Et l'inverse : un jeton d'écriture présenté au vérificateur de lecture.
const ecritureEnLecture = await verifier(
  `${CLE}/video.mp4`,
  new URLSearchParams({ e: String(ECHEANCE), u: 'usr-houefa', s: jetonPart }),
  SECRET,
  maintenant,
)
if (ecritureEnLecture === 'signature invalide') succes('jeton d’écriture refusé en lecture')
else echec(`jeton d’écriture accepté en lecture : ${ecritureEnLecture}`)

// Le paramètre porte un nom distinct : un jeton d'écriture posé en `s` n'est
// même pas vu par le vérificateur d'écriture.
const mauvaisParametre = await verifierEcritureWorker(
  'part',
  CLE,
  UPLOAD,
  new URLSearchParams({ e: String(ECHEANCE), u: 'usr-houefa', s: jetonPart }),
  SECRET,
  maintenant,
)
if (mauvaisParametre === 'autorisation absente') succes('jeton d’écriture attendu en « j », pas en « s »')
else echec(`paramètre « s » accepté en écriture : ${mauvaisParametre}`)

// --- Les deux vérificateurs disent-ils la même chose ? -----------------------
//
// Comparer les résultats ne suffit pas : une branche oubliée d'un côté ne se
// verrait que sur le cas qui l'emprunte. On compare donc le corps des deux
// fonctions, aux différences de langage près.

console.log('Cohérence des deux implémentations')

function corps(texte, nom) {
  const debut = texte.indexOf(`function ${nom}`)
  const fin = texte.indexOf('\n}', debut)
  return texte
    .slice(debut, fin)
    .replace(/\/\*[\s\S]*?\*\//g, '')       // commentaires de bloc
    .replace(/\/\/.*$/gm, '')               // commentaires de ligne
    .replace(/:\s*(string|number|URLSearchParams|Promise<[^>]+>)/g, '') // annotations TypeScript
    .replace(/\s+/g, ' ')
    // Mise en forme : virgule finale et espaces de parenthèses ne font pas
    // une différence de comportement.
    .replace(/,\s*\)/g, ')')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim()
}

const cotéServeur = readFileSync(join(RACINE, 'server/utils/video.ts'), 'utf8')

for (const nom of [
  'messageASigner',
  'verifierSignature',
  'reecrirePlaylist',
  'messageEcriture',
  'verifierEcriture',
]) {
  if (corps(cotéServeur, nom) === corps(source, nom)) succes(`${nom} identique de part et d'autre`)
  else echec(`${nom} diverge entre server/utils/video.ts et le Worker`)
}

// --- Les flux transcodés sont-ils complets ? ---------------------------------

console.log('\nFlux transcodés')
const hls = join(RACINE, 'medias/hls')

if (!existsSync(hls)) {
  console.log('  (aucun flux local — rien à contrôler)')
} else {
  for (const cle of readdirSync(hls)) {
    const dossier = join(hls, cle)
    const master = join(dossier, 'master.m3u8')
    if (!existsSync(master)) {
      echec(`${cle} — master.m3u8 absent`)
      continue
    }
    const variantes = readFileSync(master, 'utf8')
      .split('\n')
      .filter((l) => l.trim().endsWith('.m3u8'))
    const manquantes = variantes.filter((v) => !existsSync(join(dossier, v.trim())))
    if (manquantes.length) echec(`${cle} — variantes absentes : ${manquantes.join(', ')}`)
    else if (!existsSync(join(dossier, 'info.json'))) echec(`${cle} — info.json absent`)
    else succes(`${cle} — ${variantes.length} variantes`)
  }
}

console.log(`\n${reussis} réussis, ${echoues} échoués\n`)
process.exit(echoues ? 1 : 0)
