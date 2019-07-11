import { Router } from 'express';
import createError from '@scipe/create-error';
import { addLibrarian } from '@scipe/api';

const router = new Router({ caseSensitive: true });

router.get('/', addLibrarian, (req, res, next) => {
  if (!req.accepts('html')) {
    return next(createError(406, 'Not Acceptable'));
  }

  req.librarian.logout((err, headers, body) => {
    // we do nothing if error, just log it
    if (err) {
      req.log.warn(err, 'could not delete CouchDB session');
    }
    req.log.trace({ headers, body }, 'librarian.logout');
    req.session.destroy(err => {
      if (err) {
        req.log.warn(err, 'could not destroy express session');
      }
      res.clearCookie('AuthSession');
      res.clearCookie('scipe.sid');
      res.redirect('/login');
    });
  });
});

export default router;
