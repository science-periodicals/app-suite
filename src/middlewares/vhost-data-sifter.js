import createError from '@scipe/create-error';
import { validateBasicAuthCredentials } from '@scipe/api';
import { Librarian, getJournalHostname, createId } from '@scipe/librarian';
import asyncParallel from 'async/parallel';

/**
 * !! This is used by vhost-sifter.js and vhost-sifter-ssr.js. We split vhost in 2 version to avoid SSR for local dev...
 * Bare minimum data required to bootstrap the app to render journal homepage, issue homepage and journal list of issues
 * Note: In case of SSR, more data will be loaded by calling the relevant action creators
 */
export default function vhostDataSifter(req, res, callback) {
  // we only support subdomain for journals so the path MUST be '/' or a journal
  // subpage of `/about/:whatever` , `/rfas/:rfaId or `/issues`

  if (
    !(
      req.path === '/' ||
      req.path.startsWith('/rfas') ||
      req.path.startsWith('/about/journal') ||
      req.path.startsWith('/about/staff') ||
      req.path.startsWith('/issues') ||
      // we allow /issue/:issueId but exclude issue/:issueId/... (could conflict with API))
      (req.path.startsWith('/issue') &&
        req.path
          .replace(/^\//, '')
          .replace(/\/$/, '')
          .split('/').length === 2)
    )
  ) {
    return callback(null, null);
  }

  const hostname = getJournalHostname(req);

  if (!hostname) {
    return callback(null, null);
  }

  validateBasicAuthCredentials(req, res, err => {
    if (err) return callback(err);

    // validate journal
    const librarian = new Librarian(req);
    req.librarian = librarian;

    // ACL (Get acts as acl here)
    librarian.get(
      hostname.endsWith('.sci.pe') ? createId('journal', hostname) : hostname, // if sci.pe hostname, createId will take care of it, if not the byId view index the peridocal domain so we will get it that way
      { acl: true },
      (err, periodical) => {
        if (err) {
          return callback(err);
        }

        if (periodical['@type'] !== 'Periodical') {
          req.log.fatal({ periodical }, 'document is not a Periodical');
          return callback(createError(500, 'document is not a Periodical'));
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
              cb(null, periodical);
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
