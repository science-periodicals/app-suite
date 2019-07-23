import { getId } from '@scipe/jsonld';
import { xhr, merge } from '@scipe/librarian';
import PouchDB from 'pouchdb';

export function createDb(
  userId, // can be undefiend
  dbVersion,
  reset = false
) {
  const name = `${process.env.DB_NAME || 'scienceai'}-${[
    getId(userId),
    dbVersion
  ]
    .filter(Boolean)
    .join('-')}`;

  const opts = {
    auto_compaction: true,
    fetch: function(url, opts) {
      opts.credentials = 'include';
      opts.headers.set('X-PouchDB', 'true');
      return PouchDB.fetch(url, opts);
    }
  };

  const db = new PouchDB(name, opts);

  if (reset) {
    console.info(`resetting PouchDB ${name}`);
    return db
      .destroy()
      .then(res => {
        return xhr({
          url: '/pouch/status',
          method: 'POST',
          json: { reseted: true }
        });
      })
      .catch(err => {
        console.error(err);
      })
      .then(() => {
        return new PouchDB(name, opts);
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
