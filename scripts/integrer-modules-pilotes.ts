/**
 * Intègre les modules pilotes livrés par Big Five (dossier
 * `MODULES VIDEOS/videosAmettreJour`) : vidéos, sous-titres et transcriptions.
 *
 *   node --experimental-strip-types scripts/integrer-modules-pilotes.ts --hls
 *   node --experimental-strip-types scripts/integrer-modules-pilotes.ts --sql
 *
 * `--hls` découpe chaque chapitre en flux HLS dans `medias/hls/<cle>/`, sans
 * réencodage : la livraison porte déjà un 1080p et un 720p aux images clés
 * alignées, à des débits faibles (≈ 360 et 250 kbit/s). Une copie de flux
 * suffit donc, là où `transcoder-video.mjs` prendrait des heures. Les clés sont
 * consignées dans `medias/pilotes/manifeste.json`, pour qu'une reprise réutilise
 * les mêmes. L'envoi se fait ensuite avec `npm run video:publier -- <cle>…`.
 *
 * `--sql` écrit `supabase/rattrapage-modules-pilotes.sql` : modules renommés,
 * renumérotés ou créés, fiches, chapitres (mis à jour en place pour garder
 * leurs identifiants, donc la progression des apprenants), médiathèque et
 * publication. Il s'applique avec `npm run db:appliquer -- <fichier>`.
 */
import { execFileSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyserSousTitres } from '../server/utils/soustitres.ts'
import { FAQ_COMMUNE, FICHES, type FicheModule } from '../server/data/modulesPilotes.ts'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const LIVRAISON = join(RACINE, 'MODULES VIDEOS/videosAmettreJour')
const HLS = join(RACINE, 'medias/hls')
const MANIFESTE = join(RACINE, 'medias/pilotes/manifeste.json')
const SORTIE_SQL = join(RACINE, 'supabase/rattrapage-modules-pilotes.sql')

interface Chapitre {
  module: string
  position: number
  code: string
  titre: string
  dossier: string
  nom: string
  dureeSecondes: number
  sha256: string
  cle?: string
  octets?: number
  paliers?: string[]
}

/** Les chapitres de la livraison, lus dans les JSON de transcription. */
function lireLivraison(): Chapitre[] {
  const chapitres: Chapitre[] = []
  for (const programme of readdirSync(join(LIVRAISON, '1080P'))) {
    const dossierProgramme = join(LIVRAISON, '1080P', programme)
    if (!statSync(dossierProgramme).isDirectory()) continue
    for (const module of readdirSync(dossierProgramme)) {
      const dossierModule = join(dossierProgramme, module)
      if (!statSync(dossierModule).isDirectory()) continue
      for (const dossier of readdirSync(dossierModule).filter((d) => /^C\d\d_/.test(d)).sort()) {
        const json = readdirSync(join(dossierModule, dossier)).find((f) => f.endsWith('.json'))
        if (!json) throw new Error(`Transcription absente : ${module}/${dossier}`)
        const t = JSON.parse(readFileSync(join(dossierModule, dossier, json), 'utf8'))
        if (t.transcription?.statut_editorial !== 'valide') throw new Error(`Non validé : ${json}`)
        chapitres.push({
          module: t.module.id,
          position: t.chapitre.ordre,
          code: t.chapitre.code,
          titre: t.chapitre.titre,
          dossier: relative(join(LIVRAISON, '1080P'), join(dossierModule, dossier)),
          nom: json.replace(/\.json$/, ''),
          dureeSecondes: t.source.duree_s,
          sha256: t.source.sha256,
        })
      }
    }
  }
  return chapitres
}

function sonde(fichier: string, ...args: string[]): string {
  return execFileSync('ffprobe', ['-v', 'error', ...args, fichier], { encoding: 'utf8' }).trim()
}

/** « avc1.640028 » : profil et niveau H.264, tels que le master HLS les annonce. */
function codecVideo(fichier: string): string {
  const [profil, niveau] = sonde(fichier, '-select_streams', 'v:0', '-show_entries', 'stream=profile,level', '-of', 'csv=p=0').split(',')
  const idc = { Baseline: '42', 'Constrained Baseline': '42', Main: '4d', High: '64' }[profil!] ?? '64'
  return `avc1.${idc}00${Number(niveau).toString(16).padStart(2, '0')}`
}

