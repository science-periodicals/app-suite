import { escJSON } from '@scipe/librarian';
import bundlePaths from '../utils/bundle-paths';
import vhostDataReader from './vhost-data-reader';

/**
 * !! See also vhost-reader-ssr.js for the SSR version
 */
export default function vhostReader(req, res, next) {
  vhostDataReader(req, res, (err, initialState) => {
    if (err) return next(err);
    if (!initialState) return next();

    bundlePaths(['main', 'Reader'], (err, bundles) => {
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
