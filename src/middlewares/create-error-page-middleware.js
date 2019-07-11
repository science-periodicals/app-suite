import path from 'path';
import { escJSON, Librarian } from '@scipe/librarian';
import { contextLink } from '@scipe/jsonld';
import bundlePaths from '../utils/bundle-paths';

const templatePath = path.join(
  path.dirname(path.dirname(__dirname)),
  'views',
  'index.ejs'
);

export function createErrorPageMiddleware(config) {
  return function(err, req, res, next) {
    if (res.headersSent) {
      // See https://expressjs.com/en/guide/error-handling.html
      req.log.trace({ err }, 'headers were already sent');
      return next(err);
    }

    if (
      req.headers.accept &&
      req.accepts(['text/html', 'application/json', 'application/ld+json']) ===
        'text/html'
    ) {
      if (
        req.path !== '/login' && // avoid infinite redirect loop
        (err.code === 401 || (err.code === 403 && !req.session.username))
      ) {
        return res.redirect(
          `/login?next=${encodeURIComponent(req.originalUrl)}`
        );
      }

      if (!req.librarian) {
        req.librarian = new Librarian(config);
      }

      getUser(req, (_err, user) => {
        if (_err) {
          req.log.error({ err: _err }, 'could not get user');
        }

        // pass the cookie for the subdomain
        if (req.session.couchDBAuthSession) {
          res.cookie('AuthSession', req.session.couchDBAuthSession);
          req.log.trace(
            { AuthSession: req.session.couchDBAuthSession },
            'pass couchdb auth cookie'
          );
        }

        const initialState = {
          route: 'error',
          user,
          error: {
            description: err.message || 'something went wrong',
            statusCode: err.code || 400
          }
        };

        bundlePaths(['main'], (_err, bundles) => {
          if (_err) {
            return req.log.error({ err: _err }, 'could not bundle paths');
          }

          res
            .type('html')
            .header('Vary', 'Accept')
            .status(err.code || 400)
            .render(templatePath, {
              escJSON,
              bundles,
              initialState,
              error: err
            });
        });
      });
    } else {
      const statusCode = err.code || 400;

      let payload;
      if (err.action) {
        payload = Object.assign(
          {
            error: Object.assign(
              {
                '@type': 'Error',
                description: err.message,
                statusCode
              },
              err.action.error
            )
          },
          err.action,
          {
            actionStatus: 'FailedActionStatus' // always overwrite actionStatus
          }
        );
      } else {
        payload = {
          '@type': 'Error',
          statusCode,
          description: err.message || ''
        };
      }
      res
        .set('Link', contextLink)
        .set('Content-Type', 'application/json')
        .status(statusCode)
        .json(payload);
    }
  };
}

function getUser(req, callback) {
  if (req.session.userId) {
    req.librarian.getAppSuiteUser(req.session.userId, callback);
  } else {
    callback(null, null);
  }
}
