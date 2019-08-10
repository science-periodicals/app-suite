import { Router } from 'express';
import createError from '@scipe/create-error';
import { unprefix } from '@scipe/jsonld';
import { addLibrarian } from '@scipe/api';

const router = new Router({ caseSensitive: true });

/**
 * Logout if any user is logged in, login with demo creds and redirect to next URL
 */
router.get(
  '/',
  addLibrarian,
  (req, res, next) => {
    if (!req.accepts('html')) {
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
    const { next: redirectUrl, user: username } = req.query;
    if (!next || !username) {
      return next(createError(400, 'Invalid demo parameters'));
    }

    const user = {
      '@id': `user:${username}`,
      password: 'pass'
    };

    req.librarian.login(user, (err, token, authHeaders) => {
      if (err) return next(err);

      req.session.isDemoUser = true;
      req.session.fromDemoPage = true;
      req.session.userId = user['@id'];
      req.session.username = unprefix(user['@id']);
      req.session.couchDBAuthSession = token;
      req.session.couchAuthHeaders = authHeaders;
      req.session.resetPouchDB = true;
      res.cookie('AuthSession', token);

      res.redirect(302, redirectUrl);
    });
  }
);

export default router;
