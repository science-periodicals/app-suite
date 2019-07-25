import querystring from 'querystring';
import flatten from 'lodash/flatten';
import omit from 'lodash/omit';
import { parseIndexableString, toIndexableString } from '@scipe/collate';
import { getId, unprefix, arrayify } from '@scipe/jsonld';
import {
  getScopeId,
  getRootPartId,
  createId,
  xhr,
  getAgentId,
  EDITABLE_OFFLINE_TYPES
} from '@scipe/librarian';
import { resetSubdomain } from '@scipe/ui';
import { handleConflicts, createDb } from '../utils/pouch';
import { fetchGraph } from './graph-action-creators';
import { fetchFeedItems } from './feed-action-creators';
import config from '../utils/config';
import { fetchProfile } from './user-action-creators';
import { hasUpdatedActiveRoles } from '../utils/user-utils';

// TODO use history to redirect to /login and not window.location

export const CREATE_USER_POUCH_DB = 'CREATE_USER_POUCH_DB';
export function createUserPouchDb(userId) {
  return (dispatch, getState) => {
    return createDb(userId, config.DB_VERSION, true)
      .then(db => {
        dispatch({
          type: CREATE_USER_POUCH_DB,
          payload: db
        });
        return db;
      })
      .catch(err => {
        console.error(err);
        throw err;
      });
  };
}

export const START_REMOTE_CHANGES = 'START_REMOTE_CHANGES';
export const REMOTE_DATA_UPSERTED = 'REMOTE_DATA_UPSERTED';
export const REMOTE_DATA_DELETED = 'REMOTE_DATA_DELETED';

