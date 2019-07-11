import omit from 'lodash/omit';
import { arrayify, getNodeMap, getId } from '@scipe/jsonld';
import {
  FETCH_PERIODICAL_PUBLICATION_TYPES,
  FETCH_PERIODICAL_PUBLICATION_TYPES_SUCCESS,
  FETCH_PERIODICAL_PUBLICATION_TYPES_ERROR,
  CREATE_PERIODICAL_PUBLICATION_TYPE,
  CREATE_PERIODICAL_PUBLICATION_TYPE_SUCCESS,
  CREATE_PERIODICAL_PUBLICATION_TYPE_ERROR,
  UPDATE_PERIODICAL_PUBLICATION_TYPE,
  UPDATE_PERIODICAL_PUBLICATION_TYPE_SUCCESS,
  UPDATE_PERIODICAL_PUBLICATION_TYPE_ERROR,
  ARCHIVE_PERIODICAL_PUBLICATION_TYPE,
  ARCHIVE_PERIODICAL_PUBLICATION_TYPE_SUCCESS,
  ARCHIVE_PERIODICAL_PUBLICATION_TYPE_ERROR,
  TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS,
  TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS_SUCCESS,
  TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS_ERROR
} from '../actions/type-action-creators';

import {
  REMOTE_DATA_UPSERTED,
  REMOTE_DATA_DELETED
} from '../actions/pouch-action-creators';

export function fetchPeriodicalPublicationTypesStatus(
  state = { status: null, xhr: null },
  action
) {
  switch (action.type) {
    case FETCH_PERIODICAL_PUBLICATION_TYPES:
      return Object.assign({}, state, {
        status: 'active',
        error: null,
        xhr: action.payload
      });

    case FETCH_PERIODICAL_PUBLICATION_TYPES_SUCCESS: {
      return Object.assign({}, state, {
        status: 'success',
        error: null,
        xhr: null
      });
    }

    case FETCH_PERIODICAL_PUBLICATION_TYPES_ERROR:
      return Object.assign({}, state, {
        status: 'error',
        error: action.error,
        xhr: null
      });

    default:
      return state;
  }
}

// TODO? stop using and rely on `droplets` (see droplet-reducers.js)
export function publicationTypeMap(state = {}, action) {
  if (action.buffered) {
    return action.payload.reduce((state, action) => {
      return publicationTypeMap(state, action);
    }, state);
  }

  switch (action.type) {
    case FETCH_PERIODICAL_PUBLICATION_TYPES_SUCCESS: {
      const mainEntity = action.payload.mainEntity || action.payload;
      return Object.assign(
        {},
        state,
        getNodeMap(
          arrayify(mainEntity.itemListElement).map(
            itemListElement => itemListElement.item
          )
        )
      );
    }

    case TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS_SUCCESS:
    case CREATE_PERIODICAL_PUBLICATION_TYPE_SUCCESS: {
      return Object.assign({}, state, {
        [getId(action.payload.result)]: action.payload.result
      });
    }

    case UPDATE_PERIODICAL_PUBLICATION_TYPE_SUCCESS: {
      return Object.assign({}, state, {
        [action.meta.publicationTypeId]: action.payload.result
      });
    }

    case ARCHIVE_PERIODICAL_PUBLICATION_TYPE_SUCCESS:
      return omit(state, [action.meta.publicationTypeId]);

    case REMOTE_DATA_UPSERTED: {
      const doc = action.payload.master;
      if (getId(doc) && getId(doc).startsWith('type:')) {
        return Object.assign({}, state, {
          [getId(doc)]: doc
        });
      }
      return state;
    }

    case REMOTE_DATA_DELETED: {
      const doc = action.payload.master;
      if (getId(doc) && getId(doc).startsWith('type:')) {
        return omit(state, [getId(doc)]);
      }
      return state;
    }

    default:
      return state;
  }
}

export function crudPublicationTypeStatus(state = {}, action) {
  switch (action.type) {
    case CREATE_PERIODICAL_PUBLICATION_TYPE:
    case UPDATE_PERIODICAL_PUBLICATION_TYPE:
    case ARCHIVE_PERIODICAL_PUBLICATION_TYPE:
    case TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS:
      return Object.assign({}, state, {
        [action.meta.publicationTypeId]: {
          status: 'active',
          error: null,
          xhr: action.meta.xhr
        }
      });

    case CREATE_PERIODICAL_PUBLICATION_TYPE_SUCCESS:
    case UPDATE_PERIODICAL_PUBLICATION_TYPE_SUCCESS:
    case ARCHIVE_PERIODICAL_PUBLICATION_TYPE_SUCCESS:
    case TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS_SUCCESS:
      // TODO remove instead ?
      return Object.assign({}, state, {
        [action.meta.publicationTypeId]: {
          status: 'success',
          error: null,
          xhr: null
        }
      });

    case CREATE_PERIODICAL_PUBLICATION_TYPE_ERROR:
    case UPDATE_PERIODICAL_PUBLICATION_TYPE_ERROR:
    case ARCHIVE_PERIODICAL_PUBLICATION_TYPE_ERROR:
    case TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS_ERROR:
      return Object.assign({}, state, {
        [action.meta.publicationTypeId]: {
          status: 'error',
          error: action.error,
          xhr: null
        }
      });

    default:
      return state;
  }
}
