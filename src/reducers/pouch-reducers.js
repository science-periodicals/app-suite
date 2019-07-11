import omit from 'lodash/omit';
import {
  STOP_SYNC,
  CREATE_DB,
  START_CHANGES,
  STOP_CHANGES,
  START_REMOTE_CHANGES,
  STOP_REMOTE_CHANGES,
  START_REPLICATION_FROM_COUCH_TO_POUCH,
  STOP_REPLICATION_FROM_COUCH_TO_POUCH,
  START_REPLICATION_FROM_POUCH_TO_COUCH,
  STOP_REPLICATION_FROM_POUCH_TO_COUCH,
  REPLICATION_FROM_COUCH_TO_POUCH_STATUS,
  REPLICATION_FROM_POUCH_TO_COUCH_STATUS,
  LOAD_FROM_POUCH,
  LOAD_FROM_POUCH_SUCCESS,
  LOAD_FROM_POUCH_ERROR,
  POUCH_INFO,
  LAST_SEQ_POUCH,
  LAST_SEQ_REMOTE
} from '../actions/pouch-action-creators';

export function pouch(state = {}, action) {
  switch (action.type) {
    case CREATE_DB:
      return Object.assign({}, state, { db: action.payload });

    case START_REPLICATION_FROM_COUCH_TO_POUCH:
      return Object.assign({}, state, { repFromCouchToPouch: action.payload });

    case START_REPLICATION_FROM_POUCH_TO_COUCH:
      return Object.assign({}, state, { repFromPouchToCouch: action.payload });

    case STOP_REPLICATION_FROM_COUCH_TO_POUCH:
      return omit(state, ['repFromCouchToPouch', 'repFromCouchToPouchStatus']);

    case STOP_REPLICATION_FROM_POUCH_TO_COUCH:
      return omit(state, ['repFromPouchToCouch', 'repFromPouchToCouchStatus']);

    case START_CHANGES:
      return Object.assign({}, state, { changes: action.payload });

    case STOP_CHANGES:
      return omit(state, ['changes']);

    case START_REMOTE_CHANGES:
      return Object.assign({}, state, { remoteChanges: action.payload });

    case STOP_REMOTE_CHANGES:
      return omit(state, ['remoteChanges']);

    case REPLICATION_FROM_POUCH_TO_COUCH_STATUS:
      return Object.assign({}, state, {
        repFromPouchToCouchStatus: action.error ? 'error' : action.payload
      });

    case REPLICATION_FROM_COUCH_TO_POUCH_STATUS:
      return Object.assign({}, state, {
        repFromCouchToPouchStatus: action.error ? 'error' : action.payload
      });

    case STOP_SYNC:
      // STOP_SYNC is used as a signal that we are leaving <PouchDataProvider />
      // setting loadFromPouch to undefined allow to prevent <DocumentLoader /> from flickering
      // (`isLoadingFromPouch` undefined is interpreted as not having tryied to load yet)
      return Object.assign({}, state, { isLoadingFromPouch: undefined });

    case LOAD_FROM_POUCH:
      return Object.assign({}, state, { isLoadingFromPouch: true });

    case LOAD_FROM_POUCH_SUCCESS:
    case LOAD_FROM_POUCH_ERROR:
      return Object.assign({}, state, { isLoadingFromPouch: false });

    case POUCH_INFO:
      return Object.assign({}, state, {
        updateSeqPouch: action.payload.update_seq,
        startPouch: state.lastSeqPouch,
        progressPouch: null
      });

    case LAST_SEQ_POUCH: {
      const updateSeqPouch =
        action.payload > state.updateSeqPouch
          ? action.payload
          : state.updateSeqPouch;

      return Object.assign({}, state, {
        updateSeqPouch: updateSeqPouch,
        lastSeqPouch: action.payload,
        progressPouch: state.updateSeqPouch
          ? Math.ceil(
              (1 -
                (updateSeqPouch - action.payload) /
                  (updateSeqPouch - state.startPouch)) *
                100
            )
          : null
      });
    }

    default:
      return state;
  }
}

export function remote(state = {}, action) {
  switch (action.type) {
    case LAST_SEQ_REMOTE:
      return Object.assign({}, state, { lastSeqRemote: action.payload });

    default:
      return state;
  }
}
