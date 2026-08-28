import { listerBlocsVitrine, listerTemoignages } from '../../database/backoffice'
import { exigerSection } from '../../utils/session'

/** CMS du site vitrine (planche C, écran 06). */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'cms-site-vitrine')
  const [blocs, temoignages] = await Promise.all([listerBlocsVitrine(), listerTemoignages()])
  return { blocs, temoignages }
})
