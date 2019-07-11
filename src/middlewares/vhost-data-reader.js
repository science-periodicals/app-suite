import createError from '@scipe/create-error';
import { validateBasicAuthCredentials } from '@scipe/api';
import { Librarian, getJournalHostname, createId } from '@scipe/librarian';
import asyncParallel from 'async/parallel';

/**
 * !! This is used by vhost-reader.js and vhost-reader-ssr.js. We split vhost in 2 version to avoid SSR for local dev...
 * Bare minimum data required to bootstrap the app to render reader
 * Note: In case of SSR, more data will be loaded by calling the relevant action creators
 */
export default function vhostDataReader(req, res, callback) {
  const npath = req.path.replace(/^\//, '').replace(/\/$/, '');

  // 1 valid routes:
  // /:articleSlug
  if (!(npath.split('/').length === 1)) {
    return callback(null, null);
  }

  const hostname = getJournalHostname(req);

  if (!hostname) {
    return callback(null, null);
  }

  validateBasicAuthCredentials(req, res, err => {
    if (err) return callback(err);

    // validate journal, we check...
    const librarian = new Librarian(req);
    req.librarian = librarian;

    // ACL
    librarian.checkReadAcl(
      npath, // slug
      { acl: true },
      err => {
        if (err) {
          return callback(err);
        }

        asyncParallel(
          {
            user: cb => {
              if (req.session.userId) {
                req.librarian.getAppSuiteUser(req.session.userId, cb);
              } else {
                cb(null, {});
              }
            },
            homepage: cb => {
              librarian.get(
                createId('journal', hostname),
                { acl: true },
                (err, periodical) => {
                  if (err) {
                    return cb(err);
                  }

                  if (periodical['@type'] !== 'Periodical') {
                    req.log.fatal(
                      { periodical },
                      'document is not a Periodical'
                    );
                    return cb(createError(500, 'document is not a Periodical'));
                  }

                  cb(null, periodical);
                }
              );
            },
            remote: cb => {
              librarian.db.get(
                {
                  url: '/',
                  json: true
                },
                (err, resp, body) => {
                  if ((err = createError(err, resp, body))) {
                    return cb(err);
                  }
                  cb(null, { lastRemoteSeq: body.update_seq });
                }
              );
            }
          },
          (err, state) => {
            if (err) return callback(err);

            checkCouchLogin(req, (err, ok) => {
              if (err) return callback(err);
              if (!ok) {
                return callback(createError(403, 'Need to re-login'));
              }

              // pass the cookie for the subdomain
              if (req.session.couchDBAuthSession) {
                res.cookie('AuthSession', req.session.couchDBAuthSession);
                req.log.trace(
                  { AuthSession: req.session.couchDBAuthSession },
                  'pass couchdb auth cookie'
                );
              }
              callback(null, state);
            });
          }
        );
      }
    );
  });
}

function checkCouchLogin(req, callback) {
  if (!req.session.username) {
    callback(null, true);
  } else {
    req.librarian.checkCouchLogin(callback);
  }
}