export function startRemoteChanges({ force, since, history } = {}) {
  const { isJournalSubdomain } = config;

  return (dispatch, getState) => {
    const { user } = getState();

    if (!getId(user)) return; // user is not logged in so he can't access CouchDB.

    // We make sure to start with latest active roles
    dispatch(fetchProfile(getId(user), { includeActiveRoles: true }))
      .then(() => {
        const {
          pouch: { remote, remoteChanges },
          user: { '@id': userId, activeRoles },
          remote: { lastRemoteSeq },
          homepage
        } = getState();

        if (remoteChanges) {
          if (force) {
            dispatch(stopRemoteChanges());
          } else {
            return;
          }
        }

        if (since == null) {
          since = lastRemoteSeq || 'now';
        }

        let changeOpts;
        if (isJournalSubdomain) {
          changeOpts = {
            filter: 'scienceai/public',
            query_params: {
              scope: JSON.stringify(getId(homepage)),
              type: JSON.stringify(['event'])
            }
          };
        } else {
          changeOpts = {
            filter: 'scienceai/user',
            query_params: {
              user: userId, // workaround for Cloudant and CouchDB 2.0 where userCtx is not always defined
              role: JSON.stringify(activeRoles),
              type: JSON.stringify([
                'action',
                'graph',
                'release',
                'journal',
                'org',
                'issue',
                'type'
              ])
            }
          };
        }

        const feed = remote
          .changes(
            Object.assign(
              {
                since,
                live: true,
                include_docs: true
              },
              changeOpts
            )
          )
          .on('change', change => {
            const [scopeId, type] = parseIndexableString(change.id);
            dispatch(lastSeqRemote(change.seq));

            // get the scope before the dispatch of the remote data
            const {
              fetchGraphStatusMap,
              graphSearchResults: { deletedScopeIds }
            } = getState();

            dispatch({
              type: change.deleted ? REMOTE_DATA_DELETED : REMOTE_DATA_UPSERTED,
              payload: { master: change.doc },
              meta: {
                userId,
                scopeId,
                type
              }
            });

            // keep the dashboard and settings live and up to date
            if (!isJournalSubdomain) {
              if (scopeId.startsWith('graph:')) {
                // The change is in the graph: ns => we fetch the graph again so that will pull back all the workflow actions and updated the facets
                if (
                  !change.deleted ||
                  (change.deleted &&
                    change.doc['@type'] !== 'Graph' &&
                    !deletedScopeIds.includes(scopeId))
                ) {
                  dispatch(
                    fetchGraph(scopeId, {
                      cache: false, // force a cache refresh
                      query: querystring.parse(
                        (location.search || '').substring(1)
                      ),
                      nodes: change.doc['@type'] === 'UpdateAction',
                      isNewGraph:
                        change.doc['@type'] === 'CreateGraphAction' ||
                        (change.doc['@type'] === 'InviteAction' &&
                          change.doc.actionStatus === 'CompletedActionStatus' &&
                          getAgentId(change.doc.recipient) === userId) ||
                        // reason we check for that is that we could accept an invite action but the changes feed will also emit action that happened since the invite action was accepted which includes other action that would cancel the fetchGraph xhr otherwise loosing the isNewGraph opt.
                        (fetchGraphStatusMap[scopeId] &&
                          fetchGraphStatusMap[scopeId].isNewGraph)
                    })
                  );
                } else if (change.deleted && change.doc['@type'] === 'Graph') {
                  if (
                    fetchGraphStatusMap[scopeId] &&
                    fetchGraphStatusMap[scopeId].xhr
                  ) {
                    fetchGraphStatusMap[scopeId].xhr.abort();
                  }
                }
              }

              // refresh dashboard activity feed
              if (
                history.location.pahtname === '/' && // only from dashboard
                !change.deleted &&
                (type === 'action' &&
                  change.doc.actionStatus === 'CompletedActionStatus')
              ) {
                dispatch(
                  fetchFeedItems({
                    cache: false // force a cache refresh
                  })
                );
              }

              // If active role changed, we restart the remote changes as this will refetch the active roles
              if (hasUpdatedActiveRoles(user, change.doc)) {
                // restart the feed but with the updated scopes
                dispatch(
                  startRemoteChanges({
                    since: change.seq,
                    force: true,
                    history
                  })
                );
              }
            }
          })
          .on('complete', function(info) {
            // console.log(info);
          })
          .on('error', err => {
            console.error(err);
            if (err.status === 401) {
              window.location.replace(resetSubdomain('/login'));
            }
          });

        dispatch({
          type: START_REMOTE_CHANGES,
          payload: feed,
          meta: { since }
        });
      })
      .catch(err => {
        console.error(err);
      });
  };
}

export const STOP_REMOTE_CHANGES = 'STOP_REMOTE_CHANGES';
export function stopRemoteChanges() {
  return (dispatch, getState) => {
    const {
      pouch: { remoteChanges }
    } = getState();

    if (remoteChanges) {
      remoteChanges.cancel();
    }

    dispatch({ type: STOP_REMOTE_CHANGES });
  };
}

export const START_CHANGES = 'START_CHANGES';
export const STOP_CHANGES = 'STOP_CHANGES';
export const POUCH_DATA_UPSERTED = 'POUCH_DATA_UPSERTED';
export const POUCH_DATA_DELETED = 'POUCH_DATA_DELETED';

export function startChanges(periodicalId, graphId, since = 'now') {
  return (dispatch, getState) => {
    const {
      pouch: { db, changes }
    } = getState();

    if (changes) return;
    // we use the changes feed as it will also works for replication
    // event => same logic for local and remote _and_ guarantees that we
    // always have the most up-to-date _rev

    const feed = db
      .changes({
        since: since,
        live: true,
        include_docs: true,
        conflicts: true
      })
      .on('change', change => {
        handleConflicts(db, change.doc).then(data => {
          const [scopeId, type] = parseIndexableString(change.id);

          dispatch({
            type: change.deleted ? POUCH_DATA_DELETED : POUCH_DATA_UPSERTED,
            payload: data,
            meta: {
              periodicalId,
              graphId,
              scopeId,
              type
            }
          });

          // TODO restart sync when activeRole changes (need to stop it first)
        });
      })
      .on('complete', function(info) {
        console.log(info);
      })
      .on('error', err => {
        console.error(err);
      });

    dispatch({
      type: START_CHANGES,
      payload: feed,
      meta: { since }
    });
  };
}

