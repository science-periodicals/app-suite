import { escJSON } from '@scipe/librarian';
import bundlePaths from '../utils/bundle-paths';
import vhostDataSifter from './vhost-data-sifter';

/**
 * !! See also vhost-sifter-ssr.js for the SSR version
 */
export default function vhostSifter(req, res, next) {
  vhostDataSifter(req, res, (err, initialState) => {
    if (err) return next(err);
    if (!initialState) return next();

    bundlePaths(['main', 'Sifter', 'JournalPage'], (err, bundles) => {
      if (err) return next(err);
      res.render('index', {
        isJournalSubdomain: true,
        escJSON,
        bundles,
        initialState
      });
    });
  });
}