function empreinte(fichier: string): Promise<string> {
  return new Promise((ok, ko) => {
    const hachage = createHash('sha256')
    createReadStream(fichier).on('data', (d) => hachage.update(d)).on('end', () => ok(hachage.digest('hex'))).on('error', ko)
  })
}

function poids(dossier: string): number {
  return readdirSync(dossier, { withFileTypes: true }).reduce((total, e) => {
    const chemin = join(dossier, e.name)
    return total + (e.isDirectory() ? poids(chemin) : statSync(chemin).size)
  }, 0)
}

/** Débit de pointe d'une variante, mesuré sur ses segments : c'est ce que BANDWIDTH doit annoncer. */
function debitPointe(dossierVariante: string): { pointe: number; moyen: number } {
  const playlist = readFileSync(join(dossierVariante, 'index.m3u8'), 'utf8').split('\n')
  let pointe = 0
  let octets = 0
  let duree = 0
  for (let i = 0; i < playlist.length; i++) {
    const m = playlist[i]!.match(/^#EXTINF:([\d.]+)/)
    if (!m) continue
    const taille = statSync(join(dossierVariante, playlist[i + 1]!.trim())).size
    const secondes = Number(m[1])
    octets += taille
    duree += secondes
    if (secondes > 1) pointe = Math.max(pointe, (taille * 8) / secondes)
  }
  return { pointe: Math.ceil(pointe), moyen: Math.ceil((octets * 8) / duree) }
}

function lireManifeste(): Record<string, Chapitre> {
  return existsSync(MANIFESTE) ? JSON.parse(readFileSync(MANIFESTE, 'utf8')) : {}
}

async function preparerHls() {
  const manifeste = lireManifeste()
  const chapitres = lireLivraison()
  mkdirSync(dirname(MANIFESTE), { recursive: true })

  for (const ch of chapitres) {
    const id = `${ch.module}-${ch.code}`
    const fiche = (FICHES as Record<string, FicheModule | undefined>)[ch.module]
    if (!fiche) throw new Error(`Module sans fiche : ${ch.module}`)
    const cle = manifeste[id]?.cle
      ?? `${fiche.slug.slice(0, 62)}-ch${String(ch.position + 1).padStart(2, '0')}-${randomBytes(3).toString('hex')}`
    const sortie = join(HLS, cle)

    if (existsSync(join(sortie, 'info.json'))) {
      console.log(`= ${id} déjà prêt (${cle})`)
      manifeste[id] = { ...ch, ...manifeste[id], cle }
      continue
    }

    const source1080 = join(LIVRAISON, '1080P', ch.dossier, `${ch.nom}.mp4`)
    const source720 = join(LIVRAISON, '720P', ch.dossier, `${ch.nom}.mp4`)
    if (!existsSync(source720)) throw new Error(`720p absent : ${source720}`)
    if ((await empreinte(source1080)) !== ch.sha256) throw new Error(`Empreinte différente : ${source1080}`)
    const d1080 = Number(sonde(source1080, '-show_entries', 'format=duration', '-of', 'csv=p=0'))
    const d720 = Number(sonde(source720, '-show_entries', 'format=duration', '-of', 'csv=p=0'))
    if (Math.abs(d1080 - d720) > 0.1) throw new Error(`Durées différentes 1080p/720p : ${ch.nom}`)

    console.log(`→ ${id} (${Math.round(d1080)} s) → ${cle}`)
    mkdirSync(sortie, { recursive: true })
    execFileSync('ffmpeg', [
      '-y', '-i', source720, '-i', source1080,
      '-map', '0:v:0', '-map', '0:a:0', '-map', '1:v:0', '-map', '1:a:0',
      '-c', 'copy',
      '-f', 'hls',
      '-hls_time', '6',
      '-hls_playlist_type', 'vod',
      '-hls_flags', 'independent_segments',
      '-hls_segment_filename', join(sortie, '%v', 'segment_%04d.ts'),
      '-var_stream_map', 'v:0,a:0,name:720p v:1,a:1,name:1080p',
      join(sortie, '%v', 'index.m3u8'),
    ], { stdio: ['ignore', 'ignore', 'inherit'] })

    // Master écrit à la main : en copie de flux, ffmpeg ne connaît pas le débit
    // réel et annoncerait une BANDWIDTH fausse, qui égarerait le choix de qualité.
    const audio = 'mp4a.40.2'
    const variantes = [
      { nom: '720p', source: source720, resolution: '1280x720' },
      { nom: '1080p', source: source1080, resolution: '1920x1080' },
    ]
    const master = ['#EXTM3U', '#EXT-X-VERSION:3', '#EXT-X-INDEPENDENT-SEGMENTS']
    for (const v of variantes) {
      const { pointe, moyen } = debitPointe(join(sortie, v.nom))
      master.push(
        `#EXT-X-STREAM-INF:BANDWIDTH=${pointe},AVERAGE-BANDWIDTH=${moyen},RESOLUTION=${v.resolution},CODECS="${codecVideo(v.source)},${audio}"`,
        `${v.nom}/index.m3u8`,
      )
    }
    writeFileSync(join(sortie, 'master.m3u8'), `${master.join('\n')}\n`)

    execFileSync('ffmpeg', ['-y', '-ss', '2', '-i', source1080, '-frames:v', '1', '-vf', 'scale=-2:720', join(sortie, 'poster.jpg')], { stdio: 'ignore' })
    writeFileSync(join(sortie, 'sous-titres.vtt'), readFileSync(join(LIVRAISON, '1080P', ch.dossier, `${ch.nom}.vtt`)))

    const octets = poids(sortie)
    writeFileSync(join(sortie, 'info.json'), `${JSON.stringify({
      cle,
      source: relative(RACINE, source1080),
      dureeSecondes: Math.round(d1080),
      paliers: ['720p', '1080p'],
      octets,
      transcodeLe: new Date().toISOString(),
    }, null, 2)}\n`)

    manifeste[id] = { ...ch, cle, octets, paliers: ['720p', '1080p'] }
    writeFileSync(MANIFESTE, `${JSON.stringify(manifeste, null, 2)}\n`)
  }
  writeFileSync(MANIFESTE, `${JSON.stringify(manifeste, null, 2)}\n`)
  console.log(`\n✓ ${chapitres.length} chapitres prêts. Envoi : npm run video:publier -- ${Object.values(manifeste).map((c) => c.cle).join(' ')}`)
}

const sql = (v: string | null | undefined) => (v == null ? 'null' : `'${v.replace(/'/g, "''")}'`)
const jsonb = (v: unknown) => `${sql(JSON.stringify(v))}::jsonb`
const tableau = (v: string[]) => `array[${v.map(sql).join(', ')}]::text[]`

function genererSql() {
  const manifeste = lireManifeste()
  const chapitres = Object.values(manifeste).sort((a, b) => a.module.localeCompare(b.module) || a.position - b.position)
  if (chapitres.length !== lireLivraison().length) throw new Error('Manifeste incomplet : relancer --hls')
  const maintenant = new Date().toISOString()
  const lignes: string[] = [
    '-- Modules pilotes livrés par Big Five le 20/10/2026 (MODULES VIDEOS/videosAmettreJour).',
    '-- Généré par scripts/integrer-modules-pilotes.ts --sql : ne pas modifier à la main.',
    '-- Sauvegarde de l’état antérieur : docs/sauvegardes/modules-avant-pilotes-2026-10-20.json',
    'begin;',
    '',
    '-- Numéros : le dossier fait foi. unique(programme, numero) impose un passage',
    '-- par des numéros provisoires.',
    "update modules set numero = numero + 100 where id in ('mod-contenus-qui-attirent-des-clients', 'mod-etre-visible-localement-sur-internet', 'mod-comprendre-le-business-du-client');",
    "update modules set numero = 7 where id = 'mod-etre-visible-localement-sur-internet';",
    "update modules set numero = 11 where id = 'mod-comprendre-le-business-du-client';",
    '',
  ]

  for (const [code, f] of Object.entries(FICHES) as [string, FicheModule][]) {
    const siens = chapitres.filter((c) => c.module === code)
    const minutes = Math.round(siens.reduce((t, c) => t + c.dureeSecondes, 0) / 60)
    const champs = {
      slug: sql(f.slug),
      numero: String(f.numero),
      titre: sql(f.titre),
      programme: sql(f.programme),
      thematique_id: sql(f.thematiqueId),
      formateur_id: sql(f.formateurId),
      promesse: sql(f.promesse),
      pourquoi: sql(f.pourquoi),
      pour_qui: tableau(f.pourQui),
      prerequis: sql(f.prerequis),
      acquis: tableau(f.acquis),
      livrable: sql(f.livrable),
      faq: jsonb([...f.faq, ...FAQ_COMMUNE]),
      points_forts: tableau(f.pointsForts),
      duree_minutes: String(minutes),
      seo_mot_cle_principal: sql(f.seo.motCle),
      seo_title: sql(f.seo.titre),
      seo_meta_description: sql(f.seo.description),
      statut: "'disponible'",
      publie_le: sql(maintenant.slice(0, 10)),
      pret_le: sql(maintenant),
    }
    lignes.push(`-- ${code} · ${f.titre}`)
    if (f.nouveau) {
      lignes.push(
        `insert into modules (id, prix_fcfa, ${Object.keys(champs).join(', ')})`,
        `values (${sql(f.id)}, 10000, ${Object.values(champs).join(', ')});`,
      )
    } else {
      lignes.push(
        `update modules set ${Object.entries(champs).map(([k, v]) => `${k} = ${v}`).join(',\n  ')},\n  maj_le = now()`,
        `where id = ${sql(f.id)};`,
      )
    }

    for (const c of siens) {
      const dossier = join(LIVRAISON, '1080P', c.dossier)
      const script = analyserSousTitres(readFileSync(join(dossier, `${c.nom}.srt`), 'utf8'))
      const secondes = Math.round(c.dureeSecondes)
      const libelle = c.position === 0 ? 'Introduction' : `Chapitre ${c.position}`
      // Le titre vient de la fiche, qui suit la typographie du catalogue ; il
      // doit rester celui de la transcription. Seule la position 0 diffère : son
      // carton « Intro » double le libellé « Introduction ».
      const titre = f.chapitres[c.position]
      if (!titre || (c.position > 0 && titre.replace(/’/g, "'") !== c.titre)) {
        throw new Error(`Titre du chapitre ${code} ${c.code} : « ${titre} » ≠ « ${c.titre} »`)
      }
      const nomFichier = `${c.nom}.mp4`
      lignes.push(
        `with v as (`,
        `  insert into videos (cle, nom, nom_fichier, taille_octets, duree_secondes, format)`,
        `  values (${sql(c.cle!)}, ${sql(`${f.titre} · ${libelle} · ${titre}`)}, ${sql(nomFichier)}, ${c.octets}, ${secondes}, 'hls')`,
        `  returning id`,
        `)`,
        `insert into chapitres (module_id, position, libelle, titre, duree_minutes, script, script_format, script_nom_fichier, script_importe_le,`,
        `  video_id, video_cle, video_format, video_duree_secondes, video_nom_fichier, video_taille_octets, video_importee_le, sous_titres)`,
        `select ${sql(f.id)}, ${c.position}, ${sql(libelle)}, ${sql(titre)}, ${Math.max(1, Math.round(secondes / 60))}, ${jsonb(script)}, 'srt', ${sql(`${c.nom}.srt`)}, now(),`,
        `  v.id, ${sql(c.cle!)}, 'hls', ${secondes}, ${sql(nomFichier)}, ${c.octets}, now(), true from v`,
        `on conflict (module_id, position) do update set libelle = excluded.libelle, titre = excluded.titre, duree_minutes = excluded.duree_minutes,`,
        `  script = excluded.script, script_format = excluded.script_format, script_nom_fichier = excluded.script_nom_fichier, script_importe_le = excluded.script_importe_le,`,
        `  video_id = excluded.video_id, video_cle = excluded.video_cle, video_format = excluded.video_format, video_duree_secondes = excluded.video_duree_secondes,`,
        `  video_nom_fichier = excluded.video_nom_fichier, video_taille_octets = excluded.video_taille_octets, video_importee_le = excluded.video_importee_le,`,
        `  sous_titres = excluded.sous_titres;`,
      )
    }
    if (siens.length !== f.chapitres.length) throw new Error(`${code} : ${siens.length} vidéos pour ${f.chapitres.length} chapitres`)
    const dernier = Math.max(...siens.map((c) => c.position))
    lignes.push(`delete from chapitres where module_id = ${sql(f.id)} and position > ${dernier};`, '')
  }

  lignes.push('commit;', '')
  writeFileSync(SORTIE_SQL, lignes.join('\n'))
  console.log(`✓ ${relative(RACINE, SORTIE_SQL)} — ${Object.keys(FICHES).length} modules, ${chapitres.length} chapitres`)
}

const mode = process.argv[2]
if (mode === '--hls') await preparerHls()
else if (mode === '--sql') genererSql()
else {
  console.error('Usage : node --experimental-strip-types scripts/integrer-modules-pilotes.ts --hls | --sql')
  process.exit(1)
}