export function stopChanges() {
  return (dispatch, getState) => {
    const {
      pouch: { changes }
    } = getState();
    if (changes) {
      changes.cancel();
    }

    dispatch({ type: STOP_CHANGES });
  };
}

export const LOAD_FROM_POUCH = 'LOAD_FROM_POUCH';
export const LOAD_FROM_POUCH_SUCCESS = 'LOAD_FROM_POUCH_SUCCESS';
export const LOAD_FROM_POUCH_ERROR = 'LOAD_FROM_POUCH_ERROR';

/**
 * This must be called after the fast forward replication has completed
 */
export function loadFromPouch(periodicalId, graphId, { history } = {}) {
  const scopeId = getScopeId(graphId);
  return (dispatch, getState) => {
    dispatch({
      type: LOAD_FROM_POUCH,
      meta: { periodicalId, graphId, scopeId }
    });

    const {
      pouch: { db }
    } = getState();

    const toFetch = [
      // periodical
      db.get(createId('journal', periodicalId)._id).catch(err => {
        if (err.status !== 404) throw err;
      }),

      // actions
      db
        .allDocs({
          startkey: toIndexableString([scopeId, 'action', '']),
          endkey: toIndexableString([scopeId, 'action', '\ufff0']),
          include_docs: true
        })
        .then(res => res.rows.map(row => row.doc)),

      // live graph, workflow and type
      db
        .get(toIndexableString([scopeId, 'graph']))
        .then(graph => {
          return db
            .allDocs({
              keys: [getId(graph.workflow), getId(graph.additionalType)]
                .filter(Boolean)
                .map(id =>
                  toIndexableString([periodicalId, id.split(':')[0], id])
                ),
              include_docs: true
            })
            .then(res => {
              return [graph].concat(
                arrayify(res.rows)
                  .map(row => row.doc)
                  .filter(Boolean)
              );
            })
            .catch(err => {
              if (err.status !== 404) throw err;
              return [graph];
            });
        })
        .catch(err => {
          if (err.status !== 404) throw err;
        }),

      //releases
      db
        .allDocs({
          startkey: toIndexableString([scopeId, 'release', '']),
          endkey: toIndexableString([scopeId, 'release', '\ufff0']),
          include_docs: true
        })
        .then(res => res.rows.map(row => row.doc))
    ];

    return Promise.all(toFetch)
      .then(docs => {
        return Promise.all(
          flatten(docs)
            .filter(Boolean)
            .map(doc => handleConflicts(db, doc))
        );
      })
      .then(data => {
        return dispatch({
          type: LOAD_FROM_POUCH_SUCCESS,
          payload: data,
          meta: { periodicalId, graphId, scopeId }
        });
      })
      .catch(err => {
        dispatch({
          type: LOAD_FROM_POUCH_ERROR,
          error: err,
          meta: { periodicalId, graphId, scopeId }
        });
      });
  };
}

export const POUCH_SYNC = 'POUCH_SYNC';
export const POUCH_SYNC_SUCCESS = 'POUCH_SYNC_SUCCESS';
export const POUCH_SYNC_ERROR = 'POUCH_SYNC_ERROR';

