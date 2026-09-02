/**
 * Règle Supabase Auth pour le code de connexion admin (/admin/login) :
 *
 *   npm run auth:configurer
 *
 * - gabarit « Magic Link » : e-mail en français qui porte le code à six chiffres
 *   (`{{ .Token }}`) — sans lui, Supabase n'envoie qu'un lien ;
 * - expiration du code : 10 minutes ;
 * - SMTP personnalisé, si SMTP_HOST / SMTP_USER / SMTP_PASS sont renseignés —
 *   le SMTP intégré de Supabase est limité à quelques envois par heure.
 *
 * Lit `.env` : SUPABASE_URL (pour le ref du projet) et SUPABASE_ACCESS_TOKEN,
 * un jeton d'accès personnel créé sur supabase.com/dashboard/account/tokens.
 * Le jeton ne sert qu'ici, jamais à l'application.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')

const env = { ...process.env }
const fichierEnv = join(RACINE, '.env')
if (existsSync(fichierEnv)) {
  for (const ligne of readFileSync(fichierEnv, 'utf8').split('\n')) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const ref = (env.SUPABASE_URL || '').match(/https?:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
const jeton = env.SUPABASE_ACCESS_TOKEN
if (!ref || !jeton) {
  console.error('SUPABASE_URL et SUPABASE_ACCESS_TOKEN sont requis dans .env')
  process.exit(1)
}

const gabarit = `<h2>Votre code de connexion</h2>
<p>Bonjour,</p>
<p>Voici le code à saisir pour accéder à l'administration E-Masterclass Big Five :</p>
<p style="font-size:28px;font-weight:700;letter-spacing:.3em;font-family:monospace">{{ .Token }}</p>
<p>Il est valable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : sans le code, personne ne peut se connecter.</p>
<p>— E-Masterclass Big Five</p>`

const reglages = {
  mailer_subjects_magic_link: '{{ .Token }} — votre code de connexion E-Masterclass',
  mailer_templates_magic_link_content: gabarit,
  mailer_otp_exp: 600,
}

if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
  Object.assign(reglages, {
    smtp_host: env.SMTP_HOST,
    smtp_port: env.SMTP_PORT || '587',
    smtp_user: env.SMTP_USER,
    smtp_pass: env.SMTP_PASS,
    smtp_admin_email: env.SMTP_EXPEDITEUR || 'ne-pas-repondre@bigfive.ci',
    smtp_sender_name: env.SMTP_NOM || 'E-Masterclass Big Five',
    smtp_max_frequency: 60,
  })
  console.info('SMTP personnalisé :', env.SMTP_HOST)
} else {
  console.info('Pas de SMTP_HOST/SMTP_USER/SMTP_PASS : le SMTP intégré de Supabase reste utilisé (quota limité).')
}

const reponse = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(reglages),
})
if (!reponse.ok) {
  console.error(`Échec ${reponse.status} :`, await reponse.text())
  process.exit(1)
}
const config = await reponse.json()
console.info('Gabarit Magic Link :', config.mailer_templates_magic_link_content?.includes('{{ .Token }}') ? 'porte le code ✓' : 'SANS code ✗')
console.info('Expiration du code :', config.mailer_otp_exp, 's')
console.info('SMTP :', config.smtp_host || 'intégré Supabase')
