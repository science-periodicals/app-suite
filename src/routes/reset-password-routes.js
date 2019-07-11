import { Router } from 'express';
import csurf from 'csurf';
import createError from '@scipe/create-error';
import { escJSON, getAgentId } from '@scipe/librarian';
import { addDbVersion, addLibrarian, addCsrfToken } from '@scipe/api';
import { getId } from '@scipe/jsonld';
import bundlePaths from '../utils/bundle-paths';

const router = new Router({ caseSensitive: true });
const csrf = csurf({ cookie: false });

/**
 * Need `token` and `value` qs
 */
router.get(
  '/:username',
  addDbVersion,
  addLibrarian,
  csrf,
  addCsrfToken,
  (req, res, next) => {
    if (!req.accepts('html')) {
      return next(createError(406, 'Not Acceptable'));
    }

    if (!req.query.token || !req.query.value) {
      return next(
        createError(
          400,
          'Missing or invalid query string parameters "token" and "value"'
        )
      );
    }

    res.header('Vary', 'Accept');

    const userId = `user:${req.params.username}`;

    // validate token and userId
    req.librarian.tokenStore.get(`token:${req.query.token}`, (err, token) => {
      if (err) {
        return next(
          createError(404, 'Invalid or inexistent password reset token')
        );
      }

      req.librarian.get(
        getId(token.resultOf),
        { acl: false },
        (err, resetPasswordAction) => {
          if (err) {
            return next(err);
          }

          if (userId !== getAgentId(resetPasswordAction.agent)) {
            return next(
              createError(404, 'Invalid or inexistent password reset token')
            );
          }

          bundlePaths(['main'], (err, bundles) => {
            if (err) return next(err);

            res.render('index', {
              escJSON,
              bundles
            });
          });
        }
      );
    });
  }
);

export default router;