export function sync(periodicalId, graphId, { history, live = true } = {}) {
  const scopeId = getScopeId(graphId);
  return (dispatch, getState) => {
    if (config.ci) {
      // hack for backstop testing (PouchDB doesn't seem to work on CircleCI ?)
      // -> we fake loadFromPouch
      return Promise.all([
        xhr({
          url: `/load/periodical/${unprefix(periodicalId)}`,
          method: 'POST',
          json: true,
          body: []
        }).then(({ body: docs }) => {
          return docs;
        }),

        xhr({
          url: `/load/graph/${unprefix(scopeId)}`,
          method: 'POST',
          json: true,
          body: []
        }).then(({ body: docs }) => {
          return docs;
        })
      ])
        .then(([journalDocs, graphDocs]) => {
          const docs = journalDocs.concat(graphDocs).map(doc => {
            return {
              master: omit(doc, ['_revisions']),
              conflicting: []
            };
          });

          return dispatch({
            type: LOAD_FROM_POUCH_SUCCESS,
            payload: docs,
            meta: { periodicalId, graphId, scopeId }
          });
        })
        .catch(err => {
          console.error(err);
        });
    }

    dispatch({
      type: POUCH_SYNC,
      meta: { graphId }
    });

    const {
      pouch: { remote, db }
    } = getState();

    // first we take a checkpoint so that we know where to start the replication from Couch to Pouch
    return remote
      .info()
      .then(info => {
        // Fast forward replication: load all the documents that we don't have with 1 big query
        // send the current docs _id / _rev to the server to avoid fetching documents that we already have
        return Promise.all([
          // GET periodical
          db
            .allDocs({
              key: JSON.stringify(createId('journal', periodicalId)._id)
            })
            .then(res => {
              const docs = [];
              res.rows.forEach(row => {
                if (row.id && row.value && row.value.rev) {
                  docs.push({ id: row.id, rev: row.value.rev });
                }
              });

              return xhr({
                url: `/load/periodical/${unprefix(periodicalId)}`,
                method: 'POST',
                json: true,
                body: docs
              });
            })
            .then(({ body: docs }) => {
              return docs;
            }),

          // GET graph, all releases, actions, workflow and type

          db
            .allDocs({
              startkey: toIndexableString([scopeId, '']),
              endkey: toIndexableString([scopeId, '\ufff0'])
            })
            .then(res => {
              const docs = [];
              res.rows.forEach(row => {
                if (row.id && row.value && row.value.rev) {
                  docs.push({ id: row.id, rev: row.value.rev });
                }
              });

              return db
                .get(createId('graph', scopeId)._id)
                .then(graph => {
                  const journalId = getRootPartId(graph);
                  const workflowId = getId(graph.workflow);
                  const typeId = getId(graph.additionalType);

                  return db
                    .allDocs({
                      keys: [workflowId, typeId]
                        .filter(Boolean)
                        .map(id =>
                          toIndexableString([journalId, id.split(':')[0], id])
                        )
                    })
                    .then(res => {
                      res.rows.forEach(row => {
                        if (row.id && row.value && row.value.rev) {
                          docs.push({ id: row.id, rev: row.value.rev });
                        }
                      });
                    });
                })
                .catch(err => {
                  // noop;
                })
                .then(() => {
                  return xhr({
                    url: `/load/graph/${unprefix(scopeId)}`,
                    method: 'POST',
                    json: true,
                    body: docs
                  });
                });
            })
            .then(({ body: docs }) => {
              return docs;
            })
        ])
          .then(data => {
            const docs = data.reduce((all, docs) => {
              if (docs && docs.length) {
                all = all.concat(docs);
              }
              return all;
            }, []);

            if (docs.length) {
              return db.bulkDocs(docs, { new_edits: false }); // !! Note that we use `new_edits: false` to dump the docs with their **full** revision history
            }
          })
          .then(() => {
            dispatch({
              type: POUCH_SYNC_SUCCESS,
              meta: { periodicalId, graphId }
            });
            // load from Pouch and start the changes feed from a new checkpoint
            return dispatch(getInfo()).then(info => {
              const since = info.update_seq;

              return dispatch(
                loadFromPouch(periodicalId, graphId, { history })
              ).then(() => {
                if (live) {
                  dispatch(startChanges(periodicalId, graphId, since));
                }
              });
            });
          })
          .then(() => {
            if (live) {
              dispatch(
                startReplicationFromCouchToPouch(
                  periodicalId,
                  graphId,
                  info.update_seq
                )
              );
            }
          });
      })
      .catch(err => {
        dispatch({
          type: POUCH_SYNC_ERROR,
          error: err,
          meta: { graphId }
        });
      });
  };
}

