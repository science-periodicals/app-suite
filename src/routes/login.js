import { Router } from 'express';
import createError from '@scipe/create-error';
import csurf from 'csurf';
import uuid from 'uuid';
import bodyParser from 'body-parser';
import { unprefix } from '@scipe/jsonld';
import { escJSON, getDbName } from '@scipe/librarian';
import { addDbVersion, addLibrarian, addCsrfToken } from '@scipe/api';
import bundlePaths from '../utils/bundle-paths';

const jsonParser = bodyParser.json();
const csrf = csurf({ cookie: false });
const router = new Router({ caseSensitive: true });

router.get(
  '/',
  addDbVersion,
  addLibrarian,
  csrf,
  addCsrfToken,
  (req, res, next) => {
    if (!req.accepts('html')) {
      return next(createError(406, 'Not Acceptable'));
    }
    res.header('Vary', 'Accept');
    bundlePaths(['main'], (err, bundles) => {
      if (err) return next(err);

      res.render('index', {
        escJSON,
        bundles,
        resetPouchDB: req.session && req.session.resetPouchDB
      });
    });
  }
);

router.post(
  '/',
  addLibrarian,
  jsonParser,
  (req, res, next) => {
    let authorization =
      req.headers.authorization && req.headers.authorization.trim();

    if (authorization && authorization.startsWith('token')) {
      // Password-less authentication:
      // We skip the CSRF validation and validate the auth token instead. At the
      // end of that we redirect and skip the following middlewares (only used
      // form normal auth with username / password)
      const token = authorization.replace(/^token\s+/, '');

      req.librarian.getProxyUserByAuthenticationToken(
        token,
        (err, proxyUser) => {
          if (err) {
            return next(err);
          }

          const authToken = uuid.v4();
          const key = `${getDbName(
            req.app.locals.config
          )}:tokens:login:${authToken}`;
          req.librarian.redis.setex(
            key,
            2 * 60, // 2 minutes
            JSON.stringify(proxyUser),
            err => {
              if (err) {
                return next(err);
              }

              if (String(req.query.redirect) === 'false') {
                res.json({ next: `/?authToken=${authToken}` });
              } else {
                res.redirect(302, `/?authToken=${authToken}`);
              }
              // Note: we are done, we do _not_ call `next()`
            }
          );
        }
      );
    } else {
      // Normal login with username and password
      next();
    }
  },
  csrf,
  addCsrfToken,
  (req, res, next) => {
    if (!req.accepts('json')) {
      return next(createError(406, 'Not Acceptable'));
    }

    // logout if already logged in
    if (!req.session.username) {
      next();
    } else {
      // need to logout and to swap identity
      req.librarian.logout(err => {
        if (err) {
          req.log.warn(err, 'could not destroy previous couchdb session');
        }
        req.session.regenerate(next);
      });
    }
  },
  (req, res, next) => {
    const user = {
      '@id': `user:${req.body.username}`,
      password: req.body.password
    };

    req.librarian.login(user, (err, token, authHeaders) => {
      if (err) return next(err);

      req.session.userId = user['@id'];
      req.session.username = unprefix(user['@id']);
      req.session.couchDBAuthSession = token;
      req.session.couchAuthHeaders = authHeaders;
      req.session.resetPouchDB = true;
      res.cookie('AuthSession', token);

      req.librarian.getAppSuiteUser(user['@id'], (err, user) => {
        if (err) {
          return res.status(err.code).json({ error: err.message || 'error' });
        }
        res.status(200).json(user);
      });
    });
  }
);

export default router;
