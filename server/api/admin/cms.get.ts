import { listerBlocsVitrine, listerTemoignages, listerVersions } from '../../database/backoffice'
import { exigerSection } from '../../utils/session'

/** CMS du site vitrine (planche C, écran 15). */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'cms-site-vitrine')
  const [blocs, temoignages, versions] = await Promise.all([
    listerBlocsVitrine(),
    listerTemoignages(),
    // L'historique est restaurable en un clic : chaque enregistrement y dépose
    // l'état précédent, autant le montrer là où l'on édite.
    listerVersions('blocs_vitrine', undefined, 40),
  ])
  return { blocs, temoignages, versions }
})