export const STOP_SYNC = 'STOP_SYNC';

// this is poorly named, it's called when leaving <PouchDataProvider />
export function stopSync() {
  return (dispatch, getState) => {
    dispatch(stopReplicationFromCouchToPouch());
    dispatch(stopChanges());
    dispatch({
      type: 'STOP_SYNC'
    });
  };
}

export const START_REPLICATION_FROM_COUCH_TO_POUCH =
  'START_REPLICATION_FROM_COUCH_TO_POUCH';
export const STOP_REPLICATION_FROM_COUCH_TO_POUCH =
  'STOP_REPLICATION_FROM_COUCH_TO_POUCH';
export const REPLICATION_FROM_COUCH_TO_POUCH_STATUS =
  'REPLICATION_FROM_COUCH_TO_POUCH_STATUS';

export function startReplicationFromCouchToPouch(
  periodicalId,
  graphId,
  force = false,
  since = 'now'
) {
  return (dispatch, getState) => {
    const { user } = getState();

    if (!getId(user)) return; // user is not logged in so he can't access CouchDB.

    // We make sure to start with latest active roles
    dispatch(fetchProfile(getId(user), { includeActiveRoles: true }))
      .then(() => {
        const {
          pouch: { db, remote, repFromCouchToPouch },
          user
        } = getState();

        console.log(user);

        if (repFromCouchToPouch) {
          if (force) {
            dispatch(stopReplicationFromCouchToPouch());
          }
          return;
        }

        // start continuous replication from CouchDB to PouchDB (live)
        // TODO add roles for graphs so that filtered replication can properly handle the annotation ACL
        // We have the guarantee that the graph will always be present in the redux store
        // TODO fix app-route to ensure that the graph is always there
        const rep = db.replicate
          .from(remote, {
            since: since,
            live: true,
            retry: true,
            filter: 'scienceai/user',
            query_params: {
              scope: JSON.stringify([periodicalId, graphId]),
              role: JSON.stringify(user.activeRoles),
              user: getId(user) // workaround for Cloudant and CouchDB 2.0 where userCtx is not always defined
            }
          })
          .on('change', change => {
            // console.log('change couch to pouch', change);
          })
          .on('denied', info => {
            console.log('denied', info);
          })
          .on('active', () => {
            dispatch({
              type: REPLICATION_FROM_COUCH_TO_POUCH_STATUS,
              payload: 'active'
            });
          })
          .on('paused', err => {
            // console.log('paysed');
            dispatch({
              type: REPLICATION_FROM_COUCH_TO_POUCH_STATUS,
              payload: err || 'paused',
              error: !!err
            });
          })
          .on('error', err => {
            if (err.status === 401) {
              console.error(err);
              window.location.replace(resetSubdomain('/login'));
            }
            dispatch({
              type: REPLICATION_FROM_COUCH_TO_POUCH_STATUS,
              error: true,
              payload: err
            });
          });

        // pass replication object so that it can be properly canceled
        dispatch({
          type: START_REPLICATION_FROM_COUCH_TO_POUCH,
          payload: rep,
          meta: since
        });
      })
      .catch(err => {
        console.error(err);
      });
  };
}

export const START_REPLICATION_FROM_POUCH_TO_COUCH =
  'START_REPLICATION_FROM_POUCH_TO_COUCH';
export const STOP_REPLICATION_FROM_POUCH_TO_COUCH =
  'STOP_REPLICATION_FROM_POUCH_TO_COUCH';
export const REPLICATION_FROM_POUCH_TO_COUCH_STATUS =
  'REPLICATION_FROM_POUCH_TO_COUCH_STATUS';

