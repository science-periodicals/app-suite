import { Router } from 'express';
import csurf from 'csurf';
import createError from '@scipe/create-error';
import { addDbVersion, addLibrarian, addCsrfToken } from '@scipe/api';
import { escJSON } from '@scipe/librarian';
import bundlePaths from '../utils/bundle-paths';

// TODO SSR

const router = new Router({ caseSensitive: true });
const csrf = csurf({ cookie: false });

router.get(
  '/:type?',
  csrf,
  addCsrfToken,
  addDbVersion,
  addLibrarian,
  (req, res, next) => {
    checkCouchLogin(req, (err, ok) => {
      if (err) return next(err);
      if (!ok) {
        return next(createError(403, 'Need to re-login'));
      }

      getUser(req, (err, user) => {
        if (err) {
          return next(err);
        }
        res.header('Vary', 'Accept');
        bundlePaths(['main', 'Explorer'], (err, bundles) => {
          if (err) return next(err);

          res.render('index', {
            escJSON,
            bundles,
            initialState: { user }
          });
        });
      });
    });
  }
);

export default router;

function checkCouchLogin(req, callback) {
  if (!req.session.username) {
    callback(null, true);
  } else {
    req.librarian.checkCouchLogin(callback);
  }
}

function getUser(req, callback) {
  if (!req.session.username) {
    callback(null, {});
  } else {
    req.librarian.getAppSuiteUser(`user:${req.session.username}`, callback);
  }
}
