import { Router } from 'express';
import csurf from 'csurf';
import asyncParallel from 'async/parallel';
import { getId, unprefix } from '@scipe/jsonld';
import createError from '@scipe/create-error';
import {
  getScopeId,
  escJSON,
  getDbName,
  getRootPartId
} from '@scipe/librarian';
import { acl, addDbVersion, addLibrarian, addCsrfToken } from '@scipe/api';
import bundlePaths from '../utils/bundle-paths';

const csrf = csurf({ cookie: false });
const router = new Router({ caseSensitive: true });

router.get(
  '/',
  csrf,
  addCsrfToken,
  addDbVersion,
  addLibrarian,
  (req, res, next) => {
    // auto login
    if (!req.query.authToken) {
      return next();
    }

    function logoutIfNeeded(callback) {
      if (req.session.username) {
        // need to logout and to swap identity
        req.librarian.logout(err => {
          if (err) {
            req.log.warn(err, 'could not destroy previous couchdb session');
          }
          req.session.regenerate(err => {
            if (err) {
              req.log.warn(err, 'could not regenerate express session');
            }

            callback(null);
          });
        });
      } else {
        callback(null);
      }
    }

    logoutIfNeeded(err => {
      if (err) {
        return next(err);
      }

      const key = `${getDbName(req.app.locals.config)}:tokens:login:${
        req.query.authToken
      }`;

      req.librarian.redis.get(key, (err, data) => {
        if (err) {
          return next(err);
        }
        if (!data) {
          return next(createError(403, 'Invalid authToken'));
        }

        const proxyUser = JSON.parse(data);

        const { proxiedUserId } = proxyUser;

        req.librarian.login(proxyUser, (err, token, authHeaders) => {
          if (err) return next(err);

          req.librarian.redis.del(key, err => {
            if (err) {
              req.log.error(
                { err, key },
                'could not delete key (but it will autoexpire'
              );
            }
            req.session.userId = proxiedUserId;
            req.session.username = unprefix(proxiedUserId);
            req.session.couchDBAuthSession = token;
            req.session.couchAuthHeaders = authHeaders;
            req.session.resetPouchDB = true;
            res.cookie('AuthSession', token);

            res.redirect(301, '/');
          });
        });
      });
    });
  },
  (req, res, next) => {
    // if user is not logged in and visit `/`, redirect to the overview page
    // Note: we need to take into account baseUrl as this router is mounted
    // on several paths
    if (
      (req.baseUrl === '/' || !req.baseUrl) &&
      req.path === '/' &&
      !req.session.username
    ) {
      const redirectPath = req.app.locals.config.getUnLoggedInUserRedirectPath(
        req
      );
      res.redirect(redirectPath);
    } else {
      return next();
    }
  },
  acl({ checkCouchLogin: true }),
  (req, res, next) => {
    asyncParallel(
      {
        docs: cb => {
          const toFetch = [req.userId];
          if (req.graphId) {
            toFetch.push(req.graphId);
          }
          if (req.journalId) {
            toFetch.push(req.journalId);
          }
          if (req.organizationId) {
            toFetch.push(req.organizationId);
          }
          req.librarian.get(toFetch, (err, docs) => {
            if (err) return cb(err);
            cb(null, docs);
          });
        },
        user: cb => {
          req.librarian.getAppSuiteUser(req.userId, cb);
        },
        remote: cb => {
          req.librarian.db.get(
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
      (err, { docs, user, remote } = {}) => {
        if (err) return next(err);
        res.header('Vary', 'Accept');
        bundlePaths(
          ['main', 'Settings', 'Dashboard', 'Publisher'],
          (err, bundles) => {
            if (err) return next(err);

            let scopeMap;
            const droplets = {};

            if (req.userId) {
              const profile = docs.find(doc => getId(doc) === req.userId);
              if (profile) {
                droplets[getId(profile)] = profile;
              } else {
                return next(createError(404));
              }
            }

            if (req.journalId) {
              const journal = docs.find(doc => getId(doc) === req.journalId);
              if (journal) {
                droplets[getId(journal)] = journal;
              } else {
                return next(createError(404));
              }
            }

            if (req.organizationId) {
              const org = docs.find(doc => getId(doc) === req.organizationId);
              if (org) {
                droplets[getId(org)] = org;
              } else {
                return next(createError(404));
              }
            }

            if (req.graphId) {
              const graph = docs.find(doc => getId(doc) === req.graphId);
              if (graph) {
                scopeMap = {
                  [getScopeId(graph)]: {
                    graphMap: {
                      [getId(graph)]: {
                        graph
                      }
                    }
                  }
                };

                if (req.journalId) {
                  if (getRootPartId(graph) !== req.journalId) {
                    return next(createError(404));
                  }
                }
              } else {
                return next(createError(404));
              }
            }

            const initialState = { droplets, scopeMap, user, remote };

            res.render('index', {
              escJSON,
              bundles,
              initialState
            });
          }
        );
      }
    );
  }
);

export default router;