// TODO ? only replicate from Pouch To Couch if user has write access to graph, otherwise, just replicate comments
export function startReplicationFromPouchToCouch(since) {
  // Note that unlike for startReplicationFromCouchToPouch, since default to `undefined` as we want PouchDB checkpoints so that we are sure that every local doc make it to CouchDB
  return (dispatch, getState) => {
    const {
      pouch: { db, remote, repFromPouchToCouch },
      user: { username, roles = [] }
    } = getState();

    if (!username || (roles && roles.includes('readOnlyUser'))) return; // user is not logged in so he can't access CouchDB.
    if (repFromPouchToCouch) return;

    // Live replication from PouchDB to CouchDB
    const rep = db.replicate
      .to(remote, {
        since: since,
        live: true,
        retry: true,
        filter: doc => {
          const [, type] = parseIndexableString(doc._id);

          return (
            type === 'action' &&
            EDITABLE_OFFLINE_TYPES.has(doc['@type']) &&
            (doc.actionStatus === 'ActiveActionStatus' ||
              doc.actionStatus === 'StagedActionStatus')
          );
        }
      })
      .on('denied', info => {
        console.warn('denied', info);
      })
      .on('change', change => {
        dispatch(lastSeqPouch(change.last_seq));
      })
      .on('active', () => {
        dispatch({
          type: REPLICATION_FROM_POUCH_TO_COUCH_STATUS,
          payload: 'active'
        });
      })
      .on('paused', err => {
        dispatch({
          type: REPLICATION_FROM_POUCH_TO_COUCH_STATUS,
          payload: 'paused',
          error: err
        });
      })
      .on('error', err => {
        if (err.status === 401) {
          console.error(err);
          window.location.replace(resetSubdomain('/login'));
        }
        console.error(err);
        dispatch({
          type: REPLICATION_FROM_POUCH_TO_COUCH_STATUS,
          error: err
        });
      });

    // pass replication object so that it can be properly canceled
    dispatch({
      type: START_REPLICATION_FROM_POUCH_TO_COUCH,
      payload: rep,
      meta: since
    });
  };
}

export function stopReplicationFromCouchToPouch() {
  return (dispatch, getState) => {
    const {
      pouch: { repFromCouchToPouch }
    } = getState();
    if (repFromCouchToPouch) {
      repFromCouchToPouch.cancel();
    }

    dispatch({
      type: STOP_REPLICATION_FROM_COUCH_TO_POUCH
    });
  };
}

export function stopReplicationFromPouchToCouch() {
  return (dispatch, getState) => {
    const {
      pouch: { repFromPouchToCouch }
    } = getState();
    if (repFromPouchToCouch) {
      repFromPouchToCouch.cancel();
    }

    dispatch({
      type: STOP_REPLICATION_FROM_POUCH_TO_COUCH
    });
  };
}

export const POUCH_INFO = 'POUCH_INFO';
export const POUCH_INFO_ERROR = 'POUCH_INFO_ERROR';

export function getInfo() {
  return (dispatch, getState) => {
    const {
      pouch: { db }
    } = getState();

    return db
      .info()
      .then(info => {
        dispatch({
          type: POUCH_INFO,
          payload: info
        });
        return info;
      })
      .catch(err => {
        dispatch({
          type: POUCH_INFO_ERROR,
          error: err
        });
      });
  };
}

export const LAST_SEQ_POUCH = 'LAST_SEQ_POUCH';

/**
 * as given by the replication event emitter, this is the last
 * sequence that made it to couchdb
 */
export function lastSeqPouch(lastSeq) {
  return {
    type: LAST_SEQ_POUCH,
    payload: lastSeq
  };
}

export const LAST_SEQ_REMOTE = 'LAST_SEQ_REMOTE';

export function lastSeqRemote(lastSeq) {
  return {
    type: LAST_SEQ_REMOTE,
    payload: lastSeq
  };
}
