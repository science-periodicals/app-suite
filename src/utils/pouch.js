import { xhr, merge } from '@scipe/librarian';
import PouchDB from 'pouchdb';

export function createDb(config, opts) {
  opts = Object.assign({ auto_compaction: true }, opts);

  const db = new PouchDB(config.db, opts);
  if (config.resetPouchDB) {
    console.info('resetting PouchDB');
    return db
      .destroy()
      .then(res => {
        return xhr({
          url: '/session/pouch',
          method: 'POST'
        });
      })
      .catch(err => {
        console.error(err);
      })
      .then(() => {
        return new PouchDB(config.db, opts);
      });
  } else {
    return Promise.resolve(db);
  }
}

/**
 * @param master - the winning document according to PouchDB deterministic winning algorithm
 * @param conflicts - a list of _rev of the conflicting documents
 * @returns a promise of conflict resolution
 */
export function handleConflicts(db, master, conflicts) {
  conflicts = conflicts || master._conflicts;

  // TODO remove the `true`
  if (true || !conflicts || !conflicts.length) {
    return Promise.resolve({
      master,
      conflicting: []
    });
  }

  return db
    .get(master._id, { open_revs: conflicts })
    .then(res => {
      return res.filter(res => res.ok).map(res => res.ok);
    })
    .then(revs => {
      let { merged, deleted } = merge(master, revs);

      let payload = merged !== master ? [merged].concat(deleted) : deleted;

      return db.bulkDocs(payload).then(res => {
        return {
          master:
            merged !== master && res[0].ok
              ? Object.assign(merged, { _rev: res._rev })
              : master,
          conflicting: revs.filter(rev => {
            // remove docs that have been successfully deleted as they no longer conflict
            return !res.some(res => {
              return res.ok && res.rev == rev._rev;
            });
          })
        };
      });
    });
}
